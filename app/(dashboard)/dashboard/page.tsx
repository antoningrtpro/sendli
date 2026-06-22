import type { Metadata } from "next";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };
import { adminDb } from "@/lib/firebase-admin";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateProposalButton } from "@/components/proposal/create-proposal-button";
import { AnalyticsSection } from "@/components/dashboard/analytics-section";
import { DashboardHeading } from "@/components/dashboard/dashboard-heading";
import { RecentProposals } from "@/components/dashboard/recent-proposals";
import type { RecentProposal } from "@/components/dashboard/recent-proposals";
import { FileText, Eye, Trophy, Hourglass, XCircle } from "lucide-react";
import { isPremium } from "@/lib/plan";
import { getLang } from "@/lib/get-lang";
import { createTranslator } from "@/lib/i18n";

function getTs(v: { toDate?: () => Date } | string | null | undefined): number {
  if (!v) return 0;
  if (typeof v === "object" && v.toDate) return v.toDate().getTime();
  return new Date(v as string).getTime();
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const lang = await getLang();
  const t = createTranslator(lang);

  const [proposalsSnap, userSnap] = await Promise.all([
    adminDb.collection("proposals").where("userId", "==", userId)
      .select("title", "status", "amountOneShot", "amountMrr", "updatedAt", "createdAt", "published", "slug")
      .get(),
    adminDb.collection("users").doc(userId).get(),
  ]);
  const userPlan = (userSnap.data()?.plan as string) ?? "free";
  const userIsPremium = isPremium(userPlan);

  type P = {
    id: string;
    status: string;
    amountOneShot: number | null;
    amountMrr: number | null;
    title: string;
    published: boolean;
    slug?: string;
    updatedAt: { toDate?: () => Date } | string;
    createdAt?: { toDate?: () => Date } | string;
  };
  const proposals: P[] = proposalsSnap.docs.map((d): P => ({ id: d.id, ...d.data() } as P));

  // Sort all proposals by updatedAt for analytics
  proposals.sort((a, b) => getTs(b.updatedAt) - getTs(a.updatedAt));
  const proposalIds = proposals.map(p => p.id);

  // Aggregate view counts + last interaction timestamp in memory
  const viewMap: Record<string, number> = {};
  const lastInteractionMap: Record<string, number> = {};
  if (proposalIds.length > 0) {
    const eventsSnap = await adminDb.collection("proposalEvents")
      .where("proposalId", "in", proposalIds.slice(0, 30))
      .limit(2000)
      .get();
    for (const doc of eventsSnap.docs.filter(doc => doc.data().eventType === "page_view")) {
      const data = doc.data();
      const pid = data.proposalId;
      viewMap[pid] = (viewMap[pid] ?? 0) + 1;
      const ts = getTs(data.createdAt);
      if (ts > (lastInteractionMap[pid] ?? 0)) lastInteractionMap[pid] = ts;
    }
  }

  // Proposals ranked by most recent prospect interaction (no interaction → pushed last)
  const sortedByInteraction = [...proposals].sort((a, b) => {
    const aTs = lastInteractionMap[a.id] ?? 0;
    const bTs = lastInteractionMap[b.id] ?? 0;
    return bTs - aTs;
  });

  // ── Business stats ──────────────────────────────────────────────────────────
  const won     = proposals.filter(p => p.status === "won");
  const lost    = proposals.filter(p => p.status === "lost");
  const pending = proposals.filter(p => p.status === "pending" || !p.status);

  function sumAmounts(list: P[]) {
    const mrr      = list.reduce((s, p) => s + (p.amountMrr      ?? 0), 0);
    const oneShot  = list.reduce((s, p) => s + (p.amountOneShot  ?? 0), 0);
    return { mrr, oneShot };
  }
  const fmt = (n: number) =>
    n === 0 ? null : new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  // Proposals with the most recent prospect interactions
  const recentProposals: RecentProposal[] = sortedByInteraction.map(p => ({
    id: p.id,
    slug: (p.slug as string) ?? p.id,
    title: p.title,
    published: p.published,
    status: p.status ?? "pending",
    amountMrr: p.amountMrr ?? null,
    amountOneShot: p.amountOneShot ?? null,
    viewCount: viewMap[p.id] ?? 0,
  }));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 md:mb-10">
        <div>
          <DashboardHeading name={session.user.name || session.user.email || ""} />
        </div>
        <CreateProposalButton proposalCount={proposals.length} isPremium={userIsPremium} showCounter={false} />
      </div>

      {/* ── Status summary ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          { label: t("dashboard_total"),   value: proposals.length, icon: FileText, color: "#111184", bg: "#e8e8ff", amounts: sumAmounts(proposals) },
          { label: t("dashboard_won"),     value: won.length,       icon: Trophy,    color: "#065f46", bg: "#d1fae5", amounts: sumAmounts(won) },
          { label: t("dashboard_pending"), value: pending.length,   icon: Hourglass, color: "#92400e", bg: "#fef3c7", amounts: sumAmounts(pending) },
          { label: t("dashboard_lost"),    value: lost.length,      icon: XCircle,   color: "#991b1b", bg: "#fee2e2", amounts: sumAmounts(lost) },
        ].map(({ label, value, icon: Icon, color, bg, amounts }) => (
          <div
            key={label}
            className="rounded-2xl p-5 card-lift"
            style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <span className="text-xs font-medium text-gray-400">{label}</span>
            </div>
            <p className="text-3xl font-bold mb-3" style={{ color: "var(--foreground)" }}>{value}</p>
            {(amounts.mrr > 0 || amounts.oneShot > 0) && (
              <div className="flex flex-col gap-0.5">
                {fmt(amounts.mrr) && (
                  <span className="text-[11px] text-gray-400 leading-tight">
                    <span className="font-medium text-gray-500">{fmt(amounts.mrr)}</span> /mois
                  </span>
                )}
                {fmt(amounts.oneShot) && (
                  <span className="text-[11px] text-gray-400 leading-tight">
                    <span className="font-medium text-gray-500">{fmt(amounts.oneShot)}</span> one-shot
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Recent proposals (BEFORE analytics) ── */}
      <div
        className="rounded-2xl overflow-hidden mb-6"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
      >
        {/* Table header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <h2 className="font-semibold text-gray-900">{t("dashboard_recent")}</h2>
          <Link
            href="/proposals"
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: "var(--primary)" }}
          >
            {t("dashboard_see_all")}
          </Link>
        </div>

        {proposals.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{t("dashboard_no_proposals")}</p>
          </div>
        ) : (
          <>
            {/* Column headers — desktop only */}
            <div className="hidden md:flex items-center gap-4 px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-black/[0.04]" style={{ background: "rgba(0,0,0,0.012)" }}>
              <span className="w-2 flex-shrink-0" />
              <span className="flex-1">{t("proposals_col_title")}</span>
              <span className="flex-shrink-0 w-24 text-center">{t("proposals_col_status")}</span>
              <span className="flex-shrink-0 w-20 text-center">{t("proposals_col_mrr")}</span>
              <span className="flex-shrink-0 w-20 text-center">{t("proposals_col_oneshot")}</span>
              <span className="flex-shrink-0 w-10 text-center">{t("proposals_col_views")}</span>
              <span className="flex-shrink-0 w-[88px]" />
            </div>
            <RecentProposals proposals={recentProposals} isPremium={userIsPremium} />
          </>
        )}
      </div>

      <AnalyticsSection proposals={sortedByInteraction.map(p => ({ id: p.id, title: p.title }))} isPremium={userIsPremium} />

    </div>
  );
}
