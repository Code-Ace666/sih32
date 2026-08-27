import pytest
import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.models.database import Base, get_db
from app.models.models import User, FarmerProfile, ProcurementCentre, Slot, Booking, BookingStatus, UserRole

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Clean up tables
    db.query(Booking).delete()
    db.query(Slot).delete()
    db.query(ProcurementCentre).delete()
    db.query(FarmerProfile).delete()
    db.query(User).delete()
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


def test_farmer_registration_and_login():
    # 1. Register a Farmer
    register_payload = {
        "phone": "9999999999",
        "name": "Test Farmer",
        "password": "Password123",
        "role": "FARMER",
        "farmer_registration_id": "TREG001",
        "state": "Bihar",
        "district": "Patna",
        "block": "Danapur",
        "village": "Khagaul",
        "address": "Test Address",
        "preferred_language": "en"
    }
    
    response = client.post("/api/auth/register", json=register_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["phone"] == "9999999999"
    assert data["name"] == "Test Farmer"
    assert data["role"] == "FARMER"
    
    # Verify duplicates fail
    response = client.post("/api/auth/register", json=register_payload)
    assert response.status_code == 400

    # 2. Login Farmer
    login_payload = {
        "phone": "9999999999",
        "password": "Password123"
    }
    response = client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "FARMER"


def test_slot_booking_and_prevention_of_duplicates():
    db = TestingSessionLocal()
    # 1. Create seeded data
    # Create Centre
    centre = ProcurementCentre(
        name="Test Centre",
        district="Patna",
        block="Danapur",
        village="Khagaul",
        latitude=25.5,
        longitude=85.5,
        capacity_per_slot=2
    )
    db.add(centre)
    db.commit()

    # Create slot for today
    today = datetime.date.today()
    slot = Slot(
        centre_id=centre.id,
        date=today,
        start_time=datetime.time(8, 0),
        end_time=datetime.time(10, 0),
        max_capacity=2,
        booked_count=0
    )
    db.add(slot)
    db.commit()

    # Save IDs to local variables to prevent detached instance errors
    centre_id = centre.id
    slot_id = slot.id
    db.close()

    # Login to get Token
    # Let's bypass login auth by manually generating a JWT token or using mock dependencies.
    # To keep it simple, we can register the farmer via API first.
    register_payload = {
        "phone": "9876543210",
        "name": "John Doe",
        "password": "password",
        "farmer_registration_id": "REG987",
        "state": "Bihar",
        "district": "Patna",
        "block": "Danapur",
        "village": "Khagaul",
        "address": "Address"
    }
    client.post("/api/auth/register", json=register_payload)
    
    login_res = client.post("/api/auth/login", json={"phone": "9876543210", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Book slot
    booking_payload = {
        "centre_id": centre_id,
        "slot_id": slot_id,
        "booking_date": today.isoformat(),
        "crop_type": "Paddy",
        "estimated_quantity_quintal": 15.5
    }

    
    response = client.post("/api/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 200
    b_data = response.json()
    assert b_data["token_number"] == "A-001"
    
    # Try booking duplicate on same day - should fail
    response = client.post("/api/bookings", json=booking_payload, headers=headers)
    assert response.status_code == 400
    assert "already have an active booking" in response.json()["detail"]


def test_operator_flow():
    # 1. Setup farmer and operator
    # Register Farmer
    client.post("/api/auth/register", json={
        "phone": "9111111111", "name": "Farmer One", "password": "password",
        "farmer_registration_id": "REG111", "state": "Bihar", "district": "Patna", "block": "Danapur", "village": "Khagaul", "address": "Addr"
    })
    
    # Register Operator
    client.post("/api/auth/register-staff", json={
        "name": "Operator Vinay", "phone": "8111111111", "email": "vinay@demo.gov", "password": "password", "role": "CENTRE_OPERATOR"
    })

    # Login Farmer
    farmer_login = client.post("/api/auth/login", json={"phone": "9111111111", "password": "password"})
    farmer_token = farmer_login.json()["access_token"]
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}

    # Login Operator
    op_login = client.post("/api/auth/login", json={"email": "vinay@demo.gov", "password": "password"})
    op_token = op_login.json()["access_token"]
    op_headers = {"Authorization": f"Bearer {op_token}"}

    # Create Centre and Slot
    db = TestingSessionLocal()
    centre = ProcurementCentre(
        name="Mandi A", district="Patna", block="Danapur", village="Khagaul", latitude=25.0, longitude=85.0, capacity_per_slot=5
    )
    db.add(centre)
    db.commit()

    today = datetime.date.today()
    slot = Slot(
        centre_id=centre.id, date=today, start_time=datetime.time(8, 0), end_time=datetime.time(10, 0), max_capacity=5
    )
    db.add(slot)
    db.commit()
    
    centre_id = centre.id
    slot_id = slot.id
    db.close()

    # Book slot as farmer
    booking_res = client.post("/api/bookings", json={
        "centre_id": centre_id, "slot_id": slot_id, "booking_date": today.isoformat(), "crop_type": "Paddy", "estimated_quantity_quintal": 20.0
    }, headers=farmer_headers)
    booking_id = booking_res.json()["id"]

    # Check-in as farmer
    checkin_res = client.post(f"/api/bookings/{booking_id}/check-in", headers=farmer_headers)
    assert checkin_res.status_code == 200

    # Call farmer as operator
    call_res = client.post(f"/api/operator/queue/call-next?centre_id={centre_id}", headers=op_headers)
    assert call_res.status_code == 200
    assert call_res.json()["called_token"] == "A-001"


    # Start procurement as operator
    start_res = client.post(f"/api/operator/bookings/{booking_id}/start", headers=op_headers)
    assert start_res.status_code == 200

    # Complete procurement as operator
    proc_payload = {
        "crop_variety": "Super Fine Paddy",
        "quantity_quintal": 22.4,
        "quality_grade": "Grade A",
        "moisture_percentage": 13.8,
        "price_per_quintal": 2203.0,
        "deductions": 50.0
    }
    comp_res = client.post(f"/api/operator/bookings/{booking_id}/complete", json=proc_payload, headers=op_headers)
    assert comp_res.status_code == 200
    assert comp_res.json()["gross_amount"] == 22.4 * 2203.0
    assert comp_res.json()["net_payable_amount"] == (22.4 * 2203.0) - 50.0

    # Verify booking status became COMPLETED
    verify_booking_res = client.get(f"/api/bookings/{booking_id}", headers=farmer_headers)
    assert verify_booking_res.json()["status"] == BookingStatus.COMPLETED
