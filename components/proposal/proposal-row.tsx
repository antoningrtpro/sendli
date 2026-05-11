"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Globe, Lock, Eye, BarChart2, Trash2, MoreHorizontal,
  Copy, Pencil, Share2, ExternalLink, Plus, Mail, User, Clock, X, Check,
  Link as LinkIcon,
} from "lucide-react";
import { updateProposalMeta, deleteProposal } from "@/app/actions/proposals";
import { ProposalOnboardingModal } from "@/components/proposals/proposal-onboarding-modal";
import { getProposalLinks, createProposalLink, deleteProposalLink } from "@/app/actions/links";
import type { ProposalLinkWithStats } from "@/app/actions/links";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

type ProposalStatus = "pending" | "won" | "lost";

const STATUS_STYLE: Record<ProposalStatus, { color: string; bg: string }> = {
  pending: { color: "#92400e", bg: "#fef3c7" },
  won:     { color: "#065f46", bg: "#d1fae5" },
  lost:    { color: "#991b1b", bg: "#fee2e2" },
};

function fmt(n: number | null) {
  if (n === null || n === undefined) return null;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: Date | string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d));
}

interface ProposalRowProps {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  status: string;
  amountOneShot: number | null;
  amountMrr: number | null;
  viewCount: number;
  clientLogoUrl?: string | null;
  showPdfButton?: boolean;
  downloadUrl?: string | null;
  downloadButtonLabel?: string | null;
}

// ── Status dropdown ───────────────────────────────────────────────────────────

