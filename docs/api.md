# API Documentation — SIH26032

The Smart Farmer Procurement Queue & Tracking Platform exposes a comprehensive REST and WebSocket API. The swagger documentation is auto-generated and can be inspected live at `http://localhost:8000/docs` when running the backend.

## API Endpoints

### 1. Authentication
* `POST /api/auth/register`: Register a new farmer.
* `POST /api/auth/register-staff`: Register operator or admin staff.
* `POST /api/auth/login`: Authenticate phone/email and password, returns JWT token.
* `GET /api/auth/me`: Get profile context of logged-in user.

### 2. Mandi Centres & Slots
* `GET /api/centres`: Search active procurement centres (can filter by `district` and `block`).
* `GET /api/centres/{id}/slots`: Retrieve daily available booking slots and booked capacity count. Generates slots dynamically if queried for a new date.

### 3. Bookings
* `POST /api/bookings`: Create slot bookings (performs double-booking check and slot capacity limits verification).
* `GET /api/bookings/my`: Retrieve past/active bookings of the logged-in farmer.
* `GET /api/bookings/{id}`: Detailed booking token information.
* `DELETE /api/bookings/{id}`: Cancel booking.
* `POST /api/bookings/{id}/check-in`: Trigger farmer physical arrival check-in.

### 4. Queue Status
* `GET /api/bookings/live/{booking_id}`: Calculates dynamic queue position, serving token, and estimated wait minutes.
* `WS /api/ws/queue/{centre_id}`: WebSocket connection room for receiving real-time queue position updates.

### 5. Operator Workflow
* `GET /api/operator/dashboard-stats?centre_id={id}`: Operational dashboard figures (waiting, processing, completed counts).
* `GET /api/operator/bookings`: List bookings at a centre.
* `POST /api/operator/queue/call-next?centre_id={id}`: Call next farmer in queue (sets currently called token to missed, called next check-in farmer, broadcasts WS packet).
* `POST /api/operator/bookings/{id}/check-in`: Operator check-in for farmers.
* `POST /api/operator/bookings/{id}/start`: Start weighing and quality testing.
* `POST /api/operator/bookings/{id}/complete`: Log grain crop variety, weight, moisture %, grade, price, deductions, creates transaction slip and payment sheet.
* `POST /api/operator/bookings/{id}/miss`: Mark farmer as missed.

### 6. Admin Panel
* `GET /api/admin/dashboard`: Global operations aggregate stats.
* `GET /api/admin/analytics`: Bar/Pie analytics data (volumes, crop share, centre utilization, audit log history).
* `POST /api/admin/reseed`: Reseeds database back to default seed state.

### 7. Payments
* `GET /api/payments`: List of payments (filtered by farmer for farmers, all for staff).
* `POST /api/payments/{id}/process`: Process bank transaction.
* `POST /api/payments/{id}/settle`: Mark payout settled and set transaction reference.
