import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase-admin";
import { getAdminUsers } from "@/app/actions/admin";
import { AdminPanel } from "@/components/admin/admin-panel";
import { getLang } from "@/lib/get-lang";
import { createTranslator } from "@/lib/i18n";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Guard: only admins can access
  const userSnap = await adminDb.collection("users").doc(session.user.id).get();
  if (userSnap.data()?.role !== "admin") redirect("/dashboard");

  const [users, lang] = await Promise.all([getAdminUsers(), getLang()]);
  const t = createTranslator(lang);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{t("admin_title")}</h1>
        <p className="text-sm text-gray-400 mt-1">{users.length} {t("admin_users", { s: users.length !== 1 ? "s" : "" })}</p>
      </div>
      <AdminPanel users={users} currentUserId={session.user.id} />
    </div>
  );
}
