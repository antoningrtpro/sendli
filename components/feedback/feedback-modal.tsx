"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { X, ArrowRight, CheckCircle2 } from "lucide-react";
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

export function FeedbackModal({ proposalId, brandColor = "#6366f1", companyName }: FeedbackModalProps) {
  const [form, setForm] = useState<FormTemplate | null>(null);
  const [existingResponseId, setExistingResponseId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Record<string, FieldValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const visitorId = useRef<string>("");

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
    const newErrors: Record<string, string> = {};
    for (const field of form.fields) {
      if (!field.required) continue;
      const val = values[field.id];
      if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
        newErrors[field.id] = "Ce champ est obligatoire";
      }
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
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
    setTimeout(() => setOpen(false), 2500);
  }, [form, values, proposalId, existingResponseId]);

  const setValue = useCallback((fieldId: string, value: FieldValue) => {
    setValues(prev => ({ ...prev, [fieldId]: value }));
    setErrors(prev => { const e = { ...prev }; delete e[fieldId]; return e; });
  }, []);

  if (!open || !form) return null;

  const hasEmail = form.fields.some(f => f.type === "email");
  const sortedFields = form.fields.slice().sort((a, b) => a.order - b.order);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998]"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          background: "rgba(0,0,0,0.35)",
        }}
      />

      {/* Modal container */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-12">
        <div
          className="relative w-full bg-white flex flex-col"
          style={{
            maxWidth: "680px",
            maxHeight: "90vh",
            borderRadius: "20px",
            boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
          }}
        >
          {submitted ? (
            /* ── Confirmation ── */
            <div className="flex flex-col items-center justify-center gap-5 py-20 px-10 text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: brandColor + "18" }}
              >
                <CheckCircle2 className="w-8 h-8" style={{ color: brandColor }} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{form.confirmationMessage}</p>
                <p className="text-sm text-gray-400 mt-1.5">Merci pour votre temps.</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <div className="flex items-start justify-between gap-4 px-8 pt-8 pb-6 flex-shrink-0">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-extrabold text-gray-900 leading-snug">{form.title}</h2>
                  {form.subtitle && (
                    <p className="mt-2 text-sm text-gray-500 leading-relaxed">{form.subtitle}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition mt-0.5"
                  style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "#9ca3af" }}
                  aria-label="Fermer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* ── Divider ── */}
              <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.06)", flexShrink: 0 }} />

              {/* ── Fields ── */}
              <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
                {sortedFields.map((field, idx) => (
                  <div key={field.id}>
                    {/* Question label row */}
                    <div className="flex items-start gap-3 mb-3">
                      <span
                        className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5"
                        style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "#9ca3af" }}
                      >
                        {idx + 1}
                      </span>
                      <label className="text-sm font-semibold text-gray-800 leading-snug">
                        {field.label}
                        {field.required && <span className="ml-1" style={{ color: brandColor }}>*</span>}
                      </label>
                    </div>

                    {/* Input */}
                    <div className="pl-8">
                      <FieldInput
                        field={field}
                        value={values[field.id]}
                        onChange={v => setValue(field.id, v)}
                        brandColor={brandColor}
                      />
                      {errors[field.id] && (
                        <p className="mt-1.5 text-xs font-medium" style={{ color: "#ef4444" }}>{errors[field.id]}</p>
                      )}
                    </div>

                    {idx < sortedFields.length - 1 && (
                      <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.04)", marginTop: "24px" }} />
                    )}
                  </div>
                ))}

                {hasEmail && (
                  <p className="text-[11px] text-gray-400 leading-relaxed pl-8">
                    Vos réponses sont transmises uniquement
                    {companyName ? ` à ${companyName}` : " au commercial en charge de votre dossier"} et ne sont pas utilisées à d&apos;autres fins.
                  </p>
                )}
              </div>

              {/* ── Footer ── */}
              <div
                className="px-8 py-5 flex-shrink-0 flex items-center justify-between gap-4"
                style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
              >
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-sm text-gray-400 hover:text-gray-600 transition"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60"
                  style={{ backgroundColor: brandColor }}
                >
                  {submitting ? "Envoi…" : "Envoyer mes réponses"}
                  {!submitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Field Input (sans label — rendu séparément) ───────────────────────────────

function FieldInput({
  field,
  value,
  onChange,
  brandColor,
}: {
  field: FormField;
  value: FieldValue | undefined;
  onChange: (v: FieldValue) => void;
  brandColor: string;
}) {
  const baseInput = "w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:bg-white focus:border-gray-400 transition placeholder:text-gray-300";

  if (field.type === "text") return (
    <input type="text" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder} className={baseInput} />
  );

  if (field.type === "email") return (
    <input type="email" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder ?? "email@exemple.com"} className={baseInput} />
  );

  if (field.type === "phone") return (
    <input type="tel" value={(value as string) ?? ""} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder ?? "+33 6 00 00 00 00"} className={baseInput} />
  );

  if (field.type === "textarea") return (
    <textarea value={(value as string) ?? ""} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder} rows={4}
      className={baseInput + " resize-none"} />
  );

  if (field.type === "radio") return (
    <div className="space-y-2">
      {(field.options ?? []).map(opt => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition"
            style={{
              borderColor: selected ? brandColor : "#e5e7eb",
              backgroundColor: selected ? brandColor + "0d" : "#fafafa",
              color: selected ? "#111827" : "#374151",
              fontWeight: selected ? 600 : 400,
            }}
          >
            <span
              className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: selected ? brandColor : "#d1d5db", backgroundColor: selected ? brandColor : "transparent" }}
            >
              {selected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );

  if (field.type === "checkbox") return (
    <div className="space-y-2">
      {(field.options ?? []).map(opt => {
        const checked = Array.isArray(value) && (value as string[]).includes(opt);
        const toggle = () => {
          const prev = (value as string[]) ?? [];
          onChange(checked ? prev.filter(v => v !== opt) : [...prev, opt]);
        };
        return (
          <button
            key={opt}
            type="button"
            onClick={toggle}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left text-sm transition"
            style={{
              borderColor: checked ? brandColor : "#e5e7eb",
              backgroundColor: checked ? brandColor + "0d" : "#fafafa",
              color: checked ? "#111827" : "#374151",
              fontWeight: checked ? 600 : 400,
            }}
          >
            <span
              className="flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center"
              style={{ borderColor: checked ? brandColor : "#d1d5db", backgroundColor: checked ? brandColor : "transparent" }}
            >
              {checked && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="2 6 5 9 10 3" />
                </svg>
              )}
            </span>
            {opt}
          </button>
        );
      })}
    </div>
  );

  if (field.type === "scale") {
    const min = field.scaleMin ?? 1;
    const max = field.scaleMax ?? 5;
    const steps = Array.from({ length: max - min + 1 }, (_, i) => i + min);
    return (
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {steps.map(n => {
            const sel = value === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className="w-11 h-11 rounded-xl text-sm font-bold border-2 transition"
                style={{
                  borderColor: sel ? brandColor : "#e5e7eb",
                  backgroundColor: sel ? brandColor : "#fafafa",
                  color: sel ? "#fff" : "#374151",
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
        {(field.scaleMinLabel || field.scaleMaxLabel) && (
          <div className="flex justify-between text-xs text-gray-400">
            <span>{field.scaleMinLabel}</span>
            <span>{field.scaleMaxLabel}</span>
          </div>
        )}
      </div>
    );
  }

  if (field.type === "nps") {
    const steps = Array.from({ length: 11 }, (_, i) => i);
    return (
      <div className="space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          {steps.map(n => {
            const sel = value === n;
            const color = n <= 6 ? "#ef4444" : n <= 8 ? "#f59e0b" : "#22c55e";
            return (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className="w-10 h-10 rounded-xl text-sm font-bold border-2 transition"
                style={{
                  borderColor: sel ? color : "#e5e7eb",
                  backgroundColor: sel ? color : "#fafafa",
                  color: sel ? "#fff" : "#374151",
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>0 — {field.scaleMinLabel ?? "Pas du tout probable"}</span>
          <span>10 — {field.scaleMaxLabel ?? "Extrêmement probable"}</span>
        </div>
      </div>
    );
  }

  return null;
}
