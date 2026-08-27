from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date as DateType, time as TimeType, datetime
from app.models.models import BookingStatus, PaymentStatus

# User & Auth
class UserBase(BaseModel):
    phone: str
    name: str

class UserCreate(UserBase):
    password: str
    role: str = "FARMER"
    # Farmer Profile fields if role is FARMER
    farmer_registration_id: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    block: Optional[str] = None
    village: Optional[str] = None
    address: Optional[str] = None
    preferred_language: Optional[str] = "en"

class OperatorAdminCreate(BaseModel):
    name: str
    phone: str
    email: str
    password: str
    role: str

class UserLogin(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    name: str

# Farmer Profile
class FarmerProfileBase(BaseModel):
    farmer_registration_id: str
    state: str
    district: str
    block: str
    village: str
    address: str
    preferred_language: str

class FarmerProfileResponse(FarmerProfileBase):
    id: str
    user_id: str

    class Config:
        from_attributes = True

class UserResponse(UserBase):
    id: str
    role: str
    email: Optional[str] = None
    farmer_profile: Optional[FarmerProfileResponse] = None

    class Config:
        from_attributes = True

# Procurement Centre
class ProcurementCentreBase(BaseModel):
    name: str
    district: str
    block: str
    village: str
    latitude: float
    longitude: float
    capacity_per_slot: int
    avg_service_time_mins: int
    is_active: bool

class ProcurementCentreResponse(ProcurementCentreBase):
    id: str

    class Config:
        from_attributes = True

# Slot
class SlotBase(BaseModel):
    centre_id: str
    date: DateType
    start_time: TimeType
    end_time: TimeType
    max_capacity: int
    booked_count: int

class SlotResponse(SlotBase):
    id: str

    class Config:
        from_attributes = True

# Booking
class BookingCreate(BaseModel):
    centre_id: str
    slot_id: str
    booking_date: DateType
    crop_type: str
    estimated_quantity_quintal: float

class BookingResponse(BaseModel):
    id: str
    farmer_id: str
    centre_id: str
    slot_id: str
    booking_date: DateType
    token_number: str
    sequence_number: int
    crop_type: str
    estimated_quantity_quintal: float
    status: str
    created_at: datetime
    updated_at: datetime
    # Include center details
    centre: Optional[ProcurementCentreResponse] = None
    farmer_name: Optional[str] = None
    farmer_phone: Optional[str] = None
    slot: Optional[SlotResponse] = None

    class Config:
        from_attributes = True

# Procurement
class ProcurementCreate(BaseModel):
    crop_variety: str
    quantity_quintal: float
    quality_grade: str
    moisture_percentage: float
    price_per_quintal: float
    deductions: float = 0.0

class ProcurementResponse(BaseModel):
    id: str
    booking_id: str
    operator_id: str
    crop_variety: str
    quantity_quintal: float
    quality_grade: str
    moisture_percentage: float
    price_per_quintal: float
    gross_amount: float
    deductions: float
    net_payable_amount: float
    completed_at: datetime

    class Config:
        from_attributes = True

# Payment
class PaymentResponse(BaseModel):
    id: str
    procurement_id: str
    amount: float
    status: str
    transaction_reference: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Notification
class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    title_hi: str
    message: str
    message_hi: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Queue Live Status
class LiveQueueStatus(BaseModel):
    booking_id: str
    token_number: str
    status: str
    queue_position: int
    estimated_wait_minutes: int
    current_serving_token: Optional[str] = None
    centre_name: str
    average_service_time: int

# Dashboards & Analytics
class AdminDashboardStats(BaseModel):
    today_farmers: int
    today_bookings: int
    waiting_farmers: int
    currently_processing: int
    completed_today: int
    pending_payments_count: int
    total_procurement_quantity: float
    total_procurement_value: float
    pending_payment_value: float
    avg_waiting_time_minutes: float

class OperatorDashboardStats(BaseModel):
    current_serving_token: Optional[str] = None
    next_tokens: List[str] = []
    waiting_count: int
    checked_in_count: int
    processing_count: int
    completed_today_count: int
