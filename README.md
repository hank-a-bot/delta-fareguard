# ✈️ Delta FareGuard

**Automated Daily Delta Flight Fare Tracker & Guided Auto-Rebook Tool**

Delta FareGuard automatically monitors your Delta Air Lines flight reservations every morning at **9:00 AM**. If a lower fare is detected for your exact flight or fare tier (Main Cabin, Comfort+, First Class), it notifies you and initiates an automated rebooking flow to claim your fare difference as a **Delta eCredit**!

---

## 🌟 Key Features

- ⏰ **Automated Daily 9 AM Schedule**: Built-in cron scheduler runs every morning at 9:00 AM local time (customizable via Settings).
- 📉 **Delta Price Monitoring**: Scrapes current flight prices via stealth Playwright browser automation or optional SerpAPI (Google Flights API).
- 🔄 **Guided Auto-Rebooking**: Playwright stealth automation navigates Delta's *Find My Trip* portal (`/mytrips/findTrip`), pre-fills your Confirmation Code (PNR) and Last Name, selects the cheaper fare option, and guides you to claim your eCredit refund.
- 💵 **Main Cabin Fare Refunds**: Works for standard Main Cabin tickets (which carry no change fees on North American flights).
- 📊 **Glassmorphic Web Dashboard**: Sleek React UI displaying tracked reservations, potential savings, instant manual re-checks, and execution logs.
- 📬 **Instant Notifications**: Optional email (SMTP/SendGrid) or Telegram bot notifications whenever a price drop is found.
- 🤝 **Easy Hand-Off & Sharing**: Package setup with 1-click launcher (`./setup.sh`) or Docker container so friends & family can easily run their own private instance.

---

## 🚀 Quickstart Guide

### 1. Local Setup
```bash
# Clone or copy the folder
cd delta-fareguard

# Run 1-click setup script
./setup.sh

# Start the application
npm start
```

Open your browser to: **`http://localhost:3001`**

### 2. Adding a Delta Flight
1. Click **+ Track New Flight**.
2. Enter your 6-character Delta **Confirmation Code (PNR)** (e.g. `H7X9KL`).
3. Enter Passenger **Last Name**.
4. Enter **Flight Number** (e.g. `DL 1452`), **Origin** (e.g. `JFK`), **Destination** (e.g. `LAX`), **Departure Date**, and **Price Paid ($)**.
5. Ensure **Enable Automatic Rebooking on Fare Drop** is checked.
6. Click **Start Tracking Flight**.

---

## ⚙️ Customizing the Daily 9 AM Schedule

By default, Delta FareGuard runs automatically every day at **9:00 AM** (`0 9 * * *`).

To adjust the schedule or notification options:
1. Click **Settings** in the top right header of the web dashboard.
2. Modify the **Cron Schedule** (standard 5-field cron syntax).
3. Optional: Add a **SerpAPI Key** if you prefer Google Flights API pricing over direct browser scraping.
4. Optional: Toggle **Email Alerts** or add a **Telegram Bot Token**.
5. Click **Save Settings**.

---

## 🔒 Sharing & Hand-Off Instructions

To hand Delta FareGuard off to friends, family, or colleagues:
1. Zip/Share the `delta-fareguard` project directory or share the Git repo.
2. Instruct them to run `./setup.sh` and `npm start`.
3. Alternatively, for technical users or home server setup, provide the included `Dockerfile`:
   ```bash
   docker build -t delta-fareguard .
   docker run -d -p 3001:3001 --name delta-fareguard delta-fareguard
   ```

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Node.js, Express, SQLite (`sqlite3`), `node-cron`, `nodemailer`, `axios`.
- **Browser Automation**: `playwright-extra` with `puppeteer-extra-plugin-stealth`.
- **Frontend**: React, Vite, Lucide Icons, Glassmorphism Vanilla CSS design system.
