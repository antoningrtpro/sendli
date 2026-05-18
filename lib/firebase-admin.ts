import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET ?? "sendli-13774.firebasestorage.app";

function ensureInit() {
  if (getApps().length > 0) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw || raw === "{}") return; // skip at build time
  const serviceAccount = JSON.parse(raw);
  initializeApp({ credential: cert(serviceAccount), storageBucket: STORAGE_BUCKET });
}

// Proxy pattern — initialisation lazy, seulement à la première vraie requête
export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_, prop) {
    ensureInit();
    const db = getFirestore();
    const value = (db as never)[prop as string];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(db) : value;
  },
});

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_, prop) {
    ensureInit();
    const auth = getAuth();
    const value = (auth as never)[prop as string];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(auth) : value;
  },
});

export const adminStorage = new Proxy({} as ReturnType<typeof getStorage>, {
  get(_, prop) {
    ensureInit();
    const storage = getStorage();
    const value = (storage as never)[prop as string];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(storage) : value;
  },
});

export const adminMessaging = new Proxy({} as Messaging, {
  get(_, prop) {
    ensureInit();
    const m = getMessaging();
    const value = (m as never)[prop as string];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(m) : value;
  },
}) as Messaging;
