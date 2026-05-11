"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Bell, Eye, MousePointer, Clock, CheckCheck, X, ExternalLink, Trash2 } from "lucide-react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllReadNotifications,
  type AppNotification,
} from "@/app/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useLanguage } from "@/contexts/language-context";

type Tab = "unread" | "read";

const POLL_INTERVAL = 30_000; // 30s
const PANEL_WIDTH = 480;      // px

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("unread");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { t, lang } = useLanguage();

  const TYPE_CONFIG = {
    page_view: {
      icon: Eye,
      color: "text-blue-500",
      bg: "bg-blue-50",
      label: (n: AppNotification) => {
        const who = n.visitorName || n.visitorEmail || t("notif_someone");
        return t("notif_page_view", { who });
      },
    },
    cta_click: {
      icon: MousePointer,
      color: "text-green-500",
      bg: "bg-green-50",
      label: (n: AppNotification) => {
        const who = n.visitorName || n.visitorEmail || t("notif_a_visitor");
        const what = n.blockLabel ? `"${n.blockLabel}"` : t("notif_cta_what_btn");
        return t("notif_cta_click", { who, what });
      },
    },
    time_on_page: {
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-50",
      label: (n: AppNotification) => {
        const min = n.durationSeconds ? Math.round(n.durationSeconds / 60) : "?";
        const who = n.visitorName || n.visitorEmail || t("notif_a_visitor");
        return t("notif_time_on_page", { who, min });
      },
    },
  };

  const unread = notifications.filter(n => !n.read);
  const read = notifications.filter(n => n.read);
  // Most recent at the bottom — sort ascending by createdAt
  const sortAsc = (a: AppNotification, b: AppNotification) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  const listed = (tab === "unread" ? unread : read).slice().sort(sortAsc);
  const unreadCount = unread.length;

  // ── Auto-refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    async function refresh() {
      const data = await getNotifications(80);
      if (active) { setNotifications(data); setLoaded(true); }
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Scroll list to bottom
  const scrollToBottom = useCallback(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, []);

  function toggleOpen() {
    if (open) { setOpen(false); return; }
    setTab("unread"); // always reset to unread tab on open
    setOpen(true);
  }

  // Scroll to bottom whenever list content changes or panel opens
  useEffect(() => {
    if (open && loaded) {
      // Small timeout to let DOM update first
      const t = setTimeout(scrollToBottom, 50);
      return () => clearTimeout(t);
    }
  }, [open, loaded, listed.length, scrollToBottom]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        btnRef.current && !btnRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  // ── Actions ──────────────────────────────────────────────────────────────
  async function handleMarkRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await markNotificationRead(id);
  }

  async function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    await markAllNotificationsRead();
  }

  async function handleDelete(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
    startTransition(async () => { await deleteNotification(id); });
  }

  async function handleDeleteAllRead() {
    setNotifications(prev => prev.filter(n => !n.read));
    startTransition(async () => { await deleteAllReadNotifications(); });
  }

  // ── Panel JSX (rendered via portal) ──────────────────────────────────────
  const panel = open ? (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        bottom: 16,          // anchored to the bottom of the viewport
        left: 264,           // sidebar is w-64 (256px) + 8px gap
        width: PANEL_WIDTH,
        maxHeight: "min(540px, calc(100vh - 32px))",
        zIndex: 2147483647, // max possible z-index
        background: "var(--surface)",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
        <span className="text-sm font-semibold text-gray-800">{t("notif_title")}</span>
        <div className="flex items-center gap-1.5">
          {tab === "unread" && unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-700 transition px-1.5 py-1 rounded-lg hover:bg-gray-100"
              title={t("notif_mark_read")}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {t("notif_mark_read")}
            </button>
          )}
          {tab === "read" && read.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAllRead}
              className="flex items-center gap-1 text-[11px] font-medium text-red-400 hover:text-red-600 transition px-1.5 py-1 rounded-lg hover:bg-red-50"
              title={t("notif_delete_all")}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("notif_delete_all")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-gray-300 hover:text-gray-500 transition p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-3 pt-2 pb-0 flex-shrink-0">
        {([
          { key: "unread" as Tab, labelKey: "notif_unread" as const, count: unreadCount },
          { key: "read"   as Tab, labelKey: "notif_read"   as const, count: read.length },
        ]).map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-lg"
            style={tab === item.key ? { color: "var(--primary)" } : { color: "#9ca3af" }}
          >
            {t(item.labelKey)}
            {item.count > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={
                  tab === item.key
                    ? { backgroundColor: "var(--primary)" + "15", color: "var(--primary)" }
                    : { backgroundColor: "#f3f4f6", color: "#9ca3af" }
                }
              >
                {item.count}
              </span>
            )}
            {tab === item.key && (
              <span
                className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                style={{ backgroundColor: "var(--primary)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* List */}
      <div ref={listRef} className="overflow-y-auto flex-1 mt-1" style={{ minHeight: 0 }}>
        {!loaded ? (
          <div className="flex items-center justify-center py-10 text-xs text-gray-400">
            {t("loading")}
          </div>
        ) : listed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-400">
            <Bell className="w-6 h-6 opacity-30" />
            <span className="text-xs">
              {tab === "unread" ? t("notif_empty") : t("notif_empty_read")}
            </span>
          </div>
        ) : (
          listed.map(n => {
            const cfg = TYPE_CONFIG[n.type];
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`group/item flex gap-3 px-4 py-3 border-b border-gray-50 transition ${
                  tab === "unread" && !n.read
                    ? "bg-blue-50/40 hover:bg-blue-50/60 cursor-pointer"
                    : "hover:bg-gray-50/60"
                }`}
                onClick={() => tab === "unread" && !n.read && handleMarkRead(n.id)}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${n.read ? "text-gray-500" : "text-gray-800 font-medium"}`}>
                    {cfg.label(n)}
                  </p>
                  <a
                    href={`/proposals/${n.proposalId}/analytics`}
                    className="inline-flex items-center gap-0.5 text-[11px] hover:underline mt-0.5"
                    style={{ color: "var(--primary)" }}
                    onClick={e => { e.stopPropagation(); if (!n.read) handleMarkRead(n.id); }}
                  >
                    <span className="whitespace-nowrap">{n.proposalTitle}</span>
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                  </a>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: lang === "fr" ? fr : undefined })}
                  </p>
                </div>

                {/* Right side */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1.5 mt-0.5">
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                  )}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleDelete(n.id); }}
                    title={t("delete")}
                    className="opacity-0 group-hover/item:opacity-100 transition text-gray-300 hover:text-red-400 p-0.5 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Bell button */}
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl transition-colors hover:bg-gray-100"
        title={t("notif_title")}
      >
        <Bell className="w-4.5 h-4.5 text-gray-500" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Portal — rendered directly in <body>, above all stacking contexts */}
      {typeof document !== "undefined" && open
        ? createPortal(panel, document.body)
        : null}
    </>
  );
}
