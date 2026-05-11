"use server";

import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { ProposalBlock, PdfBlock } from "@/types/proposal";
import { isPremium, FREE_LIMITS } from "@/lib/plan";
import { deleteStorageFile } from "@/app/actions/upload";

/** Delete an array of Firestore doc refs in batches of 500 (Firestore limit) */
async function deleteDocs(refs: FirebaseFirestore.DocumentReference[]) {
  if (refs.length === 0) return;
  const BATCH_SIZE = 500;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = adminDb.batch();
    refs.slice(i, i + BATCH_SIZE).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

/** Fetch the user's plan from Firestore */
async function getUserPlan(userId: string): Promise<string> {
  const snap = await adminDb.collection("users").doc(userId).get();
  return (snap.data()?.plan as string) ?? "free";
}

async function requireAuth() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export interface OnboardingData {
  title: string;
  clientLogoUrl: string | null;
  showPdfButton: boolean;
  commercialPdfUrl: string | null;
  downloadButtonLabel: string | null;
  password: string | null;
}

/** Create a proposal from the onboarding modal data */
export async function createProposalWithData(
  data: OnboardingData,
): Promise<{ id: string } | { error: string }> {
  const userId = await requireAuth();

  const plan = await getUserPlan(userId);
  if (!isPremium(plan)) {
    const existingSnap = await adminDb.collection("proposals").where("userId", "==", userId).get();
    if (existingSnap.size >= FREE_LIMITS.proposals) {
      return { error: `Le plan Free est limité à ${FREE_LIMITS.proposals} proposals. Passez en Premium pour en créer davantage.` };
    }
  }

  const bannersSnap = await adminDb.collection("banners").where("userId", "==", userId).get();
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

  const title = data.title.trim() || "Nouvelle propale";

  const initialBlocks: ProposalBlock[] = [
    { id: nanoid(6), type: "heading", level: 1, text: title, align: "left", width: "full", paddingTop: 24, paddingBottom: 8 },
  ];

  // Append commercial PDF block if a PDF was uploaded
  if (data.commercialPdfUrl) {
    initialBlocks.push({
      id: nanoid(6),
      type: "pdf",
      url: data.commercialPdfUrl,
      label: data.downloadButtonLabel || "Proposition commerciale",
      height: 700,
      width: "full",
      paddingTop: 16,
      paddingBottom: 16,
      isCommercialProposal: true,
    });
  }

  const hashedPassword = data.password
    ? await bcrypt.hash(data.password, 10)
    : null;

  const ref = adminDb.collection("proposals").doc();
  await ref.set({
    userId, slug: nanoid(8), title,
    blocks: JSON.stringify(initialBlocks),
    published: false, status: "pending", bannerId,
    amountOneShot: null, amountMrr: null,
    clientLogoUrl: data.clientLogoUrl,
    password: hashedPassword,
    showPdfButton: data.showPdfButton,
    downloadUrl: data.commercialPdfUrl,
    downloadButtonLabel: data.downloadButtonLabel,
    createdAt: new Date(), updatedAt: new Date(),
  });

  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  return { id: ref.id };
}

/** Duplicate a proposal — keep all blocks but apply new onboarding settings */
export async function duplicateProposalWithData(
  originalId: string,
  data: OnboardingData,
): Promise<{ id: string } | { error: string }> {
  const userId = await requireAuth();

  const plan = await getUserPlan(userId);
  if (!isPremium(plan)) {
    const existingSnap = await adminDb.collection("proposals").where("userId", "==", userId).get();
    if (existingSnap.size >= FREE_LIMITS.proposals) {
      return { error: `Le plan Free est limité à ${FREE_LIMITS.proposals} proposals. Passez en Premium pour dupliquer.` };
    }
  }

  const originalSnap = await adminDb.collection("proposals").doc(originalId).get();
  if (!originalSnap.exists || originalSnap.data()?.userId !== userId) throw new Error("Not found");
  const original = originalSnap.data()!;

  // Parse blocks and update any existing commercial-pdf block URL
  let blocks: ProposalBlock[] = [];
  try { blocks = JSON.parse(original.blocks as string); } catch { blocks = []; }

  if (data.commercialPdfUrl) {
    // Replace existing commercial PDF block or append one
    const hasCommercial = blocks.some(b => b.type === "pdf" && (b as PdfBlock).isCommercialProposal);
    if (hasCommercial) {
      blocks = blocks.map(b =>
        b.type === "pdf" && (b as PdfBlock).isCommercialProposal
          ? { ...b, url: data.commercialPdfUrl!, label: data.downloadButtonLabel || "Proposition commerciale" } as PdfBlock
          : b
      );
    } else {
      blocks.push({
        id: nanoid(6), type: "pdf", url: data.commercialPdfUrl,
        label: data.downloadButtonLabel || "Proposition commerciale",
        height: 700, width: "full", paddingTop: 16, paddingBottom: 16,
        isCommercialProposal: true,
      });
    }
  } else {
    // Remove commercial PDF blocks if no PDF provided
    blocks = blocks.filter(b => !(b.type === "pdf" && (b as PdfBlock).isCommercialProposal));
  }

  const title = data.title.trim() || `${original.title} (Copie)`;
  const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : null;

  const ref = adminDb.collection("proposals").doc();
  await ref.set({
    ...original,
    slug: nanoid(8),
    title,
    blocks: JSON.stringify(blocks),
    published: false,
    clientLogoUrl: data.clientLogoUrl,
    password: hashedPassword,
    showPdfButton: data.showPdfButton,
    downloadUrl: data.commercialPdfUrl,
    downloadButtonLabel: data.downloadButtonLabel,
    createdAt: new Date(), updatedAt: new Date(),
  });

  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  return { id: ref.id };
}

export async function createProposal(): Promise<{ id: string } | { error: string }> {
  const userId = await requireAuth();

  // ── Plan limits ────────────────────────────────────────────────────────────
  const plan = await getUserPlan(userId);
  if (!isPremium(plan)) {
    const existingSnap = await adminDb.collection("proposals").where("userId", "==", userId).get();
    if (existingSnap.size >= FREE_LIMITS.proposals) {
      return { error: `Le plan Free est limité à ${FREE_LIMITS.proposals} proposals. Passez en Premium pour en créer davantage.` };
    }
  }

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

export async function duplicateProposal(id: string): Promise<{ id: string } | { error: string }> {
  const userId = await requireAuth();

  // ── Plan limits ────────────────────────────────────────────────────────────
  const plan = await getUserPlan(userId);
  if (!isPremium(plan)) {
    const existingSnap = await adminDb.collection("proposals").where("userId", "==", userId).get();
    if (existingSnap.size >= FREE_LIMITS.proposals) {
      return { error: `Le plan Free est limité à ${FREE_LIMITS.proposals} proposals. Passez en Premium pour dupliquer.` };
    }
  }

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
}): Promise<{ error: string } | void> {
  const userId = await requireAuth();
  const snap = await adminDb.collection("proposals").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");

  // ── Block limit for free users ─────────────────────────────────────────────
  if (data.blocks !== undefined) {
    const plan = await getUserPlan(userId);
    if (!isPremium(plan) && data.blocks.length > FREE_LIMITS.blocks) {
      return { error: `Le plan Free est limité à ${FREE_LIMITS.blocks} blocs par proposal. Passez en Premium pour en ajouter davantage.` };
    }
  }

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
  downloadUrl?: string | null;
  downloadButtonLabel?: string | null;
}) {
  const userId = await requireAuth();
  const snap = await adminDb.collection("proposals").doc(id).get();
  if (!snap.exists || snap.data()?.userId !== userId) throw new Error("Not found");

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if ("clientLogoUrl" in data) update.clientLogoUrl = data.clientLogoUrl;
  if ("showPdfButton" in data) update.showPdfButton = data.showPdfButton;
  if ("downloadUrl" in data) update.downloadUrl = data.downloadUrl;
  if ("downloadButtonLabel" in data) update.downloadButtonLabel = data.downloadButtonLabel;
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

  const proposal = snap.data()!;

  // Fetch all related sub-collections in parallel
  const [linksSnap, eventsSnap, notificationsSnap] = await Promise.all([
    adminDb.collection("proposalLinks").where("proposalId", "==", id).get(),
    adminDb.collection("proposalEvents").where("proposalId", "==", id).get(),
    adminDb.collection("notifications").where("proposalId", "==", id).get(),
  ]);

  // Cascade delete all related docs + the proposal itself
  await deleteDocs([
    ...linksSnap.docs.map(d => d.ref),
    ...eventsSnap.docs.map(d => d.ref),
    ...notificationsSnap.docs.map(d => d.ref),
    adminDb.collection("proposals").doc(id),
  ]);

  // Clean up Storage files (fire-and-forget, non-fatal)
  const storageUrls: string[] = [];
  if (proposal.clientLogoUrl) storageUrls.push(proposal.clientLogoUrl);
  if (proposal.downloadUrl) storageUrls.push(proposal.downloadUrl);

  // Extract uploaded file URLs from blocks content
  try {
    const blocks: ProposalBlock[] = JSON.parse(proposal.blocks as string);
    for (const block of blocks) {
      if (block.type === "image" && block.url?.includes("firebasestorage")) storageUrls.push(block.url);
      if (block.type === "pdf" && block.url) storageUrls.push(block.url);
      if (block.type === "embed" && block.downloadUrl) storageUrls.push(block.downloadUrl);
    }
  } catch { /* ignore JSON parse errors */ }

  if (storageUrls.length > 0) {
    await Promise.allSettled(storageUrls.map(url => deleteStorageFile(url)));
  }

  revalidatePath("/proposals");
  revalidatePath("/dashboard");
}
