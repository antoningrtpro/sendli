"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { X, Zap, Bookmark } from "lucide-react";
import { saveBlockAsFavorite } from "@/app/actions/saved-blocks";
import type { ProposalBlock } from "@/types/proposal";
import toast from "react-hot-toast";

interface SaveBlockModalProps {
  block: ProposalBlock;
  onClose: () => void;
  onSaved: (savedBlockId: string, mode: "ultra" | "template") => void;
}

const BLOCK_LABELS: Record<string, string> = {
  heading: "Titre", text: "Texte", image: "Image", video: "Vidéo", embed: "Embed",
  pdf: "PDF", divider: "Séparateur", spacer: "Espace", pricing: "Pricing",
  cta: "CTA", metrics: "Métriques", testimonial: "Témoignage",
  timeline: "Timeline", faq: "FAQ", signature: "Signature",
  team: "Équipe", enjeux: "Enjeux", "case-study": "Case Study",
};

export function SaveBlockModal({ block, onClose, onSaved }: SaveBlockModalProps) {
  const [name, setName] = useState(`${BLOCK_LABELS[block.type] ?? block.type} – favori`);
  const [mode, setMode] = useState<"ultra" | "template">("ultra");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  function handleSave() {
    if (!name.trim()) return;
    startTransition(async () => {
      const { id } = await saveBlockAsFavorite(block, name.trim(), mode);
      toast.success(mode === "ultra" ? "⚡ Favori ultra créé — synchronisé partout" : "📌 Favori créé");
      onSaved(id, mode);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Enregistrer en favori</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Nom</label>
          <input
            ref={inputRef}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* Mode */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600">Type de favori</label>

          <button
            type="button"
            onClick={() => setMode("ultra")}
            className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition ${
              mode === "ultra" ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${mode === "ultra" ? "bg-indigo-500" : "bg-gray-100"}`}>
              <Zap className={`w-3.5 h-3.5 ${mode === "ultra" ? "text-white" : "text-gray-400"}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${mode === "ultra" ? "text-indigo-700" : "text-gray-700"}`}>Ultra</p>
              <p className="text-xs text-gray-400 mt-0.5">Reprend le design et le texte. Toute modification dans une proposition se répercute partout.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMode("template")}
            className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition ${
              mode === "template" ? "border-amber-400 bg-amber-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${mode === "template" ? "bg-amber-400" : "bg-gray-100"}`}>
              <Bookmark className={`w-3.5 h-3.5 ${mode === "template" ? "text-white" : "text-gray-400"}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${mode === "template" ? "text-amber-700" : "text-gray-700"}`}>Favori</p>
              <p className="text-xs text-gray-400 mt-0.5">Reprend le design uniquement. Le texte est vide au départ et les modifications restent locales.</p>
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
            Annuler
          </button>
          <button onClick={handleSave} disabled={isPending || !name.trim()}
            className="flex-1 py-2 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50"
            style={{ backgroundColor: mode === "ultra" ? "#6366f1" : "#f59e0b" }}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
