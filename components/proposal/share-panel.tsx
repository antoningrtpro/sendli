"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Copy, ExternalLink, Plus, Mail, User, Clock, X, Check,
  Link as LinkIcon, Lock, Eye,
} from "lucide-react";
import { getProposalLinks, createProposalLink, deleteProposalLink } from "@/app/actions/links";
import type { ProposalLinkWithStats } from "@/app/actions/links";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

function fmtDate(d: Date | string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d));
}

export function SharePanel({
  proposalId, slug, pos, onClose, isPremium = false,
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
    function onScroll() { onClose(); }
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("scroll", onScroll);
    };
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

  const isMobile = window.innerWidth < 640;
  const panelWidth = isMobile ? window.innerWidth - 16 : 380;
  const adjustedLeft = isMobile ? 8 : Math.max(8, Math.min(pos.left, window.innerWidth - panelWidth - 12));
  const adjustedTop = Math.min(pos.top, window.innerHeight - 480);

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[9999] rounded-2xl border border-gray-200 shadow-2xl overflow-hidden"
      style={{ top: adjustedTop, left: adjustedLeft, width: panelWidth, background: "var(--surface)" }}
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
        <div className="relative">
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
                onClick={e => e.stopPropagation()}
              >
                Passer Premium
              </a>
            </div>
          )}
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
