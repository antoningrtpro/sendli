"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const session = await auth();
  if (!session?.user?.id) return [];

  // Verify ownership
  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, userId: session.user.id },
    select: { id: true },
  });
  if (!proposal) return [];

  const links = await prisma.proposalLink.findMany({
    where: { proposalId },
    orderBy: { createdAt: "desc" },
  });

  // Fetch view stats per link
  const linkIds = links.map(l => l.id);

  const [viewGroups, lastSeenGroups] = await Promise.all([
    prisma.proposalEvent.groupBy({
      by: ["linkId", "visitorHash"],
      where: { linkId: { in: linkIds }, eventType: "page_view" },
      _count: { id: true },
    }),
    prisma.proposalEvent.groupBy({
      by: ["linkId"],
      where: { linkId: { in: linkIds } },
      _max: { createdAt: true },
    }),
  ]);

  const viewMap: Record<string, { views: number; unique: number }> = {};
  for (const g of viewGroups) {
    if (!g.linkId) continue;
    if (!viewMap[g.linkId]) viewMap[g.linkId] = { views: 0, unique: 0 };
    viewMap[g.linkId].views += g._count.id;
    viewMap[g.linkId].unique += 1;
  }

  const lastSeenMap: Record<string, Date | null> = {};
  for (const g of lastSeenGroups) {
    if (g.linkId) lastSeenMap[g.linkId] = g._max.createdAt;
  }

  return links.map(l => ({
    id: l.id,
    token: l.token,
    recipientEmail: l.recipientEmail,
    recipientName: l.recipientName,
    createdAt: l.createdAt,
    views: viewMap[l.id]?.views ?? 0,
    uniqueVisitors: viewMap[l.id]?.unique ?? 0,
    lastSeenAt: lastSeenMap[l.id] ?? null,
  }));
}

// ── Create a new link ─────────────────────────────────────────────────────────

export async function createProposalLink(
  proposalId: string,
  recipientEmail?: string,
  recipientName?: string,
): Promise<ProposalLinkWithStats | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const proposal = await prisma.proposal.findFirst({
    where: { id: proposalId, userId: session.user.id },
    select: { id: true },
  });
  if (!proposal) return null;

  // Ensure token uniqueness
  let token = generateToken();
  let exists = await prisma.proposalLink.findUnique({ where: { token } });
  while (exists) {
    token = generateToken();
    exists = await prisma.proposalLink.findUnique({ where: { token } });
  }

  const link = await prisma.proposalLink.create({
    data: {
      proposalId,
      token,
      recipientEmail: recipientEmail?.trim() || null,
      recipientName: recipientName?.trim() || null,
    },
  });

  revalidatePath(`/proposals/${proposalId}/edit`);

  return {
    id: link.id,
    token: link.token,
    recipientEmail: link.recipientEmail,
    recipientName: link.recipientName,
    createdAt: link.createdAt,
    views: 0,
    uniqueVisitors: 0,
    lastSeenAt: null,
  };
}

// ── Delete a link ─────────────────────────────────────────────────────────────

export async function deleteProposalLink(linkId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  // Verify ownership via proposal
  const link = await prisma.proposalLink.findFirst({
    where: { id: linkId },
    include: { proposal: { select: { userId: true, id: true } } },
  });
  if (!link || link.proposal.userId !== session.user.id) return;

  await prisma.proposalLink.delete({ where: { id: linkId } });
  revalidatePath(`/proposals/${link.proposal.id}/edit`);
}
