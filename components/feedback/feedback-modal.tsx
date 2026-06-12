"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { X, ChevronRight, CheckCircle2 } from "lucide-react";
import type { FormTemplate, FormField, FieldValue } from "@/types/feedback";

interface FeedbackModalProps {
  proposalId: string;
  brandColor?: string;
  companyName?: string;
}

const VISITOR_KEY = (pid: string) => `sendli_visitor_${pid}`;

function getOrCreateVisitorId(proposalId: string): string {
  const key = VISITOR_KEY(proposalId);
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  localStorage.setItem(key, id);
  return id;
}

export function FeedbackModal({ proposalId, brandColor = "#111184", companyName }: FeedbackModalProps) {
  const [form, setForm] = useState<FormTemplate | null>(null);
  const [existingResponseId, setExistingResponseId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const visitorId = useRef<string>("");

  // Load the form on mount
  useEffect(() => {
    visitorId.current = getOrCreateVisitorId(proposalId);
    fetch(`/api/feedback?proposalId=${proposalId}&visitorId=${visitorId.current}`)
      .then(r => r.json())
      .then(data => {
        if (data.form) {
          setForm(data.form);
          setExistingResponseId(data.existingResponseId ?? null);
          setOpen(true);
        }
      })
      .catch(() => {});
  }, [proposalId]);

  // Scroll lock
  useEffect(() => {
    if (open && !submitted) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, submitted]);

  const handleClose = useCallback(async () => {
    setOpen(false);
    // Record close
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposalId,
        formTemplateId: form?.id,
        visitorId: visitorId.current,
        action: "close",
        existingResponseId,
      }),
    }).catch(() => {});
  }, [form, proposalId, existingResponseId]);

  const handleSubmit = useCallback(async () => {
    if (!form) return;
    // Validate required fields
    const newErrors: Record<string, string> = {};
    for (const field of form.fields) {
      if (!field.required) continue;
      const val = values[field.id];
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
        newErrors[field.id] = "Ce champ est obligatoire";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setSubmitting(true);
    const responses = Object.entries(values).map(([fieldId, value]) => ({ fieldId, value }));
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proposalId,
        formTemplateId: form.id,
        visitorId: visitorId.current,
        action: "submit",
        responses,
        existingResponseId,
      }),
    });
    setSubmitted(true);
    setTimeout(() => setOpen(false), 2200);
  }, [form, values, proposalId, existingResponseId]);

  const setValue = useCallback((fieldId: string, value: FieldValue) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => { const e = { ...prev }; delete e[fieldId]; return e; });
  }, []);

  if (!open || !form) return null;

  const hasEmail = form.fields.some(f => f.type === "email");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          background: "rgba(0,0,0,0.45)",
        }}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8">
        <div
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "90vh" }}
        >
          {/* Close button — always visible */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          {submitted ? (
            /* Confirmation state */
            <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
              <CheckCircle2 className="w-14 h-14" style={{ color: brandColor }} />
              <p className="text-lg font-bold text-gray-900">{form.confirmationMessage}</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-6 pt-6 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <h2 className="text-xl font-bold text-gray-900 pr-8">{form.title}</h2>
                {form.subtitle && (
                  <p className="mt-1 text-sm text-gray-500">{form.subtitle}</p>
                )}
              </div>

              {/* Fields */}
              <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">
                {form.fields
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map(field => (
                    <FieldRenderer
                      key={field.id}
                      field={field}
                      value={values[field.id]}
                      onChange={v => setValue(field.id, v)}
                      error={errors[field.id]}
                      brandColor={brandColor}
                    />
                  ))}

                {/* RGPD mention when email field is present */}
                {hasEmail && (
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Vos réponses sont transmises uniquement
                    {companyName ? ` à ${companyName}` : " au commercial en charge de votre dossier"} et ne sont pas utilisées à d&apos;autres fins.
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="px-6 pb-6 pt-3 flex-shrink-0" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60"
                  style={{ backgroundColor: brandColor }}
                >
                  {submitting ? "Envoi…" : "Envoyer mes réponses"}
                  {!submitting && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Field Renderer ─────────────────────────────────────────────────────────────

function FieldRenderer({
  field,
  value,
  onChange,
  error,
  brandColor,
}: {
  field: FormField;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  error?: string;
  brandColor: string;
}) {
  const inputClass =
    "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 transition";
  const focusStyle = { "--ring-color": brandColor } as React.CSSProperties;

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-800">
        {field.label}
        {field.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>

      {field.type === "text" && (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputClass}
          style={focusStyle}
        />
      )}

      {field.type === "email" && (
        <input
          type="email"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder ?? "email@exemple.com"}
          className={inputClass}
          style={focusStyle}
        />
      )}

      {field.type === "phone" && (
        <input
          type="tel"
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder ?? "+33 6 00 00 00 00"}
          className={inputClass}
          style={focusStyle}
        />
      )}

      {field.type === "textarea" && (
        <textarea
          value={(value as string) ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={4}
          className={inputClass + " resize-none"}
          style={focusStyle}
        />
      )}

      {field.type === "radio" && (
        <div className="space-y-2">
          {(field.options ?? []).map(opt => (
            <label key={opt} className="flex items-center gap-3 cursor-pointer group">
              <span
                className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition"
                style={{
                  borderColor: value === opt ? brandColor : "#d1d5db",
                  backgroundColor: value === opt ? brandColor : "transparent",
                }}
                onClick={() => onChange(opt)}
              >
                {value === opt && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === "checkbox" && (
        <div className="space-y-2">
          {(field.options ?? []).map(opt => {
            const checked = Array.isArray(value) && (value as string[]).includes(opt);
            const toggle = () => {
              const prev = (value as string[]) ?? [];
              onChange(checked ? prev.filter(v => v !== opt) : [...prev, opt]);
            };
            return (
              <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                <span
                  className="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition"
                  style={{
                    borderColor: checked ? brandColor : "#d1d5db",
                    backgroundColor: checked ? brandColor : "transparent",
                  }}
                  onClick={toggle}
                >
                  {checked && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  )}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt}</span>
              </label>
            );
          })}
        </div>
      )}

      {field.type === "scale" && (
        <ScaleField
          min={field.scaleMin ?? 1}
          max={field.scaleMax ?? 5}
          minLabel={field.scaleMinLabel}
          maxLabel={field.scaleMaxLabel}
          value={value as number | undefined}
          onChange={v => onChange(v)}
          brandColor={brandColor}
        />
      )}

      {field.type === "nps" && (
        <NpsField
          minLabel={field.scaleMinLabel ?? "Pas du tout probable"}
          maxLabel={field.scaleMaxLabel ?? "Extrêmement probable"}
          value={value as number | undefined}
          onChange={v => onChange(v)}
          brandColor={brandColor}
        />
      )}

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function ScaleField({
  min, max, minLabel, maxLabel, value, onChange, brandColor,
}: {
  min: number; max: number;
  minLabel?: string; maxLabel?: string;
  value?: number; onChange: (v: number) => void;
  brandColor: string;
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);
  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap">
        {steps.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="w-10 h-10 rounded-xl text-sm font-semibold border-2 transition"
            style={{
              borderColor: value === n ? brandColor : "#e5e7eb",
              backgroundColor: value === n ? brandColor : "#fff",
              color: value === n ? "#fff" : "#374151",
            }}
          >
            {n}
          </button>
        ))}
      </div>
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-xs text-gray-400">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function NpsField({
  minLabel, maxLabel, value, onChange, brandColor,
}: {
  minLabel: string; maxLabel: string;
  value?: number; onChange: (v: number) => void;
  brandColor: string;
}) {
  const steps = Array.from({ length: 11 }, (_, i) => i); // 0–10
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 flex-wrap">
        {steps.map(n => {
          const color = n <= 6 ? "#ef4444" : n <= 8 ? "#f59e0b" : "#22c55e";
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className="w-9 h-9 rounded-lg text-xs font-bold border-2 transition"
              style={{
                borderColor: value === n ? color : "#e5e7eb",
                backgroundColor: value === n ? color : "#fff",
                color: value === n ? "#fff" : "#374151",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>0 — {minLabel}</span>
        <span>10 — {maxLabel}</span>
      </div>
    </div>
  );
}
