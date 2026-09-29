# Richie Rich Pan House - Enterprise Multi-Store & POS System

Complete 24x7 multi-store enterprise management system for **Richie Rich Pan House** featuring:
* **Central Warehouse & Supply Chain:** Purchase orders, supplier matching, GRN inward bills, inter-store stock transfers, store indents, FIFO batch tracking.
* **Master Admin Controls:** Outlet finance, revenue analytics, staff counter PIN management, backup snapshots.
* **Store Admin Portals:** Bopal, Gota, Sindhu Bhavan Road (SBR), and SG Highway branch accounts & daily registers.
* **POS Billing Terminals:** High-speed barcode scanning, receipt generation, split cash/UPI payments.
* **Customer Loyalty Portal:** Order tracking, luxury paan menu, loyalty tier rewards.
* **PocketBase Real-Time Backend:** Live Server-Sent Events (SSE) synchronization between all POS counters, warehouse, and master admin.

---

## 🚀 One-Command Docker Deployment (VPS / Production)

Deploy both the **Frontend Web App** and the **PocketBase Database** on any Ubuntu/Debian VPS in one step:

```bash
docker compose up -d --build
```

### Services Started:
* **Richie Rich Web App:** `http://localhost` (or `http://YOUR_VPS_IP`)
* **PocketBase Admin & API:** `http://localhost:8090/_/` (or `http://YOUR_VPS_IP:8090/_/`)

---

## 🛠️ Configuration (.env)

Customize environment variables if needed in `.env`:

```env
APP_URL="http://187.126.115.40"
VITE_POCKETBASE_URL="http://187.126.115.40:8090"
```

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run comprehensive test suite
npm run test

# Build production bundle
npm run build
```
