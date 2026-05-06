"use client";

import { useState, useTransition } from "react";
import { X, Zap, Bookmark, Trash2, Plus } from "lucide-react";
import { deleteSavedBlock, renameSavedBlock } from "@/app/actions/saved-blocks";
import type { LibrarySavedBlock, ProposalBlock } from "@/types/proposal";
import { nanoid } from "nanoid";
import toast from "react-hot-toast";

interface FavoritesPanelProps {
  savedBlocks: LibrarySavedBlock[];
  onInsert: (block: ProposalBlock) => void;
  onClose: () => void;
}

const BLOCK_LABELS: Record<string, string> = {
  heading: "Titre", text: "Texte", image: "Image", video: "Vidéo", embed: "Embed",
  pdf: "PDF", divider: "Séparateur", spacer: "Espace", pricing: "Pricing",
  cta: "CTA", metrics: "Métriques", testimonial: "Témoignage",
  timeline: "Timeline", faq: "FAQ", signature: "Signature",
  team: "Équipe", enjeux: "Enjeux", "case-study": "Case Study",
};

const BLOCK_ICONS: Record<string, string> = {
  heading: "H", text: "¶", image: "🖼", video: "▶", embed: "</>",
  pdf: "📄", divider: "—", spacer: "↕", pricing: "€",
  cta: "→", metrics: "📊", testimonial: "❝",
  timeline: "📅", faq: "❓", signature: "✍",
  team: "👥", enjeux: "🎯", "case-study": "📖",
};

export function FavoritesPanel({ savedBlocks: initial, onInsert, onClose }: FavoritesPanelProps) {
  const [blocks, setBlocks] = useState<LibrarySavedBlock[]>(initial);
  const [filter, setFilter] = useState<"all" | "ultra" | "template">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isPending, startTransition] = useTransition();

  const filtered = blocks.filter(b => filter === "all" || b.mode === filter);

  function handleInsert(saved: LibrarySavedBlock) {
    let data: Omit<ProposalBlock, "id">;
    try { data = JSON.parse(saved.data); } catch { return; }

    const block: ProposalBlock = {
      ...data,
      id: nanoid(),
      ...(saved.mode === "ultra" ? { _savedBlockId: saved.id, _savedMode: "ultra" as const } : {}),
    } as ProposalBlock;

    onInsert(block);
    toast.success(`Bloc "${saved.name}" inséré`);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteSavedBlock(id);
      setBlocks(prev => prev.filter(b => b.id !== id));
      toast.success("Favori supprimé");
    });
  }

  function startRename(b: LibrarySavedBlock) {
    setEditingId(b.id);
    setEditingName(b.name);
  }

  function confirmRename(id: string) {
    if (!editingName.trim()) return;
    startTransition(async () => {
      await renameSavedBlock(id, editingName.trim());
      setBlocks(prev => prev.map(b => b.id === id ? { ...b, name: editingName.trim() } : b));
      setEditingId(null);
    });
  }

  return (
    <div className="absolute inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto w-[380px] h-full bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900">Mes favoris</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-gray-50 flex-shrink-0">
          {(["all", "ultra", "template"] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition ${
                filter === f ? "text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
              style={filter === f ? {
                backgroundColor: f === "ultra" ? "#6366f1" : f === "template" ? "#f59e0b" : "#374151"
              } : {}}>
              {f === "ultra" && <Zap className="w-3 h-3" />}
              {f === "template" && <Bookmark className="w-3 h-3" />}
              {f === "all" ? "Tous" : f === "ultra" ? "Ultra" : "Favoris"}
              <span className={`text-xs ${filter === f ? "opacity-70" : "text-gray-400"}`}>
                ({blocks.filter(b => f === "all" || b.mode === f).length})
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">Aucun favori{filter !== "all" ? ` ${filter}` : ""}.</p>
              <p className="text-xs mt-1">Survolez un bloc dans l'éditeur et cliquez sur ⭐</p>
            </div>
          ) : (
            filtered.map(saved => (
              <div key={saved.id}
                className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition cursor-pointer"
                onClick={() => handleInsert(saved)}>

                {/* Type icon */}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
                  style={{
                    backgroundColor: saved.mode === "ultra" ? "#eef2ff" : "#fffbeb",
                    color: saved.mode === "ultra" ? "#6366f1" : "#d97706",
                  }}>
                  {BLOCK_ICONS[saved.blockType] ?? "◻"}
                </div>

                {/* Name + type */}
                <div className="flex-1 min-w-0">
                  {editingId === saved.id ? (
                    <input
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => confirmRename(saved.id)}
                      onKeyDown={e => { if (e.key === "Enter") confirmRename(saved.id); if (e.key === "Escape") setEditingId(null); }}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                      className="w-full text-sm px-2 py-0.5 border border-indigo-300 rounded focus:outline-none"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800 truncate"
                      onDoubleClick={e => { e.stopPropagation(); startRename(saved); }}>
                      {saved.name}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-gray-400">{BLOCK_LABELS[saved.blockType] ?? saved.blockType}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    {saved.mode === "ultra" ? (
                      <span className="flex items-center gap-0.5 text-xs font-medium text-indigo-500">
                        <Zap className="w-2.5 h-2.5" /> Ultra
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-xs font-medium text-amber-500">
                        <Bookmark className="w-2.5 h-2.5" /> Favori
                      </span>
                    )}
                  </div>
                </div>

                {/* Insert button */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button type="button"
                    onClick={e => { e.stopPropagation(); handleInsert(saved); }}
                    title="Insérer"
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button type="button"
                    onClick={e => { e.stopPropagation(); handleDelete(saved.id); }}
                    title="Supprimer"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-50 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400">
            Double-cliquez sur un nom pour le renommer. Cliquez sur un bloc pour l'insérer à la fin.
          </p>
        </div>
      </div>
    </div>
  );
}
