"use server";

import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const trialEndsAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

  await adminDb.collection("users").doc(session.user.id).update({
    onboardingCompleted: true,
    plan: "premium",
    trialEndsAt,
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function checkAndDowngradeTrial(userId: string): Promise<boolean> {
  const snap = await adminDb.collection("users").doc(userId).get();
  if (!snap.exists) return false;

  const data = snap.data()!;
  const now = new Date();

  const shouldDowngrade =
    data.plan === "premium" &&
    data.trialEndsAt != null &&
    data.trialEndsAt.toDate?.() < now &&
    data.onboardingCompleted === true &&
    data.role !== "admin";

  if (shouldDowngrade) {
    await adminDb.collection("users").doc(userId).update({ plan: "free" });
    return true;
  }

  return false;
}
