import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.database import get_db
from app.models.models import Booking, Slot, ProcurementCentre, User, BookingStatus, AuditLog
from app.schemas.schemas import BookingCreate, BookingResponse, LiveQueueStatus
from app.api.auth import get_current_user, require_role, UserRole
from app.websocket.connection_manager import manager
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

# Helper to calculate queue position and serving token
def get_queue_info(db: Session, booking: Booking):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == booking.centre_id).first()
    avg_service_time = centre.avg_service_time_mins if centre else 10

    # Current serving token at this centre today
    serving_booking = db.query(Booking).filter(
        Booking.centre_id == booking.centre_id,
        Booking.booking_date == booking.booking_date,
        Booking.status.in_([BookingStatus.CALLED, BookingStatus.IN_PROCUREMENT])
    ).first()
    
    current_serving_token = serving_booking.token_number if serving_booking else None

    # If the booking is not in an active waiting state, position is 0
    if booking.status not in [BookingStatus.CHECKED_IN, BookingStatus.WAITING]:
        # If it is CALLED or IN_PROCUREMENT, position is 1 (being served)
        if booking.status in [BookingStatus.CALLED, BookingStatus.IN_PROCUREMENT]:
            return 1, avg_service_time, current_serving_token
        return 0, 0, current_serving_token

    # Find how many people are ahead of this booking.
    # People ahead are those with status CHECKED_IN or WAITING or CALLED or IN_PROCUREMENT
    # on the same day and centre, who are:
    # 1. Being served: status in (CALLED, IN_PROCUREMENT)
    # 2. Waiting: status in (CHECKED_IN, WAITING) with earlier slot date/time or same slot but lower sequence
    
    # Let's get slot details for current booking
    b_slot = db.query(Slot).filter(Slot.id == booking.slot_id).first()
    
    # 1. Count being served
    served_count = db.query(Booking).filter(
        Booking.centre_id == booking.centre_id,
        Booking.booking_date == booking.booking_date,
        Booking.status.in_([BookingStatus.CALLED, BookingStatus.IN_PROCUREMENT])
    ).count()

    # 2. Count waiting ahead
    waiting_ahead_query = db.query(Booking).join(Slot).filter(
        Booking.centre_id == booking.centre_id,
        Booking.booking_date == booking.booking_date,
        Booking.status.in_([BookingStatus.CHECKED_IN, BookingStatus.WAITING])
    )

    # Filter for earlier slot or (same slot and lower sequence)
    # We compare start_time of slots
    if b_slot:
        waiting_ahead = waiting_ahead_query.filter(
            (Slot.start_time < b_slot.start_time) | 
            ((Slot.start_time == b_slot.start_time) & (Booking.sequence_number < booking.sequence_number))
        ).count()
    else:
        waiting_ahead = waiting_ahead_query.filter(
            Booking.sequence_number < booking.sequence_number
        ).count()

    queue_position = served_count + waiting_ahead + 1
    estimated_wait = queue_position * avg_service_time

    return queue_position, estimated_wait, current_serving_token


