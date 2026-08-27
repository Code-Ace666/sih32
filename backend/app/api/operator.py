import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.database import get_db
from app.models.models import Booking, Slot, ProcurementCentre, User, BookingStatus, ProcurementRecord, Payment, PaymentStatus, AuditLog
from app.schemas.schemas import BookingResponse, ProcurementCreate, ProcurementResponse, OperatorDashboardStats
from app.api.auth import get_current_user, require_role, UserRole
from app.websocket.connection_manager import manager
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/operator", tags=["operator"])

# Operator permissions constraint
operator_permission = require_role([UserRole.CENTRE_OPERATOR, UserRole.ADMIN])


@router.get("/dashboard-stats", response_model=OperatorDashboardStats)
def get_operator_stats(
    centre_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(operator_permission)
):
    today = datetime.date.today()
    
    # Current serving
    serving = db.query(Booking).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today,
        Booking.status == BookingStatus.CALLED
    ).first()

    # Next tokens (Waiting or Checked-in) ordered by slot and sequence
    next_bookings = db.query(Booking).join(Slot).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today,
        Booking.status.in_([BookingStatus.CHECKED_IN, BookingStatus.WAITING])
    ).order_by(Slot.start_time, Booking.sequence_number).limit(5).all()

    waiting_count = db.query(Booking).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today,
        Booking.status == BookingStatus.BOOKED
    ).count()

    checked_in_count = db.query(Booking).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today,
        Booking.status == BookingStatus.CHECKED_IN
    ).count()

    processing_count = db.query(Booking).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today,
        Booking.status == BookingStatus.IN_PROCUREMENT
    ).count()

    completed_today_count = db.query(Booking).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today,
        Booking.status == BookingStatus.COMPLETED
    ).count()

    return OperatorDashboardStats(
        current_serving_token=serving.token_number if serving else None,
        next_tokens=[b.token_number for b in next_bookings],
        waiting_count=waiting_count,
        checked_in_count=checked_in_count,
        processing_count=processing_count,
        completed_today_count=completed_today_count
    )


@router.get("/bookings", response_model=List[BookingResponse])
def get_centre_bookings(
    centre_id: str,
    date: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    user: User = Depends(operator_permission)
):
    if not date:
        date_obj = datetime.date.today()
    else:
        date_obj = datetime.datetime.strptime(date, "%Y-%m-%d").date()

    query = db.query(Booking).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == date_obj
    )

    if status_filter:
        query = query.filter(Booking.status == status_filter)
    else:
        # Exclude cancelled bookings by default unless filtered
        query = query.filter(Booking.status != BookingStatus.CANCELLED)

    bookings = query.all()

    # Populate farmer details
    for b in bookings:
        farmer = db.query(User).filter(User.id == b.farmer_id).first()
        b.farmer_name = farmer.name if farmer else ""
        b.farmer_phone = farmer.phone if farmer else ""

    return bookings


