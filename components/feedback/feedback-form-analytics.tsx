"use client";

import Link from "next/link";
import { ArrowLeft, MessageSquare, TrendingUp, Users, CheckCircle } from "lucide-react";
import type { FormAnalytics, FieldAnalytics } from "@/app/actions/feedback";

interface Props { data: FormAnalytics }

export function FeedbackFormAnalytics({ data }: Props) {
  const { template, totalSent, totalAnswered, totalClosed, responseRate, fields, recentResponses } = data;
  const tagColor = template.tag === "won" ? "#16a34a" : "#dc2626";
  const tagBg    = template.tag === "won" ? "#f0fdf4" : "#fef2f2";
  const tagLabel = template.tag === "won" ? "Gagné"   : "Perdu";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/feedback"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Link>
        <span className="text-gray-200">/</span>
        <span className="text-sm font-medium text-gray-700">{template.name}</span>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ color: tagColor, backgroundColor: tagBg }}
        >
          {tagLabel}
        </span>
      </div>

      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
          Analytics — {template.name}
        </h1>
        <p className="text-sm text-gray-400 mt-1">{template.fields.length} question{template.fields.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Envoyés" value={totalSent} icon={MessageSquare} color="#6366f1" />
        <StatCard label="Répondus" value={totalAnswered} icon={CheckCircle} color="#16a34a" />
        <StatCard label="Sans réponse" value={totalClosed} icon={Users} color="#dc2626" />
        <StatCard label="Taux de réponse" value={`${responseRate}%`} icon={TrendingUp} color="#0ea5e9" />
      </div>

      {/* No data */}
      {totalAnswered === 0 ? (
        <div
          className="rounded-2xl py-20 text-center"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
        >
          <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucune réponse pour l&apos;instant</p>
          <p className="text-sm text-gray-400 mt-1">Les résultats apparaîtront dès que vos prospects rempliront ce formulaire.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map(field => (
            <FieldCard key={field.fieldId} field={field} totalResponses={totalAnswered} />
          ))}
        </div>
      )}

      {/* Recent responses list */}
      {recentResponses.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
        >
          <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
            <h2 className="text-sm font-semibold text-gray-800">Réponses récentes</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentResponses.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <span className="text-sm text-gray-700">{r.proposalTitle}</span>
                <span className="text-xs text-gray-400">
                  {r.submittedAt
                    ? new Date(r.submittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Field card ────────────────────────────────────────────────────────────────

function FieldCard({ field, totalResponses }: { field: FieldAnalytics; totalResponses: number }) {
  return (
    <div
      className="rounded-2xl p-6"
      style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
    >
      <p className="text-sm font-semibold text-gray-800 mb-4">{field.label}</p>

      {field.type === "choice" && (
        <ChoiceViz field={field} totalResponses={totalResponses} />
      )}
      {field.type === "scale" && (
        <ScaleViz field={field} />
      )}
      {field.type === "text" && (
        <TextViz field={field} />
      )}
    </div>
  );
}

// ── Choice (radio / checkbox) ─────────────────────────────────────────────────

function ChoiceViz({ field, totalResponses }: { field: Extract<FieldAnalytics, { type: "choice" }>; totalResponses: number }) {
  const max = Math.max(...field.options.map(o => o.count), 1);
  return (
    <div className="space-y-2.5">
      {field.options.map(opt => {
        const pct = totalResponses > 0 ? Math.round((opt.count / totalResponses) * 100) : 0;
        const barPct = Math.round((opt.count / max) * 100);
        return (
          <div key={opt.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 font-medium truncate max-w-[70%]">{opt.label}</span>
              <span className="text-gray-400 flex-shrink-0 ml-2">{opt.count} · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all"
                style={{ width: `${barPct}%`, backgroundColor: "var(--primary)" }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-gray-400 mt-1">{field.total} réponse{field.total !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ── Scale / NPS ───────────────────────────────────────────────────────────────

function ScaleViz({ field }: { field: Extract<FieldAnalytics, { type: "scale" }> }) {
  const max = Math.max(...field.distribution.map(d => d.count), 1);
  const avg = field.avg;
  return (
    <div className="space-y-4">
      {/* Average */}
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold" style={{ color: "var(--primary)" }}>
          {avg.toFixed(1)}
        </span>
        <span className="text-sm text-gray-400 mb-1">/ {field.max} · {field.values.length} réponse{field.values.length !== 1 ? "s" : ""}</span>
      </div>
      {/* Distribution */}
      <div className="flex items-end gap-1.5">
        {field.distribution.map(d => {
          const h = max > 0 ? Math.round((d.count / max) * 60) : 0;
          return (
            <div key={d.value} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] text-gray-400">{d.count || ""}</span>
              <div
                className="w-full rounded-t-sm"
                style={{
                  height: Math.max(h, d.count > 0 ? 4 : 0),
                  backgroundColor: d.count > 0 ? "var(--primary)" : "#f3f4f6",
                  opacity: 0.7 + (d.count / (max || 1)) * 0.3,
                }}
              />
              <span className="text-[10px] text-gray-400">{d.value}</span>
            </div>
          );
        })}
      </div>
      {field.min !== undefined && (
        <div className="flex justify-between text-[11px] text-gray-400">
          <span>{field.distribution[0]?.value}</span>
          <span>{field.distribution[field.distribution.length - 1]?.value}</span>
        </div>
      )}
    </div>
  );
}

// ── Text ──────────────────────────────────────────────────────────────────────

function TextViz({ field }: { field: Extract<FieldAnalytics, { type: "text" }> }) {
  if (field.values.length === 0) {
    return <p className="text-sm text-gray-400">Aucune réponse</p>;
  }
  return (
    <div className="space-y-2">
      {field.values.map((v, i) => (
        <div key={i} className="px-3 py-2 rounded-xl bg-gray-50 text-sm text-gray-700 leading-snug">
          {v}
        </div>
      ))}
      <p className="text-xs text-gray-400">{field.values.length} réponse{field.values.length !== 1 ? "s" : ""}</p>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
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