function StatusDropdown({
  status,
  onChangeStatus,
  isPending,
}: {
  status: ProposalStatus;
  onChangeStatus: (s: ProposalStatus) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();
  const cfg = STATUS_STYLE[status] ?? STATUS_STYLE.pending;

  function openDropdown() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        disabled={isPending}
        className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition disabled:opacity-50"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}
      >
        {t(status === "won" ? "status_won" : status === "lost" ? "status_lost" : "status_pending")}
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden py-1 min-w-[140px]"
          style={{ top: pos.top, left: pos.left }}
        >
          {(["pending", "won", "lost"] as ProposalStatus[]).map(s => {
            const c = STATUS_STYLE[s];
            const label = s === "won" ? t("status_won") : s === "lost" ? t("status_lost") : t("status_pending");
            return (
              <button key={s} type="button"
                onClick={() => { setOpen(false); onChangeStatus(s); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-gray-50 transition text-left"
                style={{ color: s === status ? c.color : "#374151", fontWeight: s === status ? 600 : 400 }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                {label}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Share sub-panel ──────────────────────────────────────────────────────────

function SharePanel({
  proposalId, slug, pos, onClose,
}: {
  proposalId: string;
  slug: string;
  pos: { top: number; left: number };
  onClose: () => void;
}) {
  const [links, setLinks] = useState<ProposalLinkWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/${slug}`
    : `/p/${slug}`;

  useEffect(() => {
    getProposalLinks(proposalId).then(fetched => {
      setLinks(fetched);
      setLoading(false);
    });
  }, [proposalId]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [onClose]);

  function copyDefault() {
    navigator.clipboard.writeText(baseUrl);
    toast.success("Lien copié !");
  }

  function handleCreate() {
    if (!email.trim()) return;
    startTransition(async () => {
      const link = await createProposalLink(proposalId, email.trim(), name.trim() || undefined);
      if (link) {
        setLinks(prev => [link, ...prev]);
        setShowForm(false);
        setEmail("");
        setName("");
        toast.success("Lien créé !");
      }
    });
  }

  function handleDelete(linkId: string) {
    startTransition(async () => {
      await deleteProposalLink(linkId);
      setLinks(prev => prev.filter(l => l.id !== linkId));
      toast.success("Lien supprimé");
    });
  }

  // Position: open left-aligned, above if not enough space below
  const panelWidth = 380;
  const adjustedLeft = Math.min(pos.left, window.innerWidth - panelWidth - 12);

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[9999] rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
      style={{ top: pos.top, left: Math.max(8, adjustedLeft), width: panelWidth, background: "var(--surface)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-900">Partager la propale</p>
          <p className="text-xs text-gray-400 mt-0.5">Créez des liens personnalisés par destinataire</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[440px] overflow-y-auto">
        {/* Default link */}
        <div>
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Lien par défaut</p>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
            <LinkIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span className="flex-1 text-xs text-gray-500 truncate font-mono">{baseUrl}</span>
            <button onClick={copyDefault}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-white transition flex-shrink-0">
              <Copy className="w-3 h-3" /> Copier
            </button>
            <a href={baseUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-white transition flex-shrink-0">
              <ExternalLink className="w-3 h-3" /> Voir
            </a>
          </div>
        </div>

        {/* Personalized links */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Liens personnalisés</p>
            <button onClick={() => setShowForm(s => !s)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--primary)" }}>
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>

          {showForm && (
            <div className="border border-gray-200 rounded-xl p-3 space-y-2 mb-3 bg-gray-50">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreate()}
                    placeholder="email@client.com *"
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2" />
                </div>
                <div className="relative flex-1">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Prénom Nom"
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={isPending || !email.trim()}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition"
                  style={{ backgroundColor: "var(--primary)" }}>
                  <Check className="w-3 h-3" /> Créer le lien
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-6 text-xs text-gray-400">Chargement…</div>
          ) : links.length === 0 && !showForm ? (
            <div className="text-center py-6 text-gray-400">
              <Mail className="w-7 h-7 mx-auto mb-1.5 opacity-30" />
              <p className="text-xs">Aucun lien personnalisé</p>
              <p className="text-[11px] text-gray-300 mt-0.5">Ajoutez un destinataire pour tracer son activité</p>
            </div>
          ) : (
            <div className="space-y-2">
              {links.map(link => {
                const url = `${baseUrl}?lid=${link.token}`;
                const label = link.recipientName || link.recipientEmail || "Lien sans destinataire";
                return (
                  <div key={link.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 bg-white group">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                      style={{ backgroundColor: "var(--primary)" }}>
                      {link.recipientName
                        ? link.recipientName.charAt(0).toUpperCase()
                        : link.recipientEmail
                          ? link.recipientEmail.charAt(0).toUpperCase()
                          : <LinkIcon className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                          <Eye className="w-3 h-3" /> {link.views} vue{link.views !== 1 ? "s" : ""}
                        </span>
                        {link.lastSeenAt && (
                          <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
                            <Clock className="w-3 h-3" /> {fmtDate(link.lastSeenAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                      <button onClick={() => { navigator.clipboard.writeText(url); toast.success("Lien copié !"); }}
                        className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => handleDelete(link.id)} disabled={isPending}
                        className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

export function ProposalRow({ id, slug, title, published, status: initialStatus, amountOneShot: initialOneShot, amountMrr: initialMrr, viewCount, clientLogoUrl, showPdfButton, downloadUrl, downloadButtonLabel }: ProposalRowProps) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<ProposalStatus>((initialStatus as ProposalStatus) ?? "pending");
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [oneShot, setOneShot] = useState<string>(initialOneShot?.toString() ?? "");
  const [mrr, setMrr] = useState<string>(initialMrr?.toString() ?? "");
  const [editingAmount, setEditingAmount] = useState<"oneShot" | "mrr" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPos, setConfirmPos] = useState<{ top: number; left: number } | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Actions menu
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsPos, setActionsPos] = useState<{ top: number; left: number } | null>(null);
  const actionsRef = useRef<HTMLButtonElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Share panel (opened from actions menu)
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePos, setSharePos] = useState<{ top: number; left: number } | null>(null);

  // Delete confirm
  const deleteRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  function openActionsMenu() {
    if (!actionsRef.current) return;
    const rect = actionsRef.current.getBoundingClientRect();
    setActionsPos({ top: rect.bottom + 4, left: rect.right - 176 });
    setActionsOpen(true);
  }

  useEffect(() => {
    if (!actionsOpen) return;
    function onOutside(e: MouseEvent) {
      if (
        actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node) &&
        actionsRef.current && !actionsRef.current.contains(e.target as Node)
      ) setActionsOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [actionsOpen]);

  useEffect(() => {
    if (!actionsOpen) return;
    const onScroll = () => setActionsOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [actionsOpen]);

  function openConfirm() {
    if (!deleteRef.current) return;
    const rect = deleteRef.current.getBoundingClientRect();
    setConfirmPos({ top: rect.bottom + 4, left: rect.right - 180 });
    setConfirmDelete(true);
  }

  useEffect(() => {
    if (!confirmDelete) return;
    function onOutside(e: MouseEvent) {
      if (
        confirmRef.current && !confirmRef.current.contains(e.target as Node) &&
        deleteRef.current && !deleteRef.current.contains(e.target as Node)
      ) setConfirmDelete(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [confirmDelete]);

  function handleShare() {
    if (!actionsRef.current) return;
    const rect = actionsRef.current.getBoundingClientRect();
    setSharePos({ top: rect.bottom + 4, left: rect.right - 380 });
    setActionsOpen(false);
    setShareOpen(true);
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteProposal(id);
      setDeleted(true);
      setConfirmDelete(false);
      toast.success(t("proposals_deleted"));
    });
  }

  function changeStatus(s: ProposalStatus) {
    setStatus(s);
    startTransition(async () => {
      await updateProposalMeta(id, { status: s });
    });
  }

  function saveAmounts() {
    setEditingAmount(null);
    startTransition(async () => {
      await updateProposalMeta(id, {
        amountOneShot: oneShot !== "" ? parseFloat(oneShot) : null,
        amountMrr: mrr !== "" ? parseFloat(mrr) : null,
      });
      toast.success(t("save"));
    });
  }

  if (deleted) return null;

  return (
  <>
    <tr
      className="transition-colors duration-150"
      style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.018)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Title */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${published ? "bg-green-400" : "bg-gray-300"}`} />
          <Link href={`/proposals/${id}/edit`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors whitespace-nowrap">
            {title}
          </Link>
          {published
            ? <Globe className="w-3 h-3 text-green-500 flex-shrink-0" />
            : <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusDropdown status={status} onChangeStatus={changeStatus} isPending={isPending} />
      </td>

      {/* MRR */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {editingAmount === "mrr" ? (
          <div className="flex items-center gap-1">
            <input type="number" min="0" step="100" value={mrr}
              onChange={e => setMrr(e.target.value)}
              onBlur={saveAmounts}
              onKeyDown={e => { if (e.key === "Enter") saveAmounts(); if (e.key === "Escape") setEditingAmount(null); }}
              autoFocus
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="0" />
            <span className="text-xs text-gray-400">€/m</span>
          </div>
        ) : (
          <button type="button" onClick={() => setEditingAmount("mrr")}
            className="hover:text-indigo-600 transition cursor-text font-semibold text-gray-900">
            {fmt(mrr !== "" ? parseFloat(mrr) : null)
              ? <>{fmt(mrr !== "" ? parseFloat(mrr) : null)}<span className="text-gray-400 font-normal text-xs">/m</span></>
              : <span className="text-gray-300 font-normal">—</span>}
          </button>
        )}
      </td>

      {/* One Shot */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {editingAmount === "oneShot" ? (
          <div className="flex items-center gap-1">
            <input type="number" min="0" step="100" value={oneShot}
              onChange={e => setOneShot(e.target.value)}
              onBlur={saveAmounts}
              onKeyDown={e => { if (e.key === "Enter") saveAmounts(); if (e.key === "Escape") setEditingAmount(null); }}
              autoFocus
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="0" />
            <span className="text-xs text-gray-400">€</span>
          </div>
        ) : (
          <button type="button" onClick={() => setEditingAmount("oneShot")}
            className="text-gray-500 font-medium hover:text-indigo-600 transition cursor-text">
            {fmt(oneShot !== "" ? parseFloat(oneShot) : null) ?? <span className="text-gray-300 font-normal">—</span>}
          </button>
        )}
      </td>

      {/* Views */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Eye className="w-3.5 h-3.5 text-gray-400" />
          {viewCount}
        </span>
      </td>

      {/* Actions — single ⋯ button, always visible */}
      <td className="px-6 py-4">
        <button
          ref={actionsRef}
          type="button"
          onClick={openActionsMenu}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 shadow-sm"
          title="Actions"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {/* Actions dropdown */}
        {actionsOpen && actionsPos && createPortal(
          <div
            ref={actionsMenuRef}
            className="fixed z-[9999] bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden py-1 min-w-[176px]"
            style={{ top: actionsPos.top, left: actionsPos.left }}
          >
            <button type="button"
              onClick={handleShare}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
            >
              <Share2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              {t("action_share")}
            </button>
            <div className="my-1 border-t border-gray-100" />
            <Link
              href={`/proposals/${id}/edit`}
              onClick={() => setActionsOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              {t("action_edit")}
            </Link>
            <Link
              href={`/proposals/${id}/preview`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setActionsOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
            >
              <Eye className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              {t("action_preview")}
            </Link>
            <Link
              href={`/proposals/${id}/analytics`}
              onClick={() => setActionsOpen(false)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
            >
              <BarChart2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              {t("action_analytics")}
            </Link>
            <button
              type="button"
              onClick={() => { setActionsOpen(false); setDuplicateOpen(true); }}
              disabled={isPending}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition text-left disabled:opacity-50"
            >
              <Copy className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              {t("action_duplicate")}
            </button>
            <div className="my-1 border-t border-gray-100" />
            <button
              ref={deleteRef}
              type="button"
              onClick={() => { setActionsOpen(false); openConfirm(); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition text-left"
            >
              <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
              {t("action_delete")}
            </button>
          </div>,
          document.body,
        )}

        {/* Share panel */}
        {shareOpen && sharePos && (
          <SharePanel
            proposalId={id}
            slug={slug}
            pos={sharePos}
            onClose={() => setShareOpen(false)}
          />
        )}

        {/* Confirm delete */}
        {confirmDelete && confirmPos && createPortal(
          <div
            ref={confirmRef}
            className="fixed z-[9999] rounded-xl border border-red-100 shadow-xl overflow-hidden py-2 px-3 flex flex-col gap-2"
            style={{ top: confirmPos.top, left: confirmPos.left, background: "#fff", boxShadow: "0 8px 24px rgba(239,68,68,0.12), 0 2px 8px rgba(0,0,0,0.08)" }}
          >
            <p className="text-xs font-medium text-gray-700 whitespace-nowrap">{t("delete_confirm_q", { title })}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50 whitespace-nowrap"
              >
                {isPending ? "…" : t("action_delete")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition whitespace-nowrap"
              >
                {t("cancel")}
              </button>
            </div>
          </div>,
          document.body,
        )}
      </td>
    </tr>

    {duplicateOpen && (
      <ProposalOnboardingModal
        mode="duplicate"
        duplicateFromId={id}
        initial={{
          title: `${title} (Copie)`,
          clientLogoUrl: clientLogoUrl ?? null,
          showPdfButton: showPdfButton ?? true,
          commercialPdfUrl: downloadUrl ?? null,
          downloadButtonLabel: downloadButtonLabel ?? null,
        }}
        onClose={() => setDuplicateOpen(false)}
      />
    )}
  </>
  );
}
