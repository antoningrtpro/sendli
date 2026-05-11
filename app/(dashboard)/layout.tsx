import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/contexts/language-context";
import { getLang } from "@/lib/get-lang";
import { checkAndDowngradeTrial } from "@/app/actions/onboarding";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const [userSnap, initialLang] = await Promise.all([
    adminDb.collection("users").doc(session.user.id).get(),
    getLang(),
  ]);
  const isAdmin = userSnap.data()?.role === "admin";
  // Treat undefined (pre-onboarding users) as completed — only show modal
  // when the field is explicitly false (set on new registrations).
  const onboardingCompleted = userSnap.data()?.onboardingCompleted !== false;

  if (onboardingCompleted) {
    await checkAndDowngradeTrial(session.user.id);
  }

  return (
    <LanguageProvider initialLang={initialLang}>
    <OnboardingGate onboardingCompleted={onboardingCompleted}>
    <div className="flex min-h-screen" style={{ background: "var(--background)" }}>
      <Sidebar isAdmin={isAdmin} />
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "14px",
            background: "#1d1d1f",
            color: "#fff",
            fontSize: "13px",
            fontFamily: "var(--font-sans)",
            padding: "12px 16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          },
        }}
      />
    </div>
    </OnboardingGate>
    </LanguageProvider>
  );
}
