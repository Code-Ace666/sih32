import datetime
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import Payment, PaymentStatus, User, UserRole, ProcurementRecord, Booking, AuditLog
from app.schemas.schemas import PaymentResponse
from app.api.auth import get_current_user, require_role
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/api/payments", tags=["payments"])

@router.get("", response_model=List[PaymentResponse])
def get_payments(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.FARMER:
        # Get payments for this farmer's bookings
        payments = db.query(Payment).join(ProcurementRecord).join(Booking).filter(
            Booking.farmer_id == current_user.id
        ).order_by(Payment.created_at.desc()).all()
    else:
        # Admins and Operators see all
        payments = db.query(Payment).order_by(Payment.created_at.desc()).all()
    
    return payments


@router.post("/{id}/process", response_model=PaymentResponse)
def process_payment(
    id: str,
    db: Session = Depends(get_db),
    operator: User = Depends(require_role([UserRole.ADMIN, UserRole.CENTRE_OPERATOR]))
):
    payment = db.query(Payment).filter(Payment.id == id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.status != PaymentStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only PENDING payments can be processed")

    payment.status = PaymentStatus.PROCESSING
    db.commit()
    db.refresh(payment)

    # Log action
    procurement = db.query(ProcurementRecord).filter(ProcurementRecord.id == payment.procurement_id).first()
    booking = db.query(Booking).filter(Booking.id == procurement.booking_id).first() if procurement else None
    
    if booking:
        NotificationService.notify_user(
            db=db,
            user_id=booking.farmer_id,
            title="Payment Processing",
            title_hi="भुगतान प्रसंस्करण में",
            message=f"Payment for Token {booking.token_number} of amount Rs. {payment.amount} is currently being processed by the bank.",
            message_hi=f"टोकन {booking.token_number} के लिए रु. {payment.amount} का भुगतान वर्तमान में बैंक द्वारा संसाधित किया जा रहा है।"
        )

    audit = AuditLog(
        user_id=operator.id,
        action="PROCESS_PAYMENT",
        details=f"Moved payment {id} to PROCESSING status"
    )
    db.add(audit)
    db.commit()

    return payment


@router.post("/{id}/settle", response_model=PaymentResponse)
def settle_payment(
    id: str,
    db: Session = Depends(get_db),
    operator: User = Depends(require_role([UserRole.ADMIN, UserRole.CENTRE_OPERATOR]))
):
    payment = db.query(Payment).filter(Payment.id == id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")

    if payment.status not in [PaymentStatus.PENDING, PaymentStatus.PROCESSING]:
        raise HTTPException(status_code=400, detail="Only PENDING or PROCESSING payments can be settled")

    today_str = datetime.date.today().strftime("%Y%m%d")
    rand_hex = "".join(random.choices("0123456789ABCDEF", k=6))
    tx_ref = f"PAY-{today_str}-{rand_hex}"

    payment.status = PaymentStatus.PAID
    payment.transaction_reference = tx_ref
    db.commit()
    db.refresh(payment)

    # Log action
    procurement = db.query(ProcurementRecord).filter(ProcurementRecord.id == payment.procurement_id).first()
    booking = db.query(Booking).filter(Booking.id == procurement.booking_id).first() if procurement else None

    if booking:
        NotificationService.notify_user(
            db=db,
            user_id=booking.farmer_id,
            title="Payment Settled (PAID)",
            title_hi="भुगतान का निपटान हो गया (PAID)",
            message=f"Payment of Rs. {payment.amount} successfully settled to your bank account. Transaction ID: {tx_ref}.",
            message_hi=f"रु. {payment.amount} का भुगतान आपके बैंक खाते में सफलतापूर्वक स्थानांतरित कर दिया गया है। लेनदेन आईडी: {tx_ref}।"
        )

    audit = AuditLog(
        user_id=operator.id,
        action="SETTLE_PAYMENT",
        details=f"Settled payment {id} with Transaction Reference: {tx_ref}"
    )
    db.add(audit)
    db.commit()

    return payment
