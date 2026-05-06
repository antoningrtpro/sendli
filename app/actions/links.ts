"use server";

import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";

function generateToken(): string {
  return randomBytes(8).toString("hex"); // 16-char hex
}

export interface ProposalLinkWithStats {
  id: string;
  token: string;
  recipientEmail: string | null;
  recipientName: string | null;
  createdAt: Date;
  views: number;
  uniqueVisitors: number;
  lastSeenAt: Date | null;
}

// ── List links for a proposal ─────────────────────────────────────────────────

export async function getProposalLinks(proposalId: string): Promise<ProposalLinkWithStats[]> {
  const session = await getSession();
  if (!session?.user?.id) return [];

  // Verify ownership
  const proposalSnap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!proposalSnap.exists || proposalSnap.data()?.userId !== session.user.id) return [];

  const linksSnap = await adminDb.collection("proposalLinks")
    .where("proposalId", "==", proposalId)
    .orderBy("createdAt", "desc")
    .get();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const links = linksSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  const linkIds = links.map(l => l.id);

  if (linkIds.length === 0) return [];

  // Fetch all events for these links and aggregate in memory
  const eventsSnap = await adminDb.collection("proposalEvents")
    .where("proposalId", "==", proposalId)
    .where("eventType", "==", "page_view")
    .get();

  const viewMap: Record<string, { views: number; unique: Set<string>; lastSeen: Date | null }> = {};
  for (const doc of eventsSnap.docs) {
    const d = doc.data();
    if (!d.linkId || !linkIds.includes(d.linkId)) continue;
    if (!viewMap[d.linkId]) viewMap[d.linkId] = { views: 0, unique: new Set(), lastSeen: null };
    viewMap[d.linkId].views += 1;
    if (d.visitorHash) viewMap[d.linkId].unique.add(d.visitorHash);
    const createdAt = d.createdAt?.toDate?.() ?? new Date(d.createdAt);
    if (!viewMap[d.linkId].lastSeen || createdAt > viewMap[d.linkId].lastSeen!) {
      viewMap[d.linkId].lastSeen = createdAt;
    }
  }

  return links.map(l => ({
    id: l.id,
    token: l.token,
    recipientEmail: l.recipientEmail ?? null,
    recipientName: l.recipientName ?? null,
    createdAt: l.createdAt?.toDate?.() ?? new Date(l.createdAt),
    views: viewMap[l.id]?.views ?? 0,
    uniqueVisitors: viewMap[l.id]?.unique.size ?? 0,
    lastSeenAt: viewMap[l.id]?.lastSeen ?? null,
  }));
}

// ── Create a new link ─────────────────────────────────────────────────────────

export async function createProposalLink(
  proposalId: string,
  recipientEmail?: string,
  recipientName?: string,
): Promise<ProposalLinkWithStats | null> {
  const session = await getSession();
  if (!session?.user?.id) return null;

  const proposalSnap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!proposalSnap.exists || proposalSnap.data()?.userId !== session.user.id) return null;

  // Ensure token uniqueness
  let token = generateToken();
  let tokenExists = !(await adminDb.collection("proposalLinks").where("token", "==", token).limit(1).get()).empty;
  while (tokenExists) {
    token = generateToken();
    tokenExists = !(await adminDb.collection("proposalLinks").where("token", "==", token).limit(1).get()).empty;
  }

  const ref = adminDb.collection("proposalLinks").doc();
  const now = new Date();
  await ref.set({
    proposalId,
    token,
    recipientEmail: recipientEmail?.trim() || null,
    recipientName: recipientName?.trim() || null,
    createdAt: now,
  });

  revalidatePath(`/proposals/${proposalId}/edit`);

  return {
    id: ref.id,
    token,
    recipientEmail: recipientEmail?.trim() || null,
    recipientName: recipientName?.trim() || null,
    createdAt: now,
    views: 0,
    uniqueVisitors: 0,
    lastSeenAt: null,
  };
}

// ── Delete a link ─────────────────────────────────────────────────────────────

export async function deleteProposalLink(linkId: string): Promise<void> {
  const session = await getSession();
  if (!session?.user?.id) return;

  const linkSnap = await adminDb.collection("proposalLinks").doc(linkId).get();
  if (!linkSnap.exists) return;

  const link = linkSnap.data()!;
  const proposalSnap = await adminDb.collection("proposals").doc(link.proposalId).get();
  if (!proposalSnap.exists || proposalSnap.data()?.userId !== session.user.id) return;

  await adminDb.collection("proposalLinks").doc(linkId).delete();
  revalidatePath(`/proposals/${link.proposalId}/edit`);
}
