"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ProposalBlock } from "@/types/proposal";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── Content stripping for "template" mode ────────────────────────────────────
// Keeps structural/design settings, clears user-specific text content.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDesign(block: ProposalBlock): Record<string, any> {
  const base = { type: block.type, width: block.width, paddingTop: block.paddingTop, paddingBottom: block.paddingBottom };
  switch (block.type) {
    case "heading":     return { ...base, level: block.level, align: block.align ?? "left", text: "" };
    case "text":        return { ...base, content: "" };
    case "image":       return { ...base, url: "", alt: "", caption: "" };
    case "video":       return { ...base, url: "", caption: "" };
    case "embed":       return { ...base, html: "", caption: "" };
    case "pdf":         return { ...base, url: "", label: "", height: block.height };
    case "divider":     return { ...base, color: block.color, thickness: block.thickness };
    case "spacer":      return { ...base, height: block.height };
    case "pricing":     return { ...base, title: "", items: [], currency: block.currency, showTotal: block.showTotal };
    case "cta":         return { ...base, label: "Votre appel à l'action", url: "", align: block.align };
    case "metrics":     return { ...base, items: [{ id: "m1", value: "", label: "" }, { id: "m2", value: "", label: "" }, { id: "m3", value: "", label: "" }] };
    case "testimonial": return { ...base, testimonials: [] };
    case "timeline":    return { ...base, title: "", items: [] };
    case "faq":         return { ...base, title: "", items: [] };
    case "signature":   return { ...base, contractUrl: "", buttonLabel: block.buttonLabel, description: "" };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case "team":        return { ...base, members: (block as any).members.map((m: any) => ({ ...m, name: "", role: "" })) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case "enjeux":      return { ...base, tag: (block as any).tag, title: "", subtitle: "", items: (block as any).items.map((it: any) => ({ ...it, title: "", description: "" })) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    case "case-study":  return { ...base, title: "", tags: (block as any).tags, description: "", quote: "", authorName: "", authorRole: "", authorAvatarUrl: "", linkLabel: (block as any).linkLabel, linkUrl: "", mediaUrl: "", metrics: ((block as any).metrics ?? []).map((m: any) => ({ ...m, value: "", label: "" })) };
    default:            return { ...base };
  }
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function saveBlockAsFavorite(
  block: ProposalBlock,
  name: string,
  mode: "ultra" | "template"
): Promise<{ id: string }> {
  const userId = await requireAuth();

  // Strip internal meta fields before saving
  const { _savedBlockId: _a, _savedMode: _b, ...cleanBlock } = block as ProposalBlock & { _savedBlockId?: string; _savedMode?: string };
  const dataToSave = mode === "template" ? extractDesign(cleanBlock as ProposalBlock) : cleanBlock;

  const saved = await prisma.savedBlock.create({
    data: { userId, name, blockType: block.type, data: JSON.stringify(dataToSave), mode },
  });
  revalidatePath("/library");
  return { id: saved.id };
}

export async function getSavedBlocks() {
  const userId = await requireAuth();
  return prisma.savedBlock.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteSavedBlock(id: string) {
  const userId = await requireAuth();
  await prisma.savedBlock.deleteMany({ where: { id, userId } });
  revalidatePath("/library");
}

export async function renameSavedBlock(id: string, name: string) {
  const userId = await requireAuth();
  await prisma.savedBlock.updateMany({ where: { id, userId }, data: { name } });
}

/**
 * Called when saving a proposal that contains ultra blocks.
 * Updates the SavedBlock master + syncs to all other proposals that reference it.
 */
export async function syncUltraBlocks(
  currentProposalId: string,
  ultraBlocks: Array<{ savedBlockId: string; block: ProposalBlock }>
) {
  const userId = await requireAuth();

  for (const { savedBlockId, block } of ultraBlocks) {
    // Strip meta before saving to master
    const { _savedBlockId: _a, _savedMode: _b, id: _id, ...cleanBlock } = block as ProposalBlock & { _savedBlockId?: string; _savedMode?: string };

    // Update the master SavedBlock
    await prisma.savedBlock.updateMany({
      where: { id: savedBlockId, userId },
      data: { data: JSON.stringify(cleanBlock), updatedAt: new Date() },
    });

    // Sync to all OTHER proposals
    const proposals = await prisma.proposal.findMany({
      where: { userId, id: { not: currentProposalId } },
      select: { id: true, blocks: true },
    });

    for (const proposal of proposals) {
      let blocks: ProposalBlock[];
      try { blocks = JSON.parse(proposal.blocks); } catch { continue; }

      let changed = false;
      const updated = blocks.map(b => {
        if (b._savedBlockId === savedBlockId && b._savedMode === "ultra") {
          changed = true;
          return { ...cleanBlock, id: b.id, _savedBlockId: savedBlockId, _savedMode: "ultra" } as ProposalBlock;
        }
        return b;
      });

      if (changed) {
        await prisma.proposal.update({ where: { id: proposal.id }, data: { blocks: JSON.stringify(updated) } });
      }
    }
  }
}
