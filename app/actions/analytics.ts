"use server";
import { getSession } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";

export interface BlockLabelStat {
  label: string;
  views: number;   // block_visible count
  clicks: number;  // block_click count
}

export interface ProposalAnalyticsSummary {
  proposalId: string;
  title: string;
  views: number;
  uniqueVisitors: number;
  ctaClicks: number;
  avgTimeSeconds: number;
}

export interface DailyView { date: string; views: number }

export interface DashboardRecipientStat {
  linkId: string;
  proposalTitle: string;
  recipientEmail: string | null;
  recipientName: string | null;
  views: number;
  lastSeenAt: string | null;
  ctaClicks: number;
}

export interface AnalyticsDetail {
  summaries: ProposalAnalyticsSummary[];
  dailyViews: DailyView[];
  recipientStats: DashboardRecipientStat[];
}

export async function getProposalsAnalytics(proposalIds: string[]): Promise<ProposalAnalyticsSummary[]> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (proposalIds.length === 0) return [];

  // Verify ownership and get titles
  const proposalDocs = await Promise.all(
    proposalIds.map(id => adminDb.collection("proposals").doc(id).get())
  );
  const proposals = proposalDocs
    .filter(d => d.exists && d.data()?.userId === session.user.id)
    .map(d => ({ id: d.id, title: d.data()!.title as string }));

  const results = await Promise.all(
    proposals.map(async (p) => {
      const eventsSnap = await adminDb.collection("proposalEvents")
        .where("proposalId", "==", p.id)
        .get();
      const events = eventsSnap.docs.map(d => d.data());

      const pageViews = events.filter(e => e.eventType === "page_view");
      const ctaEvents = events.filter(e => e.eventType === "cta_click");
      const timeEvents = events.filter(e => e.eventType === "time_on_page" && e.durationSeconds != null);

      const uniqueVisitors = new Set(pageViews.map(e => e.visitorHash).filter(Boolean)).size;
      const avgTimeSeconds = timeEvents.length > 0
        ? Math.round(timeEvents.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / timeEvents.length)
        : 0;

      return {
        proposalId: p.id,
        title: p.title,
        views: pageViews.length,
        uniqueVisitors,
        ctaClicks: ctaEvents.length,
        avgTimeSeconds,
      };
    })
  );

  return results;
}

export async function getAnalyticsDetail(proposalIds: string[]): Promise<AnalyticsDetail> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (proposalIds.length === 0) return { summaries: [], dailyViews: [], recipientStats: [] };

  const proposalDocs = await Promise.all(
    proposalIds.map(id => adminDb.collection("proposals").doc(id).get())
  );
  const proposals = proposalDocs
    .filter(d => d.exists && d.data()?.userId === session.user.id)
    .map(d => ({ id: d.id, title: d.data()!.title as string }));

  const validIds = proposals.map(p => p.id);
  const titleMap = Object.fromEntries(proposals.map(p => [p.id, p.title]));

  if (validIds.length === 0) return { summaries: [], dailyViews: [], recipientStats: [] };

  // Fetch all events for valid proposals
  const allEventsSnap = await Promise.all(
    validIds.map(id => adminDb.collection("proposalEvents").where("proposalId", "==", id).get())
  );
  const allEventsByProposal: Record<string, ReturnType<typeof allEventsSnap[0]["docs"][0]["data"]>[]> = {};
  for (let i = 0; i < validIds.length; i++) {
    allEventsByProposal[validIds[i]] = allEventsSnap[i].docs.map(d => d.data());
  }

  // ── Summaries ────────────────────────────────────────────────────────────
  const summaries = proposals.map((p) => {
    const events = allEventsByProposal[p.id] ?? [];
    const pageViews = events.filter(e => e.eventType === "page_view");
    const ctaEvents = events.filter(e => e.eventType === "cta_click");
    const timeEvents = events.filter(e => e.eventType === "time_on_page" && e.durationSeconds != null);

    const uniqueVisitors = new Set(pageViews.map(e => e.visitorHash).filter(Boolean)).size;
    const avgTimeSeconds = timeEvents.length > 0
      ? Math.round(timeEvents.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / timeEvents.length)
      : 0;

    return { proposalId: p.id, title: p.title, views: pageViews.length, uniqueVisitors, ctaClicks: ctaEvents.length, avgTimeSeconds };
  });

  // ── Daily views (last 30 days, combined) ─────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const allPageViews = validIds.flatMap(id =>
    (allEventsByProposal[id] ?? [])
      .filter(e => e.eventType === "page_view")
      .map(e => ({ createdAt: e.createdAt?.toDate?.() ?? new Date(e.createdAt) }))
  ).filter(e => e.createdAt >= thirtyDaysAgo);

  const viewsByDay: Record<string, number> = {};
  for (const e of allPageViews) {
    const day = e.createdAt.toISOString().slice(0, 10);
    viewsByDay[day] = (viewsByDay[day] ?? 0) + 1;
  }

  const dailyViews: DailyView[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, views: viewsByDay[key] ?? 0 };
  });

  // ── Per-recipient stats ───────────────────────────────────────────────────
  const linksSnaps = await Promise.all(
    validIds.map(id => adminDb.collection("proposalLinks").where("proposalId", "==", id).get())
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allLinks = linksSnaps.flatMap(snap =>
    snap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }))
  );

  const recipientStats: DashboardRecipientStat[] = [];

  for (const link of allLinks) {
    const linkEvents = validIds.flatMap(id =>
      (allEventsByProposal[id] ?? []).filter(e => e.linkId === link.id)
    );
    const pageViews = linkEvents.filter(e => e.eventType === "page_view");
    const ctaEvents = linkEvents.filter(e => e.eventType === "cta_click");

    let lastSeenAt: Date | null = null;
    for (const e of linkEvents) {
      const d = e.createdAt?.toDate?.() ?? new Date(e.createdAt);
      if (!lastSeenAt || d > lastSeenAt) lastSeenAt = d;
    }

    recipientStats.push({
      linkId: link.id,
      proposalTitle: titleMap[link.proposalId] ?? "",
      recipientEmail: link.recipientEmail ?? null,
      recipientName: link.recipientName ?? null,
      views: pageViews.length,
      lastSeenAt: lastSeenAt?.toISOString() ?? null,
      ctaClicks: ctaEvents.length,
    });
  }

  return { summaries, dailyViews, recipientStats };
}

/**
 * Returns per-block-label stats for a single proposal.
 * Only includes events where blockLabel is set (named blocks).
 */
export async function getBlockLabelStats(proposalId: string): Promise<BlockLabelStat[]> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify ownership
  const proposalSnap = await adminDb.collection("proposals").doc(proposalId).get();
  if (!proposalSnap.exists || proposalSnap.data()?.userId !== session.user.id) {
    throw new Error("Not found");
  }

  const eventsSnap = await adminDb.collection("proposalEvents")
    .where("proposalId", "==", proposalId)
    .get();

  const byLabel: Record<string, { views: number; clicks: number }> = {};

  for (const doc of eventsSnap.docs) {
    const e = doc.data();
    const label = e.blockLabel as string | null;
    if (!label) continue;

    if (!byLabel[label]) byLabel[label] = { views: 0, clicks: 0 };
    if (e.eventType === "block_visible") byLabel[label].views++;
    if (e.eventType === "block_click" || e.eventType === "cta_click") byLabel[label].clicks++;
  }

  return Object.entries(byLabel)
    .map(([label, stats]) => ({ label, ...stats }))
    .sort((a, b) => b.views - a.views);
}
