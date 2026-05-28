"use server";

import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export interface NotificationPrefs {
  page_view: boolean;   // someone opened my proposal
  cta_click: boolean;   // someone clicked a CTA
  time_on_page: boolean; // someone spent > 2 min on a proposal
  comment: boolean;     // someone left a comment
}

export interface AppNotification {
  id: string;
  type: "page_view" | "cta_click" | "time_on_page" | "comment" | "premium_request" | "premium_approved" | "new_signup" | "trial_ending";
  proposalId?: string | null;
  proposalTitle?: string | null;
  visitorName?: string | null;
  visitorEmail?: string | null;
  blockLabel?: string | null;
  durationSeconds?: number | null;
  commentContent?: string | null;
  read: boolean;
  createdAt: Date;
  // premium_request specific fields
  requestUserName?: string | null;
  requestUserEmail?: string | null;
}

const DEFAULT_PREFS: NotificationPrefs = {
  page_view: true,
  cta_click: true,
  time_on_page: false,
  comment: true,
};

// ─── Prefs ────────────────────────────────────────────────────────────────────

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  const session = await getSession();
  if (!session?.user?.id) return DEFAULT_PREFS;
  const snap = await adminDb.collection("users").doc(session.user.id).get();
  const prefs = snap.data()?.notificationPrefs as Partial<NotificationPrefs> | undefined;
  return { ...DEFAULT_PREFS, ...prefs };
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  const session = await getSession();
  if (!session?.user?.id) return;
  await adminDb.collection("users").doc(session.user.id).update({ notificationPrefs: prefs });
  revalidatePath("/settings");
}

// ─── Read notifications ────────────────────────────────────────────────────────

const NOTIF_TTL_DAYS = 30;

export async function getNotifications(limit = 60): Promise<AppNotification[]> {
  const session = await getSession();
  if (!session?.user?.id) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NOTIF_TTL_DAYS);

  // No composite index needed: filter by userId, sort + age-filter client-side
  const snap = await adminDb.collection("notifications")
    .where("userId", "==", session.user.id)
    .limit(limit * 4) // over-fetch: some docs will be expired and deleted
    .get();

  const fresh: AppNotification[] = [];
  const staleRefs: FirebaseFirestore.DocumentReference[] = [];

  for (const d of snap.docs) {
    const data = d.data();
    const createdAt: Date = data.createdAt?.toDate?.() ?? new Date();

    if (createdAt < cutoff) {
      // Older than 30 days — mark for deletion
      staleRefs.push(d.ref);
      continue;
    }

    fresh.push({
      id: d.id,
      type: data.type as AppNotification["type"],
      proposalId: (data.proposalId as string | null | undefined) ?? null,
      proposalTitle: (data.proposalTitle as string | null | undefined) ?? null,
      visitorName: (data.visitorName as string | null | undefined) ?? null,
      visitorEmail: (data.visitorEmail as string | null | undefined) ?? null,
      blockLabel: (data.blockLabel as string | null | undefined) ?? null,
      durationSeconds: (data.durationSeconds as number | null | undefined) ?? null,
      commentContent: (data.commentContent as string | null | undefined) ?? null,
      requestUserName: (data.requestUserName as string | null | undefined) ?? null,
      requestUserEmail: (data.requestUserEmail as string | null | undefined) ?? null,
      read: data.read as boolean,
      createdAt,
    });
  }

  // Delete expired notifications in the background (fire-and-forget)
  if (staleRefs.length > 0) {
    const batch = adminDb.batch();
    staleRefs.forEach(ref => batch.delete(ref));
    batch.commit().catch(() => {});
  }

  return fresh
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

export async function markNotificationRead(id: string): Promise<void> {
  const session = await getSession();
  if (!session?.user?.id) return;
  const snap = await adminDb.collection("notifications").doc(id).get();
  if (snap.exists && snap.data()?.userId === session.user.id) {
    await adminDb.collection("notifications").doc(id).update({ read: true });
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await getSession();
  if (!session?.user?.id) return;

  const snap = await adminDb.collection("notifications")
    .where("userId", "==", session.user.id)
    .where("read", "==", false)
    .get();

  const batch = adminDb.batch();
  snap.docs.forEach(d => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function deleteNotification(id: string): Promise<void> {
  const session = await getSession();
  if (!session?.user?.id) return;
  const snap = await adminDb.collection("notifications").doc(id).get();
  if (snap.exists && snap.data()?.userId === session.user.id) {
    await adminDb.collection("notifications").doc(id).delete();
  }
}

export async function deleteAllReadNotifications(): Promise<void> {
  const session = await getSession();
  if (!session?.user?.id) return;

  const snap = await adminDb.collection("notifications")
    .where("userId", "==", session.user.id)
    .where("read", "==", true)
    .get();

  const batch = adminDb.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}
