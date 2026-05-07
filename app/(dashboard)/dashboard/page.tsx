import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatNumber } from "@/lib/utils";
import { CreateProposalButton } from "@/components/proposal/create-proposal-button";
import { AnalyticsSection } from "@/components/dashboard/analytics-section";
import { FileText, Eye, Clock, TrendingUp, Trophy, Hourglass, XCircle } from "lucide-react";

function fmtEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "#92400e", bg: "#fef3c7" },
  won:     { label: "Gagné",      color: "#065f46", bg: "#d1fae5" },
  lost:    { label: "Perdu",      color: "#991b1b", bg: "#fee2e2" },
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const proposalsSnap = await adminDb.collection("proposals")
    .where("userId", "==", userId)
    .get();

  type P = { id: string; status: string; amountOneShot: number | null; amountMrr: number | null; title: string; updatedAt: { toDate?: () => Date } | string };
  const proposals: P[] = proposalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as P));
  proposals.sort((a, b) => {
    const aTime = typeof a.updatedAt === 'object' && a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt as string).getTime();
    const bTime = typeof b.updatedAt === 'object' && b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt as string).getTime();
    return bTime - aTime;
  });
  const proposalIds = proposals.map(p => p.id);

  // Aggregate view counts in memory
  const viewMap: Record<string, number> = {};
  let totalViews = 0;
  if (proposalIds.length > 0) {
    const eventsSnap = await adminDb.collection("proposalEvents")
      .where("proposalId", "in", proposalIds.slice(0, 30))
      .get();
    for (const doc of eventsSnap.docs.filter(doc => doc.data().eventType === "page_view")) {
      const pid = doc.data().proposalId;
      viewMap[pid] = (viewMap[pid] ?? 0) + 1;
      totalViews += 1;
    }
  }

  // ── Business stats ──────────────────────────────────────────────────────────
  const won     = proposals.filter(p => p.status === "won");
  const lost    = proposals.filter(p => p.status === "lost");
  const pending = proposals.filter(p => p.status === "pending" || !p.status);
  const decided = won.length + lost.length;
  const winRate = decided > 0 ? Math.round((won.length / decided) * 100) : null;

  const sumOneShot = (arr: P[]) => arr.reduce((s, p) => s + ((p.amountOneShot) ?? 0), 0);
  const sumMrr     = (arr: P[]) => arr.reduce((s, p) => s + ((p.amountMrr) ?? 0), 0);

  const wonOneShot     = sumOneShot(won);
  const wonMrr         = sumMrr(won);
  const pipelineOneShot = sumOneShot(pending);
  const pipelineMrr     = sumMrr(pending);

  const recentProposals = proposals.slice(0, 6);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Bienvenue, {session.user.name || session.user.email}</p>
        </div>
        <CreateProposalButton />
      </div>

      {/* ── Statut résumé ── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total proposals", value: proposals.length, icon: FileText, color: "#111184", bg: "#e8e8ff" },
          { label: "Gagnées",         value: won.length,       icon: Trophy,    color: "#065f46", bg: "#d1fae5" },
          { label: "En attente",      value: pending.length,   icon: Hourglass, color: "#92400e", bg: "#fef3c7" },
          { label: "Perdues",         value: lost.length,      icon: XCircle,   color: "#991b1b", bg: "#fee2e2" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
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
            <p className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>{value}</p>
          </div>
        ))}
      </div>

      <AnalyticsSection proposals={proposals.map(p => ({ id: p.id, title: p.title }))} />

      {/* ── Proposals récentes ── */}
      <div
        className="rounded-2xl mt-6 overflow-hidden"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
      >
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <h2 className="font-semibold text-gray-900">Proposals récentes</h2>
          <Link
            href="/proposals"
            className="text-sm font-medium hover:opacity-70 transition-opacity"
            style={{ color: "var(--primary)" }}
          >
            Voir tout →
          </Link>
        </div>

        {proposals.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucune proposal pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
            {recentProposals.map((p) => {
              const cfg = STATUS_STYLE[p.status] ?? STATUS_STYLE.pending;
              const updatedAt = typeof p.updatedAt === "object" && p.updatedAt !== null && "toDate" in p.updatedAt && typeof p.updatedAt.toDate === "function"
                ? p.updatedAt.toDate()
                : new Date(p.updatedAt as string);
              return (
                <Link
                  key={p.id}
                  href={`/proposals/${p.id}/edit`}
                  className="flex items-center justify-between px-6 py-4 transition-colors duration-150 group hover:bg-black/[0.02]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col gap-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate" style={{ transition: "color 150ms" }}>
                        {p.title}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {updatedAt.toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    {(p.amountOneShot || p.amountMrr) && (
                      <div className="text-right">
                        {p.amountMrr && <p className="text-sm font-semibold text-gray-800">{fmtEur(p.amountMrr)}<span className="text-xs font-normal text-gray-400">/m</span></p>}
                        {p.amountOneShot && <p className="text-xs text-gray-400">{fmtEur(p.amountOneShot)}</p>}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Eye className="w-3.5 h-3.5" />
                      {formatNumber(viewMap[p.id] ?? 0)}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
