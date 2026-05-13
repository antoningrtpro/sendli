"use client";

import { useState, useTransition, useEffect, useRef, memo, useCallback } from "react";
import { createPortal } from "react-dom";
import { getAnalyticsDetail, type DashboardRecipientStat, type DailyView, type ProposalAnalyticsSummary } from "@/app/actions/analytics";
import { Eye, Users, MousePointer, Clock, Mail, Link as LinkIcon, ChevronDown, Check, Lock } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/contexts/language-context";
import dynamic from "next/dynamic";

// Lazy-load recharts — ~400 KB, only needed when chart is visible
const RechartsChart = dynamic(
  () => import("./analytics-chart").then(m => ({ default: m.AnalyticsChart })),
  { ssr: false, loading: () => <div className="h-[180px] rounded-xl bg-gray-50 animate-pulse" /> }
);

interface Proposal { id: string; title: string }

function shortDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}
function fmtTime(s: number) {
  if (!s) return "—";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60 > 0 ? ` ${s % 60}s` : ""}`;
}
function fmt(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

// ── Dropdown selector (many proposals) ───────────────────────────────────────

function DropdownSelector({
  proposals,
  selected,
  onToggle,
  onToggleAll,
  label,
  allLabel,
}: {
  proposals: Proposal[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  label: string;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function openMenu() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 320) });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    function onScroll() { setOpen(false); }
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open]);

  // label is computed by parent and passed in

  const allSelected = selected.size === proposals.length;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className="flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 hover:border-gray-300 transition min-w-[220px] justify-between"
        style={{ background: "var(--surface)" }}
      >
        <span className="font-medium" style={{ color: "var(--foreground)" }}>{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] rounded-xl border border-gray-100 shadow-xl overflow-hidden"
          style={{ top: pos.top, left: pos.left, width: pos.width, background: "var(--surface)", boxShadow: "var(--shadow-dropdown)" }}
        >
          {/* All */}
          <button
            type="button"
            onClick={onToggleAll}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-gray-50 transition border-b border-gray-100"
          >
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition"
              style={allSelected
                ? { backgroundColor: "var(--primary)", border: "2px solid var(--primary)" }
                : { backgroundColor: "transparent", border: "2px solid #d1d5db" }}
            >
              {allSelected && <Check className="w-2.5 h-2.5 text-white" />}
            </span>
            <span className="font-medium text-gray-800">{allLabel}</span>
          </button>

          {/* Individual */}
          <div className="max-h-64 overflow-y-auto py-1">
            {proposals.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => onToggle(p.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition text-left"
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition"
                  style={selected.has(p.id)
                    ? { backgroundColor: "var(--primary)", border: "2px solid var(--primary)" }
                    : { backgroundColor: "transparent", border: "2px solid #d1d5db" }}
                >
                  {selected.has(p.id) && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                <span className="text-gray-700 text-left whitespace-normal">{p.title}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

// ── Period options ────────────────────────────────────────────────────────────

type PeriodOption = { days: number | null; labelKey: "analytics_today" | "analytics_7" | "analytics_30" | "analytics_90" | "analytics_all" };

const PERIODS: PeriodOption[] = [
  { days: 1,    labelKey: "analytics_today" },
  { days: 7,    labelKey: "analytics_7" },
  { days: 30,   labelKey: "analytics_30" },
  { days: 90,   labelKey: "analytics_90" },
  { days: null, labelKey: "analytics_all" },
];

// ── Main component ────────────────────────────────────────────────────────────

export function AnalyticsSection({ proposals, isPremium }: { proposals: Proposal[]; isPremium: boolean }) {
  const { t } = useLanguage();
  // Start with all proposals selected
  const [selected, setSelected] = useState<Set<string>>(() => new Set(proposals.map(p => p.id)));
  const [days, setDays] = useState<number | null>(30); // default 30 days
  const [summaries, setSummaries] = useState<ProposalAnalyticsSummary[]>([]);
  const [dailyViews, setDailyViews] = useState<DailyView[]>([]);
  const [recipientStats, setRecipientStats] = useState<DashboardRecipientStat[]>([]);
  const [isPending, startTransition] = useTransition();

  // Auto-load whenever selection or period changes
  useEffect(() => {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setSummaries([]);
      setDailyViews([]);
      setRecipientStats([]);
      return;
    }
    startTransition(async () => {
      const result = await getAnalyticsDetail(ids, days);
      setSummaries(result.summaries);
      setDailyViews(result.dailyViews);
      setRecipientStats(result.recipientStats);
    });
  }, [selected, days]); // eslint-disable-line

  function loadWithIds(next: Set<string>) {
    setSelected(next);
  }

  function toggleAll() {
    if (selected.size === proposals.length) loadWithIds(new Set());
    else loadWithIds(new Set(proposals.map(p => p.id)));
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    loadWithIds(next);
  }

  const totalViews = summaries.reduce((s, r) => s + r.views, 0);
  const totalUnique = summaries.reduce((s, r) => s + r.uniqueVisitors, 0);
  const totalCta = summaries.reduce((s, r) => s + r.ctaClicks, 0);
  const avgTime = summaries.length
    ? Math.round(summaries.reduce((s, r) => s + r.avgTimeSeconds, 0) / summaries.length)
    : 0;
  const hasViews = dailyViews.some(d => d.views > 0);

  const allLabel = t("dashboard_all_proposals");
  const selectorLabel = selected.size === 0 || selected.size === proposals.length
    ? allLabel
    : `${selected.size} propale${selected.size > 1 ? "s" : ""} sélectionnée${selected.size > 1 ? "s" : ""}`;

  // Chart title based on period
  const chartTitle = days === 1
    ? t("analytics_today")
    : days === null
      ? t("analytics_since_start")
      : t("analytics_last_n_days").replace("{n}", String(days));

  return (
    <div className="relative rounded-2xl mt-6 overflow-hidden" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>

      {/* Premium gate overlay */}
      {!isPremium && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl"
          style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(255,255,255,0.7)" }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50">
            <Lock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Analytics Premium</p>
            <p className="text-xs text-gray-500 mt-0.5">Passez en Premium pour accéder aux analytics</p>
          </div>
          <Link
            href="/settings"
            className="text-xs font-semibold px-4 py-2 rounded-xl text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--primary)" }}
          >
            Passer Premium
          </Link>
        </div>
      )}

      {/* Header + selectors */}
      <div className="flex items-center justify-between px-6 py-5 gap-4 flex-wrap" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <div>
          <h2 className="font-semibold text-gray-900">{t("dashboard_analytics")}</h2>
          {isPending && <p className="text-xs text-gray-400 mt-0.5">{t("updating")}</p>}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100">
            {PERIODS.map(p => (
              <button
                key={String(p.days)}
                type="button"
                onClick={() => setDays(p.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  days === p.days
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t(p.labelKey)}
              </button>
            ))}
          </div>

          <DropdownSelector
            proposals={proposals}
            selected={selected}
            onToggle={toggle}
            onToggleAll={toggleAll}
            label={selectorLabel}
            allLabel={allLabel}
          />
        </div>
      </div>

      {/* Empty state */}
      {selected.size === 0 && !isPending && (
        <div className="px-6 py-10 text-center text-sm text-gray-400">
          {t("dashboard_select_one")}
        </div>
      )}

      {/* Results */}
      {selected.size > 0 && (
        <div className={`p-6 space-y-6 transition-opacity ${isPending ? "opacity-50 pointer-events-none" : "opacity-100"}`}>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: Eye,          label: t("analytics_total_views"), value: fmt(totalViews) },
              { icon: Users,        label: t("analytics_unique"),      value: fmt(totalUnique) },
              { icon: MousePointer, label: "Clics CTA",                value: fmt(totalCta) },
              { icon: Clock,        label: t("analytics_avg_time"),    value: fmtTime(avgTime) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
                <Icon className="w-4 h-4 text-gray-400 mx-auto mb-1.5" />
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Views chart */}
          {hasViews && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-4">{t("analytics_views_time")} — {chartTitle}</p>
              <RechartsChart data={dailyViews} viewsLabel={t("analytics_col_views")} />
            </div>
          )}

          {/* Per-proposal breakdown (only if >1 selected) */}
          {summaries.length > 1 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">{t("dashboard_by_proposal")}</p>
              <div className="space-y-2">
                {summaries.map(row => (
                  <div key={row.proposalId} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-gray-50">
                    <p className="text-sm font-medium text-gray-800 min-w-0">{row.title}</p>
                    <div className="flex items-center gap-6 text-xs text-gray-500 flex-shrink-0">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {fmt(row.views)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {fmt(row.uniqueVisitors)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtTime(row.avgTimeSeconds)}</span>
                      <span className="flex items-center gap-1"><MousePointer className="w-3 h-3" /> {fmt(row.ctaClicks)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-recipient table */}
          {recipientStats.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">{t("dashboard_by_recipient")}</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
                      <th className="text-left font-medium px-4 py-3">{t("analytics_col_recipient")}</th>
                      {summaries.length > 1 && <th className="text-left font-medium px-4 py-3">{t("dashboard_by_proposal")}</th>}
                      <th className="text-right font-medium px-4 py-3">{t("analytics_col_views")}</th>
                      <th className="text-right font-medium px-4 py-3">{t("analytics_col_cta")}</th>
                      <th className="text-right font-medium px-4 py-3">{t("analytics_col_last")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recipientStats.map(r => (
                      <tr key={r.linkId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
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
                                <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                                  <Mail className="w-3 h-3 flex-shrink-0" />{r.recipientEmail}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {summaries.length > 1 && (
                          <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">{r.proposalTitle}</td>
                        )}
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">{r.views}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{r.ctaClicks}</td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400">{fmtDate(r.lastSeenAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
