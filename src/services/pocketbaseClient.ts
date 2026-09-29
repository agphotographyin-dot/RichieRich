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

// Target PocketBase URL (Custom override, Vite env, or default VPS PocketBase)
export const getPocketBaseUrl = (): string => {
  const custom = getCustomPocketBaseUrl();
  if (custom) return custom;

  const env = (import.meta as any).env || {};
  if (env.VITE_POCKETBASE_URL && env.VITE_POCKETBASE_URL.trim() !== '') {
    return env.VITE_POCKETBASE_URL.trim();
  }

  if (typeof window !== 'undefined' && window.location) {
    const { port, origin, hostname } = window.location;
    // When served on VPS host port 8090
    if (port === '8090') {
      return origin;
    }
    // Local development fallback
    if (hostname && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return `http://${hostname}:8090`;
    }
  }

  return DEFAULT_POCKETBASE_URL;
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
}

export const checkPocketBaseHealth = async (customUrl?: string): Promise<PocketBaseHealthResult> => {
  const rawBase = (customUrl || getPocketBaseUrl()).replace(/\/+$/, '');
  const candidateUrls: string[] = [];

  // Try exact URL first
  candidateUrls.push(rawBase);

  // If missing port 8090, add it as candidate
  if (!rawBase.includes(':8090') && !rawBase.includes(':3000')) {
    candidateUrls.push(`${rawBase}:8090`);
  }

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${url}/api/health`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => null);
        return {
          success: true,
          status: 'online',
          message: data?.message || 'PocketBase server is online and responding healthy',
          testedUrl: url,
          code: res.status,
        };
      }
    } catch (err: any) {
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
        return {
          success: false,
          status: 'mixed_content',
          message: 'Browser HTTPS Mixed Content restriction in preview. Works 100% natively when running on your VPS http://187.126.115.40/ or custom domain!',
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
