import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { CreateProposalButton } from "@/components/proposal/create-proposal-button";
import { ProposalRow } from "@/components/proposal/proposal-row";
import { FileText } from "lucide-react";
import { isPremium } from "@/lib/plan";
import { getLang } from "@/lib/get-lang";
import { createTranslator } from "@/lib/i18n";

export default async function ProposalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const lang = await getLang();
  const t = createTranslator(lang);

  const [proposalsSnap, userSnap] = await Promise.all([
    adminDb.collection("proposals").where("userId", "==", userId)
      .select("title", "status", "published", "slug", "amountOneShot", "amountMrr", "updatedAt")
      .get(),
    adminDb.collection("users").doc(userId).get(),
  ]);
  const userPlan = (userSnap.data()?.plan as string) ?? "free";
  const userIsPremium = isPremium(userPlan);

  type ProposalRow = { id: string; title: string; status: string; published: boolean; slug: string; amountOneShot: number | null; amountMrr: number | null; updatedAt: { toDate?: () => Date } | string };
  const proposals: ProposalRow[] = proposalsSnap.docs.map((d): ProposalRow => ({ id: d.id, ...d.data() } as ProposalRow));
  proposals.sort((a: ProposalRow, b: ProposalRow) => {
    const aTime = typeof a.updatedAt === 'object' && a.updatedAt?.toDate ? a.updatedAt.toDate()!.getTime() : new Date(a.updatedAt as string).getTime();
    const bTime = typeof b.updatedAt === 'object' && b.updatedAt?.toDate ? b.updatedAt.toDate()!.getTime() : new Date(b.updatedAt as string).getTime();
    return bTime - aTime;
  });
  const proposalIds = proposals.map((p: ProposalRow) => p.id);

  // Aggregate view counts in memory
  const viewMap: Record<string, number> = {};
  if (proposalIds.length > 0) {
    const eventsSnap = await adminDb.collection("proposalEvents")
      .where("proposalId", "in", proposalIds.slice(0, 30)) // Firestore limit
      .get();
    for (const doc of eventsSnap.docs.filter(doc => doc.data().eventType === "page_view")) {
      const pid = doc.data().proposalId;
      viewMap[pid] = (viewMap[pid] ?? 0) + 1;
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{t("proposals_title")}</h1>
          <p className="text-sm text-gray-400 mt-1">{t("proposals_subtitle", { n: proposals.length, s: proposals.length !== 1 ? "s" : "" })}</p>
        </div>
        <CreateProposalButton proposalCount={proposals.length} isPremium={userIsPremium} />
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-2xl py-24 text-center" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h2 className="text-gray-600 font-semibold mb-1">{t("proposals_empty_title")}</h2>
          <p className="text-sm text-gray-400">{t("proposals_empty_sub")}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
          <table className="w-full">
            <thead>
              <tr className="text-left" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.015)" }}>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_title")}</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_status")}</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_mrr")}</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_oneshot")}</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_views")}</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {proposals.map(p => (
                <ProposalRow
                  key={p.id}
                  id={p.id}
                  slug={(p.slug as string) ?? p.id}
                  title={p.title as string}
                  published={p.published as boolean}
                  status={p.status as string}
                  amountOneShot={(p.amountOneShot as number | null) ?? null}
                  amountMrr={(p.amountMrr as number | null) ?? null}
                  viewCount={viewMap[p.id] ?? 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
