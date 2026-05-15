"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X, Send, MessageCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CommentReply {
  id: string;
  content: string;
  authorName: string;
  isOwner: boolean;
  createdAt: string;
}

export interface ProposalComment {
  id: string;
  proposalId: string;
  blockId: string;
  xPct: number;
  yPct: number;
  authorName: string;
  authorEmail: string | null;
  content: string;
  resolved: boolean;
  createdAt: string;
  replies: CommentReply[];
  blockLabel?: string | null;
}

// ─── useComments hook ─────────────────────────────────────────────────────────

export function useComments(
  proposalId: string,
  initialComments: ProposalComment[] = []
) {
  const [comments, setComments] = useState<ProposalComment[]>(initialComments);

  const fetchAll = useCallback(async () => {
    try {
      const r = await fetch(`/api/proposals/${proposalId}/comments`);
      if (!r.ok) return;
      const serverData: ProposalComment[] = await r.json();
      setComments(prev => {
        const serverIds = new Set(serverData.map(c => c.id));
        // Keep optimistic local comments not yet confirmed by server
        const localOnly = prev.filter(c => !serverIds.has(c.id));
        // For shared comments, prefer server data unless local has more replies
        const merged = serverData.map(sc => {
          const lc = prev.find(c => c.id === sc.id);
          if (lc && lc.replies.length > sc.replies.length) return lc;
          return sc;
        });
        return [...merged, ...localOnly];
      });
    } catch { /* non-critical background poll */ }
  }, [proposalId]);

  useEffect(() => {
    fetchAll(); // always fetch fresh on mount
    const id = setInterval(fetchAll, 8000); // poll every 8 s
    return () => clearInterval(id);
  }, [fetchAll]);

  const addComment = useCallback(
    async (data: {
      blockId: string;
      xPct: number;
      yPct: number;
      authorName: string;
      authorEmail?: string | null;
      content: string;
    }): Promise<ProposalComment> => {
      const res = await fetch(`/api/proposals/${proposalId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Failed to create comment");
      }
      const comment = await res.json() as ProposalComment;
      setComments((prev) => [...prev, comment]);
      return comment;
    },
    [proposalId]
  );

  const addReply = useCallback(
    async (
      commentId: string,
      data: { content: string; authorName: string }
    ): Promise<CommentReply> => {
      const res = await fetch(
        `/api/proposals/${proposalId}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error("Failed to add reply");
      const { reply } = await res.json() as { reply: CommentReply };
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, replies: [...c.replies, reply] } : c
        )
      );
      return reply;
    },
    [proposalId]
  );

  return { comments, setComments, addComment, addReply };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `il y a ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `il y a ${days}j`;
}

function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
  enabled = true
) {
  useEffect(() => {
    if (!enabled) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) handler();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [ref, handler, enabled]);
}

// ─── CommentContextMenu ────────────────────────────────────────────────────────

interface ContextMenuProps {
  x: number;
  y: number;
  primaryColor: string;
  onComment: () => void;
  onClose: () => void;
}

function CommentContextMenu({
  x,
  y,
  primaryColor,
  onComment,
  onClose,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, onClose, true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute z-50 w-56 rounded-xl shadow-xl border border-gray-100 bg-white overflow-hidden"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors duration-150 text-left"
        style={{ color: primaryColor }}
        onMouseDown={(e) => {
          e.stopPropagation();
          onComment();
        }}
      >
        <MessageCircle className="w-4 h-4 flex-shrink-0" />
        <span className="whitespace-nowrap">Laisser un commentaire</span>
      </button>
      <div className="h-px bg-gray-100 mx-2" />
      <button
        className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-gray-50 transition-colors duration-150 text-gray-500 text-left"
        onMouseDown={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <X className="w-4 h-4 flex-shrink-0" />
        <span className="whitespace-nowrap">Fermer</span>
      </button>
    </div>
  );
}

// ─── NewCommentForm ────────────────────────────────────────────────────────────

interface NewCommentFormProps {
  primaryColor: string;
  onSubmit: (data: {
    authorName: string;
    authorEmail: string | null;
    content: string;
  }) => Promise<void>;
  onClose: () => void;
  viewportX: number;
  viewportY: number;
}

function computeFixedPosition(viewportX: number, viewportY: number): React.CSSProperties {
  const popupW = 288;
  const popupH = 380;

  // Horizontal: try right of pin; if it clips, try left
  let left = viewportX + 16;
  if (left + popupW > window.innerWidth - 8) {
    left = viewportX - popupW - 16;
  }
  left = Math.max(4, Math.min(left, window.innerWidth - popupW - 4));

  // Vertical: center on the pin, then clamp to keep inside viewport
  let top = viewportY - Math.round(popupH / 3);
  top = Math.max(4, Math.min(top, window.innerHeight - popupH - 4));

  return { position: "fixed", left, top };
}

function NewCommentForm({
  primaryColor,
  onSubmit,
  onClose,
  viewportX,
  viewportY,
}: NewCommentFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, onClose, true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setError("Le nom et le message sont requis.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit({
        authorName: name.trim(),
        authorEmail: email.trim() || null,
        content: message.trim(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 placeholder-gray-400 transition";

  if (typeof document === "undefined") return null;

  const posStyle = computeFixedPosition(viewportX, viewportY);

  return createPortal(
    <div
      ref={ref}
      className="z-[9999] w-72 rounded-2xl shadow-2xl bg-white border border-gray-100"
      style={posStyle}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" style={{ color: primaryColor }} />
          <span className="text-sm font-semibold text-gray-800">
            Nouveau commentaire
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Nom <span style={{ color: primaryColor }}>*</span>
          </label>
          <input
            type="text"
            className={inputClass}
            style={{ ["--tw-ring-color" as string]: primaryColor + "66" }}
            placeholder="Votre nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Email{" "}
            <span className="text-gray-400 font-normal">(optionnel)</span>
          </label>
          <input
            type="email"
            className={inputClass}
            style={{ ["--tw-ring-color" as string]: primaryColor + "66" }}
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Message <span style={{ color: primaryColor }}>*</span>
          </label>
          <textarea
            className={inputClass + " resize-none"}
            style={{ ["--tw-ring-color" as string]: primaryColor + "66" }}
            placeholder="Votre commentaire..."
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="text-xs text-red-500">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
          style={{ backgroundColor: primaryColor, opacity: loading ? 0.7 : 1 }}
        >
          <Send className="w-3.5 h-3.5" />
          {loading ? "Envoi…" : "Envoyer"}
        </button>
      </form>
    </div>,
    document.body
  );
}

// ─── CommentThread ────────────────────────────────────────────────────────────

interface CommentThreadProps {
  comment: ProposalComment;
  primaryColor: string;
  onAddReply: (commentId: string, data: { content: string; authorName: string }) => Promise<CommentReply | void>;
  onClose: () => void;
  viewportX: number;
  viewportY: number;
  ownerName?: string;
}

function CommentThread({
  comment,
  primaryColor,
  onAddReply,
  onClose,
  viewportX,
  viewportY,
  ownerName,
}: CommentThreadProps) {
  const [replyName, setReplyName] = useState(ownerName ?? "");
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, onClose, true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comment.replies]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyName.trim() || !replyContent.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onAddReply(comment.id, {
        content: replyContent.trim(),
        authorName: replyName.trim(),
      });
      setReplyContent("");
    } catch {
      setError("Erreur lors de l'envoi de la réponse.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 placeholder-gray-400 transition";

  if (typeof document === "undefined") return null;

  const posStyle = computeFixedPosition(viewportX, viewportY);

  return createPortal(
    <div
      ref={ref}
      className="z-[9999] w-72 rounded-2xl shadow-2xl bg-white border border-gray-100 flex flex-col max-h-96"
      style={posStyle}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" style={{ color: primaryColor }} />
          <span className="text-sm font-semibold text-gray-800">
            Commentaires
          </span>
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: primaryColor + "15", color: primaryColor }}
          >
            {1 + comment.replies.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {/* Original comment */}
        <MessageBubble
          authorName={comment.authorName}
          content={comment.content}
          createdAt={comment.createdAt}
          isOwner={false}
          primaryColor={primaryColor}
        />
        {/* Replies */}
        {comment.replies.map((reply) => (
          <MessageBubble
            key={reply.id}
            authorName={reply.authorName}
            content={reply.content}
            createdAt={reply.createdAt}
            isOwner={reply.isOwner}
            primaryColor={primaryColor}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply form — hidden for visitors when comment is resolved */}
      {comment.resolved && !ownerName ? (
        <div className="p-3 border-t border-gray-100 flex-shrink-0">
          <p className="text-xs text-gray-400 text-center">Ce commentaire est fermé.</p>
        </div>
      ) : (
        <form
          onSubmit={handleReply}
          className="p-3 border-t border-gray-100 space-y-2 flex-shrink-0"
        >
          {!ownerName && (
            <input
              type="text"
              className={inputClass}
              placeholder="Votre nom"
              value={replyName}
              onChange={(e) => setReplyName(e.target.value)}
              required
            />
          )}
          <div className="flex gap-2">
            <input
              type="text"
              className={inputClass}
              placeholder="Répondre…"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading || !replyName.trim() || !replyContent.trim()}
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-white transition-opacity"
              style={{
                backgroundColor: primaryColor,
                opacity: loading || !replyName.trim() || !replyContent.trim() ? 0.5 : 1,
              }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      )}
    </div>,
    document.body
  );
}

interface MessageBubbleProps {
  authorName: string;
  content: string;
  createdAt: string;
  isOwner: boolean;
  primaryColor: string;
}

function MessageBubble({
  authorName,
  content,
  createdAt,
  isOwner,
  primaryColor,
}: MessageBubbleProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
          style={{ backgroundColor: isOwner ? primaryColor : "#6b7280" }}
        >
          {authorName.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-gray-700 truncate">
          {authorName}
        </span>
        {isOwner && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: primaryColor + "15", color: primaryColor }}
          >
            Auteur
          </span>
        )}
        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
          {relativeTime(createdAt)}
        </span>
      </div>
      <p className="text-xs text-gray-700 leading-relaxed pl-6">{content}</p>
    </div>
  );
}

// ─── CommentPin ───────────────────────────────────────────────────────────────

interface CommentPinProps {
  comment: ProposalComment;
  primaryColor: string;
  onOpen: (comment: ProposalComment, vpX: number, vpY: number) => void;
}

function CommentPin({
  comment,
  primaryColor,
  onOpen,
}: CommentPinProps) {
  const totalCount = 1 + comment.replies.length;

  return (
    <button
      type="button"
      className="absolute z-30 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md hover:scale-110 transition-transform duration-150 cursor-pointer"
      style={{
        left: `${comment.xPct}%`,
        top: `${comment.yPct}%`,
        transform: "translate(-50%, -50%)",
        backgroundColor: comment.resolved ? "#86efac" : primaryColor,
        boxShadow: `0 2px 8px ${comment.resolved ? "#86efac" : primaryColor}55`,
      }}
      title={`${comment.authorName}: ${comment.content}`}
      onClick={(e) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        onOpen(comment, rect.left + rect.width / 2, rect.top + rect.height / 2);
      }}
    >
      {totalCount}
    </button>
  );
}

// ─── BlockCommentZone ─────────────────────────────────────────────────────────

export interface BlockCommentZoneProps {
  blockId: string;
  proposalId: string;
  comments: ProposalComment[];
  onCommentAdded: (comment: ProposalComment) => void;
  onReplyAdded?: (commentId: string, reply: CommentReply) => void;
  primaryColor: string;
  enabled: boolean;
  children: ReactNode;
  className?: string;
  ownerName?: string;
}

export function BlockCommentZone({
  blockId,
  proposalId,
  comments,
  onCommentAdded,
  primaryColor,
  enabled,
  children,
  className,
  ownerName,
}: BlockCommentZoneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [ctxMenu, setCtxMenu] = useState<{
    clientX: number;
    clientY: number;
    xPct: number;
    yPct: number;
    blockLabel: string | null;
  } | null>(null);

  // Pending pin (before form submission)
  const [pendingPin, setPendingPin] = useState<{
    xPct: number;
    yPct: number;
    clientX: number;
    clientY: number;
    blockLabel: string | null;
  } | null>(null);

  // Active thread
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const activeComment = comments.find((c) => c.id === activeCommentId) ?? null;
  const [activeCommentViewport, setActiveCommentViewport] = useState<{ x: number; y: number } | null>(null);

  // Reply handler that calls back up (prop not needed separately; updates via parent setComments)
  const [, forceUpdate] = useState(0);

  function handleContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const xPct = (relX / rect.width) * 100;
    const yPct = (relY / rect.height) * 100;

    // Detect which named block was right-clicked
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const blockEl = el?.closest('[data-block-id]');
    const nearestBlockLabel = blockEl?.getAttribute('data-block-name') ?? null;

    // Close any open thread/form
    setActiveCommentId(null);
    setActiveCommentViewport(null);
    setPendingPin(null);
    setCtxMenu({ clientX: e.clientX, clientY: e.clientY, xPct, yPct, blockLabel: nearestBlockLabel });
  }

  function handleStartComment() {
    if (!ctxMenu) return;
    setPendingPin({
      xPct: ctxMenu.xPct,
      yPct: ctxMenu.yPct,
      clientX: ctxMenu.clientX,
      clientY: ctxMenu.clientY,
      blockLabel: ctxMenu.blockLabel,
    });
    setCtxMenu(null);
  }

  async function handleCommentSubmit(data: {
    authorName: string;
    authorEmail: string | null;
    content: string;
  }) {
    if (!pendingPin) return;
    const res = await fetch(`/api/proposals/${proposalId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blockId,
        xPct: pendingPin.xPct,
        yPct: pendingPin.yPct,
        blockLabel: pendingPin.blockLabel,
        ...data,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Erreur");
    }
    const comment = await res.json() as ProposalComment;
    onCommentAdded(comment);
    setPendingPin(null);
  }

  async function handleAddReply(
    commentId: string,
    data: { content: string; authorName: string }
  ) {
    const res = await fetch(
      `/api/proposals/${proposalId}/comments/${commentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) throw new Error("Erreur lors de l'envoi");
    const { reply } = await res.json() as { reply: CommentReply };
    // Update comments via onCommentAdded workaround — we patch the comment in parent by mutating
    // Since we don't have a direct setter, we notify parent so it re-renders
    // The parent (public-page) manages setComments. We bubble up via a synthetic call:
    const updatedComment: ProposalComment = {
      ...(comments.find((c) => c.id === commentId)!),
      replies: [...(comments.find((c) => c.id === commentId)?.replies ?? []), reply],
    };
    onCommentAdded(updatedComment); // reuse callback — parent de-dupes by id below
    forceUpdate((n) => n + 1);
    return reply;
  }

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`relative${className ? ` ${className}` : ""}`}
      onContextMenu={handleContextMenu}
    >
      {children}

      {/* Existing comment pins */}
      {comments.map((c) => (
        <CommentPin
          key={c.id}
          comment={c}
          primaryColor={primaryColor}
          onOpen={(comment, vpX, vpY) => {
            setPendingPin(null);
            setCtxMenu(null);
            setActiveCommentId(comment.id);
            setActiveCommentViewport({ x: vpX, y: vpY });
          }}
        />
      ))}

      {/* Pending pin (ghost, before form submit) */}
      {pendingPin && (
        <div
          className="absolute z-30 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md animate-pulse pointer-events-none"
          style={{
            left: `${pendingPin.xPct}%`,
            top: `${pendingPin.yPct}%`,
            transform: "translate(-50%, -50%)",
            backgroundColor: primaryColor,
            opacity: 0.7,
          }}
        >
          +
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (() => {
        const rect = containerRef.current?.getBoundingClientRect();
        const relX = rect ? ctxMenu.clientX - rect.left : 0;
        const relY = rect ? ctxMenu.clientY - rect.top : 0;
        return (
          <CommentContextMenu
            x={relX}
            y={relY}
            primaryColor={primaryColor}
            onComment={handleStartComment}
            onClose={() => setCtxMenu(null)}
          />
        );
      })()}

      {/* New comment form */}
      {pendingPin && (
        <NewCommentForm
          primaryColor={primaryColor}
          viewportX={pendingPin.clientX}
          viewportY={pendingPin.clientY}
          onSubmit={handleCommentSubmit}
          onClose={() => setPendingPin(null)}
        />
      )}

      {/* Active comment thread */}
      {activeComment && activeCommentViewport && (
        <CommentThread
          key={activeComment.id}
          comment={activeComment}
          primaryColor={primaryColor}
          viewportX={activeCommentViewport.x}
          viewportY={activeCommentViewport.y}
          onAddReply={handleAddReply}
          onClose={() => { setActiveCommentId(null); setActiveCommentViewport(null); }}
          ownerName={ownerName}
        />
      )}
    </div>
  );
}
