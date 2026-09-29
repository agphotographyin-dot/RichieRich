import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store_sync.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory data store for sub-millisecond retrieval
const storeData: Record<string, Record<string, any>> = {
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
  system_metadata: {},
};

// Load saved data from disk if present
try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    Object.assign(storeData, parsed);
    console.log('[SyncServer] Loaded existing store data from disk successfully.');
  }
} catch (err) {
  console.warn('[SyncServer] Notice: Initializing new empty store sync database.');
}

// Debounced disk persistence (batches disk writes to prevent I/O lag)
let persistTimer: NodeJS.Timeout | null = null;
const schedulePersist = () => {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(storeData, null, 2), 'utf-8');
    } catch (err) {
      console.error('[SyncServer] Disk persist error:', err);
    }
  }, 100);
};

// Parse JSON bodies up to 50MB (handles large inventory catalogs)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Universal Permissive CORS for seamless cross-counter POS communication
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Active Server-Sent Events (SSE) connections across POS counters and devices
interface SSEClient {
  id: string;
  res: Response;
  connectedAt: Date;
}
const sseClients = new Set<SSEClient>();

// Broadcast helper: sends JSON payload to all active clients in <1 millisecond
const broadcastChange = (payload: { collection: string; action: 'upsert' | 'delete' | 'batch'; data: any; senderId?: string }) => {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
};

// -------------------------------------------------------------
// Real-Time SSE Stream Endpoint
// -------------------------------------------------------------
app.get('/api/sync/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const client: SSEClient = { id: clientId, res, connectedAt: new Date() };
  sseClients.add(client);

  // Send initial welcome & connection confirmation
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, activePeers: sseClients.size, timestamp: Date.now() })}\n\n`);

  // Heartbeat to keep connection alive through any firewall/proxy (every 20s)
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch {
      clearInterval(heartbeatTimer);
      sseClients.delete(client);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    sseClients.delete(client);
  });
});

// -------------------------------------------------------------
// Health Check Endpoint
// -------------------------------------------------------------
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    code: 200,
    message: 'Richie Rich High-Performance Real-Time Sync Engine is Healthy',
    uptime: Math.round(process.uptime()),
    activeLiveStreams: sseClients.size,
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------------------------------
// Get All Data (Instant Initial Hydration in a single call)
// -------------------------------------------------------------
app.get('/api/sync/all', (req: Request, res: Response) => {
  const result: Record<string, any[]> = {};
  for (const [colName, docs] of Object.entries(storeData)) {
    result[colName] = Object.values(docs);
  }
  res.json({ success: true, data: result });
});

// -------------------------------------------------------------
// Get Specific Collection
// -------------------------------------------------------------
app.get('/api/sync/:collection', (req: Request, res: Response) => {
  const colName = req.params.collection;
  const docs = storeData[colName] ? Object.values(storeData[colName]) : [];
  res.json({ success: true, collection: colName, count: docs.length, data: docs });
});

// -------------------------------------------------------------
// Upsert Single Document in Real Time
// -------------------------------------------------------------
app.post('/api/sync/:collection', (req: Request, res: Response) => {
  const colName = req.params.collection;
  const item = req.body;
  const docId = String(item.id || item.recordId || Date.now()).trim();

  if (!storeData[colName]) {
    storeData[colName] = {};
  }

  const cleanItem = { ...item, id: docId, updatedAt: new Date().toISOString() };
  storeData[colName][docId] = cleanItem;
  schedulePersist();

  // Instant sub-millisecond broadcast to all other counters
  const senderId = (req.headers['x-client-id'] as string) || undefined;
  broadcastChange({
    collection: colName,
    action: 'upsert',
    data: cleanItem,
    senderId,
  });

  res.json({ success: true, id: docId, collection: colName });
});

// -------------------------------------------------------------
// Batch Upsert Collection (e.g. bulk catalog or initial seed)
// -------------------------------------------------------------
app.post('/api/sync/batch/:collection', (req: Request, res: Response) => {
  const colName = req.params.collection;
  const { items } = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, error: 'Expected items array' });
  }

  if (!storeData[colName]) {
    storeData[colName] = {};
  }

  const updated: any[] = [];
  const now = new Date().toISOString();

  for (const item of items) {
    if (item && item.id) {
      const docId = String(item.id).trim();
      const sanitized = { ...item, id: docId, updatedAt: item.updatedAt || now };
      storeData[colName][docId] = sanitized;
      updated.push(sanitized);
    }
  }

  schedulePersist();

  const senderId = (req.headers['x-client-id'] as string) || undefined;
  broadcastChange({
    collection: colName,
    action: 'batch',
    data: updated,
    senderId,
  });

  res.json({ success: true, collection: colName, syncedCount: updated.length });
});

// -------------------------------------------------------------
// Delete Document
// -------------------------------------------------------------
app.delete('/api/sync/:collection/:id', (req: Request, res: Response) => {
  const { collection: colName, id } = req.params;
  const docId = String(id).trim();

  if (storeData[colName] && storeData[colName][docId]) {
    delete storeData[colName][docId];
    schedulePersist();

    const senderId = (req.headers['x-client-id'] as string) || undefined;
    broadcastChange({
      collection: colName,
      action: 'delete',
      data: { id: docId },
      senderId,
    });
  }

  res.json({ success: true, id: docId, collection: colName });
});

// -------------------------------------------------------------
// Serve Production Static Frontend Build
// -------------------------------------------------------------
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[RichieRich POS Engine] Real-time sync hub running on http://0.0.0.0:${PORT}`);
  console.log(`[RichieRich POS Engine] Health Check: http://0.0.0.0:${PORT}/api/health`);
  console.log(`[RichieRich POS Engine] Real-Time Stream: http://0.0.0.0:${PORT}/api/sync/events`);
});