@router.post("/queue/call-next")
async def call_next_farmer(
    centre_id: str,
    db: Session = Depends(get_db),
    operator: User = Depends(operator_permission)
):
    today = datetime.date.today()

    # 1. Any currently CALLED farmer should be automatically marked as MISSED
    current_called = db.query(Booking).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today,
        Booking.status == BookingStatus.CALLED
    ).all()
    for cb in current_called:
        cb.status = BookingStatus.MISSED
        # Notification
        NotificationService.notify_user(
            db=db,
            user_id=cb.farmer_id,
            title="Token Missed",
            title_hi="टोकन छूट गया",
            message=f"You missed your turn for Token {cb.token_number}. Please contact support.",
            message_hi=f"आप टोकन {cb.token_number} के लिए अपनी बारी चूक गए हैं। कृपया सहायता से संपर्क करें।"
        )

    # 2. Find the next checked-in/waiting farmer
    next_booking = db.query(Booking).join(Slot).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today,
        Booking.status.in_([BookingStatus.CHECKED_IN, BookingStatus.WAITING])
    ).order_by(Slot.start_time, Booking.sequence_number).first()

    if not next_booking:
        db.commit()
        # Broadcast queue update anyway to clear currently serving token
        await manager.broadcast_to_centre(centre_id, {
            "event": "QUEUE_UPDATE",
            "centre_id": centre_id
        })
        return {"status": "success", "message": "No checked-in farmers waiting in the queue."}

    # 3. Call the next farmer
    next_booking.status = BookingStatus.CALLED
    db.commit()

    # Log action
    audit = AuditLog(
        user_id=operator.id,
        action="CALL_NEXT",
        details=f"Called token {next_booking.token_number} at centre {centre_id}"
    )
    db.add(audit)
    db.commit()

    # Send Notification to the called farmer
    NotificationService.notify_user(
        db=db,
        user_id=next_booking.farmer_id,
        title="Your Token is Called",
        title_hi="आपका टोकन बुलाया गया है",
        message=f"Token {next_booking.token_number} has been called. Please proceed to the procurement counter.",
        message_hi=f"टोकन {next_booking.token_number} को बुलाया गया है। कृपया खरीद काउंटर पर जाएँ।"
    )

    # 4. Notify next 2 farmers in line (Near Turn alerts)
    upcoming_bookings = db.query(Booking).join(Slot).filter(
        Booking.centre_id == centre_id,
        Booking.booking_date == today,
        Booking.status.in_([BookingStatus.CHECKED_IN, BookingStatus.WAITING])
    ).order_by(Slot.start_time, Booking.sequence_number).limit(2).all()

    for idx, ub in enumerate(upcoming_bookings):
        NotificationService.notify_user(
            db=db,
            user_id=ub.farmer_id,
            title="Near Turn Alert",
            title_hi="निकट बारी चेतावनी",
            message=f"Your turn is approaching. You are at position {idx + 1} in the queue.",
            message_hi=f"आपकी बारी नजदीक आ रही है। आप कतार में {idx + 1} स्थान पर हैं।"
        )

    # Broadcast updated queue state
    await manager.broadcast_to_centre(centre_id, {
        "event": "QUEUE_UPDATE",
        "centre_id": centre_id,
        "called_token": next_booking.token_number
    })

    return {"status": "success", "called_token": next_booking.token_number}


