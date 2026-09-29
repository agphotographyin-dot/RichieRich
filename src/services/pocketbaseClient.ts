import PocketBase from 'pocketbase';

const env = (import.meta as any).env || {};
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

// Target PocketBase URL (Defaults to custom setting, env var, or production VPS IP)
export const getPocketBaseUrl = (): string => {
  const custom = getCustomPocketBaseUrl();
  if (custom) return custom;

  if (env.VITE_POCKETBASE_URL && env.VITE_POCKETBASE_URL.trim() !== '') {
    return env.VITE_POCKETBASE_URL.trim();
  }

  if (typeof window !== 'undefined' && window.location) {
    const { port, origin, hostname } = window.location;
    // When served via production Nginx directly on the VPS host (e.g. 187.126.115.40:80 or custom domain)
    if (
      (port === '' || port === '80' || port === '443') &&
      (hostname === '187.126.115.40' || (!hostname.includes('run.app') && !hostname.includes('localhost') && hostname !== '127.0.0.1'))
    ) {
      return origin;
    }
    // If accessing explicitly on PocketBase port
    if (port === '8090') {
      return origin;
    }
    // Local dev server fallback (e.g. localhost:3000)
    if (hostname && (hostname === 'localhost' || hostname === '127.0.0.1')) {
      return `http://${hostname}:8090`;
    }
  }

  // Default VPS IP provided by user
  return DEFAULT_VPS_IP;
};

export const pb = new PocketBase(getPocketBaseUrl());

// Disable auto-cancellation so multiple rapid queries or real-time calls execute cleanly
pb.autoCancellation(false);

export const isPocketBaseConfigured = (): boolean => {
  return true;
};

export interface PocketBaseHealthResult {
  success: boolean;
  status: 'online' | 'offline' | 'mixed_content';
  message: string;
  testedUrl: string;
  code?: number;
}

export const checkPocketBaseHealth = async (customUrl?: string): Promise<PocketBaseHealthResult> => {
  const base = (customUrl || getPocketBaseUrl()).replace(/\/+$/, '');
  const candidateUrls = [base];
  if (!base.includes(':8090') && !base.endsWith('/api')) {
    candidateUrls.push(`${base}:8090`);
  }

  for (const url of candidateUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${url}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        return {
          success: true,
          status: 'online',
          message: data?.message || 'Server online and healthy',
          testedUrl: url,
          code: res.status,
        };
      }
    } catch (err: any) {
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
        return {
          success: false,
          status: 'mixed_content',
          message: 'Mixed Content security: Browsers prevent HTTPS cloud preview from making direct insecure HTTP calls. When accessed on your VPS http://187.126.115.40/ it connects natively with zero limits!',
          testedUrl: url,
        };
      }
    }
  }

  return {
    success: false,
    status: 'offline',
    message: 'Could not reach server at this address. Please ensure Docker or PocketBase is running.',
    testedUrl: base,
  };
};

