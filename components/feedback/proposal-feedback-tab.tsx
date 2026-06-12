"use client";

import { useState, useTransition } from "react";
import { MessageSquare, CheckCircle2, XCircle, Clock, RotateCcw } from "lucide-react";
import type { FormTemplate, FormResponse, FormField } from "@/types/feedback";
import { activateFeedbackForm, deactivateFeedbackForm } from "@/app/actions/feedback";
import { getFormTemplates } from "@/app/actions/feedback";
import toast from "react-hot-toast";

interface ProposalFeedbackTabProps {
  proposalId: string;
  proposalStatus: string;
  response: FormResponse | null;
  template: FormTemplate | null;
  activeFeedbackFormId: string | null;
}

export function ProposalFeedbackTab({
  proposalId,
  proposalStatus,
  response,
  template,
  activeFeedbackFormId,
}: ProposalFeedbackTabProps) {
  const [, startTransition] = useTransition();
  const [showFormPicker, setShowFormPicker] = useState(false);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  function openPicker() {
    setPickerLoading(true);
    setShowFormPicker(true);
    getFormTemplates().then(all => {
      const tag = proposalStatus === "won" ? "won" : "lost";
      setTemplates(all.filter(t => !t.isArchived && t.tag === tag));
      setPickerLoading(false);
    });
  }

  function activate() {
    if (!selectedFormId) return;
    startTransition(async () => {
      await activateFeedbackForm(proposalId, selectedFormId);
      toast.success("Formulaire activé !");
      setShowFormPicker(false);
    });
  }

  function deactivate() {
    startTransition(async () => {
      await deactivateFeedbackForm(proposalId);
      toast.success("Formulaire désactivé.");
    });
  }

  // ── No form ever activated ──────────────────────────────────────────────────
  if (!activeFeedbackFormId && !response) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <MessageSquare className="w-10 h-10 text-gray-200" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-700">Aucun formulaire de feedback activé</p>
          <p className="text-sm text-gray-400 max-w-sm">
            Activez un formulaire pour collecter le retour de votre prospect sur cette propale.
          </p>
        </div>
        {(proposalStatus === "won" || proposalStatus === "lost") && (
          <button
            type="button"
            onClick={openPicker}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition"
            style={{ backgroundColor: "#6366f1" }}
          >
            Activer un formulaire
          </button>
        )}
        {showFormPicker && (
          <FormPicker
            loading={pickerLoading}
            templates={templates}
            selected={selectedFormId}
            onSelect={setSelectedFormId}
            onConfirm={activate}
            onCancel={() => setShowFormPicker(false)}
          />
        )}
      </div>
    );
  }

  // ── Status banner ──────────────────────────────────────────────────────────
  const statusInfo = response
    ? response.status === "answered"
      ? { icon: CheckCircle2, color: "#16a34a", bg: "#f0fdf4", label: "Répondu", date: response.submittedAt }
      : { icon: XCircle, color: "#dc2626", bg: "#fef2f2", label: "Fermé sans réponse", date: response.closedAt }
    : { icon: Clock, color: "#d97706", bg: "#fffbeb", label: "En attente de réponse", date: null };

  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div
        className="flex items-center gap-4 px-5 py-4 rounded-2xl"
        style={{ backgroundColor: statusInfo.bg, border: `1px solid ${statusInfo.color}20` }}
      >
        <StatusIcon className="w-6 h-6 flex-shrink-0" style={{ color: statusInfo.color }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: statusInfo.color }}>
            {statusInfo.label}
          </p>
          {template && (
            <p className="text-xs text-gray-500 mt-0.5">Formulaire : {template.name}</p>
          )}
          {statusInfo.date && (
            <p className="text-xs text-gray-400">
              {new Date(statusInfo.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        {/* Deactivate / re-send */}
        {!response?.status || response.status !== "answered" ? (
          <button
            type="button"
            onClick={deactivate}
            className="flex-shrink-0 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition px-3 py-1.5 rounded-lg hover:bg-white/60"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Désactiver
          </button>
        ) : null}
      </div>

      {/* Answers */}
      {response?.status === "answered" && template && response.responses && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Réponses</h3>
          {template.fields
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(field => {
              const ans = response.responses!.find(r => r.fieldId === field.id);
              return (
                <AnswerCard key={field.id} field={field} value={ans?.value} />
              );
            })}
        </div>
      )}

      {/* Waiting state detail */}
      {!response && activeFeedbackFormId && (
        <div className="text-center text-sm text-gray-400 py-4">
          Le formulaire s&apos;affichera à la prochaine ouverture de la propale par le prospect.
        </div>
      )}

      {/* Closed detail */}
      {response?.status === "closed_without_answer" && (
        <div className="text-center text-sm text-gray-400 py-4">
          Le prospect a fermé le formulaire sans répondre. Il réapparaîtra à la prochaine visite.
        </div>
      )}
    </div>
  );
}

function AnswerCard({ field, value }: { field: FormField; value: unknown }) {
  const display = value === undefined || value === null || value === ""
    ? <span className="text-gray-300 italic">Pas de réponse</span>
    : Array.isArray(value)
    ? value.join(", ")
    : String(value);

  return (
    <div className="bg-white rounded-xl p-4 space-y-1" style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{field.label}</p>
      <p className="text-sm text-gray-800">{display as React.ReactNode}</p>
    </div>
  );
}

function FormPicker({ loading, templates, selected, onSelect, onConfirm, onCancel }: {
  loading: boolean;
  templates: FormTemplate[];
  selected: string | null;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-4 mt-2" style={{ border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}>
      <h3 className="text-sm font-bold text-gray-800">Choisir un formulaire</h3>
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          Aucun formulaire disponible pour ce statut.{" "}
          <a href="/feedback" className="text-indigo-500 hover:underline">Créer un formulaire →</a>
        </p>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <button key={t.id} type="button" onClick={() => onSelect(t.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left"
              style={{ borderColor: selected === t.id ? "#6366f1" : "#e5e7eb", backgroundColor: selected === t.id ? "#eef2ff" : "#fafafa" }}>
              <div className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                style={{ borderColor: selected === t.id ? "#6366f1" : "#d1d5db", backgroundColor: selected === t.id ? "#6366f1" : "transparent" }}>
                {selected === t.id && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{t.name}</p>
                <p className="text-xs text-gray-400">{t.fields.length} question{t.fields.length > 1 ? "s" : ""}</p>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition">
          Annuler
        </button>
        <button type="button" onClick={onConfirm} disabled={!selected}
          className="flex-1 py-2 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40"
          style={{ backgroundColor: "#6366f1" }}>
          Activer
        </button>
      </div>
    </div>
  );
}
