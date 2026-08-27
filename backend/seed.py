import datetime
import hashlib
import os
from app.models.database import SessionLocal, engine, Base
from app.models.models import User, FarmerProfile, ProcurementCentre, Slot, Booking, BookingStatus, ProcurementRecord, Payment, PaymentStatus, UserRole, Notification

def get_password_hash(password: str) -> str:
    salt = os.urandom(16).hex()
    dk = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{dk.hex()}"


def seed_db():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Clear existing data to allow easy resetting
        print("Clearing existing data...")
        db.query(Notification).delete()
        db.query(Payment).delete()
        db.query(ProcurementRecord).delete()
        db.query(Booking).delete()
        db.query(Slot).delete()
        db.query(ProcurementCentre).delete()
        db.query(FarmerProfile).delete()
        db.query(User).delete()
        db.commit()

        print("Seeding Users...")
        # 1. Farmers
        farmers_data = [
            ("Rajesh Kumar", "9000000001", "Farmer@123", "REG1001", "Patna", "Danapur", "Khagaul", "Gola Road, Khagaul, Patna"),
            ("Amit Singh", "9000000002", "Farmer@123", "REG1002", "Patna", "Danapur", "Khagaul", "Nizampur, Khagaul, Patna"),
            ("Sanjay Yadav", "9000000003", "Farmer@123", "REG1003", "Nalanda", "Biharsharif", "Tungi", "Tungi Road, Biharsharif"),
            ("Harish Patel", "9000000004", "Farmer@123", "REG1004", "Patna", "Phulwari", "Phulwarisharif", "Block Chowk, Phulwari"),
            ("Ramesh Prasad", "9000000005", "Farmer@123", "REG1005", "Patna", "Phulwari", "Phulwarisharif", "Harnichak, Phulwari")
        ]
        
        farmers = []
        for name, phone, password, reg_id, dist, block, village, addr in farmers_data:
            user = User(
                name=name,
                phone=phone,
                password_hash=get_password_hash(password),
                role=UserRole.FARMER
            )
            db.add(user)
            db.flush() # get ID
            
            profile = FarmerProfile(
                user_id=user.id,
                farmer_registration_id=reg_id,
                state="Bihar",
                district=dist,
                block=block,
                village=village,
                address=addr,
                preferred_language="hi" if "Kumar" in name or "Yadav" in name else "en"
            )
            db.add(profile)
            farmers.append(user)

        # 2. Operators
        operators_data = [
            ("Vinay Sharma (Patna Operator)", "8000000001", "operator@demo.gov", "Operator@123"),
            ("Sunil Verma (Nalanda Operator)", "8000000002", "operator2@demo.gov", "Operator@123")
        ]
        operators = []
        for name, phone, email, password in operators_data:
            user = User(
                name=name,
                phone=phone,
                email=email,
                password_hash=get_password_hash(password),
                role=UserRole.CENTRE_OPERATOR
            )
            db.add(user)
            operators.append(user)

        # 3. Admin
        admin_user = User(
            name="Admin Chief Officer",
            phone="7000000001",
            email="admin@demo.gov",
            password_hash=get_password_hash("Admin@123"),
            role=UserRole.ADMIN
        )
        db.add(admin_user)
        db.commit()

        print("Seeding Procurement Centres...")
        centres_data = [
            ("Patna Central Mandi", "Patna", "Danapur", "Khagaul", 25.58, 85.04, 15, 8),
            ("Nalanda Krishi Mandi", "Nalanda", "Biharsharif", "Tungi", 25.19, 85.51, 10, 10),
            ("Phulwari Grains Sub-Mandi", "Patna", "Phulwari", "Phulwarisharif", 25.56, 85.08, 12, 9)
        ]
        centres = []
        for name, dist, block, village, lat, lon, capacity, avg_time in centres_data:
            centre = ProcurementCentre(
                name=name,
                district=dist,
                block=block,
                village=village,
                latitude=lat,
                longitude=lon,
                capacity_per_slot=capacity,
                avg_service_time_mins=avg_time,
                is_active=True
            )
            db.add(centre)
            centres.append(centre)
        db.commit()

        # Print IDs for verification
        print("Centres created:", [c.name for c in centres])

        print("Seeding Slots...")
        # Seed slots for past 3 days and today and tomorrow
        today = datetime.date.today()
        dates = [today - datetime.timedelta(days=i) for i in range(3, -1, -1)] + [today + datetime.timedelta(days=1)]
        
        standard_times = [
            ("08:00:00", "10:00:00"),
            ("10:00:00", "12:00:00"),
            ("12:00:00", "14:00:00"),
            ("14:00:00", "16:00:00"),
            ("16:00:00", "18:00:00")
        ]

        slots_map = {} # (centre_id, date) -> list of slots
        for centre in centres:
            for d in dates:
                slots_map[(centre.id, d)] = []
                for start_str, end_str in standard_times:
                    start_time = datetime.datetime.strptime(start_str, "%H:%M:%S").time()
                    end_time = datetime.datetime.strptime(end_str, "%H:%M:%S").time()
                    slot = Slot(
                        centre_id=centre.id,
                        date=d,
                        start_time=start_time,
                        end_time=end_time,
                        max_capacity=centre.capacity_per_slot,
                        booked_count=0
                    )
                    db.add(slot)
                    slots_map[(centre.id, d)].append(slot)
        db.commit()

        print("Seeding Bookings, Procurements & Payments...")
        # We need:
        # At least 15-20 bookings.
        # At least 8 completed procurements.
        # Payments: PAID, PROCESSING, PENDING.

        # Let's seed 8 Completed bookings in the past (yesterday & day before)
        # Let's assign these bookings to different farmers
        past_dates = [today - datetime.timedelta(days=2), today - datetime.timedelta(days=1)]
        crops = ["Paddy", "Wheat"]
        proc_count = 0

        # Booking counters for sequences
        booking_sequence = {} # (centre_id, date) -> count

        # A. Create Completed Bookings
        for i in range(8):
            farmer = farmers[i % len(farmers)]
            centre = centres[i % len(centres)]
            b_date = past_dates[i % len(past_dates)]
            
            # sequence number
            seq_key = (centre.id, b_date)
            seq = booking_sequence.get(seq_key, 0) + 1
            booking_sequence[seq_key] = seq
            token = f"A-{seq:03d}"

            # Get matching slot (e.g. morning slot 10:00-12:00)
            slots_list = slots_map[(centre.id, b_date)]
            slot = slots_list[1] # 10:00-12:00
            slot.booked_count += 1

            booking = Booking(
                farmer_id=farmer.id,
                centre_id=centre.id,
                slot_id=slot.id,
                booking_date=b_date,
                token_number=token,
                sequence_number=seq,
                crop_type=crops[i % len(crops)],
                estimated_quantity_quintal=40.0 + (i * 5.0),
                status=BookingStatus.COMPLETED,
                created_at=datetime.datetime.combine(b_date, datetime.time(9, 0))
            )
            db.add(booking)
            db.flush()

            # Record crop details
            qty = 38.5 + (i * 5.2)
            price = 2183.0 if booking.crop_type == "Paddy" else 2275.0 # MSP prices
            gross = qty * price
            deductions = 150.0 * i
            net = gross - deductions

            procurement = ProcurementRecord(
                booking_id=booking.id,
                operator_id=operators[i % len(operators)].id,
                crop_variety="Common" if i % 2 == 0 else "Grade A",
                quantity_quintal=qty,
                quality_grade="Grade A" if i % 2 == 1 else "Grade B",
                moisture_percentage=14.2 - (i * 0.2),
                price_per_quintal=price,
                gross_amount=gross,
                deductions=deductions,
                net_payable_amount=net,
                completed_at=datetime.datetime.combine(b_date, datetime.time(11, 30))
            )
            db.add(procurement)
            db.flush()

            # Payment
            if i < 4:
                pay_status = PaymentStatus.PAID
                tx_ref = f"PAY-{b_date.strftime('%Y%m%d')}-00{i}"
            elif i < 6:
                pay_status = PaymentStatus.PROCESSING
                tx_ref = None
            else:
                pay_status = PaymentStatus.PENDING
                tx_ref = None

            payment = Payment(
                procurement_id=procurement.id,
                amount=net,
                status=pay_status,
                transaction_reference=tx_ref,
                created_at=datetime.datetime.combine(b_date, datetime.time(11, 45))
            )
            db.add(payment)
            proc_count += 1

        # B. Create Active Bookings for Today (waiting, called, checked-in, etc.)
        # We need a realistic live queue scenario!
        # Centre 1 (Patna Central Mandi) today has:
        # - Token A-001 (Completed today)
        # - Token A-002 (In Procurement)
        # - Token A-003 (Called)
        # - Token A-004 (Checked-in) - Farmer 1 (Rajesh Kumar)
        # - Token A-005 (Checked-in) - Farmer 2 (Amit Singh)
        # - Token A-006 (Booked - not checked in) - Farmer 3 (Sanjay Yadav)
        
        c1 = centres[0]
        today_slots = slots_map[(c1.id, today)]

        # Booking 1: Completed
        s1 = today_slots[0] # 08:00 - 10:00
        s1.booked_count += 1
        b_completed = Booking(
            farmer_id=farmers[3].id, # Harish Patel
            centre_id=c1.id,
            slot_id=s1.id,
            booking_date=today,
            token_number="A-001",
            sequence_number=1,
            crop_type="Paddy",
            estimated_quantity_quintal=35.0,
            status=BookingStatus.COMPLETED
        )
        db.add(b_completed)
        db.flush()
        
        proc_completed = ProcurementRecord(
            booking_id=b_completed.id,
            operator_id=operators[0].id,
            crop_variety="Basmati",
            quantity_quintal=34.0,
            quality_grade="Grade A",
            moisture_percentage=13.5,
            price_per_quintal=2200.0,
            gross_amount=34.0 * 2200.0,
            deductions=0.0,
            net_payable_amount=34.0 * 2200.0
        )
        db.add(proc_completed)
        db.flush()
        
        pay_completed = Payment(
            procurement_id=proc_completed.id,
            amount=34.0 * 2200.0,
            status=PaymentStatus.PAID,
            transaction_reference="PAY-TODAY-001"
        )
        db.add(pay_completed)

        # Booking 2: In Procurement
        s2 = today_slots[1] # 10:00 - 12:00
        s2.booked_count += 1
        b_proc = Booking(
            farmer_id=farmers[4].id, # Ramesh Prasad
            centre_id=c1.id,
            slot_id=s2.id,
            booking_date=today,
            token_number="A-002",
            sequence_number=2,
            crop_type="Wheat",
            estimated_quantity_quintal=50.0,
            status=BookingStatus.IN_PROCUREMENT
        )
        db.add(b_proc)

        # Booking 3: Called
        s2.booked_count += 1
        b_called = Booking(
            farmer_id=farmers[2].id, # Sanjay Yadav
            centre_id=c1.id,
            slot_id=s2.id,
            booking_date=today,
            token_number="A-003",
            sequence_number=3,
            crop_type="Paddy",
            estimated_quantity_quintal=28.5,
            status=BookingStatus.CALLED
        )
        db.add(b_called)

        # Booking 4: Checked-In (Farmer 1)
        s3 = today_slots[2] # 12:00 - 14:00
        s3.booked_count += 1
        b_checked1 = Booking(
            farmer_id=farmers[0].id, # Rajesh Kumar (Phone: 9000000001)
            centre_id=c1.id,
            slot_id=s3.id,
            booking_date=today,
            token_number="A-004",
            sequence_number=4,
            crop_type="Paddy",
            estimated_quantity_quintal=30.0,
            status=BookingStatus.CHECKED_IN
        )
        db.add(b_checked1)

        # Booking 5: Checked-In (Farmer 2)
        s3.booked_count += 1
        b_checked2 = Booking(
            farmer_id=farmers[1].id, # Amit Singh (Phone: 9000000002)
            centre_id=c1.id,
            slot_id=s3.id,
            booking_date=today,
            token_number="A-005",
            sequence_number=5,
            crop_type="Wheat",
            estimated_quantity_quintal=60.0,
            status=BookingStatus.CHECKED_IN
        )
        db.add(b_checked2)

        # Booking 6: Booked but not checked-in (Farmer 3 is busy elsewhere but let's book him here too on Centre 2 just to show multiple centres)
        c2 = centres[1]
        c2_today_slots = slots_map[(c2.id, today)]
        c2_s1 = c2_today_slots[1] # 10:00 - 12:00
        c2_s1.booked_count += 1
        b_booked_c2 = Booking(
            farmer_id=farmers[2].id, # Sanjay Yadav
            centre_id=c2.id,
            slot_id=c2_s1.id,
            booking_date=today,
            token_number="A-001",
            sequence_number=1,
            crop_type="Paddy",
            estimated_quantity_quintal=45.0,
            status=BookingStatus.BOOKED
        )
        db.add(b_booked_c2)

        # Add a couple of tomorrow bookings
        tomorrow = today + datetime.timedelta(days=1)
        c1_tomorrow_slots = slots_map[(c1.id, tomorrow)]
        c1_ts1 = c1_tomorrow_slots[0]
        c1_ts1.booked_count += 1
        b_tomorrow = Booking(
            farmer_id=farmers[0].id, # Rajesh Kumar
            centre_id=c1.id,
            slot_id=c1_ts1.id,
            booking_date=tomorrow,
            token_number="A-001",
            sequence_number=1,
            crop_type="Paddy",
            estimated_quantity_quintal=30.0,
            status=BookingStatus.BOOKED
        )
        db.add(b_tomorrow)

        db.commit()
        print("Database successfully seeded with realistic test data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
