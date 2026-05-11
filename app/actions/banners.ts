"use server";

import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import { deleteStorageFile } from "@/app/actions/upload";

async function getUserId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createBanner() {
  const userId = await getUserId();
  const ref = adminDb.collection("banners").doc();
  await ref.set({
    userId, name: "New Banner", bgColor: "#111184", bgImageUrl: null,
    title: "", subtitle: "", textColor: "#ffffff", logoUrl: null, imageOnly: false,
    createdAt: new Date(), updatedAt: new Date(),
  });
  revalidatePath("/banners");
  return { id: ref.id };
}

export async function saveBanner(id: string, data: {
  name?: string; bgColor?: string; bgImageUrl?: string | null; title?: string;
  subtitle?: string; textColor?: string; logoUrl?: string | null; imageOnly?: boolean;
}) {
  const userId = await getUserId();
  const snap = await adminDb.collection("banners").doc(id).get();
  if (!snap.exists) return { success: false, error: "not found" };
  if (snap.data()?.userId !== userId) return { success: false, error: "unauthorized" };

  await adminDb.collection("banners").doc(id).update({ ...data, updatedAt: new Date() });
  revalidatePath("/banners");
  revalidatePath("/brand-kit");
  return { success: true };
}

export async function deleteBanner(id: string) {
  const userId = await getUserId();
  const snap = await adminDb.collection("banners").doc(id).get();
  if (snap.exists && snap.data()?.userId === userId) {
    const data = snap.data()!;
    const toDelete = [data.bgImageUrl, data.logoUrl].filter(Boolean) as string[];
    await Promise.allSettled(toDelete.map(url => deleteStorageFile(url)));
    await adminDb.collection("banners").doc(id).delete();
  }
  revalidatePath("/banners");
}

export async function setProposalBanner(proposalId: string, bannerId: string | null) {
  const userId = await getUserId();
  const snap = await adminDb.collection("proposals").doc(proposalId).get();
  if (snap.exists && snap.data()?.userId === userId) {
    await adminDb.collection("proposals").doc(proposalId).update({ bannerId, updatedAt: new Date() });
  }
  revalidatePath(`/proposals/${proposalId}/edit`);
}
