# Step-by-Step Live Demonstration Guide — SIH26032

To demonstrate the Smart Farmer Procurement Queue & Tracking Platform live to judges:

## Preparation

1. Start both the backend and frontend services.
2. Open the application in two separate browser sessions (e.g., Chrome normal tab and Chrome Incognito window, or Chrome and Edge).
3. Access the portal at `http://localhost:3000`.

---

## Live Queue & Call Next Scenario

### Step 1: Login as Demo Farmer (Browser 1)
1. In the first browser, open `http://localhost:3000` (Farmer client).
2. Click **"Reset & Seed Database"** in the floating **Demo Control Panel** at the bottom right. This resets the database cleanly.
3. Click **"Farmer 1: Rajesh Kumar"** in the control panel. This logs you in instantly as Rajesh Kumar.
4. On your dashboard, observe:
   - Your Active Booking for **Patna Central Mandi** today.
   - Your token number is **A-004**.
   - Your queue position is **3** (since Token A-002 is being processed, A-003 is called, and you are Checked-in).
   - Your estimated wait time is **24 minutes** (calculated dynamically as `position 3 * 8 mins service time`).

### Step 2: Login as Operator (Browser 2)
1. In the second browser window, open `http://localhost:3000/login?staff=true` (Official client).
2. Click **"Centre Operator: Vinay"** in the Demo Control Panel to log in instantly.
3. Ensure **Patna Central Mandi** is selected in the centre dropdown at the top.
4. On the dashboard:
5. Observe **"Currently Called (At Counter)"** shows Token **A-003** (called state).
6. Observe **"Active Queue Line"** table shows **Token A-004** (Farmer 1: Rajesh Kumar) at Sequence #1.

### Step 3: Trigger "Call Next" in Operator Console
1. In Browser 2 (Operator), click the large blue **"CALL NEXT FARMER IN QUEUE"** button.
2. What happens immediately:
   - Token **A-003** (which was called but didn't start) is marked as **MISSED**.
   - The next waiting Checked-in farmer (**Token A-004**, Rajesh Kumar) is called.
   - The UI refreshes and shows **Currently Called: Token A-004**.
3. Now, look at **Browser 1 (Farmer Rajesh Kumar)**:
   - Without manual refresh, the dashboard instantly updates!
   - A pulsing warning banner appears: **"Your token is being called! Please proceed to the weighing scale immediately."**
   - The queue position widget updates: Position is now **Called / Serving Now**.
   - The in-app alerts box shows a new notification: *"Token A-004 has been called. Please proceed to the procurement counter."*
   - The **Mock SMS Simulator Log** console shows the GSM output sent to Rajesh's phone: `[SMS to 9000000001]: Your Token is Called - Token A-004 has been called. Please proceed to the procurement counter.`

### Step 4: Weighing & Grading Crop Details
1. In Browser 2 (Operator), click **"Start Weighing"** on the Called Token A-004.
2. The weighing slip form opens.
3. Input crop details:
   - Variety Name: `Basmati Rice`
   - Weighed Quantity (Quintals): `52.5`
   - Quality Grade: `Grade A`
   - Moisture %: `13.5`
   - Unit price: `2200`
   - Deductions (₹): `150`
4. Observe the real-time calculations:
   - Gross Amount: `52.5 * 2200 = ₹115,500`
   - Net Payable: `₹115,500 - 150 = ₹115,350`
5. Click **"SUBMIT WEIGHING SLIP & START PAYMENT SETTLEMENT"**.
6. The token is cleared from the queue, and the transaction is generated.

### Step 5: Check Payment Settlement (Farmer & Admin)
1. In Browser 1 (Farmer Rajesh Kumar), look at the **"Procurement & Payment History"** table at the bottom:
   - A new record appears: Date = today, Weighed Qty = `52.5 qtl`, Net Amount = `₹115,350`, Procurement status = `COMPLETED`, Payment Status = `PENDING`.
2. Now, let's process the payout. Click **"Chief Admin Officer"** in the Demo Control Panel to switch roles.
3. Go to the **Admin Dashboard** (`/admin`).
4. Scroll to the **"Mandi Payout Settlement Console"** table.
5. Find the payout record for `₹115,350` (status: `PENDING`).
6. Click **"Send to Bank"** -> Status changes to `PROCESSING`.
7. Click **"Mark Paid"** -> Status changes to `PAID`, and a mock transaction reference (e.g. `PAY-20260827-C8F1E2`) is generated.
8. Switch session back to **Farmer 1: Rajesh Kumar** in the Demo Control Panel, and verify the payment status shows `PAID` with the bank transaction reference number!
