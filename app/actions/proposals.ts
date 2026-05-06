"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { ProposalBlock } from "@/types/proposal";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createProposal(): Promise<{ id: string }> {
  const userId = await requireAuth();
  const proposal = await prisma.proposal.create({
    data: { userId, slug: nanoid(8), title: "Untitled Proposal", blocks: JSON.stringify([]) },
  });
  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  return { id: proposal.id };
}

export async function duplicateProposal(id: string): Promise<{ id: string }> {
  const userId = await requireAuth();
  const original = await prisma.proposal.findFirst({ where: { id, userId } });
  if (!original) throw new Error("Not found");

  const copy = await prisma.proposal.create({
    data: {
      userId,
      bannerId: original.bannerId,
      slug: nanoid(8),
      title: `${original.title} (Copy)`,
      blocks: original.blocks,
      published: false,
    },
  });
  revalidatePath("/proposals");
  revalidatePath("/dashboard");
  return { id: copy.id };
}

export async function updateProposalMeta(id: string, data: {
  status?: "pending" | "won" | "lost";
  amountOneShot?: number | null;
  amountMrr?: number | null;
}) {
  const userId = await requireAuth();
  const proposal = await prisma.proposal.findFirst({ where: { id, userId } });
  if (!proposal) throw new Error("Not found");
  await prisma.proposal.update({ where: { id }, data });
  revalidatePath("/proposals");
  revalidatePath("/dashboard");
}

export async function saveProposal(id: string, data: { title?: string; blocks?: ProposalBlock[]; amountOneShot?: number | null; amountMrr?: number | null; status?: "pending" | "won" | "lost" }) {
  const userId = await requireAuth();
  const proposal = await prisma.proposal.findFirst({ where: { id, userId } });
  if (!proposal) throw new Error("Not found");

  await prisma.proposal.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.blocks !== undefined && { blocks: JSON.stringify(data.blocks) }),
      ...(data.amountOneShot !== undefined && { amountOneShot: data.amountOneShot }),
      ...(data.amountMrr !== undefined && { amountMrr: data.amountMrr }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
  revalidatePath(`/proposals/${id}/edit`);
}

export async function publishProposal(id: string, published: boolean) {
  const userId = await requireAuth();
  const proposal = await prisma.proposal.findFirst({ where: { id, userId } });
  if (!proposal) throw new Error("Not found");
  await prisma.proposal.update({ where: { id }, data: { published } });
  revalidatePath(`/proposals/${id}/edit`);
  revalidatePath("/proposals");
  return { slug: proposal.slug };
}

export async function updateProposalSettings(id: string, data: {
  clientLogoUrl?: string | null;
  password?: string | null; // plain text — will be hashed here, or null to remove
  showPdfButton?: boolean;
}) {
  const userId = await requireAuth();
  const proposal = await prisma.proposal.findFirst({ where: { id, userId } });
  if (!proposal) throw new Error("Not found");

  const update: Record<string, unknown> = {};
  if ("clientLogoUrl" in data) update.clientLogoUrl = data.clientLogoUrl;
  if ("showPdfButton" in data) update.showPdfButton = data.showPdfButton;
  if ("password" in data) {
    update.password = data.password ? await bcrypt.hash(data.password, 10) : null;
  }

  await prisma.proposal.update({ where: { id }, data: update });
  revalidatePath(`/proposals/${id}/edit`);
}

/** Vérifie le mot de passe depuis la page publique et pose un cookie d'accès */
export async function verifyProposalPassword(proposalId: string, entered: string): Promise<boolean> {
  const proposal = await prisma.proposal.findUnique({ where: { id: proposalId }, select: { password: true } });
  if (!proposal?.password) return true;

  const ok = await bcrypt.compare(entered, proposal.password);
  if (ok) {
    const jar = await cookies();
    jar.set(`p_access_${proposalId}`, proposal.password, {
      httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax",
    });
  }
  return ok;
}

export async function deleteProposal(id: string) {
  const userId = await requireAuth();
  await prisma.proposal.deleteMany({ where: { id, userId } });
  revalidatePath("/proposals");
  revalidatePath("/dashboard");
}
