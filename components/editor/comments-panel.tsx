"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, MessageCircle, Send, ChevronDown, ChevronRight, Trash2, CheckCircle2 } from "lucide-react";
import type { ProposalComment, CommentReply } from "@/components/proposal/block-comments";

interface CommentsPanelProps {
  proposalId: string;
  onClose: () => void;
  primaryColor?: string;
  isPremium?: boolean;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  return `il y a ${Math.floor(hrs / 24)}j`;
}

function Avatar({ name, isOwner, primary }: { name: string; isOwner: boolean; primary: string }) {
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ backgroundColor: isOwner ? primary : "#9ca3af" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function positionLabel(yPct: number): string {
  if (yPct < 20) return "En haut";
  if (yPct < 40) return "Début";
  if (yPct < 60) return "Milieu";
  if (yPct < 80) return "Fin";
  return "En bas";
}

interface ThreadProps {
  comment: ProposalComment;
  primary: string;
  proposalId: string;
  ownerName?: string;
  onReply: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => void;
  onResolve: (commentId: string, resolved: boolean) => void;
}

function Thread({ comment, primary, proposalId, ownerName, onReply, onDelete, onResolve }: ThreadProps) {
  const [replyVal, setReplyVal] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resolving, setResolving] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch(`/api/proposals/${proposalId}/comments/${comment.id}`, { method: "DELETE" });
      onDelete(comment.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handleResolve() {
    setResolving(true);
    try {
      const next = !comment.resolved;
      await fetch(`/api/proposals/${proposalId}/comments/${comment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: next }),
      });
      onResolve(comment.id, next);
    } finally {
      setResolving(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!replyVal.trim()) return;
    setSending(true);
    try {
      await onReply(comment.id, replyVal.trim());
      setReplyVal("");
    } finally {
      setSending(false);
    }
  }

  const totalReplies = comment.replies.length;
  const hasOwnerReply = comment.replies.some(r => r.isOwner);
  const isResolved = comment.resolved ?? false;

  return (
    <div className={`group rounded-xl border overflow-hidden bg-white ${isResolved ? "border-green-200" : "border-gray-100"}`}>
      {/* Header */}
      <div className="flex items-start">
      <button
        type="button"
        onClick={() => setExpanded(o => !o)}
        className="flex-1 flex items-start gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <Avatar name={comment.authorName} isOwner={false} primary={primary} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-800 truncate">{comment.authorName}</span>
            {isResolved ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-600 font-medium flex-shrink-0">
                Fermé
              </span>
            ) : !hasOwnerReply ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium flex-shrink-0">
                En attente
              </span>
            ) : null}
            <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
              {relativeTime(comment.createdAt)}
            </span>
          </div>
          <p className={`text-xs text-gray-600 mt-0.5 leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>{comment.content}</p>
          {/* Position indicator */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {/* Mini page map */}
            <div className="relative w-3 h-4 rounded-sm border border-gray-200 bg-gray-50 flex-shrink-0 overflow-hidden">
              <div
                className="absolute left-0 right-0 h-0.5 rounded-full"
                style={{ top: `${Math.min(85, Math.max(5, comment.yPct))}%`, backgroundColor: isResolved ? "#86efac" : primary }}
              />
            </div>
            {comment.blockLabel
              ? <span className="text-[10px] text-gray-400">Bloc · <span className="font-medium text-gray-500">{comment.blockLabel}</span></span>
              : <span className="text-[10px] text-gray-400">{positionLabel(comment.yPct)} · {Math.round(comment.xPct)}% à gauche</span>
            }
          </div>
        </div>
        <div className="flex-shrink-0 text-gray-400 mt-0.5">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
      </button>
      {/* Action buttons */}
      <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-1 p-2 mt-1 transition-all">
        <button
          type="button"
          onClick={handleResolve}
          disabled={resolving}
          className={`flex-shrink-0 p-1.5 rounded-lg transition-all ${isResolved ? "text-green-500 bg-green-50 hover:bg-green-100" : "text-gray-400 hover:text-green-500 hover:bg-green-50"}`}
          title={isResolved ? "Réouvrir ce commentaire" : "Fermer ce commentaire"}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          title="Supprimer ce commentaire"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-50">
          {/* Replies */}
          {totalReplies > 0 && (
            <div className="px-3 py-2 space-y-2.5">
              {comment.replies.map(reply => (
                <div key={reply.id} className="flex items-start gap-2">
                  <Avatar name={reply.authorName} isOwner={reply.isOwner} primary={primary} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold text-gray-700">{reply.authorName}</span>
                      {reply.isOwner && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: primary + "15", color: primary }}
                        >
                          Auteur
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 ml-auto">{relativeTime(reply.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{reply.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply form */}
          <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-2 border-t border-gray-50">
            <input
              type="text"
              value={replyVal}
              onChange={e => setReplyVal(e.target.value)}
              placeholder="Répondre…"
              className="flex-1 text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 placeholder-gray-400 transition"
              style={{ ["--tw-ring-color" as string]: primary + "66" }}
            />
            <button
              type="submit"
              disabled={sending || !replyVal.trim()}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-white transition-opacity"
              style={{ backgroundColor: primary, opacity: sending || !replyVal.trim() ? 0.4 : 1 }}
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function CommentsPanel({ proposalId, onClose, primaryColor = "#111184", ownerName, isPremium = true }: CommentsPanelProps & { ownerName?: string }) {
  const [comments, setComments] = useState<ProposalComment[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchComments = useCallback(async (silent = false) => {
    try {
      const res = await fetch(`/api/proposals/${proposalId}/comments`);
      const data = await res.json() as ProposalComment[];
      setComments(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch {
      // silent
    } finally {
      if (!silent) setLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    fetchComments();
    const id = setInterval(() => fetchComments(true), 8000);
    return () => clearInterval(id);
  }, [fetchComments]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleReply = useCallback(async (commentId: string, content: string) => {
    const res = await fetch(`/api/proposals/${proposalId}/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, authorName: ownerName || "Moi" }), // isOwner determined server-side via session
    });
    if (!res.ok) throw new Error("Erreur");
    const { reply } = await res.json() as { reply: CommentReply };
    setComments(prev =>
      prev.map(c =>
        c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
      )
    );
  }, [proposalId]);

  const handleDelete = useCallback((commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  }, []);

  const handleResolve = useCallback((commentId: string, resolved: boolean) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, resolved } : c));
  }, []);

  const pendingCount = comments.filter(c => !c.resolved).length;

  return (
    <div
      ref={panelRef}
      className="absolute inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="relative ml-auto w-full md:w-[360px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Premium gate overlay */}
        {!isPremium && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 backdrop-blur-md bg-white/60">
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <span className="text-2xl">✨</span>
              <span className="text-sm font-bold text-gray-900">Fonctionnalité Premium</span>
              <p className="text-xs text-gray-500 leading-relaxed">
                Les commentaires visiteurs sont réservés aux abonnés Pro et Premium.
              </p>
              <a
                href="/settings"
                className="mt-1 px-4 py-2 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Passer au Premium →
              </a>
            </div>
          </div>
        )}

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 flex-shrink-0"
          style={{ background: "var(--surface)" }}
        >
          <div className="flex items-center gap-2.5">
            <MessageCircle className="w-4 h-4" style={{ color: primaryColor }} />
            <span className="text-sm font-semibold text-gray-900">Commentaires</span>
            {pendingCount > 0 && (
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {pendingCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5" style={{ background: "#f8f8fb" }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: primaryColor + "40", borderTopColor: primaryColor }}
              />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
              <MessageCircle className="w-8 h-8 opacity-30" />
              <p className="text-xs text-center leading-relaxed">
                Aucun commentaire pour l&apos;instant.<br />
                Les visiteurs peuvent en laisser<br />via clic droit sur la propale.
              </p>
            </div>
          ) : (
            comments.map(comment => (
              <Thread
                key={comment.id}
                comment={comment}
                primary={primaryColor}
                proposalId={proposalId}
                ownerName={ownerName}
                onReply={handleReply}
                onDelete={handleDelete}
                onResolve={handleResolve}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {!loading && comments.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-white">
            <button
              type="button"
              onClick={() => fetchComments()}
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              ↻ Rafraîchir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
