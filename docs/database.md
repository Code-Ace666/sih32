# Database Design — SIH26032

The application models its relational schema with correct constraints, primary keys, foreign keys, and indexes using SQLAlchemy.

## Relational Schema Diagram

```
 +-----------------+          +--------------------+
 |     User        | <------+ |   FarmerProfile    |
 | (FARMER/STAFF)  |          | (District/Block)   |
 +--------+--------+          +--------------------+
          |
          | 1-to-Many
          v
 +--------+--------+          +--------------------+
 |    Booking      | <------+ |        Slot        |
 | (Token/Sequence)|          | (Date/Time Window) |
 +--------+--------+          +---------+----------+
          |                             | 1-to-Many
          | 1-to-One                    v
          v                   +---------+----------+
 +--------+--------+          | ProcurementCentre  |
 |  Procurement    |          | (Capacity/Service) |
 | (Crop Weights)  |          +--------------------+
 +--------+--------+
          |
          | 1-to-One
          v
 +--------+--------+
 |    Payment      |
 | (PENDING/PAID)  |
 +-----------------+
```

## Entity Descriptions

1. **User**: Represents all actors. Role differentiates between `FARMER`, `CENTRE_OPERATOR`, and `ADMIN`.
2. **FarmerProfile**: Contains regional location parameters (state, district, block, village), preferred language, and land-registration ID linking to the farmer `User`.
3. **ProcurementCentre**: Physical Mandi centre configurations including location coordinates, slot capacity, and typical average service time.
4. **Slot**: Daily operational hours chunked into 2-hour intervals, recording capacity bookings to prevent overbooking.
5. **Booking**: Stores appointments. Fields include `token_number` (A-001, A-002...) and `sequence_number` (incremental per centre-day for queue ordering).
6. **ProcurementRecord**: Holds actual weighing slips (crop variety, weighed amount, quality grade, moisture %, gross price, deductions, and net payable amount).
7. **Payment**: Tracks payout workflows (`PENDING` -> `PROCESSING` -> `PAID`), generating bank transaction references on settlement.
8. **Notification**: Inbox for alerts. Includes columns for both English (`title`, `message`) and Hindi (`title_hi`, `message_hi`) translations.
9. **AuditLog**: Implements system trails. Records administrative/operator actions with timestamps and description payloads.
