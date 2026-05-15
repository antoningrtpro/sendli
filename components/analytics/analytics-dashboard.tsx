"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from "recharts";
import { Eye, Users, Clock, Lock, Mail, Link as LinkIcon, Layers, Pencil, ChevronDown, ChevronRight, UserCircle2, Download, MessageCircle, FileDown } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";

export interface BlockStat {
  blockId: string;
  blockType: string;
  blockName?: string;
  index: number;
  analyticsSection?: string;
  uniqueViewers: number;
  clicks: number;
  viewPct: number;
}

interface BlockGroup {
  section: string | null;
  stats: BlockStat[];
}

function groupBySection(stats: BlockStat[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  for (const stat of stats) {
    const section = stat.analyticsSection ?? null;
    const last = groups[groups.length - 1];
    if (section && last?.section === section) {
      last.stats.push(stat);
    } else {
      groups.push({ section, stats: [stat] });
    }
  }
  return groups;
}

function blockDisplayName(stat: BlockStat) {
  if (stat.blockName) return stat.blockName;
  return stat.blockType.charAt(0).toUpperCase() + stat.blockType.slice(1);
}

interface DailyView {
  date: string;
  views: number;
}

export interface PeriodStats {
  totalViews: number;
  uniqueVisitors: number;
  avgTimeSecs: number;
  granularity: "hour" | "day";
  dailyViews: DailyView[];
}

export interface RecipientStat {
  linkId: string;
  token: string;
  recipientEmail: string | null;
  recipientName: string | null;
  views: number;
  uniqueVisitors: number;
  avgTimeSecs: number;
  lastSeenAt: string | null;
  ctaClicks: number;
}

interface Props {
  periods: Record<string, PeriodStats>;
  blockStatsByPeriod: Record<string, BlockStat[]>;
  published: boolean;
  recipientStats?: RecipientStat[];
  slug?: string;
  isPremium?: boolean;
}

type PeriodKey = "today" | "7" | "30" | "90" | "all";

function shortDate(dateStr: string) {
  if (/^\d{2}:\d{2}$/.test(dateStr)) return dateStr.replace(":00", "h");
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

function fmtDur(s: number) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60 > 0 ? ` ${s % 60}s` : ""}`;
}

function xInterval(len: number, granularity: "hour" | "day") {
  if (granularity === "hour") return 2;
  if (len <= 7) return 0;
  if (len <= 30) return 4;
  if (len <= 90) return 11;
  return Math.floor(len / 8);
}

export function AnalyticsDashboard({
  periods,
  blockStatsByPeriod,
  published,
  recipientStats = [],
  slug: _slug,
  isPremium = true,
}: Props) {
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const { t } = useLanguage();

  const PERIODS: { key: PeriodKey; label: string }[] = [
    { key: "today", label: t("analytics_today") },
    { key: "7",     label: t("analytics_7") },
    { key: "30",    label: t("analytics_30") },
    { key: "90",    label: t("analytics_90") },
    { key: "all",   label: t("analytics_all") },
  ];

  function toggleGroup(section: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  if (!published) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
        <Lock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">{t("analytics_publish_hint")}</p>
      </div>
    );
  }

  const stats = periods[period] ?? periods["30"];
  const { totalViews, uniqueVisitors, avgTimeSecs, dailyViews, granularity } = stats;

  const todayKey = granularity === "day"
    ? new Date().toISOString().slice(0, 10)
    : new Date().getHours().toString().padStart(2, "0") + ":00";

  const avgTimeLabel = fmtDur(avgTimeSecs);

  // Period-aware block stats
  const blockStats = blockStatsByPeriod[period] ?? blockStatsByPeriod["30"] ?? [];
  const headerStats = blockStats.filter(b => b.blockType === "__header__");
  const contentStats = blockStats.filter(b => b.blockType !== "__header__");
  const maxView = Math.max(...contentStats.map(b => b.viewPct), 1);
  const sortedBlockStats = [...contentStats].sort((a, b) => a.index - b.index);
  const groups = groupBySection(sortedBlockStats);

  const periodLabel = period === "today"
    ? t("analytics_by_hour")
    : period === "all"
      ? t("analytics_since_start")
      : t("analytics_last_n_days", { n: period });

  return (
    <div className="relative space-y-6">

      {/* ── Premium gate overlay ─────────────────────────────────────────────── */}
      {!isPremium && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-2xl"
          style={{ backdropFilter: "blur(8px)", backgroundColor: "rgba(255,255,255,0.75)" }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-amber-50 shadow-sm">
            <Lock className="w-6 h-6 text-amber-500" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-800">Analytics Premium</p>
            <p className="text-sm text-gray-500 mt-1">Passez en Premium pour accéder aux analytics détaillés</p>
          </div>
          <Link
            href="/settings"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition hover:opacity-90 shadow"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Passer Premium →
          </Link>
        </div>
      )}

      {/* ── Period selector ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl w-fit"
        style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={period === p.key
              ? { backgroundColor: "var(--primary)", color: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }
              : { color: "var(--muted)", backgroundColor: "transparent" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t("analytics_total_views"), value: totalViews,    icon: Eye,   color: "indigo" },
          { label: t("analytics_unique"),       value: uniqueVisitors, icon: Users, color: "purple" },
          { label: t("analytics_avg_time"),     value: avgTimeLabel,  icon: Clock, color: "green" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl p-5" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                color === "indigo" ? "bg-indigo-50" : color === "purple" ? "bg-purple-50" : "bg-green-50"
              }`}>
                <Icon className={`w-4 h-4 ${
                  color === "indigo" ? "text-indigo-600" : color === "purple" ? "text-purple-600" : "text-green-600"
                }`} />
              </div>
              <span className="text-sm text-gray-400">{label}</span>
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--foreground)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Chart ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">{t("analytics_views_time")}</h2>
          <span className="text-xs text-gray-400 font-medium">{periodLabel}</span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={dailyViews} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDate}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              interval={xInterval(dailyViews.length, granularity)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={25}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => shortDate(String(label))}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [value, t("analytics_col_views")]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <ReferenceLine
              x={todayKey}
              stroke="var(--primary)"
              strokeDasharray="4 3"
              strokeOpacity={0.5}
              label={{ value: "Auj.", position: "insideTopRight", fontSize: 10, fill: "var(--primary)", opacity: 0.7 }}
            />
            <Line type="monotone" dataKey="views" stroke="var(--primary)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Per-recipient table — only shown if links exist ─────────────────── */}
      {recipientStats && recipientStats.length > 0 && <div className="rounded-2xl p-6" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-50 flex-shrink-0">
            <UserCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{t("analytics_by_recipient")}</h2>
          </div>
        </div>
        <p className="text-xs text-gray-400 mb-5 ml-10.5">{t("analytics_recipient_detail")}</p>

        {recipientStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <LinkIcon className="w-8 h-8 text-gray-200 mb-3" />
            <p className="text-sm font-medium text-gray-400">Aucun lien de partage créé</p>
            <p className="text-xs text-gray-300 mt-1">Créez des liens personnalisés pour tracker chaque contact</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium pb-3 pr-4">{t("analytics_col_recipient")}</th>
                  <th className="text-right font-medium pb-3 px-4">{t("analytics_col_views")}</th>
                  <th className="text-right font-medium pb-3 px-4">{t("analytics_col_visitors")}</th>
                  <th className="text-right font-medium pb-3 px-4">{t("analytics_col_avg_time")}</th>
                  <th className="text-right font-medium pb-3 px-4">{t("analytics_col_cta")}</th>
                  <th className="text-right font-medium pb-3 pl-4">{t("analytics_col_last")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recipientStats.map(r => (
                  <tr key={r.linkId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: "var(--primary)" }}>
                          {r.recipientName
                            ? r.recipientName.charAt(0).toUpperCase()
                            : r.recipientEmail
                              ? r.recipientEmail.charAt(0).toUpperCase()
                              : <LinkIcon className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {r.recipientName || r.recipientEmail || t("share_link_none")}
                          </p>
                          {r.recipientEmail && r.recipientName && (
                            <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 flex-shrink-0" /> {r.recipientEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{r.views}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{r.uniqueVisitors}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{fmtDur(r.avgTimeSecs)}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{r.ctaClicks}</td>
                    <td className="py-3 pl-4 text-right text-gray-400 text-xs">{fmtDate(r.lastSeenAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>}

      {/* ── Block engagement ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
        <h2 className="font-semibold text-gray-900 mb-1">{t("analytics_block_eng")}</h2>
        <p className="text-xs text-gray-400 mb-5">{t("analytics_block_order")}</p>

        {blockStats.length === 0 ? (
          <p className="text-sm text-gray-400">{t("analytics_no_blocks")}</p>
        ) : (
          <div className="space-y-5">

            {/* ── Header buttons ─────────────────────────────────────────────── */}
            {headerStats.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gray-100" />
                  <span
                    className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ color: "var(--primary)", backgroundColor: "var(--primary)" + "12" }}
                  >
                    En-tête
                  </span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>
                {headerStats.map(stat => {
                  const Icon = stat.blockId === "__header_pdf__" ? FileDown
                    : stat.blockId === "__header_contact__" ? MessageCircle
                    : Download;
                  return (
                    <div key={stat.blockId} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "var(--primary)" + "15" }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                        </div>
                        <span className="text-xs font-medium text-gray-700">{stat.blockName}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700">
                        {stat.clicks} clic{stat.clicks !== 1 ? "s" : ""}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {groups.map((group, gi) => {
              const isGroup = !!group.section && group.stats.length > 1;
              const isCollapsed = isGroup && collapsedGroups.has(group.section!);
              const groupMaxViewPct = isGroup ? Math.max(...group.stats.map(s => s.viewPct)) : 0;
              const groupTotalClicks = isGroup ? group.stats.reduce((s, st) => s + st.clicks, 0) : 0;

              return (
                <div key={gi}>
                  {isGroup && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.section!)}
                      className="w-full flex items-center gap-2 mb-3 group/grp hover:opacity-80 transition"
                    >
                      <div className="h-px flex-1 bg-gray-100 group-hover/grp:bg-gray-200 transition" />
                      <span
                        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition"
                        style={{ color: "var(--primary)", backgroundColor: "var(--primary)" + "12" }}
                      >
                        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <Layers className="w-3 h-3" />
                        {group.section}
                        <span className="font-normal opacity-60">· {group.stats.length} blocs</span>
                      </span>
                      <div className="h-px flex-1 bg-gray-100 group-hover/grp:bg-gray-200 transition" />
                    </button>
                  )}

                  {isGroup && isCollapsed && (
                    <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 text-xs text-gray-500 mb-1">
                      <span className="text-gray-400 italic">{t("analytics_group_reduced")}</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-gray-400" />
                          {groupMaxViewPct}{t("analytics_max_seen")}
                        </span>
                        <span>{groupTotalClicks} {t("analytics_clicks")}</span>
                      </div>
                    </div>
                  )}

                  {!isCollapsed && (
                    <div className={isGroup ? "space-y-3 pl-3 border-l-2" : "space-y-3"}
                      style={isGroup ? { borderColor: "var(--primary)" + "25" } : {}}>
                      {group.stats.map(stat => {
                        const displayName = blockDisplayName(stat);
                        const hasCustomName = !!stat.blockName;

                        return (
                          <div key={stat.blockId}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs text-gray-300 flex-shrink-0">#{stat.index + 1}</span>
                                <span className={`text-xs font-medium truncate ${hasCustomName ? "" : "text-gray-700 capitalize"}`}
                                  style={hasCustomName ? { color: "var(--foreground)" } : {}}>
                                  {displayName}
                                </span>
                                {hasCustomName && (
                                  <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                                    style={{ color: "var(--primary)", backgroundColor: "var(--primary)" + "0D" }}>
                                    <Pencil className="w-2 h-2" />
                                    {t("analytics_renamed")}
                                  </span>
                                )}
                                {hasCustomName && (
                                  <span className="text-[10px] text-gray-300 capitalize flex-shrink-0">
                                    ({stat.blockType})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0 ml-3">
                                <span className="font-semibold tabular-nums">{stat.viewPct}{t("analytics_seen")}</span>
                                <span className="tabular-nums">{stat.clicks} {t("analytics_clicks")}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${(stat.viewPct / maxView) * 100}%`,
                                  backgroundColor: `hsl(${240 - (stat.viewPct / maxView) * 120}, 75%, 55%)`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
