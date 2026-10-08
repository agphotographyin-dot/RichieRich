// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = parseInt(process.env.PORT || "3000", 10);
var DATA_DIR = path.resolve(__dirname, "data");
var DATA_FILE = path.join(DATA_DIR, "store_sync.json");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
var storeData = {
  inventory: {},
  orders: {},
  stores: {},
  customers: {},
  store_expenses: {},
  purchase_orders: {},
  inward_bills: {},
  stock_transfers: {},
  store_indents: {},
  suppliers: {},
  warehouse_batches: {},
  stock_audit_trail: {},
  system_metadata: {}
};
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    Object.assign(storeData, parsed);
    console.log("[SyncServer] Loaded existing store data from disk successfully.");
  }
} catch (err) {
  console.warn("[SyncServer] Notice: Initializing new empty store sync database.");
}
var persistTimer = null;
var schedulePersist = () => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(storeData, null, 2), "utf-8");
    } catch (err) {
      console.error("[SyncServer] Disk persist error:", err);
    }
  }, 100);
};
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
var sseClients = /* @__PURE__ */ new Set();
var broadcastChange = (payload) => {
  const message = `data: ${JSON.stringify(payload)}

`;
  for (const client of sseClients) {
    try {
      client.res.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
};
app.get("/api/sync/events", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": "*"
  });
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const client = { id: clientId, res, connectedAt: /* @__PURE__ */ new Date() };
  sseClients.add(client);
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", clientId, activePeers: sseClients.size, timestamp: Date.now() })}

`);
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(`: heartbeat

`);
    } catch {
      clearInterval(heartbeatTimer);
      sseClients.delete(client);
    }
  }, 2e4);
  req.on("close", () => {
    clearInterval(heartbeatTimer);
    sseClients.delete(client);
  });
});
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    code: 200,
    message: "Richie Rich High-Performance Real-Time Sync Engine is Healthy",
    uptime: Math.round(process.uptime()),
    activeLiveStreams: sseClients.size,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/sync/all", (req, res) => {
  const result = {};
  for (const [colName, docs] of Object.entries(storeData)) {
    result[colName] = Object.values(docs);
  }
  res.json({ success: true, data: result });
});
app.get("/api/sync/:collection", (req, res) => {
  const colName = req.params.collection;
  const docs = storeData[colName] ? Object.values(storeData[colName]) : [];
  res.json({ success: true, collection: colName, count: docs.length, data: docs });
});
app.post("/api/sync/:collection", (req, res) => {
  const colName = req.params.collection;
  const item = req.body;
  const docId = String(item.id || item.recordId || Date.now()).trim();
  if (!storeData[colName]) {
    storeData[colName] = {};
  }
  const cleanItem = { ...item, id: docId, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  storeData[colName][docId] = cleanItem;
  schedulePersist();
  const senderId = req.headers["x-client-id"] || void 0;
  broadcastChange({
    collection: colName,
    action: "upsert",
    data: cleanItem,
    senderId
  });
  res.json({ success: true, id: docId, collection: colName });
});
app.post("/api/sync/batch/:collection", (req, res) => {
  const colName = req.params.collection;
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, error: "Expected items array" });
  }
  if (!storeData[colName]) {
    storeData[colName] = {};
  }
  const updated = [];
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const item of items) {
    if (item && item.id) {
      const docId = String(item.id).trim();
      const sanitized = { ...item, id: docId, updatedAt: item.updatedAt || now };
      storeData[colName][docId] = sanitized;
      updated.push(sanitized);
    }
  }
  schedulePersist();
  const senderId = req.headers["x-client-id"] || void 0;
  broadcastChange({
    collection: colName,
    action: "batch",
    data: updated,
    senderId
  });
  res.json({ success: true, collection: colName, syncedCount: updated.length });
});
app.post("/api/batches/allocate", (req, res) => {
  const { itemId, sku, sourceLocationId, requestedQty } = req.body;
  const qty = Math.max(0, Math.floor(Number(requestedQty) || 0));
  if (qty <= 0) {
    return res.status(400).json({ success: false, error: "Requested quantity must be greater than zero." });
  }
  const batches = Object.values(storeData["warehouse_batches"] || {});
  const sourceKey = sourceLocationId === "warehouse" || sourceLocationId === "wh-central-amd" ? "central" : sourceLocationId || "central";
  const cleanId = String(itemId || "").trim().toLowerCase();
  const cleanSku = String(sku || "").trim().toLowerCase();
  const matchingBatches = batches.filter((b) => {
    const isMatch = b.itemId === itemId || b.sku && b.sku.toLowerCase() === cleanSku || b.id === itemId;
    const avail = Math.max(0, Math.floor(Number(b.locationQuantities?.[sourceKey] ?? (sourceKey === "central" ? b.quantityInStock : 0)) || 0));
    return isMatch && avail > 0 && b.status !== "depleted";
  }).sort((a, b) => new Date(a.expiryDate || 0).getTime() - new Date(b.expiryDate || 0).getTime());
  let remaining = qty;
  const allocations = [];
  for (const b of matchingBatches) {
    if (remaining <= 0) break;
    if (!b.locationQuantities) b.locationQuantities = {};
    const cur = Math.max(0, Math.floor(Number(b.locationQuantities[sourceKey] ?? (sourceKey === "central" ? b.quantityInStock : 0)) || 0));
    const take = Math.min(remaining, cur);
    b.locationQuantities[sourceKey] = cur - take;
    if (sourceKey === "central") {
      b.locationQuantities["wh-central-amd"] = b.locationQuantities[sourceKey];
      b.quantityInStock = b.locationQuantities[sourceKey];
    }
    b.currentQuantity = Math.max(0, (Number(b.currentQuantity) || 0) - take);
    b.currentBaseQuantity = b.currentQuantity;
    b.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    storeData["warehouse_batches"][b.id] = b;
    allocations.push({ batchId: b.id, batchNumber: b.batchNumber, quantity: take });
    remaining -= take;
  }
  schedulePersist();
  broadcastChange({ collection: "warehouse_batches", action: "batch", data: Object.values(storeData["warehouse_batches"]) });
  res.json({ success: true, allocated: qty - remaining, remainingUnallocated: remaining, allocations });
});
app.post("/api/batches/reconcile", (req, res) => {
  const inventory = Object.values(storeData["inventory"] || {});
  const batches = Object.values(storeData["warehouse_batches"] || {});
  let adjustmentsCount = 0;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  for (const inv of inventory) {
    const invId = inv.id;
    const invSku = (inv.sku || "").toLowerCase();
    const centralStock = Math.max(0, Math.floor(Number(inv.stockQuantity) || 0));
    const itemBatches = batches.filter(
      (b) => b.itemId === invId || b.sku && b.sku.toLowerCase() === invSku
    );
    const totalBatchCentral = itemBatches.reduce((sum, b) => {
      return sum + Math.max(0, Math.floor(Number(b.locationQuantities?.["central"] ?? (b.quantityInStock || 0)) || 0));
    }, 0);
    if (totalBatchCentral !== centralStock) {
      adjustmentsCount++;
      if (itemBatches.length === 0 && centralStock > 0) {
        const newBatchId = `bat-auto-${invId}-${Date.now().toString().slice(-4)}`;
        const newBatch = {
          id: newBatchId,
          itemId: invId,
          sku: inv.sku || "SKU-STD",
          name: inv.name,
          category: inv.category || "General",
          batchNumber: `BATCH-${(inv.sku || "STD").slice(0, 4).toUpperCase()}-01`,
          warehouseId: "wh-central-amd",
          warehouseName: "Central Warehouse",
          mfgDate: now.split("T")[0],
          expiryDate: new Date(Date.now() + 365 * 864e5).toISOString().split("T")[0],
          initialQuantity: centralStock,
          originalQuantity: centralStock,
          originalUnit: inv.unit || "units",
          piecesPerBox: inv.piecesPerBox || 1,
          originalBaseQuantity: centralStock,
          currentBaseQuantity: centralStock,
          currentQuantity: centralStock,
          quantityInStock: centralStock,
          consumedQuantity: 0,
          consumedBaseQuantity: 0,
          locationQuantities: {
            central: centralStock,
            "wh-central-amd": centralStock
          },
          locationUnit: "UNIT",
          unit: inv.unit || "units",
          unitCost: inv.costPrice || 20,
          supplierName: "Authoritative Central Hub",
          daysToExpiry: 365,
          status: "active",
          createdAt: now,
          updatedAt: now
        };
        storeData["warehouse_batches"][newBatchId] = newBatch;
      } else if (itemBatches.length > 0) {
        const delta = centralStock - totalBatchCentral;
        const targetBatch = itemBatches[0];
        const curCentral = Math.max(0, Math.floor(Number(targetBatch.locationQuantities?.["central"] ?? targetBatch.quantityInStock ?? 0)));
        const newCentral = Math.max(0, curCentral + delta);
        if (!targetBatch.locationQuantities) targetBatch.locationQuantities = {};
        targetBatch.locationQuantities["central"] = newCentral;
        targetBatch.locationQuantities["wh-central-amd"] = newCentral;
        targetBatch.quantityInStock = newCentral;
        targetBatch.currentQuantity = Math.max(0, (Number(targetBatch.currentQuantity) || 0) + delta);
        targetBatch.currentBaseQuantity = targetBatch.currentQuantity;
        targetBatch.updatedAt = now;
        storeData["warehouse_batches"][targetBatch.id] = targetBatch;
      }
    }
  }
  schedulePersist();
  broadcastChange({ collection: "warehouse_batches", action: "batch", data: Object.values(storeData["warehouse_batches"]) });
  res.json({
    success: true,
    message: `Reconciliation complete. ${adjustmentsCount} items synchronized between Central Hub and Batch Tracking.`,
    adjustmentsCount,
    totalBatches: Object.keys(storeData["warehouse_batches"]).length
  });
});
app.delete("/api/sync/:collection/:id", (req, res) => {
  const { collection: colName, id } = req.params;
  const docId = String(id).trim();
  if (storeData[colName] && storeData[colName][docId]) {
    delete storeData[colName][docId];
    schedulePersist();
    const senderId = req.headers["x-client-id"] || void 0;
    broadcastChange({
      collection: colName,
      action: "delete",
      data: { id: docId },
      senderId
    });
  }
  res.json({ success: true, id: docId, collection: colName });
});
var distPath = path.join(__dirname, "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[RichieRich POS Engine] Real-time sync hub running on http://0.0.0.0:${PORT}`);
  console.log(`[RichieRich POS Engine] Health Check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`[RichieRich POS Engine] Real-Time Stream: http://0.0.0.0:${PORT}/api/sync/events`);
});
