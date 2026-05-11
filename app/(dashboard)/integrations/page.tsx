import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { IntegrationsClient } from "@/components/integrations/integrations-client";
import type { IntegrationKey } from "@/app/actions/integrations";
import { isPremium } from "@/lib/plan";

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [integSnap, userSnap] = await Promise.all([
    adminDb.collection("integrations").doc(session.user.id).get(),
    adminDb.collection("users").doc(session.user.id).get(),
  ]);

  const data = integSnap.exists ? (integSnap.data() ?? {}) : {};
  const userIsPremium = isPremium((userSnap.data()?.plan as string) ?? "free");

  const integrations: Partial<Record<IntegrationKey, { embedCode: string }>> = {};
  for (const k of ["google_calendar", "hubspot"] as IntegrationKey[]) {
    if (data[k]?.embedCode) integrations[k] = { embedCode: data[k].embedCode };
  }

  return <IntegrationsClient initialIntegrations={integrations} isPremium={userIsPremium} />;
}
