# BizLedger — Installation & Setup Guide

## 📱 HOW TO INSTALL ON ANY DEVICE

BizLedger is a **Progressive Web App (PWA)** — it installs like a native app on phones, tablets, and computers, works fully offline, and stores all data locally on the device.

---

## 🖥️ Desktop (Windows / Mac / Linux)

**Using Google Chrome or Microsoft Edge:**
1. Open the `index.html` file in Chrome or Edge
   - Or host it on a local server (see below)
2. Look for the **install icon** (⊕) in the browser address bar
3. Click **"Install BizLedger"**
4. The app opens as a standalone desktop app with its own icon

**Via local server (recommended for full PWA features):**
```bash
# Option 1: Python (built-in)
cd bizledger-app
python3 -m http.server 8080
# Then open: http://localhost:8080

# Option 2: Node.js
npx serve .
```

---

## 📱 Android Phone/Tablet

1. Open Chrome on Android
2. Navigate to the app URL (e.g., `http://localhost:8080` or hosted URL)
3. Tap the **three-dot menu** (⋮) → **"Add to Home Screen"** or **"Install App"**
4. Tap **Install**
5. BizLedger appears on your home screen like a native app

---

## 🍎 iPhone / iPad (iOS)

1. Open **Safari** (must be Safari, not Chrome)
2. Navigate to the app URL
3. Tap the **Share button** (box with arrow pointing up)
4. Scroll down and tap **"Add to Home Screen"**
5. Tap **"Add"**
6. BizLedger icon appears on your home screen

---

## 🔐 FIRST-TIME SETUP (For App Sellers / Deployers)

When the app opens for the **first time**, it will ask you to:

1. **Enter the business name** (your client's business name)
2. **Set an Admin Password** — This is YOUR master password. Keep it safe.
   - Your client will NOT know this password
   - Required to: change PIN, export data, factory reset
   - Minimum 6 characters — make it strong!
3. **Set a PIN** — 4-6 digit number your client uses daily to open the app
   - Share this PIN with your client
   - They use this every day to open the app

> ⚠️ **IMPORTANT**: Set a different Admin Password for each client installation. This prevents clients from resetting/reinstalling on another device.

---

## 📋 FEATURES

| Feature | Description |
|---------|-------------|
| 💰 Income Tracking | Record all income with categories and dates |
| 💸 Expense Tracking | Track all business expenses by category |
| 🧾 Invoicing | Create professional invoices with line items, tax, discount |
| 📦 Inventory | Track stock levels, get low-stock alerts, record sales |
| 📈 Reports | Profit & Loss, Income, Expense, Inventory reports |
| 🔒 PIN Lock | Daily PIN protection for quick secure access |
| ⬇️ PDF Download | Download reports & invoices as PDF (requires internet) |
| 📤 Share Invoices | Share invoice details via phone/email |
| 🔔 Low Stock Alerts | Notifications when products fall below threshold |
| ✅ Works Offline | 100% offline — no internet needed for daily use |

---

## 🌐 PDF DOWNLOADS

PDF generation uses the device's **print-to-PDF** feature:
- Requires internet connection to open the print dialog
- Works in Chrome, Edge, Firefox, Safari
- Client will see a "Connect to internet" message if offline

---

## 💾 DATA & SECURITY

- All data stored locally on the device (localStorage)
- No data sent to any server
- Use **Settings → Export Data** to backup as JSON file
- Admin password required for factory reset

---

## 📞 SUPPORT

For technical setup help, contact your BizLedger provider.
