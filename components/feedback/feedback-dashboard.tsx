"use client";

import { useState, useTransition } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MessageSquare, TrendingUp, TrendingDown, DownloadCloud, Copy, Archive, Plus, Pencil, Trash2 } from "lucide-react";
import type { FeedbackSummary } from "@/app/actions/feedback";
import type { FormTemplate } from "@/types/feedback";
import {
  duplicateFormTemplate, deleteFormTemplate, updateFormTemplate,
  getFeedbackResponsesForExport,
} from "@/app/actions/feedback";
import Link from "next/link";
import toast from "react-hot-toast";

interface FeedbackDashboardProps {
  summary: FeedbackSummary;
  templates: FormTemplate[];
}

export function FeedbackDashboard({ summary, templates: initialTemplates }: FeedbackDashboardProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [, startTransition] = useTransition();
  const [exporting, setExporting] = useState(false);

  const responseRate = summary.totalSent > 0
    ? Math.round((summary.totalAnswered / summary.totalSent) * 100)
    : 0;
  const closeRate = summary.totalSent > 0
    ? Math.round((summary.totalClosed / summary.totalSent) * 100)
    : 0;

  function handleDuplicate(id: string) {
    startTransition(async () => {
      await duplicateFormTemplate(id);
      toast.success("Formulaire dupliqué !");
      // Reload page to refresh list
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

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Feedback sales</h1>
          <p className="text-sm text-gray-400 mt-0.5">Formulaires de feedback envoyés à vos prospects</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4" />
            Exporter CSV
          </button>
          <Link
            href="/feedback/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition"
            style={{ backgroundColor: "#6366f1" }}
          >
            <Plus className="w-4 h-4" />
            Nouveau formulaire
          </Link>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Formulaires envoyés" value={summary.totalSent} icon={MessageSquare} color="#6366f1" />
        <StatCard label="Taux de réponse" value={`${responseRate}%`} icon={TrendingUp} color="#16a34a" />
        <StatCard label="Fermés sans réponse" value={`${closeRate}%`} icon={TrendingDown} color="#dc2626" />
        <StatCard label="Réponses reçues" value={summary.totalAnswered} icon={MessageSquare} color="#0ea5e9" />
      </div>

      {/* ── Won / Lost split ── */}
      {summary.totalAnswered > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <SplitCard tag="won" answered={summary.wonAnswered} closed={summary.wonClosed} />
          <SplitCard tag="lost" answered={summary.lostAnswered} closed={summary.lostClosed} />
        </div>
      )}

      {/* ── Recent responses table ── */}
      {summary.recentResponses.length > 0 && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-800">Réponses récentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50">
                  {["Propale", "Statut propale", "Formulaire", "Statut réponse", "Date"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.recentResponses.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition cursor-pointer"
                    onClick={() => window.location.href = `/proposals/${r.proposalId}/feedback`}>
                    <td className="px-5 py-3 font-medium text-gray-800 truncate max-w-[200px]">{r.proposalTitle}</td>
                    <td className="px-5 py-3">
                      <StatusPill status={r.proposalStatus} />
                    </td>
                    <td className="px-5 py-3 text-gray-500 truncate max-w-[160px]">{r.templateName}</td>
                    <td className="px-5 py-3">
                      <ResponsePill status={r.status} />
                    </td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {(r.submittedAt ?? r.closedAt)
                        ? new Date(r.submittedAt ?? r.closedAt!).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Templates list ── */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-gray-800">Mes formulaires</h2>

        {active.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border border-dashed border-gray-200 text-center">
            <MessageSquare className="w-8 h-8 text-gray-200" />
            <p className="text-sm text-gray-400">Aucun formulaire actif. Créez-en un pour commencer.</p>
            <Link href="/feedback/new" className="text-sm font-semibold text-indigo-500 hover:underline">
              Créer mon premier formulaire →
            </Link>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {active.map(t => (
            <TemplateCard
              key={t.id}
              template={t}
              onDuplicate={() => handleDuplicate(t.id)}
              onArchive={() => handleArchive(t)}
              onDelete={() => handleDelete(t.id)}
            />
          ))}
        </div>

        {archived.length > 0 && (
          <details className="mt-4">
            <summary className="text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 transition">
              Archivés ({archived.length})
            </summary>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              {archived.map(t => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onDuplicate={() => handleDuplicate(t.id)}
                  onArchive={() => handleArchive(t)}
                  onDelete={() => handleDelete(t.id)}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 space-y-2" style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + "15" }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}

function SplitCard({ tag, answered, closed }: { tag: "won" | "lost"; answered: number; closed: number }) {
  const total = answered + closed;
  const color = tag === "won" ? "#16a34a" : "#dc2626";
  const bg = tag === "won" ? "#f0fdf4" : "#fef2f2";
  const label = tag === "won" ? "Gagné" : "Perdu";
  const rate = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 space-y-3" style={{ border: `1px solid ${color}20`, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>{label}</span>
        <span className="text-2xl font-extrabold" style={{ color }}>{rate}%</span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ backgroundColor: bg }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: color }} />
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
    ? { label: "Gagné", color: "#065f46", bg: "#d1fae5" }
    : status === "lost"
    ? { label: "Perdu", color: "#991b1b", bg: "#fee2e2" }
    : { label: "En cours", color: "#92400e", bg: "#fef3c7" };
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: cfg.color, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function ResponsePill({ status }: { status: string }) {
  if (status === "answered")
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-green-700 bg-green-50">Répondu</span>;
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-red-600 bg-red-50">Fermé sans réponse</span>;
}

function TemplateCard({ template, onDuplicate, onArchive, onDelete }: {
  template: FormTemplate;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const tagColor = template.tag === "won" ? "#16a34a" : "#dc2626";
  const tagLabel = template.tag === "won" ? "Gagné" : "Perdu";

  return (
    <div
      className="bg-white rounded-2xl p-5 space-y-3 hover:shadow-md transition-shadow"
      style={{
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        opacity: template.isArchived ? 0.6 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: tagColor }}>
              {tagLabel}
            </span>
            {template.isArchived && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-gray-400 bg-gray-100">Archivé</span>
            )}
          </div>
          <p className="text-sm font-bold text-gray-800 truncate">{template.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{template.fields.length} question{template.fields.length > 1 ? "s" : ""}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Link href={`/feedback/${template.id}/edit`}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition">
            <Pencil className="w-3.5 h-3.5" />
          </Link>
          <button type="button" onClick={onDuplicate}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onArchive}
            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition">
            <Archive className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-600 italic line-clamp-2">&quot;{template.title}&quot;</p>
    </div>
  );
}

// Recharts import kept for future use (choice charts for radio/checkbox analysis)
void BarChart; void Bar; void XAxis; void YAxis; void CartesianGrid; void Tooltip; void ResponsiveContainer;
