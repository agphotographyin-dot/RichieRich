# Enterprise Multi-Outlet POS & Central Warehouse Management System
## Operational Handbook, Troubleshooting Manual & Web Deployment Guide

---

## 1. System Overview & Architecture

This application is an all-in-one Enterprise Retail & Supply Chain Operating System designed for multi-store chains, retail outlets, and centralized warehousing networks.

### Core Portals & Role Breakdown
| Portal | Route URL | Primary Users | Key Functions |
| :--- | :--- | :--- | :--- |
| **Super Admin (Head Office)** | `/admin` | C-Suite, GM, Operations Directors | Master catalog, global analytics, multi-store financials, counter setups, loyalty programs, backups, GST tax rules. |
| **Central Warehouse Hub** | `/warehouse` | Logistics Leads, Inventory Controllers | Supplier Purchase Orders (PO), multi-hub stock management, picking, packing, stock transfers, barcode generator. |
| **Store Admin Portal** | `/store-admin` | Store Managers, Outlet Supervisors | Store profit & loss, petty cash expenses, cashier shift metrics, stock inventory allocations, warehouse stock indents. |
| **POS Terminal** | `/pos` | Cashiers, Billing Staff | Ultra-fast barcode billing, split payments (Cash, UPI, Card), thermal receipts (2-inch / 3-inch / A4), park/resume carts. |
| **Customer Order Tracker** | `/orders` or `/customer` | End Customers | Live order tracking, digital invoice retrieval, feedback rating, store pickup notifications. |

---

## 2. Comprehensive Operational Handbook

### A. Point of Sale (POS) Terminal (`/pos`)
1. **Selecting Counter & Store**:
   - On initial load, select your operating store (e.g. *Bopal Main Outlet*) and register your counter station (e.g., *Counter 1*).
2. **Adding Items to Cart**:
   - **Barcode / SKU Scanning**: Click the **Scan Barcode** button to activate the camera scanner, or use any standard USB/Bluetooth handheld barcode scanner (auto-focus is maintained on the search bar).
   - **Visual Touch Grid**: Filter products by category tab (Paan, Cafe, Essentials, Beverages) or search by keyword.
3. **Cart Operations**:
   - Adjust quantities with `+` / `-` steppers or tap the item to change quantities directly.
   - Apply line-item discounts or order-level coupon codes.
   - **Park Order**: Click **Hold / Park** to save a cart for a customer stepping away. Resume it anytime from the **Held Orders** list.
4. **Checkout & Billing**:
   - Tap **Pay / Charge (F4)**.
   - Choose payment mode: **Cash** (with automated change calculator), **UPI QR Code** (auto-generates dynamic UPI payment string), **Card / Split Payment**.
   - Select receipt format: **Thermal 58mm (2-inch)**, **Thermal 80mm (3-inch)**, or **A4 Tax Invoice**.
   - Tap **Complete Sale & Print**.

---

### B. Store Admin Portal (`/store-admin`)
1. **Financial Overview**:
   - View Today's Net Revenue, Cash in Register, UPI Collections, Operating Expenses, and Net Profit.
   - Download the **Official Store Daily Statement (PDF)** for day-end reconciliation.
2. **Petty Cash & Store Expenses**:
   - Log local expenses (Milk/dairy supplies, cleaning materials, staff lunch, electricity maintenance).
   - Tag expense payment mode (Cash from drawer vs. UPI Bank transfer) with receipt voucher numbers.
3. **Cashier Counters & Staff Monitoring**:
   - Monitor real-time sales and transaction volume broken down by active counter station.
   - Audit drawer opening floats and closing cash balances.
4. **Store Stock Inventory**:
   - Search across all store SKUs with instant status cards: Total SKUs, Low Stock, Out of Stock, Healthy.
   - Click column headers to sort by lowest stock first to spot urgent replenishment needs.
   - Export store inventory to CSV for physical stock-taking.
5. **Warehouse Stock Indents (Ordering Stock from Hubs)**:
   - Click **Order Stock from Warehouse** or the **Indent** button next to any low-stock SKU.
   - Use the **Auto-Add Low Stock Items** shortcut to instantly draft orders for all items below threshold.
   - Choose urgency level: *Routine Replenishment*, *Urgent Low Stock*, or *Emergency Surge*.
   - Track status in real time: `Pending Approval` $\rightarrow$ `Approved` $\rightarrow$ `Dispatched in Transit` $\rightarrow$ `Completed`.
   - Print official **Stock Requisition Manifest Vouchers** for delivery drivers.

---

### C. Central Warehouse Hub (`/warehouse`)
1. **Central Inventory Matrix**:
   - Oversee master warehouse stock across physical storage bays (e.g. Rack A-12, Bin 04).
   - Update master unit costs, batches, expiry dates, and supplier lead times.
2. **Store Indent Approvals & Fulfillment**:
   - Open **Store Stock Indents** to review requisitions submitted by store managers.
   - Review requested quantities against warehouse stock availability.
   - Click **Approve & Dispatch** to auto-generate a Trackable Warehouse Transfer.
3. **Outgoing Stock Transfers**:
   - Assign delivery vehicles (e.g., *Van GJ-01-AB-1234*) and delivery driver details.
   - Generate Delivery Challans and Gate Passes.
4. **Supplier Purchase Orders (PO)**:
   - Generate supplier POs for bulk procurement from FMCG vendors.
   - Record Goods Receipt Notes (GRN) upon physical truck arrival at receiving bays.
