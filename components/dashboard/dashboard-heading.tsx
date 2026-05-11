"use client";

import { useLanguage } from "@/contexts/language-context";

export function DashboardHeading({ name }: { name: string }) {
  const { t } = useLanguage();
  return (
    <>
      <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Dashboard</h1>
      <p className="text-sm text-gray-400 mt-1">{t("dashboard_welcome")}, {name}</p>
    </>
  );
}
