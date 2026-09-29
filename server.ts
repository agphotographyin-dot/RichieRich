import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { vpsBackupService } from './src/server/vpsBackupService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Dev server must run on port 3000 behind the system nginx proxy
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- API ROUTES FOR VPS POCKETBASE BACKUP ---
  
  // 1. Get VPS Backup Status & Next Run
  app.get('/api/backup/status', (_req, res) => {
    res.json(vpsBackupService.getStatus());
  });

  // 2. Test VPS PocketBase Connectivity (Ping)
  app.get('/api/backup/test', async (req, res) => {
    try {
      const url = req.query.url as string | undefined;
      const result = await vpsBackupService.testConnection(url);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ reachable: false, error: err?.message });
    }
  });

  // 3. Trigger On-Demand VPS Backup
  app.post('/api/backup/trigger', async (_req, res) => {
    try {
      const result = await vpsBackupService.runBackupCycle();
      res.json({ success: result.status !== 'error', status: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Backup failed' });
    }
  });

  // 4. Update VPS Configuration (Target URL & Interval)
  app.post('/api/backup/config', (req, res) => {
    const { targetUrl, intervalMinutes } = req.body;
    if (typeof targetUrl === 'string' && targetUrl.trim()) {
      vpsBackupService.setTargetUrl(targetUrl);
    }
    if (typeof intervalMinutes === 'number' && intervalMinutes >= 1) {
      vpsBackupService.setIntervalMinutes(intervalMinutes);
    }
    res.json({ success: true, status: vpsBackupService.getStatus() });
  });

  // 5. Update Interval only
  app.post('/api/backup/interval', (req, res) => {
    const { intervalMinutes } = req.body;
    if (typeof intervalMinutes === 'number' && intervalMinutes >= 1) {
      vpsBackupService.setIntervalMinutes(intervalMinutes);
      res.json({ success: true, status: vpsBackupService.getStatus() });
    } else {
      res.status(400).json({ success: false, error: 'Invalid intervalMinutes parameter' });
    }
  });

  // 6. Push Full Client Snapshot to VPS (Fallback when Firestore quota is exhausted)
  app.post('/api/backup/push-all', async (req, res) => {
    const { payload } = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing payload object' });
    }
    try {
      const result = await vpsBackupService.pushAllLocalPayload(payload);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 7. Client Push Proxy (bypasses browser mixed-content blocks when syncing custom batches)
  app.post('/api/backup/push', async (req, res) => {
    const { collection, items } = req.body;
    if (!collection || !Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'Missing collection or items array' });
    }
    try {
      const result = await vpsBackupService.pushBatch(collection, items);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // --- STATIC / SPA VITE MIDDLEWARE ---
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      const indexPath = path.resolve(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Application build not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Richie Rich Pan House Full-Stack Server running at http://0.0.0.0:${PORT}`);
    console.log(`[Server] Primary Real-Time Database: Google Cloud Firestore`);
    console.log(`[Server] Background Backup Target: PocketBase VPS (http://187.126.115.40:8090)`);

    // Start background interval backup scheduler (default every 5 minutes)
    vpsBackupService.startScheduler(5);
  });
}

startServer().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
