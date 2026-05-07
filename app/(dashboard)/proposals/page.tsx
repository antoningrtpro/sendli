import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateProposalButton } from "@/components/proposal/create-proposal-button";
import { ProposalRow } from "@/components/proposal/proposal-row";
import { FileText } from "lucide-react";

export default async function ProposalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const proposalsSnap = await adminDb.collection("proposals")
    .where("userId", "==", userId)
    .get();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposals = proposalsSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  proposals.sort((a, b) => {
    const aTime = typeof a.updatedAt === 'object' && a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt as string).getTime();
    const bTime = typeof b.updatedAt === 'object' && b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt as string).getTime();
    return bTime - aTime;
  });
  const proposalIds = proposals.map(p => p.id);

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
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Mes Proposals</h1>
          <p className="text-sm text-gray-400 mt-1">{proposals.length} proposal{proposals.length !== 1 ? "s" : ""}</p>
        </div>
        <CreateProposalButton />
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-2xl py-24 text-center" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
          <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h2 className="text-gray-600 font-semibold mb-1">Aucune proposal</h2>
          <p className="text-sm text-gray-400">Créez votre première proposal pour commencer</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
          <table className="w-full">
            <thead>
              <tr className="text-left" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.015)" }}>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Titre</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">MRR</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">One Shot</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Vues</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Modifié</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {proposals.map(p => (
                <ProposalRow
                  key={p.id}
                  id={p.id}
                  title={p.title as string}
                  published={p.published as boolean}
                  updatedAt={p.updatedAt?.toDate?.() ?? new Date(p.updatedAt)}
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
