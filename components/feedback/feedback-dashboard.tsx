"use client";

import { useState, useTransition } from "react";
import {
  MessageSquare, TrendingUp, TrendingDown, DownloadCloud,
  Copy, Archive, Plus, Pencil, Trash2, BarChart2, ListChecks, FileText,
} from "lucide-react";
import type { FeedbackSummary } from "@/app/actions/feedback";
import type { FormTemplate } from "@/types/feedback";
import {
  duplicateFormTemplate, deleteFormTemplate, updateFormTemplate,
  getFeedbackResponsesForExport,
} from "@/app/actions/feedback";
import Link from "next/link";
import toast from "react-hot-toast";

type Tab = "forms" | "responses" | "analytics";

interface FeedbackDashboardProps {
  summary: FeedbackSummary;
  templates: FormTemplate[];
}

export function FeedbackDashboard({ summary, templates: initialTemplates }: FeedbackDashboardProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [tab, setTab] = useState<Tab>("forms");
  const [, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  function handleDuplicate(id: string) {
    startTransition(async () => {
      await duplicateFormTemplate(id);
      toast.success("Formulaire dupliqué !");
      window.location.reload();
    });
  }

  function handleArchive(t: FormTemplate) {
    startTransition(async () => {
      await updateFormTemplate(t.id, { isArchived: !t.isArchived });
      setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, isArchived: !x.isArchived } : x));
      toast.success(t.isArchived ? "Formulaire désarchivé." : "Formulaire archivé.");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteFormTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Formulaire supprimé.");
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { rows } = await getFeedbackResponsesForExport();
      const headers = ["Propale", "Statut propale", "Formulaire", "Tag", "Statut réponse", "Date", "Réponses"];
      const csvLines = [
        headers.join(";"),
        ...rows.map(r =>
          [r.proposalTitle, r.proposalStatus, r.templateName, r.templateTag, r.status, r.submittedAt, `"${r.responses.replace(/"/g, '""')}"`].join(";")
        ),
      ];
      const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `feedback-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const active = templates.filter(t => !t.isArchived);
  const archived = templates.filter(t => t.isArchived);

  const TABS: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "forms",     label: "Mes formulaires",   icon: FileText,   count: active.length },
    { key: "responses", label: "Réponses récentes", icon: ListChecks, count: summary.recentResponses.length },
    { key: "analytics", label: "Analytics",         icon: BarChart2 },
  ];

  return (
    <div className="pb-12">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 mb-6 md:mb-10">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Feedback sales</h1>
          <p className="text-sm text-gray-400 mt-1">
            Formulaires de feedback envoyés à vos prospects
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "responses" && (
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
            >
              <DownloadCloud className="w-4 h-4" />
              Exporter CSV
            </button>
          )}
          <Link
            href="/feedback/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <Plus className="w-4 h-4" />
            Nouveau formulaire
          </Link>
        </div>
      </div>

      {/* ── Tab bar — same pill style as proposals filters ── */}
      <div className="flex items-center gap-1 mb-4">
        {TABS.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              tab === key
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-500 hover:border-gray-300"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count !== undefined && (
              <span className={`text-[10px] font-bold ml-0.5 ${tab === key ? "text-white/70" : "text-gray-400"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Mes formulaires ── */}
      {tab === "forms" && (
        <div className="space-y-3">
          {active.length === 0 ? (
            <div
              className="rounded-2xl py-24 text-center"
              style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
            >
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h2 className="text-gray-600 font-semibold mb-1">Aucun formulaire actif</h2>
              <p className="text-sm text-gray-400 mb-4">Créez votre premier formulaire pour commencer à collecter des feedbacks.</p>
              <Link
                href="/feedback/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <Plus className="w-4 h-4" />
                Créer mon premier formulaire
              </Link>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
            >
              {/* Column headers */}
              <div
                className="hidden md:grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-3.5"
                style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.015)" }}
              >
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-16">Tag</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Formulaire</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Questions</span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</span>
              </div>

              <div className="divide-y divide-gray-50">
                {active.map(t => (
                  <TemplateRow
                    key={t.id}
                    template={t}
                    onDuplicate={() => handleDuplicate(t.id)}
                    onArchive={() => handleArchive(t)}
                    onDelete={() => handleDelete(t.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {archived.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 transition select-none py-1">
                Archivés ({archived.length})
              </summary>
              <div
                className="mt-2 rounded-2xl overflow-hidden opacity-75"
                style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
              >
                <div className="divide-y divide-gray-50">
                  {archived.map(t => (
                    <TemplateRow
                      key={t.id}
                      template={t}
                      onDuplicate={() => handleDuplicate(t.id)}
                      onArchive={() => handleArchive(t)}
                      onDelete={() => handleDelete(t.id)}
                    />
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>
      )}

      {/* ── Tab: Réponses récentes ── */}
      {tab === "responses" && (
        <div>
          {summary.recentResponses.length === 0 ? (
            <div
              className="rounded-2xl py-24 text-center"
              style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
            >
              <ListChecks className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h2 className="text-gray-600 font-semibold mb-1">Aucune réponse pour l&apos;instant</h2>
              <p className="text-sm text-gray-400">Les réponses apparaîtront ici dès que vos prospects rempliront un formulaire.</p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="hidden md:table-header-group">
                    <tr
                      className="text-left"
                      style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: "rgba(0,0,0,0.015)" }}
                    >
                      {["Propale", "Statut propale", "Formulaire", "Statut réponse", "Date"].map(h => (
                        <th key={h} className="px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {summary.recentResponses.map(r => (
                      <tr
                        key={r.id}
                        className="hover:bg-black/[0.02] transition cursor-pointer"
                        onClick={() => { window.location.href = `/proposals/${r.proposalId}/feedback`; }}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-800 truncate max-w-[200px]">
                          {r.proposalTitle}
                        </td>
                        <td className="px-6 py-4">
                          <StatusPill status={r.proposalStatus} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[160px]">
                          {r.templateName}
                        </td>
                        <td className="px-6 py-4">
                          <ResponsePill status={r.status} />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 whitespace-nowrap">
                          {(r.submittedAt ?? r.closedAt)
                            ? new Date((r.submittedAt ?? r.closedAt)!).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Analytics ── */}
      {tab === "analytics" && (
        <div className="space-y-4">
          {summary.totalSent === 0 ? (
            <div
              className="rounded-2xl py-24 text-center"
              style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
            >
              <BarChart2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <h2 className="text-gray-600 font-semibold mb-1">Aucune donnée pour l&apos;instant</h2>
              <p className="text-sm text-gray-400">Les statistiques apparaîtront une fois vos premiers formulaires envoyés.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Formulaires envoyés"
                  value={summary.totalSent}
                  icon={MessageSquare}
                  color="#6366f1"
                />
                <StatCard
                  label="Taux de réponse"
                  value={`${Math.round((summary.totalAnswered / summary.totalSent) * 100)}%`}
                  icon={TrendingUp}
                  color="#16a34a"
                />
                <StatCard
                  label="Fermés sans réponse"
                  value={`${Math.round((summary.totalClosed / summary.totalSent) * 100)}%`}
                  icon={TrendingDown}
                  color="#dc2626"
                />
                <StatCard
                  label="Réponses reçues"
                  value={summary.totalAnswered}
                  icon={MessageSquare}
                  color="#0ea5e9"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <SplitCard tag="won" answered={summary.wonAnswered} closed={summary.wonClosed} />
                <SplitCard tag="lost" answered={summary.lostAnswered} closed={summary.lostClosed} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TemplateRow({ template, onDuplicate, onArchive, onDelete }: {
  template: FormTemplate;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const tagColor = template.tag === "won" ? "#16a34a" : "#dc2626";
  const tagBg   = template.tag === "won" ? "#f0fdf4" : "#fef2f2";
  const tagLabel = template.tag === "won" ? "Gagné"  : "Perdu";

  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 px-6 py-4 hover:bg-black/[0.02] transition">
      <span
        className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full w-16 text-center"
        style={{ color: tagColor, backgroundColor: tagBg }}
      >
        {tagLabel}
      </span>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{template.name}</p>
      </div>

      <span className="text-sm text-gray-400 whitespace-nowrap hidden sm:block">
        {template.fields.length} question{template.fields.length > 1 ? "s" : ""}
      </span>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        <Link
          href={`/feedback/${template.id}/edit`}
          className="p-1.5 rounded-lg text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Link>
        <button type="button" onClick={onDuplicate}
          className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onArchive}
          className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition">
          <Archive className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onDelete}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 space-y-2"
      style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function SplitCard({ tag, answered, closed }: { tag: "won" | "lost"; answered: number; closed: number }) {
  const total = answered + closed;
  const color = tag === "won" ? "#16a34a" : "#dc2626";
  const bg    = tag === "won" ? "#f0fdf4" : "#fef2f2";
  const label = tag === "won" ? "Gagné"   : "Perdu";
  const rate  = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div
      className="rounded-2xl p-5 space-y-3"
      style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)", border: `1px solid ${color}18` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: color }}>
          {label}
        </span>
        <span className="text-2xl font-bold" style={{ color }}>{rate}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: bg }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: color }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{answered} réponse{answered > 1 ? "s" : ""}</span>
        <span>{closed} fermé{closed > 1 ? "s" : ""} sans réponse</span>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = status === "won"
    ? { label: "Gagné",   color: "#065f46", bg: "#d1fae5" }
    : status === "lost"
    ? { label: "Perdu",   color: "#991b1b", bg: "#fee2e2" }
    : { label: "En cours", color: "#92400e", bg: "#fef3c7" };
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function ResponsePill({ status }: { status: string }) {
  if (status === "answered")
    return <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-green-700 bg-green-50">Répondu</span>;
  return <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-red-600 bg-red-50">Fermé sans réponse</span>;
}
