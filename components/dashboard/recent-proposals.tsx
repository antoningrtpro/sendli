"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Eye, Pencil, BarChart2, Share2, X, Plus, Mail, User, Check, Copy, ExternalLink, Trash2, Clock, Link as LinkIcon, Lock } from "lucide-react";
import { getProposalLinks, createProposalLink, deleteProposalLink } from "@/app/actions/links";
import type { ProposalLinkWithStats } from "@/app/actions/links";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

export type RecentProposal = {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  status: string;
  amountMrr: number | null;
  amountOneShot: number | null;
  viewCount: number;
};

function fmtEur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}
function fmtDate(d: Date | string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d));
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "#92400e", bg: "#fef3c7" },
  won:     { label: "Gagné",      color: "#065f46", bg: "#d1fae5" },
  lost:    { label: "Perdu",      color: "#991b1b", bg: "#fee2e2" },
};

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
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
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

  const panelWidth = 380;
  const adjustedLeft = Math.min(
    pos.left,
    (typeof window !== "undefined" ? window.innerWidth : 1200) - panelWidth - 12
  );

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
  const cfg = STATUS_STYLE[p.status] ?? STATUS_STYLE.pending;
  const dotColor = p.published ? "#10b981" : "#f59e0b";
  const shareRef = useRef<HTMLButtonElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePos, setSharePos] = useState<{ top: number; left: number } | null>(null);

  function openShare() {
    if (!shareRef.current) return;
    const rect = shareRef.current.getBoundingClientRect();
    setSharePos({ top: rect.bottom + 4, left: rect.right - 380 });
    setShareOpen(true);
  }

  return (
    <div className="flex items-center gap-4 px-6 py-3.5 hover:bg-black/[0.018] transition-colors">
      {/* Status dot */}
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />

      {/* Title */}
      <Link
        href={`/proposals/${p.id}/edit`}
        className="flex-1 min-w-0 text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate"
      >
        {p.title}
      </Link>

      {/* Status badge */}
      <div className="flex-shrink-0 w-24 flex justify-center">
        <span
          className="text-xs px-2.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
      </div>

      {/* MRR */}
      <div className="flex-shrink-0 w-20 flex justify-center">
        {p.amountMrr ? (
          <span className="text-sm font-semibold text-gray-800">
            {fmtEur(p.amountMrr)}<span className="text-xs font-normal text-gray-400">/m</span>
          </span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </div>

      {/* One Shot */}
      <div className="flex-shrink-0 w-20 flex justify-center">
        {p.amountOneShot ? (
          <span className="text-sm font-medium text-gray-600">{fmtEur(p.amountOneShot)}</span>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </div>

      {/* Views */}
      <div className="flex-shrink-0 w-10 flex items-center justify-center gap-1 text-xs text-gray-400">
        <Eye className="w-3 h-3" />
        {p.viewCount}
      </div>

      {/* Actions — icon only */}
      <div className="flex-shrink-0 flex items-center gap-0.5">
        <Link
          href={`/proposals/${p.id}/edit`}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Éditer"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Link>
        <Link
          href={`/proposals/${p.id}/analytics`}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Analytics"
        >
          <BarChart2 className="w-3.5 h-3.5" />
        </Link>
        <button
          ref={shareRef}
          type="button"
          onClick={openShare}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Partager"
        >
          <Share2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {shareOpen && sharePos && (
        <SharePanel
          proposalId={p.id}
          slug={p.slug}
          pos={sharePos}
          onClose={() => setShareOpen(false)}
          isPremium={isPremium}
        />
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function RecentProposals({ proposals, isPremium = false }: { proposals: RecentProposal[]; isPremium?: boolean }) {
  return (
    <div className="divide-y divide-black/[0.04]">
      {proposals.map(p => (
        <RecentProposalRow key={p.id} p={p} isPremium={isPremium} />
      ))}
    </div>
  );
}
