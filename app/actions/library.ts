"use server";

import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

async function getUserId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function saveTestimonial(data: {
  id?: string; quote: string; author: string; role: string; company: string; avatarUrl?: string;
}) {
  const userId = await getUserId();
  const payload = {
    userId, quote: data.quote, author: data.author, role: data.role,
    company: data.company, avatarUrl: data.avatarUrl || null, updatedAt: new Date(),
  };
  if (data.id) {
    const snap = await adminDb.collection("testimonials").doc(data.id).get();
    if (snap.exists && snap.data()?.userId === userId) {
      await adminDb.collection("testimonials").doc(data.id).update(payload);
    }
  } else {
    await adminDb.collection("testimonials").doc().set({ ...payload, createdAt: new Date() });
  }
  revalidatePath("/library");
}

export async function deleteTestimonial(id: string) {
  const userId = await getUserId();
  const snap = await adminDb.collection("testimonials").doc(id).get();
  if (snap.exists && snap.data()?.userId === userId) {
    await adminDb.collection("testimonials").doc(id).delete();
  }
  revalidatePath("/library");
}

export async function saveCaseStudy(data: {
  id?: string; title: string; tags: string[]; description: string;
  quote?: string; authorName?: string; authorRole?: string; authorAvatarUrl?: string;
  linkLabel?: string; linkUrl?: string; mediaUrl?: string;
  metrics: { id: string; value: string; label: string }[];
}) {
  const userId = await getUserId();
  const payload = {
    userId,
    title: data.title,
    tags: data.tags,
    description: data.description,
    quote: data.quote || null,
    authorName: data.authorName || null,
    authorRole: data.authorRole || null,
    authorAvatarUrl: data.authorAvatarUrl || null,
    linkLabel: data.linkLabel || null,
    linkUrl: data.linkUrl || null,
    mediaUrl: data.mediaUrl || null,
    metrics: data.metrics,
    updatedAt: new Date(),
  };
  if (data.id) {
    const snap = await adminDb.collection("caseStudies").doc(data.id).get();
    if (snap.exists && snap.data()?.userId === userId) {
      await adminDb.collection("caseStudies").doc(data.id).update(payload);
    }
  } else {
    await adminDb.collection("caseStudies").doc().set({ ...payload, createdAt: new Date() });
  }
  revalidatePath("/library");
}

export async function deleteCaseStudy(id: string) {
  const userId = await getUserId();
  const snap = await adminDb.collection("caseStudies").doc(id).get();
  if (snap.exists && snap.data()?.userId === userId) {
    await adminDb.collection("caseStudies").doc(id).delete();
  }
  revalidatePath("/library");
}
