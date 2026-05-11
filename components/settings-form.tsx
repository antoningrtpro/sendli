"use client";

import { useState, useTransition } from "react";
import { updateProfile, updatePassword, updatePlan, deleteAccount } from "@/app/actions/settings";
import { FREE_LIMITS, isPremium } from "@/lib/plan";
import { saveNotificationPrefs, type NotificationPrefs } from "@/app/actions/notifications";
import { logout } from "@/app/actions/auth";
import toast from "react-hot-toast";
import { Crown, Zap, AlertTriangle, Bell, Eye, MousePointer, Clock, Lock, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { Lang, TranslationKey } from "@/lib/i18n";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  plan: string;
  createdAt: Date;
}

const NOTIF_KEYS: {
  key: keyof NotificationPrefs;
  icon: React.ElementType;
  labelKey: TranslationKey;
  descKey: TranslationKey;
}[] = [
  { key: "page_view",    icon: Eye,          labelKey: "settings_notif_page_view", descKey: "settings_notif_page_view_desc" },
  { key: "cta_click",   icon: MousePointer, labelKey: "settings_notif_cta_click", descKey: "settings_notif_cta_desc" },
  { key: "time_on_page", icon: Clock,       labelKey: "settings_notif_time",       descKey: "settings_notif_time_desc" },
];

