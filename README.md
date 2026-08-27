# Smart Farmer Procurement Queue & Tracking Platform (SIH26032)

Developed for the **Ministry of Consumer Affairs, Food & Public Distribution** • **Department of Consumer Affairs (DoCA)**.

---

## 🌾 Problem Statement

Farmers often face long waiting times, lack of information regarding procurement schedules, and uncertainty about procurement status at crop collection centers (Mandis). This leads to:
* High physical gate congestion and long tractor queues.
* Financial uncertainty due to non-transparent weighing and delayed bank payments.
* Lack of real-time communication about token queues and slots.

### Expected Solution
Develop a digital platform that enables:
1. **Farmer Registration & Profile Setup**.
2. **Mandi Discovery & Smart Slot Booking**.
3. **Real-time Deterministic Queue Management**.
4. **Live Token Position Tracking & Waiting-time Predictions**.
5. **Interactive Operator Counter Logging (Weighing Sheets)**.
6. **Transparent Payment Settlement & Bank Transaction Tracking**.
7. **Multilingual (English/Hindi) Mobile-Responsive Interface**.

---

## 🚀 Key Features

* **Real-Time Queue Sync (WebSockets)**: Immediate sync between Operator actions ("Call Next", "Start Weighing", "Complete") and the Farmer's dashboard. Includes a 5-second polling fallback if WebSockets fail.
* **Smart Slot Recommendation**: Automatically highlights the least congested time slot for a selected date.
* **Mandi Gate Congestion Level**: Dynamically displays Mandi congestion status (LOW, MODERATE, HIGH) based on current wait times.
* **Mock SMS Simulator Gateway**: Generates in-app alerts and displays simulated SMS messages on the dashboard.
* **Bank Payout Console**: Admins can approve payout stages (`PENDING` -> `PROCESSING` -> `PAID`) with auto-generated transaction references.
* **Floating Demo Control Panel**: Allows instant role switching (Farmer, Operator, Admin) and database re-seeding for presentation purposes.

---

## 🛠 Tech Stack

* **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide icons, Recharts Analytics.
* **Backend**: Python 3.12, FastAPI, SQLAlchemy, SQLite (default fallback) / PostgreSQL.
* **Real-time**: WebSockets.
* **Dependencies**: NIST-compliant pure Python PBKDF2 SHA-256 password hashing, PyJWT tokens.

---

## 📦 Directory Structure

```text
farmer-procurement-platform/
│
├── frontend/                  # Next.js frontend code
│   ├── app/                   # App Router pages and layout
│   ├── components/            # Shared UI components (Demo Panel)
│   ├── lib/                   # API client and Translation context
│   └── package.json
│
├── backend/                   # FastAPI backend code
│   ├── app/                   # API routes, Models, Schemas
│   ├── tests/                 # Pytest test suite
│   ├── requirements.txt
│   └── seed.py                # Database seeding script
│
├── docs/                      # Architecture, DB and Demo guides
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   └── demo.md
│
├── docker-compose.yml         # Container orchestration
├── .env.example               # Environment template
└── README.md
```

---

## 🔑 Demo Accounts

| Role | Username/Mobile | Password | Description |
| :--- | :--- | :--- | :--- |
| **FARMER 1** | `9000000001` | `Farmer@123` | Rajesh Kumar (Bihar, Patna) |
| **FARMER 2** | `9000000002` | `Farmer@123` | Amit Singh (Bihar, Patna) |
| **OPERATOR** | `operator@demo.gov` | `Operator@123` | Vinay Sharma (Mandi Operator) |
| **ADMIN** | `admin@demo.gov` | `Admin@123` | Chief System Administrator |

---

## ⚙️ Running Locally

### 1. Backend Setup (FastAPI)
1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed the database (creates tables, seeds 5 farmers, 3 Mandis, 15 bookings, and completed records):
   ```bash
   python seed.py
   ```
5. Start the backend:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Swagger docs will be active at: `http://localhost:8000/docs`*

### 2. Frontend Setup (Next.js)
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Access the web application at: `http://localhost:3000`

---

## 🐳 Running with Docker Compose

Start the entire stack (PostgreSQL database, FastAPI backend, Next.js frontend) with a single command:

```bash
docker compose up --build
```

Access the frontend at `http://localhost:3000` and the backend documentation at `http://localhost:8000/docs`.

---

## 🧪 Running Tests

Ensure all API and workflow validation tests pass:

```bash
cd backend
python -m pytest
```

---

## 📖 Additional Documentation

Refer to the `docs/` folder for comprehensive documentation:
1. **[Architecture Design](file:///C:/Users/asaks/.gemini/antigravity/scratch/farmer-procurement-platform/docs/architecture.md)**: System design and components.
2. **[Database Design](file:///C:/Users/asaks/.gemini/antigravity/scratch/farmer-procurement-platform/docs/database.md)**: Relational schema details.
3. **[API Specs](file:///C:/Users/asaks/.gemini/antigravity/scratch/farmer-procurement-platform/docs/api.md)**: Endpoint inputs and outputs.
4. **[Live Demo Guide](file:///C:/Users/asaks/.gemini/antigravity/scratch/farmer-procurement-platform/docs/demo.md)**: Step-by-step instructions for live presentation.
