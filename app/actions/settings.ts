"use server";

import { getSession } from "@/lib/session";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Lang } from "@/lib/i18n";

export async function updateProfile(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name    = (formData.get("name") as string) || null;
  const email   = formData.get("email") as string;
  const phone   = (formData.get("phone") as string | null)?.trim() || null;
  const company = (formData.get("company") as string | null)?.trim() || null;

  if (!email) return { error: "Email is required" };

  // Check email uniqueness (skip if same email)
  const currentSnap = await adminDb.collection("users").doc(session.user.id).get();
  if (currentSnap.data()?.email !== email) {
    try {
      await adminAuth.getUserByEmail(email);
      return { error: "Email already in use" };
    } catch { /* email not taken */ }
  }

  await adminAuth.updateUser(session.user.id, { email, displayName: name ?? undefined });
  await adminDb.collection("users").doc(session.user.id).update({ name, email, phone, company });

  revalidatePath("/settings");
  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!newPassword || newPassword.length < 8) {
    return { error: "New password must be at least 8 characters" };
  }

  // Verify current password via REST API
  const userSnap = await adminDb.collection("users").doc(session.user.id).get();
  const email = userSnap.data()?.email;
  if (!email) return { error: "User not found" };

  const verifyRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: currentPassword, returnSecureToken: false }),
    }
  );
  if (!verifyRes.ok) return { error: "Current password is incorrect" };

  await adminAuth.updateUser(session.user.id, { password: newPassword });
  return { success: true };
}

export async function updatePlan(plan: "free" | "premium") {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await adminDb.collection("users").doc(session.user.id).update({ plan });
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAccount() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const uid = session.user.id;

  // Delete all user data
  const batch = adminDb.batch();

  const collections = ["proposals", "banners", "testimonials", "caseStudies", "savedBlocks"];
  for (const col of collections) {
    const snap = await adminDb.collection(col).where("userId", "==", uid).get();
    snap.docs.forEach(d => batch.delete(d.ref));
  }
  batch.delete(adminDb.collection("brandKits").doc(uid));
  batch.delete(adminDb.collection("users").doc(uid));
  await batch.commit();

  await adminAuth.deleteUser(uid);
}

export async function updateLanguage(lang: Lang) {
  const session = await getSession();
  if (!session?.user?.id) return;
  const validLang: Lang = lang === "en" ? "en" : "fr";
  // Persist to DB
  await adminDb.collection("users").doc(session.user.id).update({ lang: validLang });
  // Set cookie so server components can read it immediately on next request
  const jar = await cookies();
  jar.set("app-lang", validLang, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/settings");
}