export function SettingsForm({ user, notificationPrefs: initialPrefs }: { user: User; notificationPrefs?: NotificationPrefs }) {
  const [isPending, startTransition] = useTransition();
  const { t, lang, setLang } = useLanguage();
  const userIsPremium = isPremium(user.plan);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(
    initialPrefs ?? { page_view: true, cta_click: true, time_on_page: false }
  );

  function handleNotifToggle(key: keyof NotificationPrefs) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    startTransition(async () => {
      await saveNotificationPrefs(updated);
      toast.success(t("notif_prefs_saved"));
    });
  }

  function handleProfile(formData: FormData) {
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(t("settings_saved"));
    });
  }

  function handlePassword(formData: FormData) {
    startTransition(async () => {
      const result = await updatePassword(formData);
      if (result?.error) toast.error(result.error);
      else toast.success(t("settings_password_updated"));
    });
  }

  function handlePlan(plan: "free" | "premium") {
    startTransition(async () => {
      await updatePlan(plan);
      toast.success(t("plan_updated", { p: plan === "premium" ? t("plan_premium") : t("plan_free") }));
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteAccount();
      await logout();
    });
  }

  function handleLangChange(next: Lang) {
    setLang(next);
    toast.success(t("settings_lang_saved"));
  }

  return (
    <div className="space-y-6">

      {/* ── Profile ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900">{t("settings_profile")}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t("settings_profile_hint")}</p>
        </div>
        <form action={handleProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings_full_name")}</label>
              <input
                name="name" type="text" defaultValue={user.name ?? ""}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings_company")}</label>
              <input
                name="company" type="text" defaultValue={user.company ?? ""}
                placeholder={t("settings_company_ph")}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings_email")}</label>
            <input
              name="email" type="email" defaultValue={user.email} required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings_phone")}</label>
            <input
              name="phone" type="tel" defaultValue={user.phone ?? ""}
              placeholder="+33 6 00 00 00 00"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
            />
          </div>
          <button type="submit" disabled={isPending}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-full text-sm font-medium transition">
            {t("settings_save")}
          </button>
        </form>
      </div>

      {/* ── Language ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <h2 className="font-semibold text-gray-900">{t("settings_language")}</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">{t("settings_language_hint")}</p>
        <div className="flex gap-3">
          {(["fr", "en"] as Lang[]).map(l => (
            <button key={l} type="button" onClick={() => handleLangChange(l)} disabled={isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition"
              style={lang === l
                ? { borderColor: "var(--primary)", backgroundColor: "var(--primary)" + "10", color: "var(--primary)" }
                : { borderColor: "#e5e7eb", backgroundColor: "transparent", color: "#6b7280" }}
            >
              <span>{l === "fr" ? "🇫🇷" : "🇬🇧"}</span>
              {l === "fr" ? t("settings_lang_fr") : t("settings_lang_en")}
            </button>
          ))}
        </div>
      </div>

      {/* ── Password ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-gray-900 mb-4">{t("settings_password")}</h2>
        <form action={handlePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings_current_password")}</label>
            <input name="currentPassword" type="password" required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings_new_password")}</label>
            <input name="newPassword" type="password" minLength={8} required
              placeholder={t("settings_new_password_ph")}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
            />
          </div>
          <button type="submit" disabled={isPending}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-full text-sm font-medium transition">
            {t("settings_update_password")}
          </button>
        </form>
      </div>

      {/* ── Notifications ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-soft p-6 relative overflow-hidden" style={{ background: "var(--surface)" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: userIsPremium ? "var(--primary)" : "#9ca3af" }} />
            <h2 className={`font-semibold ${userIsPremium ? "text-gray-900" : "text-gray-400"}`}>{t("settings_notifications")}</h2>
          </div>
          {!userIsPremium && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
              <Crown className="w-3 h-3" /> Premium
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-5">
          {userIsPremium ? t("settings_notif_choose") : t("settings_notif_premium")}
        </p>

        <div className={`space-y-3 ${!userIsPremium ? "opacity-40 pointer-events-none select-none" : ""}`}>
          {NOTIF_KEYS.map(({ key, icon: Icon, labelKey, descKey }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{t(labelKey)}</p>
                  <p className="text-xs text-gray-400 truncate">{t(descKey)}</p>
                </div>
              </div>
              <button type="button" onClick={() => handleNotifToggle(key)}
                disabled={isPending || !userIsPremium}
                className="flex-shrink-0 w-10 h-5.5 rounded-full relative transition-colors duration-200 focus:outline-none disabled:opacity-50"
                style={{ backgroundColor: notifPrefs[key] ? "var(--primary)" : "#e5e7eb" }}>
                <span className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200"
                  style={{ transform: notifPrefs[key] ? "translateX(18px)" : "translateX(0)" }} />
              </button>
            </div>
          ))}
        </div>

        {!userIsPremium && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: "transparent" }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md border border-gray-100 text-xs font-semibold text-gray-500">
              <Lock className="w-3.5 h-3.5" />
              {t("premium_feature")}
            </div>
          </div>
        )}
      </div>

      {/* ── Subscription ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-gray-900 mb-4">{t("settings_subscription")}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`rounded-xl border-2 p-5 cursor-pointer transition ${
              user.plan === "free" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handlePlan("free")}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-900">{t("plan_free")}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">0€<span className="text-sm font-normal text-gray-500">/mois</span></p>
            <ul className="text-xs text-gray-500 space-y-1 mt-3">
              <li>• {t("plan_free_proposals", { n: FREE_LIMITS.proposals })}</li>
              <li>• {t("plan_free_blocks", { n: FREE_LIMITS.blocks })}</li>
              <li>• {t("plan_free_analytics")}</li>
              <li>• {t("plan_free_pdf")}</li>
            </ul>
          </div>
          <div
            className={`rounded-xl border-2 p-5 cursor-pointer transition ${
              user.plan === "premium" || user.plan === "pro" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handlePlan("premium")}
          >
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-gray-900">{t("plan_premium")}</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">{t("recommended")}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">29€<span className="text-sm font-normal text-gray-500">/mois</span></p>
            <ul className="text-xs text-gray-500 space-y-1 mt-3">
              <li>• {t("plan_prem_proposals")}</li>
              <li>• {t("plan_prem_blocks")}</li>
              <li>• {t("plan_prem_analytics")}</li>
              <li>• {t("plan_prem_support")}</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          {t("settings_plan_current")} : <strong className="capitalize">
            {user.plan === "pro" || user.plan === "premium" ? t("plan_premium") : t("plan_free")}
          </strong> · {t("settings_member_since")} {new Date(user.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR")}
        </p>
      </div>

      {/* ── Danger Zone ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.25)", boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="font-semibold text-red-700">{t("settings_danger")}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">{t("settings_delete_desc")}</p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)}
            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-full text-sm font-medium transition">
            {t("settings_delete_account")}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={handleDelete} disabled={isPending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-full text-sm font-medium transition">
              {t("settings_delete_confirm")}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-500 hover:text-gray-700">
              {t("cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
