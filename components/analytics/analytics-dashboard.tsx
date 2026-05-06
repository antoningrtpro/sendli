"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Eye, Users, Clock, Lock, Mail, Link as LinkIcon, Tag } from "lucide-react";

interface BlockStat {
  blockId: string;
  blockType: string;
  index: number;
  analyticsSection?: string;
  uniqueViewers: number;
  clicks: number;
  viewPct: number;
}

// Groups consecutive blocks under their nearest preceding section label
interface BlockGroup {
  section: string | null; // null = no label
  stats: BlockStat[];
}

function groupBySection(stats: BlockStat[]): BlockGroup[] {
  const groups: BlockGroup[] = [];
  let current: BlockGroup | null = null;

  for (const stat of stats) {
    if (stat.analyticsSection) {
      // Start a new named group
      current = { section: stat.analyticsSection, stats: [stat] };
      groups.push(current);
    } else if (current) {
      current.stats.push(stat);
    } else {
      // Before any section label — put in an unnamed group
      current = { section: null, stats: [stat] };
      groups.push(current);
    }
  }
  return groups;
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
  blockStats: BlockStat[];
  published: boolean;
  recipientStats?: RecipientStat[];
}

type PeriodKey = "today" | "7" | "30" | "90" | "all";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7",     label: "7 jours" },
  { key: "30",    label: "30 jours" },
  { key: "90",    label: "90 jours" },
  { key: "all",   label: "Tout" },
];

function shortDate(dateStr: string) {
  // Hourly format: "14:00" → "14h"
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

// Pick X-axis tick interval based on granularity and number of data points
function xInterval(len: number, granularity: "hour" | "day") {
  if (granularity === "hour") return 2; // every 3rd hour: 0h, 3h, 6h…
  if (len <= 7) return 0;
  if (len <= 30) return 4;
  if (len <= 90) return 11;
  return Math.floor(len / 8);
}

export function AnalyticsDashboard({
  periods,
  blockStats,
  published,
  recipientStats = [],
}: Props) {
  const [period, setPeriod] = useState<PeriodKey>("30");

  if (!published) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
        <Lock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Publiez votre proposition pour commencer à suivre les analytics.</p>
      </div>
    );
  }

  const stats = periods[period] ?? periods["30"];
  const { totalViews, uniqueVisitors, avgTimeSecs, dailyViews, granularity } = stats;

  // Today's key in the current dataset
  const todayKey = granularity === "day"
    ? new Date().toISOString().slice(0, 10)
    : new Date().getHours().toString().padStart(2, "0") + ":00";
  const avgTimeLabel = fmtDur(avgTimeSecs);
  const maxView = Math.max(...blockStats.map(b => b.viewPct), 1);

  return (
    <div className="space-y-6">

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
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Vues totales",       value: totalViews,      icon: Eye,   color: "indigo" },
          { label: "Visiteurs uniques",  value: uniqueVisitors,  icon: Users, color: "purple" },
          { label: "Temps moyen",        value: avgTimeLabel,    icon: Clock, color: "green" },
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
          <h2 className="font-semibold text-gray-900">Vues dans le temps</h2>
          <span className="text-xs text-gray-400 font-medium">
            {period === "today" ? "Par heure · aujourd'hui"
              : period === "all" ? "Depuis le début"
              : `${period} derniers jours`}
          </span>
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
              formatter={(value: any) => [value, "Vues"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <ReferenceLine
              x={todayKey}
              stroke="var(--primary)"
              strokeDasharray="4 3"
              strokeOpacity={0.5}
              label={{ value: "Auj.", position: "insideTopRight", fontSize: 10, fill: "var(--primary)", opacity: 0.7 }}
            />
            <Line
              type="monotone"
              dataKey="views"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Per-recipient table ──────────────────────────────────────────────── */}
      {recipientStats.length > 0 && (
        <div className="rounded-2xl p-6" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
          <h2 className="font-semibold text-gray-900 mb-1">Suivi par destinataire</h2>
          <p className="text-xs text-gray-400 mb-5">Activité détaillée pour chaque lien personnalisé</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left font-medium pb-3 pr-4">Destinataire</th>
                  <th className="text-right font-medium pb-3 px-4">Vues</th>
                  <th className="text-right font-medium pb-3 px-4">Visiteurs</th>
                  <th className="text-right font-medium pb-3 px-4">Tps moyen</th>
                  <th className="text-right font-medium pb-3 px-4">Clics CTA</th>
                  <th className="text-right font-medium pb-3 pl-4">Dernière visite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recipientStats.map(r => (
                  <tr key={r.linkId} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: "var(--primary)" }}>
                          {r.recipientName
                            ? r.recipientName.charAt(0).toUpperCase()
                            : r.recipientEmail
                              ? r.recipientEmail.charAt(0).toUpperCase()
                              : <LinkIcon className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {r.recipientName || r.recipientEmail || "Lien sans destinataire"}
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
        </div>
      )}

      {/* ── Block engagement ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
        <h2 className="font-semibold text-gray-900 mb-1">Engagement par bloc</h2>
        <p className="text-xs text-gray-400 mb-5">
          Dans l&apos;ordre de la proposition · les dividers sont exclus
        </p>

        {blockStats.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun bloc trouvé.</p>
        ) : (
          <div className="space-y-6">
            {groupBySection([...blockStats].sort((a, b) => a.index - b.index)).map((group, gi) => (
              <div key={gi}>
                {/* Section header */}
                {group.section && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1 bg-gray-100" />
                    <span
                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full"
                      style={{ color: "var(--primary)", backgroundColor: "var(--primary)" + "12" }}
                    >
                      <Tag className="w-3 h-3" />
                      {group.section}
                    </span>
                    <div className="h-px flex-1 bg-gray-100" />
                  </div>
                )}

                {/* Blocks in this group */}
                <div className="space-y-3">
                  {group.stats.map(stat => (
                    <div key={stat.blockId}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-300">#{stat.index + 1}</span>
                          <span className="text-xs font-medium capitalize text-gray-700">{stat.blockType}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="font-semibold tabular-nums">{stat.viewPct}% vu</span>
                          <span className="tabular-nums">{stat.clicks} clics</span>
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
