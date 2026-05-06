"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (proposalIds.length === 0) return [];

  const proposals = await prisma.proposal.findMany({
    where: { id: { in: proposalIds }, userId: session.user.id },
    select: { id: true, title: true },
  });

  const results = await Promise.all(
    proposals.map(async (p) => {
      const [views, uniqueVisitors, ctaClicks, timeEvents] = await Promise.all([
        prisma.proposalEvent.count({ where: { proposalId: p.id, eventType: "page_view" } }),
        prisma.proposalEvent.groupBy({ by: ["visitorHash"], where: { proposalId: p.id, eventType: "page_view", visitorHash: { not: null } } }).then(r => r.length),
        prisma.proposalEvent.count({ where: { proposalId: p.id, eventType: "cta_click" } }),
        prisma.proposalEvent.findMany({ where: { proposalId: p.id, eventType: "time_on_page", durationSeconds: { not: null } }, select: { durationSeconds: true } }),
      ]);
      const avgTimeSeconds = timeEvents.length > 0
        ? Math.round(timeEvents.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / timeEvents.length)
        : 0;
      return { proposalId: p.id, title: p.title, views, uniqueVisitors, ctaClicks, avgTimeSeconds };
    })
  );

  return results;
}

export async function getAnalyticsDetail(proposalIds: string[]): Promise<AnalyticsDetail> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (proposalIds.length === 0) return { summaries: [], dailyViews: [], recipientStats: [] };

  const proposals = await prisma.proposal.findMany({
    where: { id: { in: proposalIds }, userId: session.user.id },
    select: { id: true, title: true },
  });
  const validIds = proposals.map(p => p.id);
  const titleMap = Object.fromEntries(proposals.map(p => [p.id, p.title]));

  if (validIds.length === 0) return { summaries: [], dailyViews: [], recipientStats: [] };

  // ── Summaries ────────────────────────────────────────────────────────────
  const summaries = await Promise.all(
    proposals.map(async (p) => {
      const [views, uniqueVisitors, ctaClicks, timeEvents] = await Promise.all([
        prisma.proposalEvent.count({ where: { proposalId: p.id, eventType: "page_view" } }),
        prisma.proposalEvent.groupBy({ by: ["visitorHash"], where: { proposalId: p.id, eventType: "page_view", visitorHash: { not: null } } }).then(r => r.length),
        prisma.proposalEvent.count({ where: { proposalId: p.id, eventType: "cta_click" } }),
        prisma.proposalEvent.findMany({ where: { proposalId: p.id, eventType: "time_on_page", durationSeconds: { not: null } }, select: { durationSeconds: true } }),
      ]);
      const avgTimeSeconds = timeEvents.length > 0
        ? Math.round(timeEvents.reduce((s, e) => s + (e.durationSeconds ?? 0), 0) / timeEvents.length)
        : 0;
      return { proposalId: p.id, title: p.title, views, uniqueVisitors, ctaClicks, avgTimeSeconds };
    })
  );

  // ── Daily views (last 30 days, combined) ─────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentPageViews = await prisma.proposalEvent.findMany({
    where: {
      proposalId: { in: validIds },
      eventType: "page_view",
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { createdAt: true },
  });

  const viewsByDay: Record<string, number> = {};
  for (const e of recentPageViews) {
    const day = new Date(e.createdAt).toISOString().slice(0, 10);
    viewsByDay[day] = (viewsByDay[day] ?? 0) + 1;
  }

  const dailyViews: DailyView[] = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, views: viewsByDay[key] ?? 0 };
  });

  // ── Per-recipient stats ───────────────────────────────────────────────────
  const links = await prisma.proposalLink.findMany({
    where: { proposalId: { in: validIds } },
    orderBy: { createdAt: "desc" },
  });

  const linkIds = links.map((l: { id: string }) => l.id);
  const recipientStats: DashboardRecipientStat[] = [];

  if (linkIds.length > 0) {
    const [viewGroups, ctaGroups, lastSeenGroups] = await Promise.all([
      prisma.proposalEvent.groupBy({
        by: ["linkId"],
        where: { linkId: { in: linkIds }, eventType: "page_view" },
        _count: { id: true },
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

    type GroupRow = { linkId: string | null };
    const viewsMap: Record<string, number> = {};
    for (const g of viewGroups as (GroupRow & { _count: { id: number } })[]) {
      if (g.linkId) viewsMap[g.linkId] = g._count.id;
    }
    const ctaMap: Record<string, number> = {};
    for (const g of ctaGroups as (GroupRow & { _count: { id: number } })[]) {
      if (g.linkId) ctaMap[g.linkId] = g._count.id;
    }
    const lastSeenMap: Record<string, Date | null> = {};
    for (const g of lastSeenGroups as (GroupRow & { _max: { createdAt: Date | null } })[]) {
      if (g.linkId) lastSeenMap[g.linkId] = g._max.createdAt;
    }

    for (const l of links as { id: string; proposalId: string; recipientEmail: string | null; recipientName: string | null }[]) {
      recipientStats.push({
        linkId: l.id,
        proposalTitle: titleMap[l.proposalId] ?? "",
        recipientEmail: l.recipientEmail,
        recipientName: l.recipientName,
        views: viewsMap[l.id] ?? 0,
        lastSeenAt: lastSeenMap[l.id]?.toISOString() ?? null,
        ctaClicks: ctaMap[l.id] ?? 0,
      });
    }
  }

  return { summaries, dailyViews, recipientStats };
}
