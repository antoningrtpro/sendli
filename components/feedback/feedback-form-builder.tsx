"use client";

import { useState, useTransition } from "react";
import { nanoid } from "nanoid";
import {
  Plus, Trash2, GripVertical, ChevronDown, ChevronUp, ArrowLeft, Save,
} from "lucide-react";
import { createFormTemplate, updateFormTemplate } from "@/app/actions/feedback";
import type { FormTemplate, FormField, FormFieldType } from "@/types/feedback";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text:     "Texte court",
  textarea: "Texte long",
  radio:    "Choix unique",
  checkbox: "Choix multiple",
  scale:    "Échelle numérique",
  email:    "Email",
  phone:    "Téléphone",
  nps:      "Note NPS (0–10)",
};

function defaultField(type: FormFieldType, order: number): FormField {
  return {
    id: nanoid(8),
    type,
    label: "",
    placeholder: "",
    required: false,
    order,
    options: type === "radio" || type === "checkbox" ? ["Option 1", "Option 2"] : undefined,
    scaleMin: type === "scale" ? 1 : type === "nps" ? 0 : undefined,
    scaleMax: type === "scale" ? 5 : type === "nps" ? 10 : undefined,
    scaleMinLabel: type === "nps" ? "Pas du tout probable" : undefined,
    scaleMaxLabel: type === "nps" ? "Extrêmement probable" : undefined,
  };
}

interface FeedbackFormBuilderProps {
  initial?: FormTemplate;
}