@router.post("/bookings/{id}/check-in")
async def operator_check_in(
    id: str,
    db: Session = Depends(get_db),
    operator: User = Depends(operator_permission)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != BookingStatus.BOOKED:
        raise HTTPException(status_code=400, detail="Only BOOKED slots can be checked in")

    booking.status = BookingStatus.CHECKED_IN
    db.commit()

    # Log action
    audit = AuditLog(
        user_id=operator.id,
        action="OPERATOR_CHECK_IN",
        details=f"Operator manually checked in token {booking.token_number}"
    )
    db.add(audit)
    db.commit()

    NotificationService.notify_user(
        db=db,
        user_id=booking.farmer_id,
        title="Checked In by Operator",
        title_hi="ऑपरेटर द्वारा चेक-इन किया गया",
        message=f"Checked-in successfully for Token {booking.token_number}.",
        message_hi=f"टोकन {booking.token_number} के लिए सफलतापूर्वक चेक-इन किया गया।"
    )

    await manager.broadcast_to_centre(booking.centre_id, {
        "event": "QUEUE_UPDATE",
        "centre_id": booking.centre_id
    })

    return {"status": "success", "message": f"Token {booking.token_number} checked in."}


@router.post("/bookings/{id}/start")
async def start_procurement(
    id: str,
    db: Session = Depends(get_db),
    operator: User = Depends(operator_permission)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status not in [BookingStatus.CALLED, BookingStatus.CHECKED_IN]:
        raise HTTPException(status_code=400, detail="Cannot start procurement for this booking status")

    booking.status = BookingStatus.IN_PROCUREMENT
    db.commit()

    # Log action
    audit = AuditLog(
        user_id=operator.id,
        action="START_PROCUREMENT",
        details=f"Started crop weighing/inspection for token {booking.token_number}"
    )
    db.add(audit)
    db.commit()

    await manager.broadcast_to_centre(booking.centre_id, {
        "event": "QUEUE_UPDATE",
        "centre_id": booking.centre_id
    })

    return {"status": "success", "message": f"Procurement started for token {booking.token_number}."}


@router.post("/bookings/{id}/complete", response_model=ProcurementResponse)
async def complete_procurement(
    id: str,
    procurement_in: ProcurementCreate,
    db: Session = Depends(get_db),
    operator: User = Depends(operator_permission)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != BookingStatus.IN_PROCUREMENT:
        raise HTTPException(status_code=400, detail="Procurement must be started before completing")

    # Math
    gross = procurement_in.quantity_quintal * procurement_in.price_per_quintal
    net = gross - procurement_in.deductions

    # Create procurement record
    record = ProcurementRecord(
        booking_id=booking.id,
        operator_id=operator.id,
        crop_variety=procurement_in.crop_variety,
        quantity_quintal=procurement_in.quantity_quintal,
        quality_grade=procurement_in.quality_grade,
        moisture_percentage=procurement_in.moisture_percentage,
        price_per_quintal=procurement_in.price_per_quintal,
        gross_amount=gross,
        deductions=procurement_in.deductions,
        net_payable_amount=net,
        completed_at=datetime.datetime.utcnow()
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    # Create payment record (PENDING)
    payment = Payment(
        procurement_id=record.id,
        amount=net,
        status=PaymentStatus.PENDING
    )
    db.add(payment)
    
    # Complete Booking
    booking.status = BookingStatus.COMPLETED
    db.commit()

    # Log action
    audit = AuditLog(
        user_id=operator.id,
        action="COMPLETE_PROCUREMENT",
        details=f"Completed procurement record for booking {booking.token_number}. Gross: ₹{gross}, Net: ₹{net}"
    )
    db.add(audit)
    db.commit()

    # Notifications
    NotificationService.notify_user(
        db=db,
        user_id=booking.farmer_id,
        title="Crop Procurement Completed",
        title_hi="फसल खरीद पूरी हुई",
        message=f"Crop procurement completed. Net quantity: {record.quantity_quintal} qtl. Total Net Payable: Rs. {record.net_payable_amount}.",
        message_hi=f"फसल खरीद पूरी हो चुकी है। शुद्ध मात्रा: {record.quantity_quintal} क्विंटल। कुल देय राशि: रु. {record.net_payable_amount}।"
    )

    NotificationService.notify_user(
        db=db,
        user_id=booking.farmer_id,
        title="Payment Initiated",
        title_hi="भुगतान शुरू किया गया",
        message=f"Payment of Rs. {record.net_payable_amount} has been initiated for Token {booking.token_number}.",
        message_hi=f"टोकन {booking.token_number} के लिए रु. {record.net_payable_amount} का भुगतान शुरू कर दिया गया है।"
    )

    # Broadcast updated queue state
    await manager.broadcast_to_centre(booking.centre_id, {
        "event": "QUEUE_UPDATE",
        "centre_id": booking.centre_id
    })

    return record


@router.post("/bookings/{id}/miss")
async def mark_missed(
    id: str,
    db: Session = Depends(get_db),
    operator: User = Depends(operator_permission)
):
    booking = db.query(Booking).filter(Booking.id == id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status not in [BookingStatus.CALLED, BookingStatus.CHECKED_IN, BookingStatus.WAITING]:
        raise HTTPException(status_code=400, detail="Cannot mark this booking status as missed")

    booking.status = BookingStatus.MISSED
    db.commit()

    # Log action
    audit = AuditLog(
        user_id=operator.id,
        action="MARK_MISSED",
        details=f"Marked token {booking.token_number} as MISSED"
    )
    db.add(audit)
    db.commit()

    NotificationService.notify_user(
        db=db,
        user_id=booking.farmer_id,
        title="Token Missed Alert",
        title_hi="टोकन छूट गया चेतावनी",
        message=f"Your token {booking.token_number} was marked as missed. Please re-visit check-in.",
        message_hi=f"आपका टोकन {booking.token_number} छूटा हुआ चिह्नित किया गया था। कृपया दोबारा चेक-इन करें।"
    )

    await manager.broadcast_to_centre(booking.centre_id, {
        "event": "QUEUE_UPDATE",
        "centre_id": booking.centre_id
    })

    return {"status": "success", "message": f"Token {booking.token_number} marked as MISSED."}