@router.post("", response_model=BookingResponse)
def create_booking(booking_in: BookingCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.FARMER:
        raise HTTPException(status_code=403, detail="Only farmers can book slots")

    # Verify slot exists and has capacity
    slot = db.query(Slot).filter(Slot.id == booking_in.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Selected slot does not exist")
    
    if slot.booked_count >= slot.max_capacity:
        raise HTTPException(status_code=400, detail="This slot is fully booked. Please select another slot.")

    # Prevent duplicate booking on the same day for this farmer
    duplicate = db.query(Booking).filter(
        Booking.farmer_id == current_user.id,
        Booking.booking_date == booking_in.booking_date,
        Booking.status.notin_([BookingStatus.CANCELLED, BookingStatus.MISSED])
    ).first()
    if duplicate:
        raise HTTPException(
            status_code=400,
            detail=f"You already have an active booking on {booking_in.booking_date}. Booking ID: {duplicate.token_number}"
        )

    # Generate sequence number for today at this centre
    last_booking = db.query(Booking).filter(
        Booking.centre_id == booking_in.centre_id,
        Booking.booking_date == booking_in.booking_date
    ).order_by(Booking.sequence_number.desc()).first()
    
    next_seq = (last_booking.sequence_number + 1) if last_booking else 1

    # Token number format: T-date-seq, e.g. T-0827-024 or let's use a simpler "A-024" type format.
    # To keep it matching the problem statement, let's use "A-" prefix and pad the sequence number: A-001, A-002, etc.
    token_number = f"A-{next_seq:03d}"

    new_booking = Booking(
        farmer_id=current_user.id,
        centre_id=booking_in.centre_id,
        slot_id=booking_in.slot_id,
        booking_date=booking_in.booking_date,
        token_number=token_number,
        sequence_number=next_seq,
        crop_type=booking_in.crop_type,
        estimated_quantity_quintal=booking_in.estimated_quantity_quintal,
        status=BookingStatus.BOOKED
    )

    slot.booked_count += 1
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    # Log action
    audit = AuditLog(
        user_id=current_user.id,
        action="BOOK_SLOT",
        details=f"Booked slot {slot.start_time}-{slot.end_time} on {booking_in.booking_date}. Token: {token_number}"
    )
    db.add(audit)
    db.commit()

    # Generate In-app Notification & SMS
    NotificationService.notify_user(
        db=db,
        user_id=current_user.id,
        title="Slot Booked Successfully",
        title_hi="स्लॉट सफलतापूर्वक बुक हो गया",
        message=f"Your procurement slot has been booked successfully. Token: {token_number}. Date: {new_booking.booking_date}.",
        message_hi=f"आपका खरीद स्लॉट सफलतापूर्वक बुक हो गया है। टोकन: {token_number}। दिनांक: {new_booking.booking_date}।"
    )

    return new_booking


@router.get("/my", response_model=List[BookingResponse])
def get_my_bookings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bookings = db.query(Booking).filter(Booking.farmer_id == current_user.id).order_by(Booking.booking_date.desc()).all()
    # Add details for response mapping
    for b in bookings:
        b.farmer_name = current_user.name
        b.farmer_phone = current_user.phone
    return bookings


@router.get("/{id}", response_model=BookingResponse)
def get_booking(id: str, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    farmer = db.query(User).filter(User.id == booking.farmer_id).first()
    booking.farmer_name = farmer.name if farmer else ""
    booking.farmer_phone = farmer.phone if farmer else ""
    return booking


@router.delete("/{id}")
def cancel_booking(id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.farmer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking")

    if booking.status in [BookingStatus.COMPLETED, BookingStatus.IN_PROCUREMENT, BookingStatus.CALLED]:
        raise HTTPException(status_code=400, detail="Cannot cancel a booking that is currently active or completed")

    booking.status = BookingStatus.CANCELLED
    
    # Free up slot capacity
    slot = db.query(Slot).filter(Slot.id == booking.slot_id).first()
    if slot and slot.booked_count > 0:
        slot.booked_count -= 1

    db.commit()

    # Log action
    audit = AuditLog(
        user_id=current_user.id,
        action="CANCEL_BOOKING",
        details=f"Cancelled booking {booking.token_number}"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "message": "Booking cancelled successfully"}


@router.post("/{id}/check-in")
async def check_in_booking(id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Only farmer of this booking or operator can check in
    if booking.farmer_id != current_user.id and current_user.role not in [UserRole.CENTRE_OPERATOR, UserRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to check in")

    if booking.status != BookingStatus.BOOKED:
        raise HTTPException(status_code=400, detail=f"Booking cannot be checked in. Current status: {booking.status}")

    # Set status
    booking.status = BookingStatus.CHECKED_IN
    db.commit()

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        action="CHECK_IN",
        details=f"Checked in booking {booking.token_number}"
    )
    db.add(audit)
    db.commit()

    # Send Notification
    NotificationService.notify_user(
        db=db,
        user_id=booking.farmer_id,
        title="Checked In Successfully",
        title_hi="सफलतापूर्वक चेक-इन किया गया",
        message=f"You are checked in for Token {booking.token_number}. Please wait for your turn.",
        message_hi=f"आप टोकन {booking.token_number} के लिए चेक-इन हो चुके हैं। कृपया अपनी बारी की प्रतीक्षा करें।"
    )

    # Broadcast WebSocket update
    await manager.broadcast_to_centre(booking.centre_id, {
        "event": "QUEUE_UPDATE",
        "centre_id": booking.centre_id,
        "token_number": booking.token_number,
        "status": booking.status
    })

    return {"status": "success", "message": "Checked in successfully"}


@router.get("/live/{booking_id}", response_model=LiveQueueStatus)
def get_live_queue_status(booking_id: str, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == booking.centre_id).first()
    centre_name = centre.name if centre else "Procurement Centre"
    avg_service_time = centre.avg_service_time_mins if centre else 10

    pos, wait, serving = get_queue_info(db, booking)

    return LiveQueueStatus(
        booking_id=booking.id,
        token_number=booking.token_number,
        status=booking.status,
        queue_position=pos,
        estimated_wait_minutes=wait,
        current_serving_token=serving,
        centre_name=centre_name,
        average_service_time=avg_service_time
    )
