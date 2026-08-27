import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.database import get_db
from app.models.models import ProcurementCentre, Slot
from app.schemas.schemas import ProcurementCentreResponse, SlotResponse

router = APIRouter(prefix="/api/centres", tags=["centres"])

@router.get("", response_model=List[ProcurementCentreResponse])
def get_centres(
    district: Optional[str] = None,
    block: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(ProcurementCentre).filter(ProcurementCentre.is_active == True)
    if district:
        query = query.filter(ProcurementCentre.district.ilike(f"%{district}%"))
    if block:
        query = query.filter(ProcurementCentre.block.ilike(f"%{block}%"))
    return query.all()

@router.get("/{id}", response_model=ProcurementCentreResponse)
def get_centre(id: str, db: Session = Depends(get_db)):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Procurement centre not found")
    return centre

@router.get("/{id}/slots", response_model=List[SlotResponse])
def get_centre_slots(
    id: str,
    date: Optional[str] = None, # Expects YYYY-MM-DD
    db: Session = Depends(get_db)
):
    centre = db.query(ProcurementCentre).filter(ProcurementCentre.id == id).first()
    if not centre:
        raise HTTPException(status_code=404, detail="Procurement centre not found")

    if not date:
        date_obj = datetime.date.today()
    else:
        try:
            date_obj = datetime.datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Get slots for this date
    slots = db.query(Slot).filter(Slot.centre_id == id, Slot.date == date_obj).all()

    # If no slots exist for this date, automatically pre-generate them for the demo
    if not slots:
        standard_slots = [
            ("08:00:00", "10:00:00"),
            ("10:00:00", "12:00:00"),
            ("12:00:00", "14:00:00"),
            ("14:00:00", "16:00:00"),
            ("16:00:00", "18:00:00"),
        ]
        slots = []
        for start_str, end_str in standard_slots:
            start_time = datetime.datetime.strptime(start_str, "%H:%M:%S").time()
            end_time = datetime.datetime.strptime(end_str, "%H:%M:%S").time()
            slot = Slot(
                centre_id=id,
                date=date_obj,
                start_time=start_time,
                end_time=end_time,
                max_capacity=centre.capacity_per_slot,
                booked_count=0
            )
            db.add(slot)
        db.commit()
        # Fetch them again to have IDs
        slots = db.query(Slot).filter(Slot.centre_id == id, Slot.date == date_obj).all()

    return slots
