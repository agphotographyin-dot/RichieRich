import PocketBase from 'pocketbase';

export const DEFAULT_POCKETBASE_URL = 'http://187.126.115.40:8090';
export const DEFAULT_VPS_IP = 'http://187.126.115.40';

export const getCustomPocketBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem('rr_pocketbase_url');
    if (saved && saved.trim()) return saved.trim();
  }
  return '';
};

export const setCustomPocketBaseUrl = (url: string) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (url && url.trim()) {
      window.localStorage.setItem('rr_pocketbase_url', url.trim());
      pb.baseUrl = url.trim();
    } else {
      window.localStorage.removeItem('rr_pocketbase_url');
      pb.baseUrl = getPocketBaseUrl();
    }
  }
};

// Target PocketBase URL (Custom override, Vite env, reverse proxy, or default VPS PocketBase)
export const getPocketBaseUrl = (): string => {
  const custom = getCustomPocketBaseUrl();
  if (custom) return custom;

  const env = (import.meta as any).env || {};
  if (env.VITE_POCKETBASE_URL && env.VITE_POCKETBASE_URL.trim() !== '') {
    return env.VITE_POCKETBASE_URL.trim();
  }

  if (typeof window !== 'undefined' && window.location) {
    const { port, origin, hostname, protocol } = window.location;
    // When served over HTTPS, avoid mixed content errors by preferring same-origin reverse proxy
    if (protocol === 'https:') {
      return origin;
    }
    // When served directly on VPS host port 8090
    if (port === '8090') {
      return origin;
    }
    // Behind reverse proxy (port 80 or default web port) where Nginx forwards /api/ to PocketBase
    if (port === '80' || port === '') {
      return origin;
    }
    // Any HTTP host (VPS IP, localhost, internal network): default to port 8090 on the same host
    if (hostname) {
      return `http://${hostname}:8090`;
    }
  }

  return DEFAULT_POCKETBASE_URL;
};

// Priority list of candidate endpoints for health check & resilient fallback
export const getCandidatePocketBaseUrls = (customUrl?: string): string[] => {
  const urls: string[] = [];
  const primary = customUrl || getPocketBaseUrl();
  if (primary) urls.push(primary.replace(/\/+$/, ''));

  if (typeof window !== 'undefined' && window.location) {
    const { origin, hostname, protocol } = window.location;
    if (origin && !urls.includes(origin)) urls.push(origin);
    if (protocol !== 'https:' && hostname) {
      const host8090 = `http://${hostname}:8090`;
      if (!urls.includes(host8090)) urls.push(host8090);
    }
  }

  if (!urls.includes(DEFAULT_POCKETBASE_URL)) urls.push(DEFAULT_POCKETBASE_URL);

  return urls;
};

// Singleton PocketBase client instance
export const pb = new PocketBase(getPocketBaseUrl());

// Disable auto-cancellation so concurrent POS queries and realtime streams don't cancel each other
pb.autoCancellation(false);

export const isPocketBaseConfigured = (): boolean => true;

export interface PocketBaseHealthResult {
  success: boolean;
  status: 'online' | 'offline' | 'mixed_content';
  message: string;
  testedUrl: string;
  code?: number;
  collectionsFound?: string[];
}

export const checkPocketBaseHealth = async (customUrl?: string): Promise<PocketBaseHealthResult> => {
  const rawBase = (customUrl || getPocketBaseUrl()).replace(/\/+$/, '');
  const candidateUrls = getCandidatePocketBaseUrls(customUrl);

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${url}/api/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        // Also check if collections are accessible or if inventory collection exists
        let collectionsFound: string[] = [];
        try {
          const invRes = await fetch(`${url}/api/collections/inventory/records?perPage=1`, {
            headers: { Accept: 'application/json' },
          });
          if (invRes.ok) {
            collectionsFound.push('inventory');
          }
        } catch {}

        return {
          success: true,
          status: 'online',
          message: collectionsFound.includes('inventory')
            ? 'PocketBase server is online and collections are configured & ready!'
            : 'PocketBase is running, but database collections are not created yet. Use 1-Click Auto Setup below.',
          testedUrl: url,
          code: res.status,
          collectionsFound,
        };
      }
    } catch (err: any) {
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
        return {
          success: false,
          status: 'mixed_content',
          message: 'Browser HTTPS restriction in preview. Open app directly on your VPS http://187.126.115.40/ for full native access.',
          testedUrl: url,
        };
      }
    }
  }

  return {
    success: false,
    status: 'offline',
    message: `Could not connect to PocketBase at ${rawBase}. Ensure PocketBase container is running on port 8090.`,
    testedUrl: rawBase,
  };
};

