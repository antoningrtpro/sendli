"use server";

import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
import type { Plan } from "@/lib/plan";

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  plan: Plan;
  role: string | null;
  proposalCount: number;
  createdAt: Date;
}

async function requireAdmin(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const snap = await adminDb.collection("users").doc(session.user.id).get();
  if (snap.data()?.role !== "admin") throw new Error("Forbidden");
  return session.user.id;
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user?.id) return false;
  const snap = await adminDb.collection("users").doc(session.user.id).get();
  return snap.data()?.role === "admin";
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  await requireAdmin();

  const usersSnap = await adminDb.collection("users").get();

  // Count proposals per user in one pass
  const proposalsSnap = await adminDb.collection("proposals").get();
  const proposalCounts: Record<string, number> = {};
  for (const doc of proposalsSnap.docs) {
    const uid = doc.data().userId as string;
    if (uid) proposalCounts[uid] = (proposalCounts[uid] ?? 0) + 1;
  }

  return usersSnap.docs
    .map(d => {
      const data = d.data();
      const rawPlan = (data.plan as string) ?? "free";
      const plan: Plan = rawPlan === "premium" || rawPlan === "pro" ? "premium" : "free";
      return {
        id: d.id,
        name: (data.name as string | null) ?? null,
        email: (data.email as string) ?? "",
        company: (data.company as string | null) ?? null,
        plan,
        role: (data.role as string | null) ?? null,
        proposalCount: proposalCounts[d.id] ?? 0,
        createdAt: data.createdAt?.toDate?.() ?? new Date(),
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function adminSetUserPlan(userId: string, plan: Plan): Promise<void> {
  await requireAdmin();
  await adminDb.collection("users").doc(userId).update({ plan });
  revalidatePath("/admin");
}

export async function adminSetUserRole(userId: string, role: "admin" | null): Promise<void> {
  await requireAdmin();
  // Granting admin automatically upgrades to premium
  const update: Record<string, unknown> = { role: role ?? null };
  if (role === "admin") update.plan = "premium";
  await adminDb.collection("users").doc(userId).update(update);
  revalidatePath("/admin");
}
