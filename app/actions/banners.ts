"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createBanner() {
  const userId = await getUserId();
  const banner = await prisma.banner.create({
    data: { userId, name: "New Banner", bgColor: "#111184", title: "", subtitle: "", textColor: "#ffffff" },
  });
  revalidatePath("/banners");
  return { id: banner.id };
}

export async function saveBanner(id: string, data: {
  name?: string; bgColor?: string; bgImageUrl?: string | null; title?: string;
  subtitle?: string; textColor?: string; logoUrl?: string | null; imageOnly?: boolean;
}) {
  const userId = await getUserId();
  await prisma.banner.updateMany({ where: { id, userId }, data });
  revalidatePath("/banners");
  return { success: true };
}

export async function deleteBanner(id: string) {
  const userId = await getUserId();
  await prisma.banner.deleteMany({ where: { id, userId } });
  revalidatePath("/banners");
}

export async function setProposalBanner(proposalId: string, bannerId: string | null) {
  const userId = await getUserId();
  await prisma.proposal.updateMany({
    where: { id: proposalId, userId },
    data: { bannerId },
  });
  revalidatePath(`/proposals/${proposalId}/edit`);
}
