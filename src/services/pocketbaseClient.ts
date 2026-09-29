import PocketBase from 'pocketbase';

const env = (import.meta as any).env || {};

// Target PocketBase URL (Defaults to same-origin reverse-proxied /api or port 8090)
export const getPocketBaseUrl = (): string => {
  if (env.VITE_POCKETBASE_URL && env.VITE_POCKETBASE_URL.trim() !== '') {
    return env.VITE_POCKETBASE_URL.trim();
  }
  if (typeof window !== 'undefined' && window.location) {
    const { port, origin, hostname } = window.location;
    // When served via production Nginx (port 80 / 443 or default HTTP), use same-origin proxy
    if (port === '' || port === '80' || port === '443') {
      return origin;
    }
    // If accessing explicitly on PocketBase port
    if (port === '8090') {
      return origin;
    }
    // Local dev server fallback (e.g. localhost:3000)
    if (hostname && !hostname.includes('run.app')) {
      return `http://${hostname}:8090`;
    }
  }
  // Default VPS IP
  return 'http://187.126.115.40';
};

export const pb = new PocketBase(getPocketBaseUrl());

// Disable auto-cancellation so multiple rapid queries or real-time calls execute cleanly
pb.autoCancellation(false);

export const isPocketBaseConfigured = (): boolean => {
  return true;
};
