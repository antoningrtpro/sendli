"use client";

import { useEffect, useState } from "react";
import { X, MessageSquare, CheckCircle2 } from "lucide-react";
import { getFormTemplates } from "@/app/actions/feedback";
import type { FormTemplate } from "@/types/feedback";
import { createPortal } from "react-dom";

interface StatusFeedbackModalProps {
  proposalId: string;
  newStatus: "won" | "lost";
  onConfirm: (formTemplateId: string | null) => void;
  onCancel: () => void;
}

export function StatusFeedbackModal({
  proposalId,
  newStatus,
  onConfirm,
  onCancel,
}: StatusFeedbackModalProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  void proposalId;

  useEffect(() => {
    getFormTemplates().then(all => {
      const filtered = all.filter(t => !t.isArchived && t.tag === newStatus);
      setTemplates(filtered);
      setLoading(false);
    });
  }, [newStatus]);

  const statusLabel = newStatus === "won" ? "Gagné" : "Perdu";
  const statusColor = newStatus === "won" ? "#16a34a" : "#dc2626";

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {/* Backdrop — no onClick, this is a confirmation dialog */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Close */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: statusColor }}>
              {statusLabel}
            </span>
          </div>
          <h2 className="text-base font-bold text-gray-900">Envoyer un formulaire de feedback ?</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Le formulaire s&apos;affichera à votre prospect à la prochaine ouverture de la propale.
          </p>
        </div>

        {/* Template list */}
        <div className="px-6 py-4 space-y-2 max-h-72 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Chargement…</p>
          ) : templates.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <MessageSquare className="w-8 h-8 text-gray-200 mx-auto" />
              <p className="text-sm text-gray-400">
                Aucun formulaire &quot;{statusLabel}&quot; disponible.
              </p>
              <a href="/feedback" className="text-xs font-medium text-indigo-500 hover:underline">
                Créer un formulaire →
              </a>
            </div>
          ) : (
            <>
              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelected(t.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left"
                  style={{
                    borderColor: selected === t.id ? "#6366f1" : "#f3f4f6",
                    backgroundColor: selected === t.id ? "#eef2ff" : "#fafafa",
                  }}
                >
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition"
                    style={{
                      borderColor: selected === t.id ? "#6366f1" : "#d1d5db",
                      backgroundColor: selected === t.id ? "#6366f1" : "transparent",
                    }}
                  >
                    {selected === t.id && <span className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{t.name}</p>
                    <p className="text-xs text-gray-400">
                      {t.fields.length} question{t.fields.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  {selected === t.id && (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-indigo-500" />
                  )}
                </button>
              ))}

              {/* No form option */}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left"
                style={{
                  borderColor: selected === null && !loading ? "#6366f1" : "#f3f4f6",
                  backgroundColor: selected === null && !loading ? "#eef2ff" : "#fafafa",
                }}
              >
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition"
                  style={{
                    borderColor: selected === null && !loading ? "#6366f1" : "#d1d5db",
                    backgroundColor: selected === null && !loading ? "#6366f1" : "transparent",
                  }}
                >
                  {selected === null && !loading && <span className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <p className="text-sm font-medium text-gray-500">Aucun formulaire</p>
              </button>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 flex gap-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
          <button
            type="button"
            onClick={() => onConfirm(null)}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Confirmer sans formulaire
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            disabled={selected === null || loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-40"
            style={{ backgroundColor: "#6366f1" }}
          >
            Activer le formulaire
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
