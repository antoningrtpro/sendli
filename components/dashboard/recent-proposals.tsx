"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Eye, Pencil, BarChart2, Share2, X, Plus, Mail, User, Check, Copy, ExternalLink, Trash2, Clock, Link as LinkIcon, Lock, ChevronDown, ChevronUp, ClipboardCheck, ClipboardList } from "lucide-react";
import { getProposalLinks, createProposalLink, deleteProposalLink } from "@/app/actions/links";
import { useBlur } from "@/contexts/blur-context";
import { useLanguage } from "@/contexts/language-context";
import type { ProposalLinkWithStats } from "@/app/actions/links";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { updateProposalMeta } from "@/app/actions/proposals";
import { activateFeedbackForm } from "@/app/actions/feedback";
import { StatusFeedbackModal } from "@/components/feedback/status-feedback-modal";

const INITIAL_VISIBLE_COUNT = 10;

export type RecentProposal = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  status: string;
  amountMrr: number | null;
  amountOneShot: number | null;
  viewCount: number;
  feedbackStatus: "answered" | "pending_answer" | null;
};

function fmtEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: Date | string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d));
}

type ProposalStatus = "pending" | "won" | "lost";

const STATUS_STYLE: Record<ProposalStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "#92400e", bg: "#fef3c7" },
  won:     { label: "Gagné",      color: "#065f46", bg: "#d1fae5" },
  lost:    { label: "Perdu",      color: "#991b1b", bg: "#fee2e2" },
};

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
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("scroll", onScroll);
    };
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

// ── Feedback indicator ────────────────────────────────────────────────────────

function FeedbackDot({ status }: { status: "answered" | "pending_answer" | null }) {
  if (!status) return null;
  if (status === "answered") {
    return (
      <span title="Feedback reçu" className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ backgroundColor: "#d1fae5" }}>
        <ClipboardCheck className="w-3 h-3" style={{ color: "#065f46" }} />
      </span>
    );
  }
  return (
    <span title="En attente de feedback" className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ backgroundColor: "#fef3c7" }}>
      <ClipboardList className="w-3 h-3" style={{ color: "#92400e" }} />
    </span>
  );
}

// ── Share Panel ───────────────────────────────────────────────────────────────

