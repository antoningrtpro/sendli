"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function getUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

export async function saveTestimonial(data: {
  id?: string;
  quote: string;
  author: string;
  role: string;
  company: string;
  avatarUrl?: string;
}) {
  const userId = await getUserId();
  if (data.id) {
    await prisma.testimonial.updateMany({
      where: { id: data.id, userId },
      data: { quote: data.quote, author: data.author, role: data.role, company: data.company, avatarUrl: data.avatarUrl || null },
    });
  } else {
    await prisma.testimonial.create({
      data: { userId, quote: data.quote, author: data.author, role: data.role, company: data.company, avatarUrl: data.avatarUrl || null },
    });
  }
  revalidatePath("/library");
}

export async function deleteTestimonial(id: string) {
  const userId = await getUserId();
  await prisma.testimonial.deleteMany({ where: { id, userId } });
  revalidatePath("/library");
}

// ─── Case Studies ─────────────────────────────────────────────────────────────

export async function saveCaseStudy(data: {
  id?: string;
  title: string;
  tags: string[];
  description: string;
  quote?: string;
  authorName?: string;
  authorRole?: string;
  authorAvatarUrl?: string;
  linkLabel?: string;
  linkUrl?: string;
  mediaUrl?: string;
  metrics: { id: string; value: string; label: string }[];
}) {
  const userId = await getUserId();
  const payload = {
    title: data.title,
    tags: JSON.stringify(data.tags),
    description: data.description,
    quote: data.quote || null,
    authorName: data.authorName || null,
    authorRole: data.authorRole || null,
    authorAvatarUrl: data.authorAvatarUrl || null,
    linkLabel: data.linkLabel || null,
    linkUrl: data.linkUrl || null,
    mediaUrl: data.mediaUrl || null,
    metrics: JSON.stringify(data.metrics),
  };
  if (data.id) {
    await prisma.caseStudy.updateMany({ where: { id: data.id, userId }, data: payload });
  } else {
    await prisma.caseStudy.create({ data: { userId, ...payload } });
  }
  revalidatePath("/library");
}

export async function deleteCaseStudy(id: string) {
  const userId = await getUserId();
  await prisma.caseStudy.deleteMany({ where: { id, userId } });
  revalidatePath("/library");
}
