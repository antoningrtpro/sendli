import { auth } from "@/lib/auth";
import { adminDb } from "@/lib/firebase-admin";
import { redirect, notFound } from "next/navigation";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import type { RecipientStat, PeriodStats } from "@/components/analytics/analytics-dashboard";
import type { ProposalBlock } from "@/types/proposal";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

// Midnight of today (local time expressed as UTC-consistent Date)
function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Build hourly views for today (24 points, "00:00"…"23:00")
function buildHourlyViews(events: { createdAt: Date }[]): { date: string; views: number }[] {
  const midnight = todayMidnight();
  const filtered = events.filter(e => new Date(e.createdAt) >= midnight);
  const byHour: Record<number, number> = {};
  filtered.forEach(e => {
    const h = new Date(e.createdAt).getHours();
    byHour[h] = (byHour[h] ?? 0) + 1;
  });
  return Array.from({ length: 24 }, (_, h) => ({
    date: String(h).padStart(2, "0") + ":00",
    views: byHour[h] ?? 0,
  }));
}

// Build { date: string; views: number }[] for the last N days
function buildDailyViews(
  events: { createdAt: Date }[],
  days: number
): { date: string; views: number }[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const filtered = events.filter(e => new Date(e.createdAt) >= cutoff);
  const byDay: Record<string, number> = {};
  filtered.forEach(e => {
    const key = new Date(e.createdAt).toISOString().slice(0, 10);
    byDay[key] = (byDay[key] ?? 0) + 1;
  });
  return Array.from({ length: days + 1 }, (_, i) => {
    const d = new Date(cutoff);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, views: byDay[key] ?? 0 };
  });
}

// Build stats (totalViews, uniqueVisitors, avgTime) for the last N days
// days = 0 → all time, days = -1 → today from midnight
function buildPeriodStats(
  pageViews: { visitorHash: string | null; createdAt: Date }[],
  timings: { durationSeconds: number | null; createdAt: Date }[],
  days: number
): Omit<PeriodStats, "dailyViews" | "granularity"> {
  const cutoff = days === -1 ? todayMidnight()
    : days > 0   ? new Date(Date.now() - days * 86400_000)
    : new Date(0);
  const filteredViews = pageViews.filter(e => new Date(e.createdAt) >= cutoff);
  const filteredTimings = timings.filter(e => new Date(e.createdAt) >= cutoff && e.durationSeconds != null);
  const uniqueVisitors = new Set(filteredViews.map(e => e.visitorHash).filter(Boolean)).size;
  const avgTimeSecs = filteredTimings.length
    ? Math.round(filteredTimings.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / filteredTimings.length)
    : 0;
  return { totalViews: filteredViews.length, uniqueVisitors, avgTimeSecs };
}

