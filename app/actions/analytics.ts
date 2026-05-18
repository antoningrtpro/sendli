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

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Split an array into chunks of `size` (for Firestore `in` queries max 30) */
function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Fetch all events for a list of proposalIds using batched `in` queries */
async function fetchEventsByProposalIds(ids: string[]) {
  if (ids.length === 0) return [];
  const snaps = await Promise.all(
    chunks(ids, 30).map(batch =>
      adminDb.collection("proposalEvents")
        .where("proposalId", "in", batch)
        .get()
    )
  );
  return snaps.flatMap(s => s.docs.map(d => d.data()));
}

// ── Actions ──────────────────────────────────────────────────────────────────

export async function getProposalsAnalytics(proposalIds: string[]): Promise<ProposalAnalyticsSummary[]> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (proposalIds.length === 0) return [];

  // Verify ownership — only fetch title + userId, skip blocks
  const proposalDocs = await Promise.all(
    proposalIds.map(id => adminDb.collection("proposals").doc(id).get())
  );
  const proposals = proposalDocs
    .filter(d => d.exists && d.data()?.userId === session.user.id)
    .map(d => ({ id: d.id, title: d.data()!.title as string }));

  if (proposals.length === 0) return [];

  // Single batched query instead of N queries
  const allEvents = await fetchEventsByProposalIds(proposals.map(p => p.id));

  // Group events by proposalId in memory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byProposal: Record<string, any[]> = {};
  for (const e of allEvents) {
    const id = e.proposalId as string;
    if (!byProposal[id]) byProposal[id] = [];
    byProposal[id].push(e);
  }

  return proposals.map((p) => {
    const events = byProposal[p.id] ?? [];
    const pageViews = events.filter(e => e.eventType === "page_view");
    const ctaEvents = events.filter(e => e.eventType === "cta_click");
    const timeEvents = events.filter(e => e.eventType === "time_on_page" && e.durationSeconds != null);

    const uniqueVisitors = new Set(pageViews.map(e => e.visitorHash).filter(Boolean)).size;
    const avgTimeSeconds = timeEvents.length > 0
      ? Math.round(timeEvents.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / timeEvents.length)
      : 0;

    return { proposalId: p.id, title: p.title, views: pageViews.length, uniqueVisitors, ctaClicks: ctaEvents.length, avgTimeSeconds };
  });
}

