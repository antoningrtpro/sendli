"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockRenderer } from "./block-renderer";
import { SaveBlockModal } from "./save-block-modal";
import type { ProposalBlock, BlockWidth, BrandKitData, LibraryTestimonial, LibraryCaseStudy } from "@/types/proposal";
import { GripVertical, Trash2, Star, Zap, Copy, BarChart2, X, Check, Pencil, Layers } from "lucide-react";
import { useState, useRef, memo } from "react";
import { cn } from "@/lib/utils";

interface BlockWrapperProps {
  block: ProposalBlock;
  onChange: (updated: ProposalBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  brandKit?: BrandKitData;
  libraryTestimonials?: LibraryTestimonial[];
  libraryCaseStudies?: LibraryCaseStudy[];
}

const WIDTH_CYCLE: BlockWidth[] = ["full", "two-thirds", "half", "one-third"];
const WIDTH_LABEL: Record<BlockWidth, string> = {
  full: "Full",
  "two-thirds": "2/3",
  half: "1/2",
  "one-third": "1/3",
};

const widthClass: Record<BlockWidth, string> = {
  full:          "w-full",
  "two-thirds":  "w-2/3",
  half:          "w-1/2",
  "one-third":   "w-1/3",
};

function BlockWrapperInner({ block, onChange, onDelete, onDuplicate, brandKit, libraryTestimonials, libraryCaseStudies }: BlockWrapperProps) {
  const [hovered, setHovered] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [nameDraft, setNameDraft] = useState(block.blockName ?? "");
  const [groupDraft, setGroupDraft] = useState(block.analyticsSection ?? "");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function onEnter() {
    clearTimeout(leaveTimer.current);
    setHovered(true);
  }
  function onLeave() {
    leaveTimer.current = setTimeout(() => setHovered(false), 120);
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    paddingTop: block.paddingTop,
    paddingBottom: block.paddingBottom,
  };

  const isUltra = block._savedMode === "ultra" && !!block._savedBlockId;
  const hasGroup = !!block.analyticsSection;
  const hasName = !!block.blockName;
  const hasAnyAnalytics = hasGroup || hasName;

  function cycleWidth() {
    const idx = WIDTH_CYCLE.indexOf(block.width);
    const next = WIDTH_CYCLE[(idx + 1) % WIDTH_CYCLE.length];
    onChange({ ...block, width: next });
  }

  function openAnalyticsPanel() {
    setNameDraft(block.blockName ?? "");
    setGroupDraft(block.analyticsSection ?? "");
    setShowAnalyticsPanel(true);
    setTimeout(() => nameInputRef.current?.focus(), 30);
  }

  function saveAnalytics() {
    onChange({
      ...block,
      blockName: nameDraft.trim() || undefined,
      analyticsSection: groupDraft.trim() || undefined,
    });
    setShowAnalyticsPanel(false);
  }

  function clearAnalytics() {
    onChange({ ...block, blockName: undefined, analyticsSection: undefined });
    setNameDraft("");
    setGroupDraft("");
    setShowAnalyticsPanel(false);
  }

  return (
    <>
      {/* Group pill — shown above the block when analyticsSection is set */}
      {hasGroup && (
        <div className="flex items-center gap-2 mb-1 px-1">
          <div className="h-px flex-1" style={{ backgroundColor: "var(--primary)", opacity: 0.15 }} />
          <span
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition"
            style={{ color: "var(--primary)", backgroundColor: "var(--primary)" + "12" }}
            onClick={openAnalyticsPanel}
            title="Modifier le groupe"
          >
            <Layers className="w-3 h-3" />
            {block.analyticsSection}
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: "var(--primary)", opacity: 0.15 }} />
        </div>
      )}

      {/* Block name badge — shown when blockName is set (and no group, or alongside group) */}
      {hasName && (
        <div className="flex items-center gap-1 mb-1 px-1">
          <button
            type="button"
            onClick={openAnalyticsPanel}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md hover:opacity-80 transition"
            style={{ color: "var(--primary)", backgroundColor: "var(--primary)" + "0D" }}
            title="Modifier le nom du bloc"
          >
            <Pencil className="w-2.5 h-2.5" />
            {block.blockName}
          </button>
        </div>
      )}