function SharePanel({
  proposalId,
  slug,
  pos,
  onClose,
  isPremium = false,
}: {
  proposalId: string;
  slug: string;
  pos: { top: number; left: number };
  onClose: () => void;
  isPremium?: boolean;
}) {
  const [links, setLinks] = useState<ProposalLinkWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}/p/${slug}` : `/p/${slug}`;

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
    function onScroll() { onClose(); }
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("scroll", onScroll);
    };
  }, [onClose]);

  async function handleCreate() {
    if (!email.trim()) return;
    setSaving(true);
    const link = await createProposalLink(proposalId, email.trim(), name.trim() || undefined);
    setSaving(false);
    if (link) {
      setLinks(prev => [link, ...prev]);
      setShowForm(false);
      setEmail("");
      setName("");
      toast.success("Lien créé !");
    }
  }

  async function handleDelete(linkId: string) {
    setSaving(true);
    await deleteProposalLink(linkId);
    setSaving(false);
    setLinks(prev => prev.filter(l => l.id !== linkId));
    toast.success("Lien supprimé");
  }

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const panelWidth = isMobile ? window.innerWidth - 16 : 380;

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[9999] rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
      style={{ top: pos.top, left: pos.left, width: panelWidth, background: "var(--surface)" }}
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
            <button
              onClick={() => { navigator.clipboard.writeText(baseUrl); toast.success("Lien copié !"); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-white transition flex-shrink-0"
            >
              <Copy className="w-3 h-3" /> Copier
            </button>
            <a href={baseUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-white transition flex-shrink-0">
              <ExternalLink className="w-3 h-3" /> Voir
            </a>
          </div>
        </div>

        {/* Personalized links */}
        <div className="relative">
          {/* Premium overlay */}
          {!isPremium && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl"
              style={{ backdropFilter: "blur(5px)", backgroundColor: "rgba(255,255,255,0.82)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50">
                <Lock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xs font-semibold text-gray-800">Liens personnalisés</p>
              <p className="text-[11px] text-gray-400 text-center px-4">Disponible avec le plan Premium</p>
              <a
                href="/settings"
                className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition hover:opacity-90"
                style={{ backgroundColor: "#f59e0b" }}
              >
                Passer Premium
              </a>
            </div>
          )}
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Liens personnalisés</p>
            <button
              onClick={() => setShowForm(s => !s)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>

          {showForm && (
            <div className="border border-gray-200 rounded-xl p-3 space-y-2 mb-3 bg-gray-50">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleCreate(); }}
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
                <button onClick={handleCreate} disabled={saving || !email.trim()}
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
                      <button onClick={() => handleDelete(link.id)} disabled={saving}
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

// ── Row component ─────────────────────────────────────────────────────────────

function RecentProposalRow({ p, isPremium }: { p: RecentProposal; isPremium: boolean }) {
  const [status, setStatus] = useState<ProposalStatus>((p.status as ProposalStatus) ?? "pending");
  const [feedbackModalStatus, setFeedbackModalStatus] = useState<"won" | "lost" | null>(null);
  const [isPending, startTransition] = useTransition();
  const cfg = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  const dotColor = p.published ? "#10b981" : "#f59e0b";
  const { blurProposals } = useBlur();
  const blurStyle = blurProposals ? { filter: "blur(6px)", userSelect: "none" as const, pointerEvents: "none" as const } : {};
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePos, setSharePos] = useState<{ top: number; left: number } | null>(null);

  function changeStatus(s: ProposalStatus) {
    if ((s === "won" || s === "lost") && isPremium) {
      setFeedbackModalStatus(s);
    } else {
      setStatus(s);
      startTransition(async () => {
        await updateProposalMeta(p.id, {
          status: s,
          ...(s === "pending" ? { activeFeedbackFormId: null, feedbackFormTriggeredAt: null } : {}),
        });
      });
    }
  }

  function openShare(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const isMobile = window.innerWidth < 768;
    const panelWidth = isMobile ? window.innerWidth - 16 : 380;
    setSharePos({
      top: rect.bottom + 4,
      left: isMobile ? 8 : Math.max(8, rect.right - panelWidth),
    });
    setShareOpen(true);
  }

  return (
    <>
      {/* ── Mobile card (hidden on md+) ────────────────────────────────────── */}
      <div className="md:hidden px-4 py-3 hover:bg-black/[0.018] transition-colors" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
              <Link
                href={`/proposals/${p.id}/edit`}
                className="font-semibold text-sm text-gray-900 hover:text-indigo-600 truncate transition-colors"
              >
                <span style={blurStyle}>{p.title}</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusDropdown status={status} onChangeStatus={changeStatus} isPending={isPending} />
              <FeedbackDot status={p.feedbackStatus} />
              {p.amountMrr && (
                <span className="text-xs font-semibold text-gray-700">{fmtEur(p.amountMrr)}<span className="text-gray-400 font-normal">/m</span></span>
              )}
              {p.amountOneShot && (
                <span className="text-xs text-gray-600">{fmtEur(p.amountOneShot)}</span>
              )}
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <Eye className="w-3 h-3" />{p.viewCount}
              </span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Link href={`/proposals/${p.id}/edit`} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Éditer">
              <Pencil className="w-4 h-4" />
            </Link>
            <Link href={`/proposals/${p.id}/analytics`} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Analytics">
              <BarChart2 className="w-4 h-4" />
            </Link>
            <button type="button" onClick={openShare} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Partager">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop row (hidden on mobile) ────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-4 px-6 py-3.5 hover:bg-black/[0.018] transition-colors">
        {/* Status dot */}
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />

        {/* Title */}
        <Link
          href={`/proposals/${p.id}/edit`}
          className="flex-1 min-w-0 text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate"
        >
          <span style={blurStyle}>{p.title}</span>
        </Link>

        {/* Status badge */}
        <div className="flex-shrink-0 w-24 flex items-center justify-center gap-1.5">
          <StatusDropdown status={status} onChangeStatus={changeStatus} isPending={isPending} />
          <FeedbackDot status={p.feedbackStatus} />
        </div>

        {/* MRR */}
        <div className="flex-shrink-0 w-20 flex justify-center">
          {p.amountMrr ? (
            <span className="text-sm font-semibold text-gray-800">{fmtEur(p.amountMrr)}<span className="text-xs font-normal text-gray-400">/m</span></span>
          ) : <span className="text-xs text-gray-300">—</span>}
        </div>

        {/* One Shot */}
        <div className="flex-shrink-0 w-20 flex justify-center">
          {p.amountOneShot ? (
            <span className="text-sm font-medium text-gray-600">{fmtEur(p.amountOneShot)}</span>
          ) : <span className="text-xs text-gray-300">—</span>}
        </div>

        {/* Views */}
        <div className="flex-shrink-0 w-10 flex items-center justify-center gap-1 text-xs text-gray-400">
          <Eye className="w-3 h-3" />{p.viewCount}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-0.5">
          <Link href={`/proposals/${p.id}/edit`} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Éditer">
            <Pencil className="w-3.5 h-3.5" />
          </Link>
          <Link href={`/proposals/${p.id}/analytics`} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Analytics">
            <BarChart2 className="w-3.5 h-3.5" />
          </Link>
          <button type="button" onClick={openShare} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Partager">
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {shareOpen && sharePos && (
        <SharePanel proposalId={p.id} slug={p.slug} pos={sharePos} onClose={() => setShareOpen(false)} isPremium={isPremium} />
      )}

      {feedbackModalStatus && (
        <StatusFeedbackModal
          proposalId={p.id}
          newStatus={feedbackModalStatus}
          onConfirm={(formTemplateId) => {
            const confirmedStatus = feedbackModalStatus;
            setFeedbackModalStatus(null);
            setStatus(confirmedStatus);
            startTransition(async () => {
              await updateProposalMeta(p.id, { status: confirmedStatus });
              if (formTemplateId) {
                await activateFeedbackForm(p.id, formTemplateId);
                toast.success("Formulaire de feedback activé !");
              }
            });
          }}
          onCancel={() => setFeedbackModalStatus(null)}
        />
      )}
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function RecentProposals({ proposals, isPremium = false }: { proposals: RecentProposal[]; isPremium?: boolean }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? proposals : proposals.slice(0, INITIAL_VISIBLE_COUNT);
  const hasMore = proposals.length > INITIAL_VISIBLE_COUNT;

  return (
    <div>
      {visible.map(p => (
        <RecentProposalRow key={p.id} p={p} isPremium={isPremium} />
      ))}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1.5 px-6 py-3 text-sm font-medium transition-colors"
          style={{ color: "var(--primary)", borderTop: "1px solid rgba(0,0,0,0.05)" }}
        >
          {expanded ? (
            <>{t("dashboard_show_less")} <ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <>{t("dashboard_load_more")} <ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>
      )}
    </div>
  );
}
