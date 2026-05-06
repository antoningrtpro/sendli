import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  return Array.from({ length: days }, (_, i) => {
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

  const proposal = await prisma.proposal.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!proposal) notFound();

  const blocks: ProposalBlock[] = JSON.parse(proposal.blocks);

  // ── Raw events ────────────────────────────────────────────────────────────
  interface RawEvent {
    eventType: string;
    blockId: string | null;
    visitorHash: string | null;
    durationSeconds: number | null;
    createdAt: Date;
  }

  const allEvents: RawEvent[] = await prisma.proposalEvent.findMany({
    where: { proposalId: id },
    select: { eventType: true, blockId: true, visitorHash: true, durationSeconds: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const pageViews = allEvents.filter(e => e.eventType === "page_view");
  const timings = allEvents.filter(e => e.eventType === "time_on_page");

  // ── Periods ───────────────────────────────────────────────────────────────
  // Determine "all time" date range for the chart
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

  // ── Block engagement (all time) ───────────────────────────────────────────
  const totalUniqueVisitors = periods["all"].uniqueVisitors;
  const blockVisibleCounts: Record<string, Set<string>> = {};
  const blockClickCounts: Record<string, number> = {};

  allEvents.forEach(e => {
    if (!e.blockId) return;
    if (e.eventType === "block_visible") {
      if (!blockVisibleCounts[e.blockId]) blockVisibleCounts[e.blockId] = new Set();
      if (e.visitorHash) blockVisibleCounts[e.blockId].add(e.visitorHash);
    }
    if (e.eventType === "block_click" || e.eventType === "cta_click") {
      blockClickCounts[e.blockId] = (blockClickCounts[e.blockId] ?? 0) + 1;
    }
  });

  const blockStats = blocks
    .filter(block => block.type !== "divider" && block.type !== "spacer")
    .map((block, i) => ({
      blockId: block.id,
      blockType: block.type,
      index: i,
      analyticsSection: block.analyticsSection,
      uniqueViewers: blockVisibleCounts[block.id]?.size ?? 0,
      clicks: blockClickCounts[block.id] ?? 0,
      viewPct: totalUniqueVisitors > 0
        ? Math.round(((blockVisibleCounts[block.id]?.size ?? 0) / totalUniqueVisitors) * 100)
        : 0,
    }));

  // ── Per-recipient stats ────────────────────────────────────────────────────
  const proposalLinks = await prisma.proposalLink.findMany({
    where: { proposalId: id },
    orderBy: { createdAt: "desc" },
  });

  const linkIds = proposalLinks.map((l: { id: string }) => l.id);
  const recipientStats: RecipientStat[] = [];

  if (linkIds.length > 0) {
    const [linkViewGroups, linkTimeGroups, linkCtaGroups, linkLastSeen] = await Promise.all([
      prisma.proposalEvent.groupBy({
        by: ["linkId"],
        where: { linkId: { in: linkIds }, eventType: "page_view" },
        _count: { id: true },
      }),
      prisma.proposalEvent.groupBy({
        by: ["linkId"],
        where: { linkId: { in: linkIds }, eventType: "time_on_page" },
        _avg: { durationSeconds: true },
      }),
      prisma.proposalEvent.groupBy({
        by: ["linkId"],
        where: { linkId: { in: linkIds }, eventType: "cta_click" },
        _count: { id: true },
      }),
      prisma.proposalEvent.groupBy({
        by: ["linkId"],
        where: { linkId: { in: linkIds } },
        _max: { createdAt: true },
      }),
    ]);

    const linkUniqueRaw = await prisma.proposalEvent.groupBy({
      by: ["linkId", "visitorHash"],
      where: { linkId: { in: linkIds }, eventType: "page_view" },
      _count: { id: true },
    });
    const uniqueMap: Record<string, number> = {};
    for (const g of linkUniqueRaw as { linkId: string | null }[]) {
      if (!g.linkId) continue;
      uniqueMap[g.linkId] = (uniqueMap[g.linkId] ?? 0) + 1;
    }

    const viewsMap: Record<string, number> = {};
    for (const g of linkViewGroups as { linkId: string | null; _count: { id: number } }[]) {
      if (g.linkId) viewsMap[g.linkId] = g._count.id;
    }
    const timeMap: Record<string, number> = {};
    for (const g of linkTimeGroups as { linkId: string | null; _avg: { durationSeconds: number | null } }[]) {
      if (g.linkId) timeMap[g.linkId] = Math.round(g._avg.durationSeconds ?? 0);
    }
    const ctaMap: Record<string, number> = {};
    for (const g of linkCtaGroups as { linkId: string | null; _count: { id: number } }[]) {
      if (g.linkId) ctaMap[g.linkId] = g._count.id;
    }
    const lastSeenMap: Record<string, Date | null> = {};
    for (const g of linkLastSeen as { linkId: string | null; _max: { createdAt: Date | null } }[]) {
      if (g.linkId) lastSeenMap[g.linkId] = g._max.createdAt;
    }

    for (const link of proposalLinks as { id: string; token: string; recipientEmail: string | null; recipientName: string | null }[]) {
      recipientStats.push({
        linkId: link.id,
        token: link.token,
        recipientEmail: link.recipientEmail,
        recipientName: link.recipientName,
        views: viewsMap[link.id] ?? 0,
        uniqueVisitors: uniqueMap[link.id] ?? 0,
        avgTimeSecs: timeMap[link.id] ?? 0,
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
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{proposal.title}</h1>
        <p className="text-sm text-gray-400 mt-1">Analytics</p>
      </div>

      <AnalyticsDashboard
        periods={periods}
        blockStats={blockStats}
        published={proposal.published}
        recipientStats={recipientStats}
      />
    </div>
  );
}