/**
 * 1-Click Auto Setup for PocketBase Collections:
 * Logs in with admin credentials, creates all required collections,
 * and sets all API rules to public ("") so POS counters can read & write seamlessly.
 */
export const autoProvisionPocketBaseCollections = async (
  adminEmail: string,
  adminPass: string,
  customBaseUrl?: string
): Promise<{ success: boolean; message: string; created: number; updated: number }> => {
  const base = (customBaseUrl || getPocketBaseUrl()).replace(/\/+$/, '');
  const targetPb = new PocketBase(base);
  targetPb.autoCancellation(false);

  try {
    // 1. Authenticate as Superuser / Admin
    let token = '';
    
    // Method A: Try PocketBase v0.23+ superuser endpoint
    try {
      const authRes = await fetch(`${base}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ identity: adminEmail.trim(), password: adminPass.trim() }),
      });
      if (authRes.ok) {
        const authData = await authRes.json();
        token = authData.token;
        targetPb.authStore.save(token, authData.record || null);
      }
    } catch {}

    // Method B: Try PocketBase v0.20-v0.22 admin endpoint
    if (!token) {
      try {
        const authRes = await fetch(`${base}/api/admins/auth-with-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ identity: adminEmail.trim(), password: adminPass.trim() }),
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          token = authData.token;
          targetPb.authStore.save(token, authData.admin || null);
        }
      } catch {}
    }

    // Method C: SDK auth attempt
    if (!token) {
      try {
        if ((targetPb as any).collection) {
          await targetPb.collection('_superusers').authWithPassword(adminEmail.trim(), adminPass.trim());
          token = targetPb.authStore.token;
        }
      } catch {}
      if (!token && (targetPb as any).admins?.authWithPassword) {
        try {
          await (targetPb as any).admins.authWithPassword(adminEmail.trim(), adminPass.trim());
          token = targetPb.authStore.token;
        } catch {}
      }
    }

    if (!token) {
      throw new Error(
        'Authentication failed. Please verify your Super Admin email and password at ' +
          base +
          '/_/ (make sure to include /_/ at the end).'
      );
    }

    // 2. Fetch existing collections
    let existingList: any[] = [];
    try {
      existingList = await targetPb.collections.getFullList();
    } catch {
      const resp = await fetch(`${base}/api/collections?perPage=100`, {
        headers: { Authorization: token, Accept: 'application/json' },
      });
      if (resp.ok) {
        const body = await resp.json();
        existingList = body.items || [];
      }
    }

    const existingNames = new Set(existingList.map((c) => c.name));

    const collectionsToProvision = [
      'inventory',
      'orders',
      'stores',
      'customers',
      'store_expenses',
      'purchase_orders',
      'inward_bills',
      'stock_transfers',
      'store_indents',
      'suppliers',
      'system_metadata',
    ];

    let created = 0;
    let updated = 0;

    for (const name of collectionsToProvision) {
      const payload: any = {
        name,
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: '',
        schema: [
          { name: 'recordId', type: 'text', required: false },
          { name: 'data', type: 'json', required: false },
          { name: 'updatedAt', type: 'text', required: false },
        ],
        fields: [
          { name: 'recordId', type: 'text', required: false },
          { name: 'data', type: 'json', required: false },
          { name: 'updatedAt', type: 'text', required: false },
        ],
      };

      if (!existingNames.has(name)) {
        try {
          await targetPb.collections.create(payload);
          created++;
        } catch (err: any) {
          console.warn(`Notice creating collection ${name}:`, err?.message);
        }
      } else {
        const existingCol = existingList.find((c) => c.name === name);
        if (existingCol) {
          try {
            await targetPb.collections.update(existingCol.id, {
              listRule: '',
              viewRule: '',
              createRule: '',
              updateRule: '',
              deleteRule: '',
            });
            updated++;
          } catch {}
        }
      }
    }

    return {
      success: true,
      message: `Setup Complete! ${created} collections created, ${updated} existing updated with public read/write rules.`,
      created,
      updated,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Could not authenticate or configure PocketBase.',
      created: 0,
      updated: 0,
    };
  }
};
