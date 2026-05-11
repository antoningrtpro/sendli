"use client";

import { useState, useEffect, useTransition, useRef } from "react";
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

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("unread");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
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
  const listed = tab === "unread" ? unread : read;
  const unreadCount = unread.length;

  // ── Auto-refresh (always, for badge + list) ──────────────────────────────
  useEffect(() => {
    let active = true;
    async function refresh() {
      const data = await getNotifications(80);
      if (active) {
        setNotifications(data);
        setLoaded(true);
      }
    }
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
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
    startTransition(async () => {
      await deleteNotification(id);
    });
  }

  async function handleDeleteAllRead() {
    setNotifications(prev => prev.filter(n => !n.read));
    startTransition(async () => {
      await deleteAllReadNotifications();
    });
  }

  return (
    <div ref={panelRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
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

      {/* Panel */}
      {open && (
        <div
          className="absolute left-full bottom-0 ml-2 w-84 rounded-2xl shadow-xl z-[200] overflow-hidden flex flex-col"
          style={{
            background: "var(--surface)",
            border: "1px solid rgba(0,0,0,0.08)",
            width: "22rem",
            maxHeight: "540px",
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
                style={
                  tab === item.key
                    ? { color: "var(--primary)" }
                    : { color: "#9ca3af" }
                }
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
                {/* Active underline */}
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
          <div className="overflow-y-auto flex-1 mt-1">
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
                        <span className="truncate max-w-[160px]">{n.proposalTitle}</span>
                        <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                      </a>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {formatDistanceToNow(n.createdAt, { addSuffix: true, locale: lang === "fr" ? fr : undefined })}
                      </p>
                    </div>

                    {/* Right side: unread dot + delete */}
                    <div className="flex-shrink-0 flex flex-col items-center gap-1.5 mt-0.5">
                      {!n.read && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: "var(--primary)" }}
                        />
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
      )}
    </div>
  );
}
