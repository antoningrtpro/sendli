"use server";

import { getSession } from "@/lib/session";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Lang } from "@/lib/i18n";
import { deleteStorageFile } from "@/app/actions/upload";

/** Delete an array of Firestore doc refs in batches of 500 */
async function deleteDocs(refs: FirebaseFirestore.DocumentReference[]) {
  if (refs.length === 0) return;
  const BATCH_SIZE = 500;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    refs.slice(i, i + BATCH_SIZE).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

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

/** Downgrade current user to the free plan. Upgrading requires admin or Stripe webhook. */
export async function updatePlan(plan: "free") {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  // Only downgrading is allowed from client-side. Upgrades go through adminSetUserPlan.
  await adminDb.collection("users").doc(session.user.id).update({
    plan: "free",
    extensionToken: null, // invalidate Chrome extension on downgrade
  });
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAccount() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const uid = session.user.id;

  // Fetch all user data in parallel
  const [proposalsSnap, bannersSnap, testimonialsSnap, caseStudiesSnap, savedBlocksSnap, notificationsSnap, brandKitSnap] = await Promise.all([
    adminDb.collection("proposals").where("userId", "==", uid).get(),
    adminDb.collection("banners").where("userId", "==", uid).get(),
    adminDb.collection("testimonials").where("userId", "==", uid).get(),
    adminDb.collection("caseStudies").where("userId", "==", uid).get(),
    adminDb.collection("savedBlocks").where("userId", "==", uid).get(),
    adminDb.collection("notifications").where("userId", "==", uid).get(),
    adminDb.collection("brandKits").doc(uid).get(),
  ]);

  const proposalIds = proposalsSnap.docs.map(d => d.id);

  // Fetch cascade sub-collections for all proposals in parallel
  const [linksSnaps, eventsSnaps, commentsSnaps] = await Promise.all([
    Promise.all(
      proposalIds.length > 0
        ? chunkArray(proposalIds, 30).map(batch =>
            adminDb.collection("proposalLinks").where("proposalId", "in", batch).get()
          )
        : []
    ),
    Promise.all(
      proposalIds.length > 0
        ? chunkArray(proposalIds, 30).map(batch =>
            adminDb.collection("proposalEvents").where("proposalId", "in", batch).get()
          )
        : []
    ),
    Promise.all(
      proposalIds.length > 0
        ? chunkArray(proposalIds, 30).map(batch =>
            adminDb.collection("proposalComments").where("proposalId", "in", batch).get()
          )
        : []
    ),
  ]);

  // Collect all Storage URLs to clean up
  const storageUrls: string[] = [];

  for (const doc of proposalsSnap.docs) {
    const d = doc.data();
    if (d.clientLogoUrl) storageUrls.push(d.clientLogoUrl);
    if (d.downloadUrl) storageUrls.push(d.downloadUrl);
    try {
      const blocks = JSON.parse(d.blocks as string);
      for (const block of blocks) {
        if (block.type === "image" && block.url?.includes("firebasestorage")) storageUrls.push(block.url);
        if (block.type === "pdf" && block.url) storageUrls.push(block.url);
        if (block.type === "embed" && block.downloadUrl) storageUrls.push(block.downloadUrl);
        if (block.type === "video" && block.url?.includes("firebasestorage")) storageUrls.push(block.url);
      }
    } catch { /* ignore */ }
  }
  for (const doc of bannersSnap.docs) {
    const d = doc.data();
    if (d.bgImageUrl) storageUrls.push(d.bgImageUrl);
    if (d.logoUrl) storageUrls.push(d.logoUrl);
  }
  for (const doc of testimonialsSnap.docs) {
    if (doc.data().avatarUrl) storageUrls.push(doc.data().avatarUrl);
  }
  for (const doc of caseStudiesSnap.docs) {
    const d = doc.data();
    if (d.mediaUrl) storageUrls.push(d.mediaUrl);
    if (d.authorAvatarUrl) storageUrls.push(d.authorAvatarUrl);
  }
  if (brandKitSnap.exists && brandKitSnap.data()?.logoUrl) {
    storageUrls.push(brandKitSnap.data()!.logoUrl);
  }

  // Collect all Firestore refs to delete
  const allRefs: FirebaseFirestore.DocumentReference[] = [
    ...proposalsSnap.docs.map(d => d.ref),
    ...bannersSnap.docs.map(d => d.ref),
    ...testimonialsSnap.docs.map(d => d.ref),
    ...caseStudiesSnap.docs.map(d => d.ref),
    ...savedBlocksSnap.docs.map(d => d.ref),
    ...notificationsSnap.docs.map(d => d.ref),
    ...linksSnaps.flatMap(s => s.docs.map(d => d.ref)),
    ...eventsSnaps.flatMap(s => s.docs.map(d => d.ref)),
    ...commentsSnaps.flatMap(s => s.docs.map(d => d.ref)),
    adminDb.collection("brandKits").doc(uid),
    adminDb.collection("users").doc(uid),
  ];

  // Delete Firestore + Storage in parallel
  await Promise.all([
    deleteDocs(allRefs),
    storageUrls.length > 0
      ? Promise.allSettled(storageUrls.map(url => deleteStorageFile(url)))
      : Promise.resolve(),
  ]);

  // Delete Firebase Auth user and clear session cookie
  await adminAuth.deleteUser(uid);
  const jar = await cookies();
  jar.delete("__session");
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
