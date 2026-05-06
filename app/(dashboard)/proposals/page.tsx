import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateProposalButton } from "@/components/proposal/create-proposal-button";
import { ProposalRow } from "@/components/proposal/proposal-row";
import { FileText } from "lucide-react";

export default async function ProposalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  const proposals = await prisma.proposal.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  const proposalIds = proposals.map(p => p.id);

  const viewCounts = await prisma.proposalEvent.groupBy({
    by: ["proposalId"],
    where: { eventType: "page_view", proposalId: { in: proposalIds } },
    _count: { id: true },
  });

  const viewMap = Object.fromEntries(
    viewCounts.map(v => [v.proposalId, v._count.id])
  );

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
          <p className="text-sm text-gray-400 mb-6">Créez votre première proposal pour commencer</p>
          <CreateProposalButton />
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
                  title={p.title}
                  published={p.published}
                  updatedAt={p.updatedAt}
                  status={p.status}
                  amountOneShot={p.amountOneShot ?? null}
                  amountMrr={p.amountMrr ?? null}
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
