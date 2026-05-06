import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

function ensureInit() {
  if (getApps().length > 0) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw || raw === "{}") return; // skip at build time
  const serviceAccount = JSON.parse(raw);
  initializeApp({ credential: cert(serviceAccount) });
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