export default async function AnalyticsPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const proposalSnap = await adminDb.collection("proposals").doc(id).get();
  if (!proposalSnap.exists || proposalSnap.data()?.userId !== session.user.id) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposal = { id: proposalSnap.id, ...proposalSnap.data()! } as { id: string; [k: string]: any };
  const blocks: ProposalBlock[] = JSON.parse(proposal.blocks as string);

  // ── Raw events ────────────────────────────────────────────────────────────
  const allEventsSnap = await adminDb.collection("proposalEvents")
    .where("proposalId", "==", id)
    .get();

  interface RawEvent {
    eventType: string;
    blockId: string | null;
    visitorHash: string | null;
    durationSeconds: number | null;
    createdAt: Date;
    linkId?: string | null;
  }

  const allEvents: RawEvent[] = allEventsSnap.docs.map(d => {
    const data = d.data();
    return {
      eventType: data.eventType,
      blockId: data.blockId ?? null,
      visitorHash: data.visitorHash ?? null,
      durationSeconds: data.durationSeconds ?? null,
      createdAt: data.createdAt?.toDate?.() ?? new Date(data.createdAt),
      linkId: data.linkId ?? null,
    };
  });
  allEvents.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const pageViews = allEvents.filter(e => e.eventType === "page_view");
  const timings = allEvents.filter(e => e.eventType === "time_on_page");

  // ── Periods ───────────────────────────────────────────────────────────────
  const allDays = pageViews.length > 0
    ? Math.max(7, Math.ceil((Date.now() - new Date(pageViews[0].createdAt).getTime()) / 86400_000) + 1)
    : 30;

  const periods: Record<string, PeriodStats> = {
    "today": { ...buildPeriodStats(pageViews, timings, -1), granularity: "hour", dailyViews: buildHourlyViews(pageViews) },
    "7":     { ...buildPeriodStats(pageViews, timings, 7),  granularity: "day",  dailyViews: buildDailyViews(pageViews, 7) },
    "30":    { ...buildPeriodStats(pageViews, timings, 30), granularity: "day",  dailyViews: buildDailyViews(pageViews, 30) },
    "90":    { ...buildPeriodStats(pageViews, timings, 90), granularity: "day",  dailyViews: buildDailyViews(pageViews, 90) },
    "all":   { ...buildPeriodStats(pageViews, timings, 0),  granularity: "day",  dailyViews: buildDailyViews(pageViews, allDays) },
  };

  // ── Block engagement — computed per period ────────────────────────────────
  const filteredBlocks = blocks.filter(block => block.type !== "divider" && block.type !== "spacer");

  function buildBlockStats(events: typeof allEvents, cutoff: Date) {
    const filtered = events.filter(e => new Date(e.createdAt) >= cutoff);
    const pageViews = filtered.filter(e => e.eventType === "page_view");
    const totalUnique = new Set(pageViews.map(e => e.visitorHash).filter(Boolean)).size;

    const blockVisibleCounts: Record<string, Set<string>> = {};
    const blockClickCounts: Record<string, number> = {};

    filtered.forEach(e => {
      if (!e.blockId) return;
      if (e.eventType === "block_visible") {
        if (!blockVisibleCounts[e.blockId]) blockVisibleCounts[e.blockId] = new Set();
        if (e.visitorHash) blockVisibleCounts[e.blockId].add(e.visitorHash);
      }
      if (e.eventType === "block_click" || e.eventType === "cta_click") {
        blockClickCounts[e.blockId] = (blockClickCounts[e.blockId] ?? 0) + 1;
      }
    });

    return filteredBlocks.map((block, i) => ({
      blockId: block.id,
      blockType: block.type,
      blockName: block.blockName,
      index: i,
      analyticsSection: block.analyticsSection,
      uniqueViewers: blockVisibleCounts[block.id]?.size ?? 0,
      clicks: blockClickCounts[block.id] ?? 0,
      viewPct: totalUnique > 0
        ? Math.round(((blockVisibleCounts[block.id]?.size ?? 0) / totalUnique) * 100)
        : 0,
    }));
  }

  const blockStatsByPeriod = {
    "today": buildBlockStats(allEvents, todayMidnight()),
    "7":     buildBlockStats(allEvents, new Date(Date.now() - 7  * 86400_000)),
    "30":    buildBlockStats(allEvents, new Date(Date.now() - 30 * 86400_000)),
    "90":    buildBlockStats(allEvents, new Date(Date.now() - 90 * 86400_000)),
    "all":   buildBlockStats(allEvents, new Date(0)),
  };

  // ── Per-recipient stats ────────────────────────────────────────────────────
  const linksSnap = await adminDb.collection("proposalLinks")
    .where("proposalId", "==", id)
    .get();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proposalLinks = linksSnap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string; [k: string]: any }));
  proposalLinks.sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt?.toDate?.()?.getTime?.() ?? 0);
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt?.toDate?.()?.getTime?.() ?? 0);
    return bTime - aTime;
  });
  const linkIds = proposalLinks.map(l => l.id);
  const recipientStats: RecipientStat[] = [];

  if (linkIds.length > 0) {
    // Aggregate per-link stats in memory from allEvents
    const viewsMap: Record<string, number> = {};
    const uniqueMap: Record<string, Set<string>> = {};
    const timeMap: Record<string, number[]> = {};
    const ctaMap: Record<string, number> = {};
    const lastSeenMap: Record<string, Date | null> = {};

    for (const e of allEvents) {
      if (!e.linkId || !linkIds.includes(e.linkId)) continue;
      if (e.eventType === "page_view") {
        viewsMap[e.linkId] = (viewsMap[e.linkId] ?? 0) + 1;
        if (!uniqueMap[e.linkId]) uniqueMap[e.linkId] = new Set();
        if (e.visitorHash) uniqueMap[e.linkId].add(e.visitorHash);
      }
      if (e.eventType === "time_on_page" && e.durationSeconds != null) {
        if (!timeMap[e.linkId]) timeMap[e.linkId] = [];
        timeMap[e.linkId].push(e.durationSeconds);
      }
      if (e.eventType === "cta_click") {
        ctaMap[e.linkId] = (ctaMap[e.linkId] ?? 0) + 1;
      }
      if (!lastSeenMap[e.linkId] || e.createdAt > lastSeenMap[e.linkId]!) {
        lastSeenMap[e.linkId] = e.createdAt;
      }
    }

    for (const link of proposalLinks) {
      const times = timeMap[link.id] ?? [];
      const avgTimeSecs = times.length > 0
        ? Math.round(times.reduce((s, t) => s + t, 0) / times.length)
        : 0;
      recipientStats.push({
        linkId: link.id,
        token: link.token as string,
        recipientEmail: (link.recipientEmail as string | null) ?? null,
        recipientName: (link.recipientName as string | null) ?? null,
        views: viewsMap[link.id] ?? 0,
        uniqueVisitors: uniqueMap[link.id]?.size ?? 0,
        avgTimeSecs,
        lastSeenAt: lastSeenMap[link.id]?.toISOString() ?? null,
        ctaClicks: ctaMap[link.id] ?? 0,
      });
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/proposals/${id}/edit`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour à l&apos;éditeur
        </Link>
      </div>

      <div className="mb-10">
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{proposal.title as string}</h1>
        <p className="text-sm text-gray-400 mt-1">Analytics</p>
      </div>

      <AnalyticsDashboard
        periods={periods}
        blockStatsByPeriod={blockStatsByPeriod}
        published={proposal.published as boolean}
        recipientStats={recipientStats}
      />
    </div>
  );
}