export async function getAnalyticsDetail(proposalIds: string[], days?: number | null): Promise<AnalyticsDetail> {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (proposalIds.length === 0) return { summaries: [], dailyViews: [], recipientStats: [] };

  // Verify ownership — skip blocks
  const proposalDocs = await Promise.all(
    proposalIds.map(id => adminDb.collection("proposals").doc(id).get())
  );
  const proposals = proposalDocs
    .filter(d => d.exists && d.data()?.userId === session.user.id)
    .map(d => ({ id: d.id, title: d.data()!.title as string }));

  const validIds = proposals.map(p => p.id);
  const titleMap = Object.fromEntries(proposals.map(p => [p.id, p.title]));

  if (validIds.length === 0) return { summaries: [], dailyViews: [], recipientStats: [] };

  // Fetch events + links in parallel using batched `in` queries
  const [allEvents, linksSnaps] = await Promise.all([
    fetchEventsByProposalIds(validIds),
    Promise.all(
      chunks(validIds, 30).map(batch =>
        adminDb.collection("proposalLinks").where("proposalId", "in", batch).get()
      )
    ),
  ]);

  // ── Time range filter ────────────────────────────────────────────────────
  // days=null → all time; days=1 → today; days=N → last N days
  let cutoff: Date | null = null;
  if (days != null) {
    cutoff = new Date();
    if (days === 1) {
      cutoff.setHours(0, 0, 0, 0); // start of today
    } else {
      cutoff.setDate(cutoff.getDate() - days);
      cutoff.setHours(0, 0, 0, 0);
    }
  }

  const filteredEvents = cutoff
    ? allEvents.filter(e => {
        const d = e.createdAt?.toDate?.() ?? new Date(e.createdAt);
        return d >= cutoff!;
      })
    : allEvents;

  // Group filtered events by proposalId
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byProposal: Record<string, any[]> = {};
  for (const e of filteredEvents) {
    const id = e.proposalId as string;
    if (!byProposal[id]) byProposal[id] = [];
    byProposal[id].push(e);
  }

  // ── Summaries (based on filtered events) ────────────────────────────────
  const summaries = proposals.map((p) => {
    const events = byProposal[p.id] ?? [];
    const pageViews = events.filter(e => e.eventType === "page_view");
    const ctaEvents = events.filter(e => e.eventType === "cta_click");
    const timeEvents = events.filter(e => e.eventType === "time_on_page" && e.durationSeconds != null);

    const uniqueVisitors = new Set(pageViews.map(e => e.visitorHash).filter(Boolean)).size;
    const avgTimeSeconds = timeEvents.length > 0
      ? Math.round(timeEvents.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / timeEvents.length)
      : 0;

    return { proposalId: p.id, title: p.title, views: pageViews.length, uniqueVisitors, ctaClicks: ctaEvents.length, avgTimeSeconds };
  });

  // ── Daily views chart ─────────────────────────────────────────────────────
  // Determine chart window
  let chartDays: number;
  let chartStart: Date;

  if (days === null || days == null) {
    // All time: find earliest page_view across all events
    let earliest: Date | null = null;
    for (const e of allEvents) {
      if (e.eventType !== "page_view") continue;
      const d = e.createdAt?.toDate?.() ?? new Date(e.createdAt);
      if (!earliest || d < earliest) earliest = d;
    }
    if (earliest) {
      chartStart = new Date(earliest);
      chartStart.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((Date.now() - chartStart.getTime()) / 86400000) + 1;
      chartDays = Math.min(365, Math.max(diffDays, 1));
    } else {
      chartDays = 30;
      chartStart = new Date();
      chartStart.setDate(chartStart.getDate() - 30);
    }
  } else {
    // Always end the chart on today: generate `days` points from (days-1) days ago → today
    chartDays = Math.max(days, 1);
    chartStart = new Date();
    chartStart.setDate(chartStart.getDate() - (chartDays - 1));
    chartStart.setHours(0, 0, 0, 0);
  }

  const viewsByDay: Record<string, number> = {};
  for (const e of filteredEvents) {
    if (e.eventType !== "page_view") continue;
    const d = e.createdAt?.toDate?.() ?? new Date(e.createdAt);
    const key = d.toISOString().slice(0, 10);
    viewsByDay[key] = (viewsByDay[key] ?? 0) + 1;
  }

  const dailyViews: DailyView[] = Array.from({ length: chartDays }, (_, i) => {
    const d = new Date(chartStart);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, views: viewsByDay[key] ?? 0 };
  });

  // ── Per-recipient stats (based on filtered events) ───────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allLinks = linksSnaps.flatMap(snap =>
    snap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }))
  );

  // Build a map: linkId → filtered events (single pass)
  const byLink: Record<string, typeof filteredEvents> = {};
  for (const e of filteredEvents) {
    const lid = e.linkId as string | undefined;
    if (!lid) continue;
    if (!byLink[lid]) byLink[lid] = [];
    byLink[lid].push(e);
  }

  const recipientStats: DashboardRecipientStat[] = allLinks.map(link => {
    const linkEvents = byLink[link.id] ?? [];
    const pageViews = linkEvents.filter(e => e.eventType === "page_view");
    const ctaEvents = linkEvents.filter(e => e.eventType === "cta_click");

    let lastSeenAt: Date | null = null;
    for (const e of linkEvents) {
      const d = e.createdAt?.toDate?.() ?? new Date(e.createdAt);
      if (!lastSeenAt || d > lastSeenAt) lastSeenAt = d;
    }

    return {
      linkId: link.id,
      proposalTitle: titleMap[link.proposalId] ?? "",
      recipientEmail: link.recipientEmail ?? null,
      recipientName: link.recipientName ?? null,
      views: pageViews.length,
      lastSeenAt: lastSeenAt?.toISOString() ?? null,
      ctaClicks: ctaEvents.length,
    };
  });

  return { summaries, dailyViews, recipientStats };
}

/**
 * Returns per-block-label stats for a single proposal.
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
