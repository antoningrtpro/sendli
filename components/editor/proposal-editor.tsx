"use client";

import { useState, useCallback, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { BlockWrapper } from "./block-wrapper";
import { AddBlockMenu } from "./add-block-menu";
import { saveProposal, publishProposal } from "@/app/actions/proposals";
import { nanoid } from "nanoid";
import { setProposalBanner } from "@/app/actions/banners";
import { syncUltraBlocks } from "@/app/actions/saved-blocks";
import type { ProposalBlock, BrandKitData, BannerData, LibraryTestimonial, LibrarySavedBlock, LibraryCaseStudy } from "@/types/proposal";
import { groupBlocksIntoRows } from "@/lib/block-rows";
import toast from "react-hot-toast";
import {
  Globe, Lock, Save, X, Settings, Star,
  Image, MoreHorizontal, BarChart2, Download, Share2,
  ChevronDown, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { BannersManager } from "@/components/banners/banners-manager";
import { ProposalSettingsPanel } from "@/components/editor/proposal-settings-panel";
import { FavoritesPanel } from "@/components/editor/favorites-panel";
import { SharePanel } from "@/components/editor/share-panel";
import type { Banner } from "@/components/banners/banners-manager";
import type { ProposalLinkWithStats } from "@/app/actions/links";

type ProposalStatus = "pending" | "won" | "lost";

const STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: "En attente", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  won:     { label: "Gagné",      color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
  lost:    { label: "Perdu",      color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
};

interface ProposalEditorProps {
  proposalId: string;
  initialTitle: string;
  initialBlocks: ProposalBlock[];
  initialPublished: boolean;
  initialStatus: ProposalStatus;
  initialAmountOneShot: number | null;
  initialAmountMrr: number | null;
  initialClientLogoUrl: string | null;
  initialHasPassword: boolean;
  initialShowPdfButton: boolean;
  slug: string;
  brandKit?: BrandKitData | null;
  initialBanner?: BannerData | null;
  userBanners: Banner[];
  libraryTestimonials?: LibraryTestimonial[];
  libraryCaseStudies?: LibraryCaseStudy[];
  librarySavedBlocks?: LibrarySavedBlock[];
  initialLinks?: ProposalLinkWithStats[];
}

export function ProposalEditor({
  proposalId, initialTitle, initialBlocks, initialPublished, slug,
  initialStatus, initialAmountOneShot, initialAmountMrr,
  initialClientLogoUrl, initialHasPassword, initialShowPdfButton,
  brandKit, initialBanner, userBanners,
  libraryTestimonials = [], libraryCaseStudies = [], librarySavedBlocks = [],
  initialLinks = [],
}: ProposalEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [blocks, setBlocks] = useState<ProposalBlock[]>(initialBlocks);
  const [published, setPublished] = useState(initialPublished);
  const [status, setStatus] = useState<ProposalStatus>(initialStatus);
  const [amountOneShot, setAmountOneShot] = useState<string>(initialAmountOneShot?.toString() ?? "");
  const [amountMrr, setAmountMrr] = useState<string>(initialAmountMrr?.toString() ?? "");
  const [banner, setBanner] = useState<BannerData | null>(initialBanner ?? null);

  // Panel visibility
  const [showBannerPicker, setShowBannerPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const [savedBlocks, setSavedBlocks] = useState<LibrarySavedBlock[]>(librarySavedBlocks);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const overflowRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Unsaved warning on tab close
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!isDirty) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Close overflow menu on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) setShowOverflow(false);
    }
    if (showOverflow) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [showOverflow]);

  // Close status menu on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) setShowStatusMenu(false);
    }
    if (showStatusMenu) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [showStatusMenu]);

  function closeAllPanels() {
    setShowBannerPicker(false);
    setShowSettings(false);
    setShowFavorites(false);
    setShowOverflow(false);
  }

  function handleNavigate(href: string) {
    if (isDirty) {
      setPendingHref(href);
      setShowLeaveModal(true);
    } else {
      router.push(href);
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function markDirty() { setIsDirty(true); }

  function updateBlock(id: string, updated: ProposalBlock) {
    setBlocks(prev => prev.map(b => b.id === id ? updated : b));
    markDirty();
  }

  function deleteBlock(id: string) {
    setBlocks(prev => prev.filter(b => b.id !== id));
    markDirty();
  }

  function insertBlock(newBlock: ProposalBlock, afterIndex: number) {
    setBlocks(prev => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newBlock);
      return next;
    });
    markDirty();
  }

  function duplicateBlock(id: string) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx === -1) return prev;
      const copy = { ...JSON.parse(JSON.stringify(prev[idx])), id: nanoid(), _savedBlockId: undefined, _savedMode: undefined };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    markDirty();
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setBlocks(prev => {
      const oldIdx = prev.findIndex(b => b.id === active.id);
      const newIdx = prev.findIndex(b => b.id === over.id);
      return arrayMove(prev, oldIdx, newIdx);
    });
    markDirty();
  }

  function handleStatusChange(s: ProposalStatus) {
    setStatus(s);
    setShowStatusMenu(false);
  }

  const handleSave = useCallback(() => {
    startTransition(async () => {
      await saveProposal(proposalId, {
        title, blocks,
        amountOneShot: amountOneShot !== "" ? parseFloat(amountOneShot) : null,
        amountMrr: amountMrr !== "" ? parseFloat(amountMrr) : null,
        status,
      });

      const ultraEntries = blocks
        .filter(b => b._savedMode === "ultra" && b._savedBlockId)
        .map(b => ({ savedBlockId: b._savedBlockId!, block: b }));
      if (ultraEntries.length > 0) await syncUltraBlocks(proposalId, ultraEntries);

      setIsDirty(false);
      toast.success("Sauvegardé !");
    });
  }, [proposalId, title, blocks, amountOneShot, amountMrr, status]);

  const handlePublish = useCallback(() => {
    startTransition(async () => {
      const next = !published;
      await publishProposal(proposalId, next);
      setPublished(next);
      toast.success(next ? "Proposition publiée !" : "Proposition dépubliée");
    });
  }, [proposalId, published]);

  function handleSelectBanner(b: Banner) {
    startTransition(async () => {
      await setProposalBanner(proposalId, b.id);
      setBanner({ id: b.id, name: b.name, bgColor: b.bgColor, bgImageUrl: b.bgImageUrl, title: b.title, subtitle: b.subtitle, textColor: b.textColor, logoUrl: b.logoUrl, imageOnly: b.imageOnly });
      setShowBannerPicker(false);
      toast.success("Banner appliqué !");
    });
  }

  function handleRemoveBanner() {
    startTransition(async () => {
      await setProposalBanner(proposalId, null);
      setBanner(null);
      toast.success("Banner retiré");
    });
  }

  const cfg = STATUS_CONFIG[status];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <div className="flex flex-col h-screen">

      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 h-14 flex items-center px-4 gap-3"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          boxShadow: "0 1px 6px rgba(17,17,132,0.05)",
        }}
      >
        {/* Back */}
        <button
          type="button"
          onClick={() => handleNavigate("/proposals")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 font-medium"
        >
          <span className="text-base leading-none">←</span>
          <span>Proposals</span>
        </button>

        <div className="w-px h-5 bg-gray-200 flex-shrink-0" />

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); markDirty(); }}
          className="flex-1 text-sm font-semibold text-gray-900 focus:outline-none bg-transparent min-w-0 py-1 border-b border-transparent focus:border-primary-300 transition-colors"
          placeholder="Titre de la proposition…"
        />

        {/* Unsaved dot */}
        {isDirty && (
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Modifications non sauvegardées" />
        )}

        {/* Status pill dropdown */}
        <div className="relative flex-shrink-0" ref={statusRef}>
          <button
            type="button"
            onClick={() => setShowStatusMenu(o => !o)}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full transition-all"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.dot }} />
            {cfg.label}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {showStatusMenu && (
            <div
              className="absolute top-full left-0 mt-1.5 w-40 rounded-xl border border-gray-100 shadow-lg overflow-hidden z-50"
              style={{ background: "var(--surface)", boxShadow: "var(--shadow-dropdown)" }}
            >
              {(["pending", "won", "lost"] as ProposalStatus[]).map(s => {
                const c = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-gray-50 transition text-left"
                    style={{ color: c.color }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.dot }} />
                    {c.label}
                    {status === s && <CheckCircle2 className="w-3 h-3 ml-auto" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-all duration-150 flex-shrink-0 font-medium disabled:opacity-35"
          style={isDirty
            ? { backgroundColor: "var(--primary)", color: "#fff", borderColor: "var(--primary)", boxShadow: "0 2px 8px rgba(17,17,132,0.25)" }
            : { backgroundColor: "transparent", color: "#9ca3af", borderColor: "#e5e7eb" }}
        >
          <Save className="w-3.5 h-3.5" />
          {isPending ? "…" : "Enregistrer"}
        </button>

        {/* Share */}
        <div className="flex-shrink-0">
          {published ? (
            <SharePanel
              proposalId={proposalId}
              slug={slug}
              appUrl={appUrl}
              initialLinks={initialLinks}
            />
          ) : (
            <button
              onClick={handlePublish}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-all duration-150 flex-shrink-0"
              title="Publiez d'abord pour partager"
            >
              <Share2 className="w-3.5 h-3.5" />
              Partager
            </button>
          )}
        </div>

        {/* Publish toggle */}
        <button
          onClick={handlePublish}
          disabled={isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-full font-semibold transition-all duration-150 flex-shrink-0 disabled:opacity-60 hover:opacity-90"
          style={{
            backgroundColor: published ? "#6b7280" : "var(--primary)",
            color: "#fff",
            boxShadow: published ? "none" : "0 2px 10px rgba(17,17,132,0.28)",
          }}
        >
          {published ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
          {published ? "Dépublier" : "Publier"}
        </button>

        {/* Overflow ··· */}
        <div className="relative flex-shrink-0" ref={overflowRef}>
          <button
            type="button"
            onClick={() => setShowOverflow(o => !o)}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showOverflow && (
            <div
              className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50 py-1.5"
              style={{ background: "var(--surface)", boxShadow: "var(--shadow-dropdown)" }}
            >
              {/* Banner */}
              <button
                type="button"
                onClick={() => { closeAllPanels(); setShowBannerPicker(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
              >
                <Image className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1">Banner</span>
                {banner && <span className="text-xs text-primary-600 font-medium truncate max-w-[80px]">{banner.name}</span>}
              </button>

              {/* Favoris */}
              <button
                type="button"
                onClick={() => { closeAllPanels(); setShowFavorites(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
              >
                <Star className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1">Favoris</span>
                {savedBlocks.length > 0 && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{savedBlocks.length}</span>
                )}
              </button>

              {/* Paramètres */}
              <button
                type="button"
                onClick={() => { closeAllPanels(); setShowSettings(true); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
              >
                <Settings className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Paramètres
              </button>

              <div className="my-1 border-t border-gray-100" />

              {/* Analytics */}
              <Link
                href={`/proposals/${proposalId}/analytics`}
                onClick={() => setShowOverflow(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <BarChart2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Analytics
              </Link>

              {/* PDF */}
              <a
                href={`/api/pdf/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowOverflow(false)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
                Export PDF
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Favorites panel ──────────────────────────────────────────────────── */}
      {showFavorites && (
        <FavoritesPanel
          savedBlocks={savedBlocks}
          onInsert={block => {
            setBlocks(prev => [...prev, block]);
            markDirty();
            toast.success("Bloc inséré — pensez à sauvegarder");
          }}
          onClose={() => setShowFavorites(false)}
        />
      )}

      {/* ── Settings panel ────────────────────────────────────────────────────── */}
      {showSettings && (
        <ProposalSettingsPanel
          proposalId={proposalId}
          initialClientLogoUrl={initialClientLogoUrl}
          initialHasPassword={initialHasPassword}
          initialShowPdfButton={initialShowPdfButton}
          status={status}
          onStatusChange={handleStatusChange}
          amountOneShot={amountOneShot}
          amountMrr={amountMrr}
          onAmountOneShotChange={v => { setAmountOneShot(v); markDirty(); }}
          onAmountMrrChange={v => { setAmountMrr(v); markDirty(); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── Banner picker panel ───────────────────────────────────────────────── */}
      {showBannerPicker && (
        <div className="absolute inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowBannerPicker(false)} />
          <div className="relative ml-auto w-[600px] h-full bg-white shadow-2xl overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg text-gray-900">Choisir un banner</h2>
              <div className="flex items-center gap-2">
                {banner && (
                  <button onClick={handleRemoveBanner}
                    className="text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-full border border-red-200 transition">
                    Retirer le banner
                  </button>
                )}
                <button onClick={() => setShowBannerPicker(false)} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <BannersManager
              initialBanners={userBanners}
              onSelect={handleSelectBanner}
              selectedId={banner?.id}
            />
          </div>
        </div>
      )}

      {/* ── Leave confirmation modal ──────────────────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl shadow-2xl p-7 w-full max-w-sm mx-4 space-y-4" style={{ background: "var(--surface)" }}>
            <div className="space-y-1">
              <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>Modifications non sauvegardées</h2>
              <p className="text-sm text-gray-500">Voulez-vous enregistrer vos modifications avant de quitter ?</p>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  handleSave();
                  setTimeout(() => { router.push(pendingHref!); setShowLeaveModal(false); setPendingHref(null); }, 800);
                }}
                className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition"
                style={{ backgroundColor: "var(--primary)" }}
              >
                {isPending ? "Enregistrement…" : "Enregistrer et quitter"}
              </button>
              <button
                type="button"
                onClick={() => { setShowLeaveModal(false); router.push(pendingHref!); setPendingHref(null); }}
                className="w-full py-2.5 rounded-full text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
              >
                Quitter sans enregistrer
              </button>
              <button
                type="button"
                onClick={() => { setShowLeaveModal(false); setPendingHref(null); }}
                className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Editor canvas ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto" style={{ background: "var(--background)" }}>

        <div className="max-w-3xl mx-auto pt-10 pb-12 px-4">

          {/* Banner preview — même rendu que la page publique */}
          {banner && (
            <div className="relative group/banner mb-8">
              {banner.imageOnly && banner.bgImageUrl ? (
                <div className="rounded-2xl overflow-hidden h-56">
                  <img src={banner.bgImageUrl} alt={banner.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="rounded-2xl overflow-hidden h-56 flex items-center justify-center relative"
                  style={{
                    backgroundColor: banner.bgColor,
                    backgroundImage: banner.bgImageUrl ? `url(${banner.bgImageUrl})` : undefined,
                    backgroundSize: "cover", backgroundPosition: "center",
                  }}
                >
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="relative z-10 text-center px-8">
                    {banner.logoUrl && <img src={banner.logoUrl} alt="Logo" className="h-10 object-contain mx-auto mb-3" />}
                    {banner.title && <p className="text-4xl font-extrabold" style={{ color: banner.textColor }}>{banner.title}</p>}
                    {banner.subtitle && <p className="mt-2 text-base opacity-80" style={{ color: banner.textColor }}>{banner.subtitle}</p>}
                  </div>
                </div>
              )}

              {/* Hover overlay — bouton édition */}
              <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover/banner:bg-black/30 transition-all duration-200 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => setShowBannerPicker(true)}
                  className="opacity-0 group-hover/banner:opacity-100 transition-all duration-200 px-4 py-2 rounded-xl bg-white/90 backdrop-blur-sm text-sm font-semibold text-gray-800 shadow-lg hover:bg-white"
                >
                  Changer de bannière
                </button>
              </div>
            </div>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <AddBlockMenu onAdd={block => insertBlock(block, -1)} />
              {groupBlocksIntoRows(blocks).map((row) => {
                const lastBlockIndex = blocks.findIndex(b => b.id === row[row.length - 1].id);
                return (
                  <div key={row.map(b => b.id).join("|")}>
                    <div className={row.length > 1 ? "flex items-start" : undefined}>
                      {row.map(block => (
                        <BlockWrapper
                          key={block.id}
                          block={block}
                          onChange={updated => updateBlock(block.id, updated)}
                          onDelete={() => deleteBlock(block.id)}
                          onDuplicate={() => duplicateBlock(block.id)}
                          brandKit={brandKit ?? undefined}
                          libraryTestimonials={libraryTestimonials}
                          libraryCaseStudies={libraryCaseStudies}
                        />
                      ))}
                    </div>
                    <AddBlockMenu onAdd={newBlock => insertBlock(newBlock, lastBlockIndex)} />
                  </div>
                );
              })}
            </SortableContext>
          </DndContext>

          {blocks.length === 0 && (
            <div className="text-center py-28">
              <div
                className="inline-flex flex-col items-center gap-4 p-10 rounded-3xl"
                style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ backgroundColor: "var(--primary-light)" }}
                >
                  ✦
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-800">Votre proposition est vide</p>
                  <p className="text-sm text-gray-400 mt-1">Cliquez sur <strong>+</strong> ci-dessus pour ajouter votre premier bloc</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
