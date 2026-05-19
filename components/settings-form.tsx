"use client";

import { useState, useTransition } from "react";
import { updateProfile, updatePassword, updatePlan, deleteAccount, requestPremiumUpgrade } from "@/app/actions/settings";
import { FREE_LIMITS, isPremium } from "@/lib/plan";
import { saveNotificationPrefs, type NotificationPrefs } from "@/app/actions/notifications";
import { logout } from "@/app/actions/auth";
import toast from "react-hot-toast";
import { Crown, Zap, AlertTriangle, Bell, Eye, EyeOff, MousePointer, Clock, Lock, Globe, MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import type { Lang, TranslationKey } from "@/lib/i18n";
import { ExtensionSection } from "@/components/settings/extension-section";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  plan: string;
  createdAt: Date;
  trialEndsAt?: Date | null;
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
  { key: "comment",     icon: MessageSquare, labelKey: "settings_notif_comment",   descKey: "settings_notif_comment_desc" },
];

export function SettingsForm({ user, notificationPrefs: initialPrefs, hasPendingRequest = false, trialEndsAt }: { user: User; notificationPrefs?: NotificationPrefs; hasPendingRequest?: boolean; trialEndsAt?: Date | null }) {
  const [isPending, startTransition] = useTransition();
  const { t, lang, setLang } = useLanguage();
  const userIsPremium = isPremium(user.plan);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [requestSent, setRequestSent] = useState(hasPendingRequest);
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(
    initialPrefs ?? { page_view: true, cta_click: true, time_on_page: false, comment: true }
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

  const PWD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/;
  const pwdStrong = PWD_REGEX.test(newPwd);
  const pwdMatch  = newPwd === confirmPwd;

  function handlePassword(formData: FormData) {
    if (!pwdStrong) {
      toast.error("Le mot de passe doit contenir 8 caractères min., une majuscule, un chiffre et un caractère spécial.");
      return;
    }
    if (!pwdMatch) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    startTransition(async () => {
      const result = await updatePassword(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(t("settings_password_updated"));
        setNewPwd("");
        setConfirmPwd("");
      }
    });
  }

  function handleDowngrade() {
    startTransition(async () => {
      await updatePlan("free");
      toast.success(t("plan_updated", { p: t("plan_free") }));
    });
  }

  function handleRequestPremium() {
    startTransition(async () => {
      const result = await requestPremiumUpgrade(billing);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        setRequestSent(true);
        toast.success("Demande envoyée ! L'équipe vous contactera très vite.");
      }
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

  const now = new Date();
  const isInTrial = userIsPremium && !!trialEndsAt && trialEndsAt > now && user.plan !== "admin";
  const trialDaysLeft = isInTrial ? Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const trialProgress = isInTrial ? Math.round(((15 - trialDaysLeft) / 15) * 100) : 100;

  return (
    <div className="space-y-6">

      {/* ── Profile ──────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900">{t("settings_profile")}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t("settings_profile_hint")}</p>
        </div>
        <form action={handleProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* ── Extension Chrome (visible pour tous, bloqué pour free) ─────────── */}
      <ExtensionSection isPremium={userIsPremium} />

      {/* ── Subscription ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-soft overflow-hidden" style={{ background: "var(--surface)" }}>

        {userIsPremium ? (
          /* ── Premium user: anti-churn ───────────────────────────────────── */
          <div className="p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isInTrial ? "bg-blue-100" : "bg-amber-100"}`}>
                <Crown className={`w-5 h-5 ${isInTrial ? "text-blue-500" : "text-amber-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{isInTrial ? "Période d'essai Premium" : "Vous êtes Premium"}</p>
                  {isInTrial ? (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      Essai gratuit
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Actif</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {isInTrial
                    ? `Se termine le ${trialEndsAt!.toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                    : `${t("settings_member_since")} ${new Date(user.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR")}`
                  }
                </p>
              </div>
            </div>

            {/* Trial countdown */}
            {isInTrial && (
              <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-blue-900">
                    {trialDaysLeft <= 1 ? "Dernier jour !" : `${trialDaysLeft} jours restants`}
                  </span>
                  <span className="text-xs text-blue-600 font-medium">Essai 15 jours</span>
                </div>
                <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${trialProgress}%`,
                      backgroundColor: trialDaysLeft <= 3 ? "#f59e0b" : "#3b82f6",
                    }}
                  />
                </div>
                {trialDaysLeft <= 3 && (
                  <div className="mt-3 pt-3 border-t border-amber-200 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs text-amber-700 font-medium">
                      Votre essai se termine bientôt. Conservez tous vos accès sans interruption.
                    </p>
                    {requestSent ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700">
                        <Clock className="w-3.5 h-3.5" /> Demande envoyée
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestPremium}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition disabled:opacity-60 hover:opacity-90 whitespace-nowrap"
                        style={{ backgroundColor: "#f59e0b" }}
                      >
                        <Crown className="w-3.5 h-3.5" />
                        Passer Premium
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Features grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { icon: "∞", label: "Propales", sub: "illimitées" },
                { icon: "📊", label: "Analytics", sub: "avancées" },
                { icon: "🔔", label: "Notifications", sub: "temps réel" },
                { icon: "💬", label: "Commentaires", sub: "clients" },
              ].map(f => (
                <div key={f.label} className={`rounded-xl border px-3 py-4 text-center ${isInTrial ? "bg-blue-50 border-blue-100" : "bg-amber-50 border-amber-100"}`}>
                  <p className="text-xl mb-1">{f.icon}</p>
                  <p className={`text-xs font-semibold ${isInTrial ? "text-blue-900" : "text-amber-900"}`}>{f.label}</p>
                  <p className={`text-[10px] mt-0.5 ${isInTrial ? "text-blue-600" : "text-amber-600"}`}>{f.sub}</p>
                </div>
              ))}
            </div>

            {/* Cancel subscription — danger zone at bottom */}
            <div className="pt-5 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500">Gestion de l&apos;abonnement</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {isInTrial ? "Mettre fin à la période d'essai" : "Résilier votre abonnement Premium"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDowngrade}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-300 transition disabled:opacity-50"
                >
                  <span>Résilier</span>
                </button>
              </div>
            </div>
          </div>

        ) : (
          /* ── Free user: conversion ───────────────────────────────────────── */
          <>
            {/* Header */}
            <div className="px-8 pt-8 pb-5">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Passez à Premium</h2>
                  <p className="text-sm text-gray-500 mt-1">Tout ce qu&apos;il vous faut pour closer plus vite.</p>
                </div>
                {/* Billing toggle */}
                <div className="flex-shrink-0 flex items-center gap-1 p-1 rounded-xl bg-gray-100 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setBilling("monthly")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${billing === "monthly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                  >
                    Mensuel
                  </button>
                  <button
                    type="button"
                    onClick={() => setBilling("annual")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${billing === "annual" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
                  >
                    Annuel
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">-16%</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="mx-8 mb-5 rounded-2xl border-2 p-6 relative overflow-hidden" style={{ borderColor: "var(--primary)", background: "linear-gradient(135deg, #f0f0ff 0%, #fff 60%)" }}>
              <div className="flex items-end gap-2 mb-1">
                {billing === "annual" ? (
                  <>
                    <span className="text-4xl font-extrabold text-gray-900">8,33€</span>
                    <span className="text-sm text-gray-400 mb-1">/mois</span>
                    <span className="text-xs text-gray-400 mb-1 ml-1">· facturé 100€/an</span>
                  </>
                ) : (
                  <>
                    <span className="text-4xl font-extrabold text-gray-900">9,90€</span>
                    <span className="text-sm text-gray-400 mb-1">/mois</span>
                  </>
                )}
              </div>
              {billing === "annual" && (
                <p className="text-xs font-semibold text-green-600 mt-3 mb-4">🎉 Vous économisez 18,80€ par rapport au mensuel</p>
              )}
              {billing === "monthly" && (
                <p className="text-xs text-gray-400 mt-3 mb-4">Ou <span className="font-semibold text-gray-600">100€/an</span> — économisez 18,80€</p>
              )}

              {/* Features */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-6">
                {[
                  "Propales illimitées",
                  "Commentaires clients",
                  "Analytics temps réel",
                  "Extension Chrome",
                  "Notifications push",
                  "Support prioritaire",
                ].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white" style={{ backgroundColor: "var(--primary)" }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>

              {/* CTA */}
              {requestSent ? (
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2.5 rounded-xl">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  Demande envoyée — nous revenons vers vous rapidement
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestPremium}
                  disabled={isPending}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white transition disabled:opacity-60 hover:opacity-90 active:scale-[0.98]"
                  style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 14px rgba(17,17,132,0.25)" }}
                >
                  {billing === "annual" ? "Passer Premium — 100€/an" : "Passer Premium — 9,90€/mois"}
                </button>
              )}

              {/* Trust signals */}
              {!requestSent && (
                <p className="text-center text-[11px] text-gray-400 mt-2.5">Sans engagement · Résiliable à tout moment</p>
              )}
            </div>

            {/* Free plan reminder */}
            <div className="px-8 pb-7 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Plan actuel : <strong className="text-gray-600">Free</strong> · {FREE_LIMITS.proposals} propales max
              </p>
              <button type="button" onClick={() => setBilling(b => b === "annual" ? "monthly" : "annual")} className="text-[11px] text-gray-400 hover:underline">
                {billing === "annual" ? "Voir le mensuel" : "Voir l'annuel"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Password ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-gray-900 mb-4">{t("settings_password")}</h2>
        <form action={handlePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings_current_password")}</label>
            <div className="relative">
              <input name="currentPassword" type={showCurrentPwd ? "text" : "password"} required
                className="w-full px-3.5 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
              />
              <button type="button" onClick={() => setShowCurrentPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("settings_new_password")}</label>
            <div className="relative">
              <input
                name="newPassword" type={showNewPwd ? "text" : "password"} required
                value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 focus:bg-white transition ${
                  newPwd && !pwdStrong ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-primary-400"
                }`}
              />
              <button type="button" onClick={() => setShowNewPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPwd && !pwdStrong && (
              <p className="text-xs text-red-500 mt-1">
                8 caractères min., une majuscule, un chiffre et un caractère spécial requis
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le nouveau mot de passe</label>
            <div className="relative">
              <input
                name="confirmPassword" type={showConfirmPwd ? "text" : "password"} required
                value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 focus:bg-white transition ${
                  confirmPwd && !pwdMatch ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-primary-400"
                }`}
              />
              <button type="button" onClick={() => setShowConfirmPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPwd && !pwdMatch && (
              <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>
          <button type="submit" disabled={isPending || (!!newPwd && (!pwdStrong || !pwdMatch))}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-full text-sm font-medium transition">
            {t("settings_update_password")}
          </button>
        </form>
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
