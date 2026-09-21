import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
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
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // Support custom named database ID from AI Studio provisioning or standard (default) database
    if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== '') {
      try {
        firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
      } catch (dbErr) {
        console.warn('Could not initialize named database, falling back to default:', dbErr);
        firestoreDb = getFirestore(firebaseApp);
      }
    } else {
      firestoreDb = getFirestore(firebaseApp);
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
