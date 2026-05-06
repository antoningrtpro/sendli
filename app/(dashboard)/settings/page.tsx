import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const snap = await adminDb.collection("users").doc(session.user.id).get();
  if (!snap.exists) redirect("/login");

  const data = snap.data()!;
  const user = {
    id: snap.id,
    name: (data.name as string | null) ?? null,
    email: (data.email as string) ?? "",
    phone: (data.phone as string | null) ?? null,
    plan: (data.plan as string) ?? "free",
    createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Settings</h1>
        <p className="text-sm text-gray-400 mt-1">Manage your account and preferences</p>
      </div>
      <SettingsForm user={user} />
    </div>
  );
}
