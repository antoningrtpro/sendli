import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";

export interface SessionUser {
  id: string;
  email: string | undefined;
  name: string | undefined;
}

export async function getSession(): Promise<{ user: SessionUser } | null> {
  const jar = await cookies();
  const sessionCookie = jar.get("__session")?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, false);
    return { user: { id: decoded.uid, email: decoded.email, name: decoded.name } };
  } catch {
    return null;
  }
}
