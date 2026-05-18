"use client";

import { useState, useMemo } from "react";
import { ProposalRow } from "@/components/proposal/proposal-row";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export type SerializedProposal = {
  id: string;
  slug: string;
  title: string;
  status: string;
  published: boolean;
  amountOneShot: number | null;
  amountMrr: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  clientLogoUrl: string | null;
  showPdfButton: boolean;
  downloadUrl: string | null;
  downloadButtonLabel: string | null;
  viewCount: number;
  lastVisitAt: string | null;
};

type SortKey = "lastVisit" | "createdAt" | "updatedAt";
type StatusFilter = "all" | "pending" | "won" | "lost";

const ROWS_OPTIONS = [10, 25, 50] as const;

function getTs(val: string | null | undefined): number {
  if (!val) return 0;
  const d = new Date(val);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export function ProposalsTableClient({ proposals, isPremium = false }: { proposals: SerializedProposal[]; isPremium?: boolean }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("lastVisit");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<(typeof ROWS_OPTIONS)[number]>(10);

  // Status counts for badges
  const statusCounts = useMemo(() => ({
    all: proposals.length,
    pending: proposals.filter(p => p.status === "pending").length,
    won: proposals.filter(p => p.status === "won").length,
    lost: proposals.filter(p => p.status === "lost").length,
  }), [proposals]);

  // Filter
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return proposals.filter(p => {
      const matchSearch = !q || p.title.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [proposals, search, statusFilter]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "createdAt":  return getTs(b.createdAt) - getTs(a.createdAt);
        case "updatedAt":  return getTs(b.updatedAt) - getTs(a.updatedAt);
        case "lastVisit":
        default: {
          const diff = getTs(b.lastVisitAt) - getTs(a.lastVisitAt);
          if (diff !== 0) return diff;
          // proposals never visited go last
          return getTs(b.updatedAt) - getTs(a.updatedAt);
        }
      }
    });
  }, [filtered, sortKey]);

  // Pagination
  const totalPages = Math.ceil(sorted.length / rowsPerPage);
  const safePage = Math.min(page, Math.max(1, totalPages));
  const paginated = sorted.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

  function handleSearch(q: string) {
    setSearch(q);
    setPage(1);
  }
  function handleSort(key: SortKey) {
    setSortKey(key);
    setPage(1);
  }
  function handleStatus(s: StatusFilter) {
    setStatusFilter(s);
    setPage(1);
  }

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "lastVisit", label: t("proposals_sort_last_visit") },
    { key: "createdAt", label: t("proposals_sort_created") },
    { key: "updatedAt", label: t("proposals_sort_updated") },
  ];

  const STATUS_TABS: { key: StatusFilter; label: string; dot?: string }[] = [
    { key: "all",     label: "Toutes" },
    { key: "pending", label: "En cours",  dot: "bg-amber-400" },
    { key: "won",     label: "Gagnées",   dot: "bg-green-400" },
    { key: "lost",    label: "Perdues",   dot: "bg-red-400" },
  ];

  return (
    <>
      {/* Toolbar: search + status filters + sort — all on one line */}
      <div className="flex items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative w-64 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder={t("proposals_search_placeholder")}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
          />
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1 flex-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleStatus(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                statusFilter === tab.key
                  ? "bg-gray-900 text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {tab.dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${tab.dot}`} />}
              {tab.label}
              <span className={`text-[10px] font-bold ml-0.5 ${statusFilter === tab.key ? "text-white/70" : "text-gray-400"}`}>
                {statusCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={sortKey}
            onChange={e => handleSort(e.target.value as SortKey)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition cursor-pointer"
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
        {sorted.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {t("proposals_no_results")}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="hidden md:table-header-group">
                <tr className="text-left" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.015)" }}>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_title")}</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_status")}</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_mrr")}</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_oneshot")}</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_views")}</th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("proposals_col_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.map(p => (
                  <ProposalRow
                    key={p.id}
                    id={p.id}
                    slug={p.slug}
                    title={p.title}
                    published={p.published}
                    status={p.status}
                    amountOneShot={p.amountOneShot}
                    amountMrr={p.amountMrr}
                    viewCount={p.viewCount}
                    clientLogoUrl={p.clientLogoUrl}
                    showPdfButton={p.showPdfButton}
                    downloadUrl={p.downloadUrl}
                    downloadButtonLabel={p.downloadButtonLabel}
                    isPremium={isPremium}
                  />
                ))}
              </tbody>
            </table>

            {/* Pagination — only if more than rowsPerPage proposals exist */}
            {proposals.length > 10 && (
              <div
                className="flex items-center justify-between px-6 py-4 text-sm"
                style={{ borderTop: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.012)" }}
              >
                {/* Rows per page */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{t("proposals_rows_per_page")}</span>
                  <select
                    value={rowsPerPage}
                    onChange={e => {
                      setRowsPerPage(Number(e.target.value) as typeof rowsPerPage);
                      setPage(1);
                    }}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {ROWS_OPTIONS.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>

                {/* Page info + nav */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {(safePage - 1) * rowsPerPage + 1}–{Math.min(safePage * rowsPerPage, sorted.length)} / {sorted.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setPage(safePage - 1)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {/* Page number pills */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                      .reduce<(number | "…")[]>((acc, n, i, arr) => {
                        if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("…");
                        acc.push(n);
                        return acc;
                      }, [])
                      .map((n, i) =>
                        n === "…" ? (
                          <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-gray-400">…</span>
                        ) : (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setPage(n as number)}
                            className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition ${
                              n === safePage
                                ? "bg-indigo-600 text-white"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                            }`}
                          >
                            {n}
                          </button>
                        )
                      )}
                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage(safePage + 1)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