export function FeedbackFormBuilder({ initial }: FeedbackFormBuilderProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [tag, setTag] = useState<"won" | "lost">(initial?.tag ?? "won");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [confirmationMessage, setConfirmationMessage] = useState(
    initial?.confirmationMessage ?? "Merci pour votre retour !"
  );
  const [fields, setFields] = useState<FormField[]>(
    initial?.fields?.slice().sort((a, b) => a.order - b.order) ?? []
  );
  const [expandedField, setExpandedField] = useState<string | null>(null);

  function addField(type: FormFieldType) {
    const next: FormField = defaultField(type, fields.length);
    setFields(prev => [...prev, next]);
    setExpandedField(next.id);
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  }

  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id).map((f, i) => ({ ...f, order: i })));
  }

  function moveField(id: string, dir: -1 | 1) {
    setFields(prev => {
      const idx = prev.findIndex(f => f.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next.map((f, i) => ({ ...f, order: i }));
    });
  }

  function save() {
    if (!name.trim() || !title.trim()) {
      toast.error("Le nom interne et le titre prospect sont obligatoires.");
      return;
    }
    const orderedFields = fields.map((f, i) => ({ ...f, order: i }));
    startTransition(async () => {
      if (initial) {
        await updateFormTemplate(initial.id, { name, tag, title, subtitle: subtitle || null, fields: orderedFields, confirmationMessage });
        toast.success("Formulaire mis à jour !");
      } else {
        await createFormTemplate({ name, tag, title, subtitle: subtitle || undefined, fields: orderedFields, confirmationMessage });
        toast.success("Formulaire créé !");
      }
      router.push("/feedback");
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Back */}
      <button
        type="button"
        onClick={() => router.push("/feedback")}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux formulaires
      </button>

      {/* Meta */}
      <div className="bg-white rounded-2xl p-6 space-y-4" style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <h2 className="text-base font-bold text-gray-800">Informations du formulaire</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Nom interne <span className="text-red-400">*</span>
            </label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ex : Refus court, Acceptation onboarding"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <p className="text-xs text-gray-400 mt-1">Visible uniquement par vous dans le dashboard.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Tag statut <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              {(["won", "lost"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition"
                  style={{
                    borderColor: tag === t ? (t === "won" ? "#16a34a" : "#dc2626") : "#e5e7eb",
                    backgroundColor: tag === t ? (t === "won" ? "#f0fdf4" : "#fef2f2") : "#fff",
                    color: tag === t ? (t === "won" ? "#16a34a" : "#dc2626") : "#6b7280",
                  }}
                >
                  {t === "won" ? "Gagné" : "Perdu"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Titre affiché au prospect <span className="text-red-400">*</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="ex : Vous avez pris votre décision — on aimerait comprendre pourquoi"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Sous-titre (optionnel)
          </label>
          <input
            value={subtitle}
            onChange={e => setSubtitle(e.target.value)}
            placeholder="ex : Cela nous prend moins de 2 minutes"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Message de confirmation
          </label>
          <input
            value={confirmationMessage}
            onChange={e => setConfirmationMessage(e.target.value)}
            placeholder="Merci pour votre retour !"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>
      </div>

      {/* Fields */}
      <div className="bg-white rounded-2xl p-6 space-y-3" style={{ border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <h2 className="text-base font-bold text-gray-800">Questions</h2>

        {fields.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            Aucune question pour l&apos;instant. Ajoutez-en une ci-dessous.
          </p>
        )}

        <div className="space-y-2">
          {fields.map((field, idx) => (
            <FieldCard
              key={field.id}
              field={field}
              idx={idx}
              total={fields.length}
              expanded={expandedField === field.id}
              onToggle={() => setExpandedField(prev => prev === field.id ? null : field.id)}
              onChange={patch => updateField(field.id, patch)}
              onRemove={() => removeField(field.id)}
              onMove={dir => moveField(field.id, dir)}
            />
          ))}
        </div>

        {/* Add field dropdown */}
        <AddFieldMenu onAdd={addField} />
      </div>

      {/* Save */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/feedback")}
          className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition"
          style={{ backgroundColor: "#6366f1" }}
        >
          <Save className="w-4 h-4" />
          {initial ? "Mettre à jour" : "Créer le formulaire"}
        </button>
      </div>
    </div>
  );
}

// ── Field Card ─────────────────────────────────────────────────────────────────

function FieldCard({
  field, idx, total, expanded, onToggle, onChange, onRemove, onMove,
}: {
  field: FormField;
  idx: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<FormField>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <div
      className="rounded-xl border overflow-hidden transition"
      style={{ borderColor: expanded ? "#6366f1" : "#e5e7eb" }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
        style={{ backgroundColor: expanded ? "#eef2ff" : "#fafafa" }}
        onClick={onToggle}
      >
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <span className="text-xs font-semibold text-gray-400 w-5 flex-shrink-0">{idx + 1}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium flex-shrink-0">
          {FIELD_TYPE_LABELS[field.type]}
        </span>
        <span className="flex-1 min-w-0 text-sm font-medium text-gray-700 truncate">
          {field.label || <span className="text-gray-300 italic">Sans titre</span>}
        </span>
        {field.required && (
          <span className="text-[10px] font-semibold text-red-400 flex-shrink-0">Obligatoire</span>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={e => { e.stopPropagation(); onMove(-1); }} disabled={idx === 0}
            className="p-1 rounded hover:bg-gray-200 transition disabled:opacity-30 text-gray-400">
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onMove(1); }} disabled={idx === total - 1}
            className="p-1 rounded hover:bg-gray-200 transition disabled:opacity-30 text-gray-400">
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded hover:bg-red-50 hover:text-red-400 transition text-gray-300">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded edit area */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-3 bg-white">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Label *</label>
            <input
              value={field.label}
              onChange={e => onChange({ label: e.target.value })}
              placeholder="La question posée au prospect"
              className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {(field.type === "text" || field.type === "textarea" || field.type === "email" || field.type === "phone") && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Placeholder</label>
              <input
                value={field.placeholder ?? ""}
                onChange={e => onChange({ placeholder: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </div>
          )}

          {(field.type === "radio" || field.type === "checkbox") && (
            <OptionsEditor
              options={field.options ?? []}
              onChange={opts => onChange({ options: opts })}
            />
          )}

          {field.type === "scale" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Min</label>
                <input type="number" value={field.scaleMin ?? 1} onChange={e => onChange({ scaleMin: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Max</label>
                <input type="number" value={field.scaleMax ?? 5} onChange={e => onChange({ scaleMax: Number(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Libellé min</label>
                <input value={field.scaleMinLabel ?? ""} onChange={e => onChange({ scaleMinLabel: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Libellé max</label>
                <input value={field.scaleMaxLabel ?? ""} onChange={e => onChange({ scaleMaxLabel: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
            </div>
          )}

          {field.type === "nps" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Libellé 0</label>
                <input value={field.scaleMinLabel ?? "Pas du tout probable"} onChange={e => onChange({ scaleMinLabel: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Libellé 10</label>
                <input value={field.scaleMaxLabel ?? "Extrêmement probable"} onChange={e => onChange({ scaleMaxLabel: e.target.value })}
                  className="mt-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none" />
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={field.required}
              onChange={e => onChange({ required: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 accent-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">Champ obligatoire</span>
          </label>
        </div>
      )}
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Options</label>
      {options.map((opt, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={opt}
            onChange={e => {
              const next = [...options];
              next[i] = e.target.value;
              onChange(next);
            }}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <button type="button" onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="px-2 text-gray-300 hover:text-red-400 transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...options, `Option ${options.length + 1}`])}
        className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 font-medium">
        <Plus className="w-3.5 h-3.5" /> Ajouter une option
      </button>
    </div>
  );
}

function AddFieldMenu({ onAdd }: { onAdd: (t: FormFieldType) => void }) {
  const [open, setOpen] = useState(false);
  const types: FormFieldType[] = ["text", "textarea", "radio", "checkbox", "scale", "email", "phone", "nps"];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border border-dashed border-indigo-200 text-indigo-500 hover:bg-indigo-50 transition w-full justify-center"
      >
        <Plus className="w-4 h-4" /> Ajouter une question
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl border border-gray-100 shadow-xl z-20 overflow-hidden">
          {types.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { onAdd(t); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
            >
              {FIELD_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
