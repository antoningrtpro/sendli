"use server";

import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";

export type IntegrationKey = "google_calendar" | "hubspot";

export interface Integration {
  key: IntegrationKey;
  embedCode: string;
  updatedAt: Date;
}

async function getUserId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

/** Save or update a single integration embed code */
export async function saveIntegration(
  key: IntegrationKey,
  embedCode: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId();
    await adminDb
      .collection("integrations")
      .doc(userId)
      .set({ [key]: { embedCode, updatedAt: new Date() } }, { merge: true });
    revalidatePath("/integrations");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/** Remove a single integration */
export async function deleteIntegration(
  key: IntegrationKey,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getUserId();
    const { FieldValue } = await import("firebase-admin/firestore");
    await adminDb
      .collection("integrations")
      .doc(userId)
      .update({ [key]: FieldValue.delete() });
    revalidatePath("/integrations");
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/** Fetch all integrations for the current user */
export async function getIntegrations(): Promise<
  Partial<Record<IntegrationKey, { embedCode: string }>>
> {
  try {
    const userId = await getUserId();
    const snap = await adminDb.collection("integrations").doc(userId).get();
    if (!snap.exists) return {};
    const data = snap.data() ?? {};
    const result: Partial<Record<IntegrationKey, { embedCode: string }>> = {};
    for (const k of ["google_calendar", "hubspot"] as IntegrationKey[]) {
      if (data[k]?.embedCode) result[k] = { embedCode: data[k].embedCode };
    }
    return result;
  } catch {
    return {};
  }
}
