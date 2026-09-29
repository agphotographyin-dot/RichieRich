import PocketBase from 'pocketbase';

const env = (import.meta as any).env || {};

// Target PocketBase URL (Defaults to current VPS host IP or window location)
export const getPocketBaseUrl = (): string => {
  if (env.VITE_POCKETBASE_URL && env.VITE_POCKETBASE_URL.trim() !== '') {
    return env.VITE_POCKETBASE_URL.trim();
  }
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    // If accessing via IP or domain, default to port 8090 on the same host
    if (hostname && hostname !== 'localhost' && !hostname.includes('run.app')) {
      return `http://${hostname}:8090`;
    }
  }
  // Default VPS IP
  return 'http://187.126.115.40:8090';
};

export const pb = new PocketBase(getPocketBaseUrl());

// Disable auto-cancellation so multiple rapid queries or real-time calls execute cleanly
pb.autoCancellation(false);

export const isPocketBaseConfigured = (): boolean => {
  return true;
};
