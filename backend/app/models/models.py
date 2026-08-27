import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Date, Time, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class UserRole:
    FARMER = "FARMER"
    CENTRE_OPERATOR = "CENTRE_OPERATOR"
    ADMIN = "ADMIN"

class BookingStatus:
    BOOKED = "BOOKED"
    CHECKED_IN = "CHECKED_IN"
    WAITING = "WAITING"
    CALLED = "CALLED"
    IN_PROCUREMENT = "IN_PROCUREMENT"
    COMPLETED = "COMPLETED"
    MISSED = "MISSED"
    CANCELLED = "CANCELLED"

class PaymentStatus:
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PAID = "PAID"
    FAILED = "FAILED"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    phone = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # FARMER, CENTRE_OPERATOR, ADMIN
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    farmer_profile = relationship("FarmerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="farmer", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class FarmerProfile(Base):
    __tablename__ = "farmer_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    farmer_registration_id = Column(String, unique=True, index=True, nullable=False)
    state = Column(String, nullable=False)
    district = Column(String, nullable=False)
    block = Column(String, nullable=False)
    village = Column(String, nullable=False)
    address = Column(String, nullable=False)
    preferred_language = Column(String, default="en")  # en, hi

    # Relationships
    user = relationship("User", back_populates="farmer_profile")


class ProcurementCentre(Base):
    __tablename__ = "procurement_centres"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False, index=True)
    block = Column(String, nullable=False, index=True)
    village = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity_per_slot = Column(Integer, default=15)
    avg_service_time_mins = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)

    # Relationships
    slots = relationship("Slot", back_populates="centre", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="centre", cascade="all, delete-orphan")


class Slot(Base):
    __tablename__ = "slots"

    id = Column(String, primary_key=True, default=generate_uuid)
    centre_id = Column(String, ForeignKey("procurement_centres.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    max_capacity = Column(Integer, nullable=False)
    booked_count = Column(Integer, default=0)

    # Relationships
    centre = relationship("ProcurementCentre", back_populates="slots")
    bookings = relationship("Booking", back_populates="slot", cascade="all, delete-orphan")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(String, primary_key=True, default=generate_uuid)
    farmer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    centre_id = Column(String, ForeignKey("procurement_centres.id", ondelete="CASCADE"), nullable=False)
    slot_id = Column(String, ForeignKey("slots.id", ondelete="CASCADE"), nullable=False)
    booking_date = Column(Date, nullable=False, index=True)
    token_number = Column(String, nullable=False, index=True)
    sequence_number = Column(Integer, nullable=False)  # Order inside the day/centre
    crop_type = Column(String, nullable=False)
    estimated_quantity_quintal = Column(Float, nullable=False)
    status = Column(String, default=BookingStatus.BOOKED, nullable=False)  # BOOKED, CHECKED_IN, WAITING, CALLED, IN_PROCUREMENT, COMPLETED, MISSED, CANCELLED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    farmer = relationship("User", back_populates="bookings")
    centre = relationship("ProcurementCentre", back_populates="bookings")
    slot = relationship("Slot", back_populates="bookings")
    procurement = relationship("ProcurementRecord", back_populates="booking", uselist=False, cascade="all, delete-orphan")


class ProcurementRecord(Base):
    __tablename__ = "procurements"

    id = Column(String, primary_key=True, default=generate_uuid)
    booking_id = Column(String, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, unique=True)
    operator_id = Column(String, ForeignKey("users.id"), nullable=False)
    crop_variety = Column(String, nullable=False)
    quantity_quintal = Column(Float, nullable=False)
    quality_grade = Column(String, nullable=False)  # Grade A, Grade B, Common
    moisture_percentage = Column(Float, nullable=False)
    price_per_quintal = Column(Float, nullable=False)
    gross_amount = Column(Float, nullable=False)
    deductions = Column(Float, default=0.0)
    net_payable_amount = Column(Float, nullable=False)
    completed_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="procurement")
    payment = relationship("Payment", back_populates="procurement", uselist=False, cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, default=generate_uuid)
    procurement_id = Column(String, ForeignKey("procurements.id", ondelete="CASCADE"), nullable=False, unique=True)
    amount = Column(Float, nullable=False)
    status = Column(String, default=PaymentStatus.PENDING, nullable=False)  # PENDING, PROCESSING, PAID, FAILED
    transaction_reference = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    procurement = relationship("ProcurementRecord", back_populates="payment")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    title_hi = Column(String, nullable=False)
    message = Column(String, nullable=False)
    message_hi = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)
    details = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
