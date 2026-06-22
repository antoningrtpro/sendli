"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { saveBrandKit } from "@/app/actions/brand-kit";
import { createBanner, saveBanner } from "@/app/actions/banners";
import { saveNotificationPrefs } from "@/app/actions/notifications";
import { saveIntegration } from "@/app/actions/integrations";
import { updateLanguage } from "@/app/actions/settings";
import { completeOnboarding } from "@/app/actions/onboarding";
import { uploadImage } from "@/app/actions/upload";
import type { NotificationPrefs } from "@/app/actions/notifications";
import type { IntegrationKey } from "@/app/actions/integrations";
import type { Lang } from "@/lib/i18n";

// ─── Onboarding translations ───────────────────────────────────────────────────

const OB = {
  fr: {
    step_titles: [
      "Choisissez votre langue",
      "Votre identité visuelle",
      "Créez votre première bannière",
      "Vos préférences de notifications",
      "Intégrations",
    ],
    optional: "optionnel",
    back: "Retour",
    cancel: "Annuler",
    next: "Suivant →",
    skip: "Passer",
    finish: "Terminer",
    loading: "Chargement…",
    // Step 2
    logo_label: "Logo",
    logo_import: "Importer",
    logo_url_ph: "https://exemple.com/logo.png",
    logo_hint: "Importez un fichier ou collez une URL",
    color_label: "Couleur principale",
    font_label: "Police de caractères",
    preview_label: "Aperçu",
    preview_company: "Votre Entreprise",
    preview_proposal: "Proposition commerciale",
    preview_cta: "Voir l'offre →",
    // Step 3
    banner_img_label: "Image de bannière",
    banner_img_remove: "Supprimer",
    banner_img_import: "Importer une image",
    banner_img_replace: "Remplacer l'image",
    banner_img_uploading: "Upload en cours…",
    banner_img_hint: "Importez une image pour l'utiliser comme bannière — les champs manuels disparaissent",
    banner_title_label: "Titre",
    banner_title_ph: "Ex: Notre offre pour vous",
    banner_subtitle_label: "Sous-titre",
    banner_subtitle_ph: "Ex: Propale personnalisée",
    banner_bg_color: "Couleur de fond",
    banner_text_color: "Couleur du texte",
    banner_logo_label: "URL du logo (optionnel)",
    banner_title_preview: "Titre de la bannière",
    banner_subtitle_preview: "Sous-titre…",
    // Step 4
    notif_page_view: "Ouverture de propale",
    notif_page_view_desc: "Soyez notifié quand un prospect ouvre votre propale",
    notif_cta: "Clic sur un bouton",
    notif_cta_desc: "Soyez notifié quand un prospect clique sur un CTA",
    notif_time: "Temps passé",
    notif_time_desc: "Soyez notifié quand un prospect passe plus de 2 min sur votre propale",
    // Step 5
    intg_gcal_desc: "Intégrez votre calendrier de prise de rendez-vous directement dans vos propales.",
    intg_hubspot_desc: "Intégrez votre page de réunion HubSpot directement dans vos propales.",
    intg_connected: "Connecté",
    intg_embed_ph: "Collez ici votre code embed…",
    intg_save: "Enregistrer",
    intg_saving: "Enregistrement…",
    // Final
    final_title: "Bienvenue sur Sendli !",
    final_subtitle: "Votre compte a été activé avec une période d'essai de",
    final_trial: "15 jours Premium",
    final_b1: "Propales illimitées",
    final_b2: "Blocs illimités",
    final_b3: "Analytics avancés",
    final_b4: "Notifications en temps réel",
    final_cta_proposal: "Créer ma première propale →",
    final_cta_dashboard: "Accéder au dashboard",
  },
  en: {
    step_titles: [
      "Choose your language",
      "Your brand identity",
      "Create your first banner",
      "Notification preferences",
      "Integrations",
    ],
    optional: "optional",
    back: "Back",
    cancel: "Cancel",
    next: "Next →",
    skip: "Skip",
    finish: "Finish",
    loading: "Loading…",
    // Step 2
    logo_label: "Logo",
    logo_import: "Upload",
    logo_url_ph: "https://example.com/logo.png",
    logo_hint: "Upload a file or paste a URL",
    color_label: "Primary color",
    font_label: "Font",
    preview_label: "Preview",
    preview_company: "Your Company",
    preview_proposal: "Business proposal",
    preview_cta: "View offer →",
    // Step 3
    banner_img_label: "Banner image",
    banner_img_remove: "Remove",
    banner_img_import: "Upload an image",
    banner_img_replace: "Replace image",
    banner_img_uploading: "Uploading…",
    banner_img_hint: "Upload an image to use it as a banner — manual fields will be hidden",
    banner_title_label: "Title",
    banner_title_ph: "E.g. Our offer for you",
    banner_subtitle_label: "Subtitle",
    banner_subtitle_ph: "E.g. Personalised proposal",
    banner_bg_color: "Background color",
    banner_text_color: "Text color",
    banner_logo_label: "Logo URL (optional)",
    banner_title_preview: "Banner title",
    banner_subtitle_preview: "Subtitle…",
    // Step 4
    notif_page_view: "Proposal opened",
    notif_page_view_desc: "Get notified when a prospect opens your proposal",
    notif_cta: "Button click",
    notif_cta_desc: "Get notified when a prospect clicks a CTA",
    notif_time: "Time spent",
    notif_time_desc: "Get notified when a prospect spends more than 2 min on your proposal",
    // Step 5
    intg_gcal_desc: "Embed your appointment calendar directly in your proposals.",
    intg_hubspot_desc: "Embed your HubSpot meeting page directly in your proposals.",
    intg_connected: "Connected",
    intg_embed_ph: "Paste your embed code here…",
    intg_save: "Save",
    intg_saving: "Saving…",
    // Final
    final_title: "Welcome to Sendli!",
    final_subtitle: "Your account has been activated with a trial period of",
    final_trial: "15 days Premium",
    final_b1: "Unlimited proposals",
    final_b2: "Unlimited blocks",
    final_b3: "Advanced analytics",
    final_b4: "Real-time notifications",
    final_cta_proposal: "Create my first proposal →",
    final_cta_dashboard: "Go to dashboard",
  },
} as const;

