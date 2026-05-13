import type { Metadata } from "next";
import { auth } from "@/lib/auth";

export const metadata: Metadata = { title: "Mes Propales" };
import { adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { CreateProposalButton } from "@/components/proposal/create-proposal-button";
import { ProposalsTableClient } from "@/components/proposal/proposals-table-client";
import type { SerializedProposal } from "@/components/proposal/proposals-table-client";
import { FileText } from "lucide-react";
import { isPremium } from "@/lib/plan";
import { getLang } from "@/lib/get-lang";
import { createTranslator } from "@/lib/i18n";

function toIso(v: { toDate?: () => Date } | string | null | undefined): string | null {
  if (!v) return null;
  try {
    if (typeof v === "object" && v.toDate) return v.toDate().toISOString();
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch { return null; }
}

export default async function ProposalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const lang = await getLang();
  const t = createTranslator(lang);

  const [proposalsSnap, userSnap] = await Promise.all([
    adminDb.collection("proposals").where("userId", "==", userId)
      .select(
        "title", "status", "published", "slug",
        "amountOneShot", "amountMrr",
        "createdAt", "updatedAt",
        "clientLogoUrl", "showPdfButton", "downloadUrl", "downloadButtonLabel"
      )
      .get(),
    adminDb.collection("users").doc(userId).get(),
  ]);
  const userPlan = (userSnap.data()?.plan as string) ?? "free";
  const userIsPremium = isPremium(userPlan);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type RawProposal = { id: string; [k: string]: any };
  const rawProposals: RawProposal[] = proposalsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const proposalIds = rawProposals.map(p => p.id);

  // Aggregate view counts + last visit per proposal
  const viewMap: Record<string, number> = {};
  const lastVisitMap: Record<string, string | null> = {};

  if (proposalIds.length > 0) {
    // Firestore `in` limit = 30; fetch in batches
    const batches = [];
    for (let i = 0; i < proposalIds.length; i += 30) {
      batches.push(proposalIds.slice(i, i + 30));
    }
    const snaps = await Promise.all(
      batches.map(batch =>
        adminDb.collection("proposalEvents")
          .where("proposalId", "in", batch)
          .get()
      )
    );
    for (const snap of snaps) {
      for (const doc of snap.docs) {
        const data = doc.data();
        const pid = data.proposalId as string;
        if (data.eventType === "page_view") {
          viewMap[pid] = (viewMap[pid] ?? 0) + 1;
          const d: Date = data.createdAt?.toDate?.() ?? new Date(data.createdAt);
          const current = lastVisitMap[pid] ? new Date(lastVisitMap[pid]!) : null;
          if (!current || d > current) {
            lastVisitMap[pid] = d.toISOString();
          }
        }
      }
    }
  }

  const proposals: SerializedProposal[] = rawProposals.map(p => ({
    id: p.id,
    slug: (p.slug as string) ?? p.id,
    title: (p.title as string) ?? "",
    status: (p.status as string) ?? "pending",
    published: (p.published as boolean) ?? false,
    amountOneShot: (p.amountOneShot as number | null) ?? null,
    amountMrr: (p.amountMrr as number | null) ?? null,
    createdAt: toIso(p.createdAt),
    updatedAt: toIso(p.updatedAt),
    clientLogoUrl: (p.clientLogoUrl as string | null) ?? null,
    showPdfButton: (p.showPdfButton as boolean) ?? true,
    downloadUrl: (p.downloadUrl as string | null) ?? null,
    downloadButtonLabel: (p.downloadButtonLabel as string | null) ?? null,
    viewCount: viewMap[p.id] ?? 0,
    lastVisitAt: lastVisitMap[p.id] ?? null,
  }));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{t("proposals_title")}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {t("proposals_subtitle", { n: proposals.length, s: proposals.length !== 1 ? "s" : "" })}
          </p>
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
        <ProposalsTableClient proposals={proposals} isPremium={userIsPremium} />
      )}
    </div>
  );
}
