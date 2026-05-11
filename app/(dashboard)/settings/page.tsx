import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";
import type { NotificationPrefs } from "@/app/actions/notifications";
import { getLang } from "@/lib/get-lang";
import { createTranslator } from "@/lib/i18n";

const DEFAULT_PREFS: NotificationPrefs = { page_view: true, cta_click: true, time_on_page: false };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const lang = await getLang();
  const t = createTranslator(lang);

  const snap = await adminDb.collection("users").doc(session.user.id).get();
  if (!snap.exists) redirect("/login");

  const data = snap.data()!;
  const user = {
    id: snap.id,
    name: (data.name as string | null) ?? null,
    email: (data.email as string) ?? "",
    phone: (data.phone as string | null) ?? null,
    company: (data.company as string | null) ?? null,
    plan: (data.plan as string) ?? "free",
    createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
  };

  const notificationPrefs: NotificationPrefs = {
    ...DEFAULT_PREFS,
    ...(data.notificationPrefs as Partial<NotificationPrefs> | undefined),
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{t("settings_title")}</h1>
        <p className="text-sm text-gray-400 mt-1">{t("settings_subtitle")}</p>
      </div>
      <SettingsForm user={user} notificationPrefs={notificationPrefs} />
    </div>
  );
}
