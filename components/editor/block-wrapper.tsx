"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockRenderer } from "./block-renderer";
import { SaveBlockModal } from "./save-block-modal";
import type { ProposalBlock, BlockWidth, BrandKitData, LibraryTestimonial, LibraryCaseStudy } from "@/types/proposal";
import { GripVertical, Trash2, Star, Zap, Copy, Tag, X, Check } from "lucide-react";
import { useState, useRef } from "react";
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

export function BlockWrapper({ block, onChange, onDelete, onDuplicate, brandKit, libraryTestimonials, libraryCaseStudies }: BlockWrapperProps) {
  const [hovered, setHovered] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showSectionInput, setShowSectionInput] = useState(false);
  const [sectionDraft, setSectionDraft] = useState(block.analyticsSection ?? "");
  const sectionInputRef = useRef<HTMLInputElement>(null);
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
  const hasSection = !!block.analyticsSection;

  function cycleWidth() {
    const idx = WIDTH_CYCLE.indexOf(block.width);
    const next = WIDTH_CYCLE[(idx + 1) % WIDTH_CYCLE.length];
    onChange({ ...block, width: next });
  }

  function openSectionInput() {
    setSectionDraft(block.analyticsSection ?? "");
    setShowSectionInput(true);
    setTimeout(() => sectionInputRef.current?.focus(), 30);
  }

  function saveSection() {
    onChange({ ...block, analyticsSection: sectionDraft.trim() || undefined });
    setShowSectionInput(false);
  }

  function clearSection() {
    onChange({ ...block, analyticsSection: undefined });
    setSectionDraft("");
    setShowSectionInput(false);
  }

  return (
    <>
      {/* Section label — displayed above the block when set */}
      {hasSection && (
        <div className="flex items-center gap-2 mb-1 px-1 group/sec">
          <div className="h-px flex-1" style={{ backgroundColor: "var(--primary)", opacity: 0.2 }} />
          <span
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition"
            style={{ color: "var(--primary)", backgroundColor: "var(--primary)" + "12" }}
            onClick={openSectionInput}
            title="Modifier la section"
          >
            <Tag className="w-3 h-3" />
            {block.analyticsSection}
          </span>
          <div className="h-px flex-1" style={{ backgroundColor: "var(--primary)", opacity: 0.2 }} />
        </div>
      )}

      {/* Section input popover */}
      {showSectionInput && (
        <div
          className="flex items-center gap-2 mb-2 px-1 py-1.5 rounded-xl border"
          style={{ background: "var(--surface)", borderColor: "var(--primary)" + "30" }}
        >
          <Tag className="w-3.5 h-3.5 flex-shrink-0 ml-1" style={{ color: "var(--primary)" }} />
          <input
            ref={sectionInputRef}
            value={sectionDraft}
            onChange={e => setSectionDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") saveSection(); if (e.key === "Escape") setShowSectionInput(false); }}
            placeholder="Nom de la section (ex: Offre, Équipe…)"
            className="flex-1 text-xs bg-transparent focus:outline-none text-gray-700 placeholder-gray-300"
          />
          {hasSection && (
            <button type="button" onClick={clearSection} title="Retirer la section"
              className="text-gray-300 hover:text-red-400 transition flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button type="button" onClick={saveSection}
            className="flex items-center justify-center w-6 h-6 rounded-lg text-white flex-shrink-0"
            style={{ backgroundColor: "var(--primary)" }}>
            <Check className="w-3 h-3" />
          </button>
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

        {/* Drag handle — left, appears on hover */}
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute -left-8 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing rounded-lg transition-opacity",
            hovered && !isDragging ? "opacity-100" : "opacity-0",
          )}
        >
          <GripVertical className="w-4 h-4 text-gray-300 hover:text-gray-500 transition-colors" />
        </div>

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

        {/* Controls toolbar — right side, on hover */}
        {hovered && !isDragging && (
          <div
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 py-1.5 px-1 rounded-xl z-10"
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

            {/* Section label */}
            <button
              type="button"
              onClick={openSectionInput}
              title="Nommer une section analytics"
              className={cn(
                "w-8 h-7 flex items-center justify-center rounded-lg transition",
                hasSection
                  ? "text-white"
                  : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"
              )}
              style={hasSection ? { backgroundColor: "var(--primary)" } : {}}
            >
              <Tag className="w-3.5 h-3.5" />
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