      {/* Analytics panel — shows when open */}
      {showAnalyticsPanel && (
        <div
          className="mb-2 rounded-xl border p-3"
          style={{ background: "var(--surface)", borderColor: "var(--primary)" + "25" }}
        >
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
            Nommage analytics
          </p>
          <div className="flex gap-3 items-end">
            {/* Block name */}
            <div className="flex-1">
              <label className="text-[10px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Pencil className="w-2.5 h-2.5" />
                Renommer ce bloc
              </label>
              <div className="relative">
                <input
                  ref={nameInputRef}
                  value={nameDraft}
                  onChange={e => setNameDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveAnalytics(); if (e.key === "Escape") setShowAnalyticsPanel(false); }}
                  placeholder="Ex: CTA Principal, Tarifs…"
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 pr-6 focus:outline-none focus:border-gray-300 placeholder-gray-300 text-gray-700"
                />
                {nameDraft && (
                  <button
                    type="button"
                    onClick={() => setNameDraft("")}
                    title="Effacer le nom"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Group name */}
            <div className="flex-1">
              <label className="text-[10px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" />
                Ajouter à un groupe
              </label>
              <div className="relative">
                <input
                  value={groupDraft}
                  onChange={e => setGroupDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveAnalytics(); if (e.key === "Escape") setShowAnalyticsPanel(false); }}
                  placeholder="Ex: Offre, Équipe…"
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 pr-6 focus:outline-none focus:border-gray-300 placeholder-gray-300 text-gray-700"
                />
                {groupDraft && (
                  <button
                    type="button"
                    onClick={() => setGroupDraft("")}
                    title="Effacer le groupe"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 pb-0.5">
              <button
                type="button"
                onClick={() => setShowAnalyticsPanel(false)}
                title="Annuler"
                className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={saveAnalytics}
                title="Enregistrer"
                className="flex items-center justify-center w-7 h-7 rounded-lg text-white transition"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={setNodeRef}
        style={style}
        className={cn("relative group flex", widthClass[block.width])}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        {/* Ultra accent — left edge */}
        {isUltra && (
          <div className="absolute -left-1 top-4 bottom-4 w-0.5 rounded-full bg-indigo-400 opacity-50" />
        )}

        {/* Drag handle — always slightly visible, full opacity on hover */}
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute -left-8 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing rounded-lg transition-opacity duration-150",
            isDragging ? "opacity-0" : hovered ? "opacity-100" : "opacity-20",
          )}
        >
          <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
        </div>

        {/* Hover left-border accent (Notion-style) */}
        <div
          className="absolute -left-3 top-2 bottom-2 w-0.5 rounded-full transition-all duration-150"
          style={{
            backgroundColor: "var(--primary)",
            opacity: hovered && !isDragging ? (isUltra ? 0 : 0.45) : 0,
          }}
        />

        {/* Block content */}
        <div
          className={cn(
            "flex-1 rounded-xl transition-all duration-150",
            hovered && !isDragging
              ? isUltra
                ? "ring-1 ring-indigo-200 shadow-sm"
                : "ring-1 ring-gray-200 shadow-sm"
              : "ring-1 ring-transparent"
          )}
        >
          <BlockRenderer
            block={block}
            onChange={onChange}
            brandKit={brandKit}
            isEditing
            libraryTestimonials={libraryTestimonials}
            libraryCaseStudies={libraryCaseStudies}
          />
        </div>

        {/* Controls toolbar — right side, fade-in on hover */}
        {hovered && !isDragging && (
          <div
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl z-10 animate-in fade-in-0 zoom-in-95 duration-150"
            style={{
              background: "var(--surface)",
              boxShadow: "var(--shadow-dropdown)",
              border: "1px solid rgba(0,0,0,0.07)",
            }}
          >
            {/* Width cycle */}
            <button
              type="button"
              onClick={cycleWidth}
              title={`Largeur : ${WIDTH_LABEL[block.width]} → suivante`}
              className="w-8 h-7 flex items-center justify-center text-xs font-bold rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition"
            >
              {WIDTH_LABEL[block.width]}
            </button>

            <div className="w-4 h-px bg-gray-200" />

            {/* Analytics naming */}
            <button
              type="button"
              onClick={openAnalyticsPanel}
              title={hasAnyAnalytics ? "Modifier le nommage analytics" : "Nommer ce bloc dans l'analytics"}
              className={cn(
                "w-8 h-7 flex items-center justify-center rounded-lg transition",
                hasAnyAnalytics
                  ? "text-white"
                  : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"
              )}
              style={hasAnyAnalytics ? { backgroundColor: "var(--primary)" } : {}}
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>

            {/* Save as favourite */}
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              title={isUltra ? "Bloc ultra (synchronisé)" : "Enregistrer en favori"}
              className={cn(
                "w-8 h-7 flex items-center justify-center rounded-lg transition",
                isUltra
                  ? "text-indigo-500 hover:bg-indigo-50"
                  : "text-gray-300 hover:text-amber-500 hover:bg-amber-50"
              )}
            >
              {isUltra ? <Zap className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
            </button>

            {/* Duplicate */}
            <button
              type="button"
              onClick={onDuplicate}
              title="Dupliquer ce bloc"
              className="w-8 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-blue-500 hover:bg-blue-50 transition"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            <div className="w-4 h-px bg-gray-200" />

            {/* Delete */}
            <button
              type="button"
              onClick={onDelete}
              title="Supprimer"
              className="w-8 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {showSaveModal && (
        <SaveBlockModal
          block={block}
          onClose={() => setShowSaveModal(false)}
          onSaved={(savedBlockId, mode) => {
            if (mode === "ultra") onChange({ ...block, _savedBlockId: savedBlockId, _savedMode: "ultra" });
          }}
        />
      )}
    </>
  );
}

export const BlockWrapper = memo(BlockWrapperInner);
