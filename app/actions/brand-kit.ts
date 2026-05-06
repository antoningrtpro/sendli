"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveBrandKit(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const data = {
    primaryColor: (formData.get("primaryColor") as string) || "#6366f1",
    secondaryColor: (formData.get("secondaryColor") as string) || "#8b5cf6",
    fontFamily: (formData.get("fontFamily") as string) || "Inter",
    bgColor: (formData.get("bgColor") as string) || "#ffffff",
    textColor: (formData.get("textColor") as string) || "#1f2937",
    logoUrl: (formData.get("logoUrl") as string) || undefined,
  };

  await prisma.brandKit.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });

  revalidatePath("/brand-kit");
  return { success: true };
}
