"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { createProposalLink, deleteProposalLink } from "@/app/actions/links";
import type { ProposalLinkWithStats } from "@/app/actions/links";
import toast from "react-hot-toast";
import {
  Share2, Copy, ExternalLink, Plus, Trash2, Mail, User,
  Eye, Clock, X, Check, Link as LinkIcon,
} from "lucide-react";

interface SharePanelProps {
  proposalId: string;
  slug: string;
  appUrl: string;
  initialLinks: ProposalLinkWithStats[];
}

function fmtDate(d: Date | string | null) {
  if (!d) return null;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d));
}

function fmtDuration(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${s % 60 > 0 ? ` ${s % 60}s` : ""}`;
}

// ── Single link row ────────────────────────────────────────────────────────────

function LinkRow({
  link,
  baseUrl,
  onDelete,
  isPending,
}: {
  link: ProposalLinkWithStats;
  baseUrl: string;
  onDelete: (id: string) => void;
  isPending: boolean;
}) {
  const url = `${baseUrl}?lid=${link.token}`;

  function copy() {
    navigator.clipboard.writeText(url);
    toast.success("Lien copié !");
  }

  const label = link.recipientName || link.recipientEmail || "Lien sans destinataire";

  return (
    <div className="flex items-start gap-3 py-3 px-4 rounded-xl border border-gray-200 bg-white group">
      {/* Avatar / icon */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold mt-0.5"
        style={{ backgroundColor: "var(--primary)" }}>
        {link.recipientName
          ? link.recipientName.charAt(0).toUpperCase()
          : link.recipientEmail
            ? link.recipientEmail.charAt(0).toUpperCase()
            : <LinkIcon className="w-3.5 h-3.5" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
        {link.recipientEmail && link.recipientName && (
          <p className="text-xs text-gray-400 truncate">{link.recipientEmail}</p>
        )}
        {/* Stats */}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Eye className="w-3 h-3" />
            {link.views} vue{link.views !== 1 ? "s" : ""}
          </span>
          {link.lastSeenAt && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              Vu le {fmtDate(link.lastSeenAt)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
        <button onClick={copy} title="Copier le lien"
          className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" title="Ouvrir"
          className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button onClick={() => onDelete(link.id)} disabled={isPending} title="Supprimer"
          className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Add recipient form ─────────────────────────────────────────────────────────

function AddRecipientForm({
  proposalId,
  onCreated,
  onCancel,
}: {
  proposalId: string;
  onCreated: (link: ProposalLinkWithStats) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!email.trim()) return;
    startTransition(async () => {
      const link = await createProposalLink(proposalId, email.trim(), name.trim() || undefined);
      if (link) {
        onCreated(link);
        toast.success("Lien créé !");
      }
    });
  }

  return (
    <div className="border border-primary-200 bg-primary-50 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-primary-800">Nouveau destinataire</p>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="email@client.com *"
            className="w-full pl-8 pr-3 py-2 border border-primary-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <div className="relative flex-1">
          <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            placeholder="Prénom Nom (optionnel)"
            className="w-full pl-8 pr-3 py-2 border border-primary-200 rounded-lg text-sm bg-white focus:outline-none"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={isPending || !email.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition"
          style={{ backgroundColor: "var(--primary)" }}>
          <Check className="w-3.5 h-3.5" /> Créer le lien
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition">
          <X className="w-3.5 h-3.5" /> Annuler
        </button>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function SharePanel({ proposalId, slug, appUrl, initialLinks }: SharePanelProps) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ProposalLinkWithStats[]>(initialLinks);
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  const baseUrl = `${appUrl}/p/${slug}`;

  // Close on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  function copyDefault() {
    navigator.clipboard.writeText(baseUrl);
    toast.success("Lien copié !");
  }

  function handleDelete(linkId: string) {
    startTransition(async () => {
      await deleteProposalLink(linkId);
      setLinks(prev => prev.filter(l => l.id !== linkId));
      toast.success("Lien supprimé");
    });
  }

  function handleCreated(link: ProposalLinkWithStats) {
    setLinks(prev => [link, ...prev]);
    setShowForm(false);
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition"
        style={open
          ? { backgroundColor: "var(--primary)", color: "#fff", borderColor: "var(--primary)" }
          : { backgroundColor: "transparent", color: "var(--primary)", borderColor: "var(--primary)" }}>
        <Share2 className="w-3.5 h-3.5" />
        Partager
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Partager la proposal</h3>
              <p className="text-xs text-gray-400 mt-0.5">Créez des liens personnalisés par destinataire</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
            {/* Default link */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Lien par défaut</p>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
                <LinkIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="flex-1 text-xs text-gray-600 truncate font-mono">{baseUrl}</span>
                <button onClick={copyDefault}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-white transition flex-shrink-0">
                  <Copy className="w-3 h-3" /> Copier
                </button>
                <a href={baseUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-gray-300 text-gray-500 hover:bg-white transition flex-shrink-0">
                  <ExternalLink className="w-3 h-3" /> Voir
                </a>
              </div>
            </div>

            {/* Named links */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Liens personnalisés</p>
                <button
                  onClick={() => { setShowForm(true); }}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium text-white transition hover:opacity-90"
                  style={{ backgroundColor: "var(--primary)" }}>
                  <Plus className="w-3 h-3" /> Ajouter
                </button>
              </div>

              {showForm && (
                <div className="mb-3">
                  <AddRecipientForm
                    proposalId={proposalId}
                    onCreated={handleCreated}
                    onCancel={() => setShowForm(false)}
                  />
                </div>
              )}

              {links.length === 0 && !showForm ? (
                <div className="text-center py-8 text-gray-400">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Aucun lien personnalisé pour l&apos;instant</p>
                  <p className="text-xs text-gray-300 mt-0.5">Ajoutez un destinataire pour tracer son activité</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {links.map(link => (
                    <LinkRow
                      key={link.id}
                      link={link}
                      baseUrl={baseUrl}
                      onDelete={handleDelete}
                      isPending={isPending}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
