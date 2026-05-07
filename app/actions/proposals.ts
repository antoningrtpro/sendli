"use server";

import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { ProposalBlock } from "@/types/proposal";

async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createProposal(): Promise<{ id: string }> {
  const userId = await requireAuth();

  const DEFAULT_TITLE = "Nouvelle proposal";

  // ── Auto-select the user's most recent banner ──────────────────────────────
  const bannersSnap = await adminDb.collection("banners")
    .where("userId", "==", userId)
    .get();

  let bannerId: string | null = null;
  if (!bannersSnap.empty) {
    const sorted = bannersSnap.docs
      .map(d => ({ id: d.id, createdAt: d.data().createdAt }))
      .sort((a, b) => {
        const at = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
        const bt = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
        return bt - at;
      });
    bannerId = sorted[0].id;
  }

  // ── Initial blocks: H1 with the proposal title ─────────────────────────────
  const initialBlocks: ProposalBlock[] = [
    {
      id: nanoid(6),
      type: "heading",
      level: 1,
      text: DEFAULT_TITLE,
      align: "left",
      width: "full",
      paddingTop: 24,
      paddingBottom: 8,
    },
  ];

  const ref = adminDb.collection("proposals").doc();
  await ref.set({
    userId, slug: nanoid(8), title: DEFAULT_TITLE,
    blocks: JSON.stringify(initialBlocks),
    published: false, status: "pending", bannerId,
    amountOneShot: null, amountMrr: null, clientLogoUrl: null,
    password: null, showPdfButton: true,
    createdAt: new Date(), updatedAt: new Date(),
  });

  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  return { id: ref.id };
}

export async function duplicateProposal(id: string): Promise<{ id: string }> {
  const userId = await requireAuth();
  const originalSnap = await adminDb.collection("proposals").doc(id).get();
  if (!originalSnap.exists || originalSnap.data()?.userId !== userId) throw new Error("Not found");
  const original = originalSnap.data()!;

  const ref = adminDb.collection("proposals").doc();
  await ref.set({
    ...original,
    slug: nanoid(8),
    title: `${original.title} (Copy)`,
    published: false,
    createdAt: new Date(), updatedAt: new Date(),
  });
  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  return { id: ref.id };
}

export async function updateProposalMeta(id: string, data: {
  status?: "pending" | "won" | "lost";
  amountOneShot?: number | null;
  amountMrr?: number | null;
}) {
  const userId = await requireAuth();
  const snap = await adminDb.collection("proposals").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");
  await adminDb.collection("proposals").doc(id).update({ ...data, updatedAt: new Date() });
  revalidatePath("/proposals");
  revalidatePath("/dashboard");
}

export async function saveProposal(id: string, data: {
  title?: string; blocks?: ProposalBlock[];
  amountOneShot?: number | null; amountMrr?: number | null;
  status?: "pending" | "won" | "lost";
}) {
  const userId = await requireAuth();
  const snap = await adminDb.collection("proposals").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (data.title !== undefined) update.title = data.title;
  if (data.blocks !== undefined) update.blocks = JSON.stringify(data.blocks);
  if (data.amountOneShot !== undefined) update.amountOneShot = data.amountOneShot;
  if (data.amountMrr !== undefined) update.amountMrr = data.amountMrr;
  if (data.status !== undefined) update.status = data.status;

  await adminDb.collection("proposals").doc(id).update(update);
  revalidatePath(`/proposals/${id}/edit`);
}

export async function publishProposal(id: string, published: boolean) {
  const userId = await requireAuth();
  const snap = await adminDb.collection("proposals").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");
  await adminDb.collection("proposals").doc(id).update({ published, updatedAt: new Date() });
  revalidatePath(`/proposals/${id}/edit`);
  revalidatePath("/proposals");
  return { slug: snap.data()!.slug };
}

export async function updateProposalSettings(id: string, data: {
  clientLogoUrl?: string | null;
  password?: string | null;
  showPdfButton?: boolean;
}) {
  const userId = await requireAuth();
  const snap = await adminDb.collection("proposals").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if ("clientLogoUrl" in data) update.clientLogoUrl = data.clientLogoUrl;
  if ("showPdfButton" in data) update.showPdfButton = data.showPdfButton;
  if ("password" in data) {
    update.password = data.password ? await bcrypt.hash(data.password, 10) : null;
  }
  await adminDb.collection("proposals").doc(id).update(update);
  revalidatePath(`/proposals/${id}/edit`);
}

export async function verifyProposalPassword(proposalId: string, entered: string): Promise<boolean> {
  const snap = await adminDb.collection("proposals").doc(proposalId).get();
  const password = snap.data()?.password;
  if (!password) return true;

  const ok = await bcrypt.compare(entered, password);
  if (ok) {
    const jar = await cookies();
    jar.set(`p_access_${proposalId}`, password, {
      httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax",
    });
  }
  return ok;
}

export async function deleteProposal(id: string) {
  const userId = await requireAuth();
  const snap = await adminDb.collection("proposals").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");
  await adminDb.collection("proposals").doc(id).delete();
  revalidatePath("/proposals");
  revalidatePath("/dashboard");
}
