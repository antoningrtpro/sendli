"use server";

import { getSession } from "@/lib/session";
import { adminDb, adminAuth, adminStorage } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import type { Plan } from "@/lib/plan";
import { deleteStorageFile } from "@/app/actions/upload";
import type { ProposalBlock } from "@/types/proposal";

/** Delete Firestore doc refs in batches of 500 */
async function batchDelete(refs: FirebaseFirestore.DocumentReference[]) {
  if (refs.length === 0) return;
  for (let i = 0; i < refs.length; i += 500) {
    const batch = adminDb.batch();
    refs.slice(i, i + 500).forEach(r => batch.delete(r));
    await batch.commit();
  }
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  plan: Plan;
  role: string | null;
  proposalCount: number;
  createdAt: Date;
  trialEndsAt: Date | null;
}

async function requireAdmin(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const snap = await adminDb.collection("users").doc(session.user.id).get();
  if (snap.data()?.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user?.id) return false;
  const snap = await adminDb.collection("users").doc(session.user.id).get();
  return snap.data()?.role === "admin";
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  await requireAdmin();

  const [usersSnap, proposalsSnap] = await Promise.all([
    adminDb.collection("users").limit(500).get(),
    adminDb.collection("proposals").limit(2000).get(),
  ]);
  const proposalCounts: Record<string, number> = {};
  for (const doc of proposalsSnap.docs) {
    const uid = doc.data().userId as string;
    if (uid) proposalCounts[uid] = (proposalCounts[uid] ?? 0) + 1;
  }

  return usersSnap.docs
    .map(d => {
      const data = d.data();
      const rawPlan = (data.plan as string) ?? "free";
      const plan: Plan = rawPlan === "premium" || rawPlan === "pro" ? "premium" : "free";
      return {
        id: d.id,
        name: (data.name as string | null) ?? null,
        email: (data.email as string) ?? "",
        company: (data.company as string | null) ?? null,
        plan,
        role: (data.role as string | null) ?? null,
        proposalCount: proposalCounts[d.id] ?? 0,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
        trialEndsAt: data.trialEndsAt?.toDate?.() ?? null,
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function adminSetUserPlan(userId: string, plan: Plan): Promise<void> {
  await requireAdmin();
  const update: Record<string, unknown> = { plan };
  if (plan === "free") update.extensionToken = null;
  await adminDb.collection("users").doc(userId).update(update);
  revalidatePath("/admin");
}

export interface PremiumRequestAdmin {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  userCompany: string | null;
  billingPeriod: "monthly" | "annual";
  status: "pending" | "approved" | "denied";
  createdAt: Date;
}

export async function getPremiumRequests(): Promise<PremiumRequestAdmin[]> {
  await requireAdmin();
  const snap = await adminDb.collection("premiumRequests")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId as string,
      userName: (data.userName as string | null) ?? null,
      userEmail: (data.userEmail as string) ?? "",
      userCompany: (data.userCompany as string | null) ?? null,
      billingPeriod: (data.billingPeriod as "monthly" | "annual") ?? "monthly",
      status: (data.status as "pending" | "approved" | "denied") ?? "pending",
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
    };
  });
}

export async function adminHandlePremiumRequest(
  requestId: string,
  action: "approve" | "deny",
): Promise<void> {
  const adminId = await requireAdmin();
  const { FieldValue } = await import("firebase-admin/firestore");

  const requestRef = adminDb.collection("premiumRequests").doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) throw new Error("Request not found");

  const requestData = requestSnap.data()!;
  const targetUserId = requestData.userId as string;

  await requestRef.update({
    status: action === "approve" ? "approved" : "denied",
    resolvedAt: FieldValue.serverTimestamp(),
    resolvedBy: adminId,
  });

  if (action === "approve") {
    await adminDb.collection("users").doc(targetUserId).update({ plan: "premium" });
    // Notify the user
    const notifRef = adminDb.collection("notifications").doc();
    await notifRef.set({
      userId: targetUserId,
      type: "premium_approved",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  revalidatePath("/admin");
}

export async function adminSetUserRole(userId: string, role: "admin" | null): Promise<void> {
  await requireAdmin();
  // Granting admin automatically upgrades to premium
  const update: Record<string, unknown> = { role: role ?? null };
  if (role === "admin") update.plan = "premium";
  await adminDb.collection("users").doc(userId).update(update);
  revalidatePath("/admin");
}

/**
 * Fully delete a user:
 *  1. All proposals + sub-collections (events, links, notifications)
 *  2. Banners, integrations, brand-kit, library docs
 *  3. Firebase Storage files (by URL + by directory prefix)
 *  4. Firestore users/{userId} doc
 *  5. Firebase Auth user
 */
export async function adminDeleteUser(userId: string): Promise<void> {
  const callerId = await requireAdmin();
  if (callerId === userId) throw new Error("Cannot delete your own account");

  const allRefs: FirebaseFirestore.DocumentReference[] = [];
  const storageUrls: string[] = [];

  // ── 1. Proposals + sub-collections ────────────────────────────────────────
  const proposalsSnap = await adminDb.collection("proposals").where("userId", "==", userId).get();

  for (const proposalDoc of proposalsSnap.docs) {
    const data = proposalDoc.data();

    // Collect storage URLs referenced in the proposal
    if (data.clientLogoUrl) storageUrls.push(data.clientLogoUrl as string);
    if (data.downloadUrl)   storageUrls.push(data.downloadUrl as string);
    try {
      const blocks: ProposalBlock[] = JSON.parse(data.blocks as string);
      for (const block of blocks) {
        if (block.type === "image" && block.url?.includes("firebasestorage")) storageUrls.push(block.url);
        if (block.type === "pdf"   && block.url) storageUrls.push(block.url);
        if (block.type === "embed" && block.downloadUrl) storageUrls.push(block.downloadUrl);
        if (block.type === "video" && block.url?.includes("firebasestorage")) storageUrls.push(block.url);
      }
    } catch { /* ignore JSON parse errors */ }

    // Fetch sub-collections in parallel
    const [eventsSnap, linksSnap, notifsSnap, commentsSnap] = await Promise.all([
      adminDb.collection("proposalEvents").where("proposalId", "==", proposalDoc.id).get(),
      adminDb.collection("proposalLinks").where("proposalId", "==", proposalDoc.id).get(),
      adminDb.collection("notifications").where("proposalId", "==", proposalDoc.id).get(),
      adminDb.collection("proposalComments").where("proposalId", "==", proposalDoc.id).get(),
    ]);

    allRefs.push(
      ...eventsSnap.docs.map(d => d.ref),
      ...linksSnap.docs.map(d => d.ref),
      ...notifsSnap.docs.map(d => d.ref),
      ...commentsSnap.docs.map(d => d.ref),
      proposalDoc.ref,
    );
  }

  // ── 2. Banners ────────────────────────────────────────────────────────────
  const bannersSnap = await adminDb.collection("banners").where("userId", "==", userId).get();
  for (const doc of bannersSnap.docs) {
    const data = doc.data();
    if (data.bgImageUrl) storageUrls.push(data.bgImageUrl as string);
    if (data.logoUrl)    storageUrls.push(data.logoUrl as string);
    allRefs.push(doc.ref);
  }

  // ── 3. Other top-level user docs ──────────────────────────────────────────
  const [librarySnap, notifSnap] = await Promise.all([
    adminDb.collection("library").where("userId", "==", userId).get().catch(() => null),
    adminDb.collection("notifications").where("userId", "==", userId).get().catch(() => null),
  ]);
  if (librarySnap) allRefs.push(...librarySnap.docs.map(d => d.ref));
  if (notifSnap)   allRefs.push(...notifSnap.docs.map(d => d.ref));

  // Singleton docs
  allRefs.push(
    adminDb.collection("integrations").doc(userId),
    adminDb.collection("brandKits").doc(userId),
    adminDb.collection("users").doc(userId),
  );

  // ── 4. Delete Firestore docs ──────────────────────────────────────────────
  await batchDelete(allRefs);

  // ── 5. Delete Storage files ───────────────────────────────────────────────
  const bucket = adminStorage.bucket();
  await Promise.allSettled([
    // Delete files referenced by URL
    ...storageUrls.filter(Boolean).map(url => deleteStorageFile(url)),
    // Delete entire user directories (catches anything not linked in docs)
    bucket.deleteFiles({ prefix: `banners/${userId}/` }),
    bucket.deleteFiles({ prefix: `logos/${userId}/` }),
    bucket.deleteFiles({ prefix: `documents/${userId}/` }),
  ]);

  // ── 6. Delete Firebase Auth user ──────────────────────────────────────────
  try {
    await adminAuth.deleteUser(userId);
  } catch (err) {
    // User may not exist in Auth (manual Firestore entry etc.) — non-fatal
    console.warn("[adminDeleteUser] Auth delete:", (err as Error).message);
  }

  revalidatePath("/admin");
}