5. **Barcode & Label Generator**:
   - Print Code-128 and QR Code sticker sheets formatted for standard label printers (e.g., Zebra, TSC).

---

### D. Super Admin Control Center (`/admin`)
1. **Catalog Management**:
   - Create, edit, and categorize products. Configure GST tax slabs (0%, 5%, 12%, 18%).
2. **Multi-Store Management**:
   - Add new retail branches, configure geographical coordinates, assign default counter stations.
3. **Loyalty, Promos & Gift Cards**:
   - Configure loyalty points earning rates (e.g., 1 point per ₹100 spent) and redemption values.
   - Create promo coupon codes with start/end validity dates and minimum order limits.
4. **Data Backups & System Reset**:
   - Export full system state (JSON snapshot) to local disk.
   - Import previous backups or reset with clean demo retail data.

---

## 3. Future Roadmap & Extensibility

1. **Native Cloud Database Sync**:
   - Seamless plug-and-play adapter to transition from browser local storage to **Google Cloud Firestore / Cloud SQL** for multi-device live sync.
2. **WhatsApp & SMS Billing Integration**:
   - Send paperless digital receipt links directly to customer mobile numbers via Twilio or Gupshup WhatsApp API.
3. **Weight Scale Interface**:
   - WebSerial / WebUSB protocol integration to read live grams directly from digital weighing scales at paan and confectionery counters.
4. **Automated Replenishment Forecasting**:
   - Machine learning algorithms calculating stock run-out dates based on 7-day rolling sales velocity.

---

## 4. Troubleshooting & FAQ Guide

### Q1: The POS or Store Inventory feels slow or unresponsive.
* **Solution**: 
  - The Store Stock Inventory table includes a built-in page-size selector (25, 50, 100, 200). Lower the view to 25 or 50 items per page for ultra-smooth scrolling on low-spec counter tablets.
  - Clear browser cache if thousands of historical simulation orders have accumulated, or create a fresh backup via Super Admin $\rightarrow$ *Backups & Security*.

### Q2: How do I print thermal receipts without browser print dialog headers/footers?
* **Solution**:
  - In Google Chrome's print dialog, click **More Settings**.
  - Set **Margins** to **None** or **Minimum**.
  - **Uncheck** "Headers and footers".
  - Set Paper Size to **58mm** (2-inch roll) or **80mm** (3-inch roll).

### Q3: Camera barcode scanner says "Permission Denied" or does not open.
* **Solution**:
  - Ensure the application is served over **HTTPS** (or `http://localhost`). Browsers strictly block camera hardware APIs on insecure HTTP connections.
  - Check browser permissions (click the padlock icon next to the URL bar and toggle *Camera* to *Allow*).
  - You can also plug in any standard handheld 1D/2D USB barcode gun; it works automatically as keyboard input without requiring camera permissions.

### Q4: Direct links to `/store-admin` or `/pos` give a 404 error when refreshing on external web hosting.
* **Solution**:
  - This is standard Single Page Application (SPA) routing behavior. Web servers must redirect all incoming routes to `index.html`.
  - For **Nginx**: Add `try_files $uri $uri/ /index.html;` in your `nginx.conf`.
  - For **Vercel**: Add `vercel.json` with rewrite rules (provided below in the deployment guide).
  - For **Netlify**: Add a `_redirects` file containing `/*  /index.html  200`.

---

## 5. Production Web Deployment Guide

### Option 1: One-Click Cloud Run / Docker (Recommended)

1. **Create a `Dockerfile`** in the project root:
```dockerfile
# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production server stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. **Create `nginx.conf`** in the project root:
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

3. **Deploy to Google Cloud Run**:
```bash
# Build container image with Google Cloud Build
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/pos-app

# Deploy to Cloud Run with HTTPS and auto-scaling
gcloud run deploy pos-app \
  --image gcr.io/YOUR_PROJECT_ID/pos-app \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 80
```

---

### Option 2: Deploying to Vercel

1. Create a `vercel.json` file in the root folder:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
2. Run via Vercel CLI or GitHub repository push:
```bash
npm install -g vercel
vercel --prod
```

---

### Option 3: Deploying to Netlify

1. Create a file `public/_redirects`:
```text
/*    /index.html   200
```
2. Deploy via Netlify CLI:
```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

---

### Option 4: Self-Hosted Ubuntu Linux VPS (Nginx + Let's Encrypt SSL)

1. **Install Node.js & Nginx**:
```bash
sudo apt update && sudo apt install -y nginx git nodejs npm certbot python3-certbot-nginx
```

2. **Clone & Build the App**:
```bash
cd /var/www
sudo git clone <YOUR_GIT_REPO_URL> pos-app
cd pos-app
sudo npm install
sudo npm run build
```

3. **Configure Nginx**:
```bash
sudo nano /etc/nginx/sites-available/pos.yourdomain.com
```
Paste this configuration:
```nginx
server {
    listen 80;
    server_name pos.yourdomain.com;

    root /var/www/pos-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

4. **Enable Site & Activate SSL**:
```bash
sudo ln -s /etc/nginx/sites-available/pos.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Install free Let's Encrypt HTTPS Certificate
sudo certbot --nginx -d pos.yourdomain.com
```

Your enterprise POS & Warehouse management system is now live, secured with HTTPS, and accessible from any desktop, tablet, or smartphone.
