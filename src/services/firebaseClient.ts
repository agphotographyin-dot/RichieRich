import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  memoryLocalCache,
} from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

export interface FirebaseConfigType {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
}

const env = (import.meta as any).env || {};

export const firebaseConfig: FirebaseConfigType = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || (rawConfig as any)?.projectId || '',
  appId: env.VITE_FIREBASE_APP_ID || (rawConfig as any)?.appId || '',
  apiKey: env.VITE_FIREBASE_API_KEY || (rawConfig as any)?.apiKey || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || (rawConfig as any)?.authDomain || '',
  firestoreDatabaseId: env.VITE_FIREBASE_DATABASE_ID || (rawConfig as any)?.firestoreDatabaseId || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || (rawConfig as any)?.storageBucket || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || (rawConfig as any)?.messagingSenderId || '',
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || (rawConfig as any)?.measurementId || '',
};

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let initError: Error | null = null;

try {
  if (firebaseConfig?.apiKey && firebaseConfig?.projectId) {
    const isNewApp = getApps().length === 0;
    firebaseApp = isNewApp ? initializeApp(firebaseConfig) : getApp();

    const targetDbId =
      firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== ''
        ? firebaseConfig.firestoreDatabaseId
        : undefined;

    // Initialize with high-performance in-memory caching to eliminate disk bottlenecks and speed up snapshot delivery
    const firestoreSettings = {
      ignoreUndefinedProperties: true,
      localCache: memoryLocalCache(),
    };

    try {
      firestoreDb = initializeFirestore(firebaseApp, firestoreSettings, targetDbId);
    } catch {
      // If already initialized in another module, obtain reference
      firestoreDb = targetDbId ? getFirestore(firebaseApp, targetDbId) : getFirestore(firebaseApp);
    }
  }
} catch (err) {
  initError = err as Error;
  console.error('Firebase initialization error:', err);
}

export const app = firebaseApp;
export const db = firestoreDb;
export const getInitError = () => initError;
export const isFirebaseConfigured = () => Boolean(db && firebaseConfig?.projectId);