type OBLang = keyof typeof OB;
type OBDict = (typeof OB)[OBLang];

const GOOGLE_FONTS = [
  "Inter",
  "Poppins",
  "Playfair Display",
  "Roboto",
  "Lato",
  "Montserrat",
  "Open Sans",
  "Raleway",
  "Nunito",
  "DM Sans",
];

const TOTAL_STEPS = 5;

// ─── Sub-components ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && onChange(!checked)}
      style={{
        position: "relative",
        display: "inline-block",
        width: 48,
        height: 26,
        flexShrink: 0,
        borderRadius: 13,
        background: checked ? "var(--primary)" : "#d1d5db",
        cursor: "pointer",
        transition: "background 0.2s",
        outline: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 25 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          transition: "left 0.2s",
        }}
      />
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-muted, #6b7280)" }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 44,
            height: 44,
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            padding: 2,
            background: "none",
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1.5px solid #e5e7eb",
            background: "#f9fafb",
            fontSize: 14,
            fontFamily: "monospace",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 12,
    border: "1.5px solid #e5e7eb",
    background: "#f9fafb",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    color: "var(--text, #1f2937)",
  };
}

// ─── Steps ─────────────────────────────────────────────────────────────────────

function Step1Lang({
  onSelect,
}: {
  onSelect: (lang: Lang) => void;
}) {
  const [selected, setSelected] = useState<Lang | null>(null);

  function handleSelect(lang: Lang) {
    setSelected(lang);
    onSelect(lang);
  }

  return (
    <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
      {(["fr", "en"] as Lang[]).map((lang) => {
        const isSelected = selected === lang;
        return (
          <button
            key={lang}
            onClick={() => handleSelect(lang)}
            style={{
              flex: 1,
              maxWidth: 240,
              padding: "32px 24px",
              borderRadius: 20,
              border: `2.5px solid ${isSelected ? "var(--primary)" : "#e5e7eb"}`,
              background: isSelected ? "var(--primary, #6366f1)08" : "var(--surface, #fff)",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.18s",
              position: "relative",
              boxShadow: isSelected ? "0 0 0 4px var(--primary, #6366f1)18" : "var(--shadow-soft, 0 2px 8px rgba(0,0,0,0.07))",
            }}
          >
            {isSelected && (
              <span
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                ✓
              </span>
            )}
            <div style={{ fontSize: 40, marginBottom: 12 }}>
              {lang === "fr" ? "🇫🇷" : "🇬🇧"}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: isSelected ? "var(--primary)" : "var(--text, #1f2937)" }}>
              {lang === "fr" ? "Français" : "English"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Step2Brand({
  data,
  onChange,
  d,
}: {
  data: { logoUrl: string; primaryColor: string; fontFamily: string };
  onChange: (data: { logoUrl: string; primaryColor: string; fontFamily: string }) => void;
  d: OBDict;
}) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  async function handleLogoFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setLogoUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadImage(dataUrl, "logos", `logo_${Date.now()}`);
      if ("url" in result) {
        onChange({ ...data, logoUrl: result.url });
      }
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Logo */}
      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-muted, #6b7280)" }}>
          Logo
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {/* Upload zone */}
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={logoUploading}
            style={{
              flexShrink: 0,
              width: 72,
              height: 72,
              borderRadius: 14,
              border: "2px dashed #d1d5db",
              background: "#f9fafb",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: logoUploading ? "wait" : "pointer",
              gap: 4,
              transition: "border-color 0.18s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = data.primaryColor; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d1d5db"; }}
          >
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.logoUrl}
                alt="Logo"
                style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 8 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : logoUploading ? (
              <span style={{ fontSize: 11, color: "#9ca3af", textAlign: "center" }}>Upload…</span>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{d.logo_import}</span>
              </>
            )}
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
          />
          {/* URL input */}
          <div style={{ flex: 1 }}>
            <input
              type="text"
              placeholder={d.logo_url_ph}
              value={data.logoUrl}
              onChange={(e) => onChange({ ...data, logoUrl: e.target.value })}
              style={inputStyle()}
            />
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{d.logo_hint}</p>
          </div>
        </div>
      </div>

      <ColorInput
        label={d.color_label}
        value={data.primaryColor}
        onChange={(v) => onChange({ ...data, primaryColor: v })}
      />

      <div>
        <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-muted, #6b7280)" }}>
          {d.font_label}
        </label>
        <select
          value={data.fontFamily}
          onChange={(e) => onChange({ ...data, fontFamily: e.target.value })}
          style={{
            ...inputStyle(),
            appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%236b7280' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 14px center",
            paddingRight: 36,
            cursor: "pointer",
          }}
        >
          {GOOGLE_FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      {/* Live preview */}
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted, #6b7280)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {d.preview_label}
        </p>
        <div
          style={{
            borderRadius: 16,
            border: "1.5px solid #f1f3f5",
            overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
            fontFamily: data.fontFamily + ", sans-serif",
          }}
        >
          {/* Mock proposal header */}
          <div style={{ padding: "16px 20px", background: data.primaryColor, display: "flex", alignItems: "center", gap: 12 }}>
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt="" style={{ height: 28, maxWidth: 80, objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </div>
            )}
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, fontFamily: "inherit" }}>{d.preview_company}</span>
          </div>
          {/* Mock content */}
          <div style={{ padding: "16px 20px", background: "#fff" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1f2937", marginBottom: 6, fontFamily: "inherit" }}>
              {d.preview_proposal}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ height: 8, borderRadius: 4, background: "#f1f3f5", flex: 2 }} />
              <div style={{ height: 8, borderRadius: 4, background: "#f1f3f5", flex: 3 }} />
              <div style={{ height: 8, borderRadius: 4, background: "#f1f3f5", flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ height: 8, borderRadius: 4, background: "#f1f3f5", flex: 3 }} />
              <div style={{ height: 8, borderRadius: 4, background: "#f1f3f5", flex: 2 }} />
            </div>
            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                style={{
                  padding: "8px 18px",
                  borderRadius: 8,
                  background: data.primaryColor,
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "default",
                  fontFamily: "inherit",
                }}
              >
                {d.preview_cta}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3Banner({
  data,
  onChange,
  d,
}: {
  data: { title: string; subtitle: string; bgColor: string; textColor: string; logoUrl: string; bgImageUrl?: string };
  onChange: (data: { title: string; subtitle: string; bgColor: string; textColor: string; logoUrl: string; bgImageUrl?: string }) => void;
  d: OBDict;
}) {
  const bgImageRef = useRef<HTMLInputElement>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const imageMode = !!data.bgImageUrl;

  async function handleBgFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setBgUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadImage(dataUrl, "banners", `banner_${Date.now()}`);
      if ("url" in result) {
        onChange({ ...data, bgImageUrl: result.url });
      }
    } finally {
      setBgUploading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Preview */}
      <div
        style={{
          borderRadius: 14,
          minHeight: 80,
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
          position: "relative",
        }}
      >
        {imageMode ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.bgImageUrl}
            alt="Bannière"
            style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              padding: "20px 24px",
              background: data.bgColor,
              color: data.textColor,
              minHeight: 80,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {data.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.logoUrl}
                alt=""
                style={{ height: 32, maxWidth: 80, objectFit: "contain" }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{data.title || d.banner_title_preview}</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>{data.subtitle || d.banner_subtitle_preview}</div>
            </div>
          </div>
        )}
      </div>

      {/* Image upload zone */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted, #6b7280)" }}>
            {d.banner_img_label}
          </label>
          {imageMode && (
            <button
              type="button"
              onClick={() => onChange({ ...data, bgImageUrl: undefined })}
              style={{
                fontSize: 12,
                color: "#ef4444",
                background: "#fef2f2",
                border: "none",
                borderRadius: 8,
                padding: "3px 10px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {d.banner_img_remove}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => bgImageRef.current?.click()}
          disabled={bgUploading}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: 12,
            border: `2px dashed ${imageMode ? "var(--primary, #6366f1)" : "#d1d5db"}`,
            background: imageMode ? "var(--primary, #6366f1)08" : "#f9fafb",
            cursor: bgUploading ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            color: imageMode ? "var(--primary, #6366f1)" : "#6b7280",
            fontSize: 13,
            fontWeight: 600,
            transition: "all 0.18s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          {bgUploading ? d.banner_img_uploading : imageMode ? d.banner_img_replace : d.banner_img_import}
        </button>
        <input
          ref={bgImageRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBgFile(f); }}
        />
        {!imageMode && (
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 5 }}>
            {d.banner_img_hint}
          </p>
        )}
      </div>

      {/* Manual fields — hidden when image uploaded */}
      {!imageMode && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-muted, #6b7280)" }}>
                {d.banner_title_label}
              </label>
              <input
                type="text"
                placeholder={d.banner_title_ph}
                value={data.title}
                onChange={(e) => onChange({ ...data, title: e.target.value })}
                style={inputStyle()}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-muted, #6b7280)" }}>
                {d.banner_subtitle_label}
              </label>
              <input
                type="text"
                placeholder={d.banner_subtitle_ph}
                value={data.subtitle}
                onChange={(e) => onChange({ ...data, subtitle: e.target.value })}
                style={inputStyle()}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <ColorInput
              label={d.banner_bg_color}
              value={data.bgColor}
              onChange={(v) => onChange({ ...data, bgColor: v })}
            />
            <ColorInput
              label={d.banner_text_color}
              value={data.textColor}
              onChange={(v) => onChange({ ...data, textColor: v })}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 6, color: "var(--text-muted, #6b7280)" }}>
              {d.banner_logo_label}
            </label>
            <input
              type="text"
              placeholder={d.logo_url_ph}
              value={data.logoUrl}
              onChange={(e) => onChange({ ...data, logoUrl: e.target.value })}
              style={inputStyle()}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Step4Notifications({
  prefs,
  onChange,
  d,
}: {
  prefs: NotificationPrefs;
  onChange: (p: NotificationPrefs) => void;
  d: OBDict;
}) {
  const rows: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
    {
      key: "page_view",
      label: d.notif_page_view,
      desc: d.notif_page_view_desc,
    },
    {
      key: "cta_click",
      label: d.notif_cta,
      desc: d.notif_cta_desc,
    },
    {
      key: "time_on_page",
      label: d.notif_time,
      desc: d.notif_time_desc,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {rows.map((row, i) => (
        <div
          key={row.key}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 20px",
            borderRadius: 14,
            background: "var(--surface, #fff)",
            boxShadow: "var(--shadow-soft, 0 2px 8px rgba(0,0,0,0.07))",
            border: "1.5px solid #f1f3f5",
            marginBottom: i < rows.length - 1 ? 10 : 0,
          }}
        >
          <div style={{ flex: 1, paddingRight: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text, #1f2937)", marginBottom: 2 }}>
              {row.label}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted, #6b7280)" }}>
              {row.desc}
            </div>
          </div>
          <Toggle
            checked={prefs[row.key]}
            onChange={(v) => onChange({ ...prefs, [row.key]: v })}
          />
        </div>
      ))}
    </div>
  );
}

function Step5Integrations({ d }: { d: OBDict }) {
  const [expandedKey, setExpandedKey] = useState<IntegrationKey | null>(null);
  const [embedInputs, setEmbedInputs] = useState<Partial<Record<IntegrationKey, string>>>({});
  const [saved, setSaved] = useState<Partial<Record<IntegrationKey, boolean>>>({});
  const [saving, setSaving] = useState<IntegrationKey | null>(null);

  const integrations: { key: IntegrationKey; label: string; desc: string; logo: React.ReactNode }[] = [
    {
      key: "google_calendar",
      label: "Google Calendar",
      desc: d.intg_gcal_desc,
      logo: (
        <svg viewBox="0 0 48 48" style={{ width: 40, height: 40 }} fill="none">
          <rect x="6" y="6" width="36" height="36" rx="4" fill="#fff" stroke="#e0e0e0" />
          <rect x="6" y="6" width="36" height="12" rx="4" fill="#4285F4" />
          <circle cx="16" cy="8" r="2" fill="#fff" />
          <circle cx="32" cy="8" r="2" fill="#fff" />
          <text x="24" y="34" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#4285F4">31</text>
        </svg>
      ),
    },
    {
      key: "hubspot",
      label: "HubSpot",
      desc: d.intg_hubspot_desc,
      logo: (
        <svg viewBox="0 0 48 48" style={{ width: 40, height: 40 }} fill="none">
          <circle cx="24" cy="24" r="22" fill="#FF7A59" />
          <path d="M28 18.5a4 4 0 0 0-4-4v-4.5h-4V14.5a4 4 0 0 0-4 4v1a4 4 0 0 0 2.5 3.72v4.78h3v-4.78A4 4 0 0 0 24 19.5h4v-1zm-8 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" fill="white" />
          <circle cx="30" cy="30" r="5" fill="white" />
          <circle cx="30" cy="30" r="3" fill="#FF7A59" />
        </svg>
      ),
    },
  ];

  async function handleSave(key: IntegrationKey) {
    const code = (embedInputs[key] ?? "").trim();
    if (!code) return;
    setSaving(key);
    await saveIntegration(key, code);
    setSaved((prev) => ({ ...prev, [key]: true }));
    setSaving(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {integrations.map((intg) => {
        const isExpanded = expandedKey === intg.key;
        const isSaved = saved[intg.key];
        return (
          <div
            key={intg.key}
            style={{
              borderRadius: 16,
              border: `1.5px solid ${isExpanded ? "var(--primary, #6366f1)" : "#e5e7eb"}`,
              background: "var(--surface, #fff)",
              overflow: "hidden",
              boxShadow: "var(--shadow-soft, 0 2px 8px rgba(0,0,0,0.07))",
              transition: "border-color 0.18s",
            }}
          >
            <button
              onClick={() => setExpandedKey(isExpanded ? null : intg.key)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 20px",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {intg.logo}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: "var(--text, #1f2937)" }}>{intg.label}</span>
                  {isSaved && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#10b981",
                      background: "#d1fae5",
                      padding: "2px 8px",
                      borderRadius: 999,
                    }}>
                      {d.intg_connected}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted, #6b7280)", marginTop: 2 }}>{intg.desc}</div>
              </div>
              <span style={{ fontSize: 18, color: "#9ca3af", transition: "transform 0.18s", transform: isExpanded ? "rotate(180deg)" : "none" }}>
                ›
              </span>
            </button>

            {isExpanded && (
              <div style={{ padding: "0 20px 16px" }}>
                <textarea
                  value={embedInputs[intg.key] ?? ""}
                  onChange={(e) => setEmbedInputs((prev) => ({ ...prev, [intg.key]: e.target.value }))}
                  placeholder={d.intg_embed_ph}
                  rows={4}
                  style={{
                    ...inputStyle(),
                    resize: "vertical",
                    fontFamily: "monospace",
                    fontSize: 13,
                  }}
                />
                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => handleSave(intg.key)}
                    disabled={saving === intg.key || !(embedInputs[intg.key] ?? "").trim()}
                    style={{
                      padding: "10px 20px",
                      borderRadius: 10,
                      background: "var(--primary, #6366f1)",
                      color: "#fff",
                      border: "none",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: saving === intg.key ? "wait" : "pointer",
                      opacity: !(embedInputs[intg.key] ?? "").trim() ? 0.5 : 1,
                    }}
                  >
                    {saving === intg.key ? d.intg_saving : d.intg_save}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FinalPage({ onDone, d }: { onDone: () => void; d: OBDict }) {
  const router = useRouter();

  const benefits = [d.final_b1, d.final_b2, d.final_b3, d.final_b4];

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 26, fontWeight: 800, color: "var(--text, #1f2937)", marginBottom: 10 }}>
        {d.final_title}
      </h2>
      <p style={{ fontSize: 15, color: "var(--text-muted, #6b7280)", marginBottom: 24, lineHeight: 1.6 }}>
        {d.final_subtitle}{" "}
        <strong style={{ color: "var(--primary, #6366f1)" }}>{d.final_trial}</strong>
      </p>

      <div
        style={{
          background: "linear-gradient(135deg, var(--primary, #6366f1)0a, var(--primary, #6366f1)18)",
          border: "1.5px solid var(--primary, #6366f1)30",
          borderRadius: 16,
          padding: "20px 24px",
          marginBottom: 28,
          textAlign: "left",
        }}
      >
        {benefits.map((b) => (
          <div key={b} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "var(--primary, #6366f1)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text, #1f2937)" }}>{b}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button
          onClick={() => {
            onDone();
            router.push("/proposals");
          }}
          style={{
            flex: 1,
            maxWidth: 240,
            padding: "14px 20px",
            borderRadius: 12,
            background: "var(--primary, #6366f1)",
            color: "#fff",
            border: "none",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 4px 16px var(--primary, #6366f1)40",
          }}
        >
          {d.final_cta_proposal}
        </button>
        <button
          onClick={() => {
            onDone();
            router.push("/dashboard");
          }}
          style={{
            flex: 1,
            maxWidth: 200,
            padding: "14px 20px",
            borderRadius: 12,
            background: "var(--surface, #fff)",
            color: "var(--text, #1f2937)",
            border: "1.5px solid #e5e7eb",
            fontWeight: 600,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          {d.final_cta_dashboard}
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export function OnboardingModal({ onComplete }: { onComplete: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); // 1-5 = steps, 6 = final
  const [showFinal, setShowFinal] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Step 1 — Lang
  const [langSelected, setLangSelected] = useState<Lang | null>(null);

  // Active dictionary — defaults to French, switches as soon as user picks English
  const d: OBDict = OB[(langSelected ?? "fr") as OBLang];

  // Step 2 — Brand Kit
  const [brandData, setBrandData] = useState({
    logoUrl: "",
    primaryColor: "#6366f1",
    fontFamily: "Inter",
  });

  // Step 3 — Banner
  const [bannerData, setBannerData] = useState<{
    title: string;
    subtitle: string;
    bgColor: string;
    textColor: string;
    logoUrl: string;
    bgImageUrl?: string;
  }>({
    title: "",
    subtitle: "",
    bgColor: "#111184",
    textColor: "#ffffff",
    logoUrl: "",
  });

  // Step 4 — Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    page_view: true,
    cta_click: true,
    time_on_page: false,
    comment: true,
    feedback_received: true,
  });

  async function handleNext() {
    if (step === 1) {
      if (!langSelected) return;
      setStep(2);
    } else if (step === 2) {
      startTransition(async () => {
        const fd = new FormData();
        fd.append("primaryColor", brandData.primaryColor);
        fd.append("secondaryColor", brandData.primaryColor);
        fd.append("fontFamily", brandData.fontFamily);
        fd.append("bgColor", "#ffffff");
        fd.append("textColor", "#1f2937");
        fd.append("logoUrl", brandData.logoUrl);
        await saveBrandKit(fd);
        setStep(3);
      });
    } else if (step === 3) {
      startTransition(async () => {
        const { id } = await createBanner();
        const isImageOnly = !!bannerData.bgImageUrl;
        await saveBanner(id, {
          name: bannerData.title || "Ma bannière",
          title: isImageOnly ? "" : bannerData.title,
          subtitle: isImageOnly ? "" : bannerData.subtitle,
          bgColor: bannerData.bgColor,
          textColor: bannerData.textColor,
          logoUrl: bannerData.logoUrl || null,
          bgImageUrl: bannerData.bgImageUrl || null,
          imageOnly: isImageOnly,
        });
        setStep(4);
      });
    } else if (step === 4) {
      startTransition(async () => {
        await saveNotificationPrefs(notifPrefs);
        setStep(5);
      });
    } else if (step === 5) {
      startTransition(async () => {
        await completeOnboarding();
        setShowFinal(true);
      });
    }
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  const progress = showFinal ? 100 : ((step - 1) / TOTAL_STEPS) * 100;

  const content = (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99990,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          position: "fixed",
          zIndex: 99991,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(680px, calc(100vw - 32px))",
          maxHeight: "calc(100vh - 48px)",
          overflowY: "auto",
          background: "var(--surface, #fff)",
          borderRadius: 24,
          boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
        }}
      >
        {/* Header */}
        {!showFinal && (
          <div style={{ padding: "28px 32px 0" }}>
            {/* Step dots */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i + 1 === step ? 24 : 8,
                    height: 8,
                    borderRadius: 999,
                    background: i + 1 <= step ? "var(--primary, #6366f1)" : "#e5e7eb",
                    transition: "all 0.2s",
                  }}
                />
              ))}
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: "var(--primary, #6366f1)" }}>
                {step}/{TOTAL_STEPS}
              </span>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--text, #1f2937)", margin: 0, marginBottom: 4 }}>
              {d.step_titles[step - 1]}
              {step === 5 && (
                <span style={{
                  marginLeft: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#6b7280",
                  background: "#f3f4f6",
                  padding: "3px 10px",
                  borderRadius: 999,
                  verticalAlign: "middle",
                }}>
                  {d.optional}
                </span>
              )}
            </h2>

            {/* Progress bar */}
            <div
              style={{
                height: 3,
                background: "#f1f3f5",
                borderRadius: 999,
                marginTop: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progress}%`,
                  background: "var(--primary, #6366f1)",
                  borderRadius: 999,
                  transition: "width 0.35s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ padding: showFinal ? "40px 40px 32px" : "28px 32px" }}>
          {showFinal ? (
            <FinalPage onDone={onComplete} d={d} />
          ) : step === 1 ? (
            <Step1Lang
              onSelect={(lang) => {
                setLangSelected(lang);
                startTransition(async () => {
                  await updateLanguage(lang);
                  // slight delay so user sees the selection, then auto-advance
                  await new Promise((r) => setTimeout(r, 350));
                  setStep(2);
                });
              }}
            />
          ) : step === 2 ? (
            <Step2Brand data={brandData} onChange={setBrandData} d={d} />
          ) : step === 3 ? (
            <Step3Banner data={bannerData} onChange={setBannerData} d={d} />
          ) : step === 4 ? (
            <Step4Notifications prefs={notifPrefs} onChange={setNotifPrefs} d={d} />
          ) : (
            <Step5Integrations d={d} />
          )}
        </div>

        {/* Footer */}
        {!showFinal && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 32px 28px",
              gap: 12,
            }}
          >
            <button
              onClick={handleBack}
              disabled={step === 1}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "1.5px solid #e5e7eb",
                background: "transparent",
                color: step === 1 ? "#d1d5db" : "var(--text, #1f2937)",
                fontWeight: 600,
                fontSize: 14,
                cursor: step === 1 ? "not-allowed" : "pointer",
                transition: "opacity 0.15s",
              }}
            >
              {step === 1 ? d.cancel : d.back}
            </button>

            {step === 5 ? (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={handleNext}
                  disabled={isPending}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: "1.5px solid #e5e7eb",
                    background: "transparent",
                    color: "var(--text-muted, #6b7280)",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: isPending ? "wait" : "pointer",
                  }}
                >
                  {d.skip}
                </button>
                <button
                  onClick={handleNext}
                  disabled={isPending}
                  style={{
                    padding: "12px 24px",
                    borderRadius: 12,
                    background: "var(--primary, #6366f1)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: isPending ? "wait" : "pointer",
                    boxShadow: "0 4px 14px var(--primary, #6366f1)40",
                  }}
                >
                  {isPending ? d.loading : d.next}
                </button>
              </div>
            ) : (
              <button
                onClick={handleNext}
                disabled={isPending || (step === 1 && !langSelected)}
                style={{
                  padding: "12px 28px",
                  borderRadius: 12,
                  background: step === 1 && !langSelected ? "#d1d5db" : "var(--primary, #6366f1)",
                  color: "#fff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: isPending || (step === 1 && !langSelected) ? "not-allowed" : "pointer",
                  boxShadow: step === 1 && !langSelected ? "none" : "0 4px 14px var(--primary, #6366f1)40",
                  transition: "all 0.2s",
                }}
              >
                {isPending ? d.loading : step === TOTAL_STEPS ? d.finish : d.next}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
