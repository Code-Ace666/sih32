import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.database import get_db
from app.models.models import Booking, ProcurementRecord, Payment, AuditLog, BookingStatus, PaymentStatus, ProcurementCentre, UserRole, User
from app.schemas.schemas import AdminDashboardStats
from app.api.auth import require_role

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Admin constraint
admin_permission = require_role([UserRole.ADMIN])


@router.get("/dashboard", response_model=AdminDashboardStats)
def get_admin_dashboard_stats(
    db: Session = Depends(get_db),
    user: User = Depends(admin_permission)
):
    today = datetime.date.today()

    today_farmers = db.query(func.count(func.distinct(Booking.farmer_id))).filter(Booking.booking_date == today).scalar() or 0
    today_bookings = db.query(Booking).filter(Booking.booking_date == today).count()
    waiting_farmers = db.query(Booking).filter(
        Booking.booking_date == today,
        Booking.status.in_([BookingStatus.CHECKED_IN, BookingStatus.WAITING])
    ).count()
    currently_processing = db.query(Booking).filter(
        Booking.booking_date == today,
        Booking.status == BookingStatus.IN_PROCUREMENT
    ).count()
    completed_today = db.query(Booking).filter(
        Booking.booking_date == today,
        Booking.status == BookingStatus.COMPLETED
    ).count()

    pending_payments_count = db.query(Payment).filter(
        Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.PROCESSING])
    ).count()

    total_procurement_quantity = db.query(func.sum(ProcurementRecord.quantity_quintal)).scalar() or 0.0
    total_procurement_value = db.query(func.sum(ProcurementRecord.net_payable_amount)).scalar() or 0.0
    
    pending_payment_value = db.query(func.sum(Payment.amount)).filter(
        Payment.status.in_([PaymentStatus.PENDING, PaymentStatus.PROCESSING])
    ).scalar() or 0.0

    # Let's say average service time is 10 minutes, but we can compute average of some mock data
    # (completed bookings) or just return a default like 12.5.
    avg_waiting_time_minutes = 12.5

    return AdminDashboardStats(
        today_farmers=today_farmers,
        today_bookings=today_bookings,
        waiting_farmers=waiting_farmers,
        currently_processing=currently_processing,
        completed_today=completed_today,
        pending_payments_count=pending_payments_count,
        total_procurement_quantity=float(total_procurement_quantity),
        total_procurement_value=float(total_procurement_value),
        pending_payment_value=float(pending_payment_value),
        avg_waiting_time_minutes=avg_waiting_time_minutes
    )

@router.get("/analytics")
def get_analytics(
    db: Session = Depends(get_db),
    user: User = Depends(admin_permission)
):
    # 1. Daily volumes last 7 days
    today = datetime.date.today()
    daily_volumes = []
    for i in range(6, -1, -1):
        d = today - datetime.timedelta(days=i)
        vol = db.query(func.sum(ProcurementRecord.quantity_quintal)).filter(
            func.date(ProcurementRecord.completed_at) == d
        ).scalar() or 0.0
        daily_volumes.append({
            "date": d.strftime("%d %b"),
            "volume": float(vol)
        })

    # 2. Crop-wise distribution
    crop_counts = db.query(
        Booking.crop_type,
        func.sum(ProcurementRecord.quantity_quintal)
    ).join(ProcurementRecord).group_by(Booking.crop_type).all()
    
    crop_data = []
    for crop, qtl in crop_counts:
        crop_data.append({
            "name": crop,
            "value": float(qtl or 0)
        })
    if not crop_data:
        crop_data = [{"name": "Paddy", "value": 0.0}, {"name": "Wheat", "value": 0.0}]

    # 3. Payment distribution
    pay_dist = db.query(
        Payment.status,
        func.count(Payment.id)
    ).group_by(Payment.status).all()
    
    payment_data = {ps: 0 for ps in [PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.PAID, PaymentStatus.FAILED]}
    for status_val, count in pay_dist:
        payment_data[status_val] = count

    # 4. Centre utilization
    centres = db.query(ProcurementCentre).all()
    centre_data = []
    for centre in centres:
        today_bookings = db.query(Booking).filter(
            Booking.centre_id == centre.id,
            Booking.booking_date == today
        ).count()
        # Max theoretical daily capacity = capacity_per_slot * number of slots (e.g. 5)
        capacity = centre.capacity_per_slot * 5
        centre_data.append({
            "name": centre.name,
            "bookings": today_bookings,
            "capacity": capacity,
            "utilization": round((today_bookings / capacity * 100), 1) if capacity > 0 else 0
        })

    # 5. Recent audit logs
    audit_logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(15).all()
    logs_data = []
    for log in audit_logs:
        operator_name = "System"
        if log.user_id:
            operator_user = db.query(User).filter(User.id == log.user_id).first()
            if operator_user:
                operator_name = operator_user.name
        
        logs_data.append({
            "id": log.id,
            "user_name": operator_name,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.isoformat()
        })

    return {
        "daily_volumes": daily_volumes,
        "crop_distribution": crop_data,
        "payments": payment_data,
        "centre_utilization": centre_data,
        "audit_logs": logs_data
    }

@router.post("/reseed")
def reseed_database():
    from seed import seed_db
    try:
        seed_db()
        return {"status": "success", "message": "Database reseeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reseed failed: {str(e)}")

