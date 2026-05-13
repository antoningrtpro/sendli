"use client";

import { useState, useTransition, useRef } from "react";
import { saveBrandKit, saveBrandKitLogoUrl } from "@/app/actions/brand-kit";
import { uploadImage } from "@/app/actions/upload";
import toast from "react-hot-toast";
import { Upload, X, Loader2, Pencil } from "lucide-react";
interface BrandKit { id?: string; userId?: string; primaryColor: string; secondaryColor: string; fontFamily: string; bgColor: string; textColor: string; logoUrl?: string | null; }

const PREVIEW_TEXT = "The quick brown fox jumps over the lazy dog";

interface BrandKitFormProps {
  brandKit: BrandKit | null;
  fonts: string[];
}

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect very light colors to show checkerboard so the swatch is visible
  const isLight = (() => {
    try {
      const r = parseInt(value.slice(1, 3), 16);
      const g = parseInt(value.slice(3, 5), 16);
      const b = parseInt(value.slice(5, 7), 16);
      return (r * 299 + g * 587 + b * 114) / 1000 > 230;
    } catch { return false; }
  })();

  return (
    <div className="group">
      {/* Swatch — click triggers the hidden color input via ref */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-full h-20 rounded-xl cursor-pointer border-2 transition-all shadow-sm overflow-hidden border-transparent group-hover:border-gray-300 group-hover:shadow-md"
        style={{
          backgroundColor: value,
          backgroundImage: isLight
            ? "linear-gradient(45deg,#d1d5db 25%,transparent 25%),linear-gradient(-45deg,#d1d5db 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d1d5db 75%),linear-gradient(-45deg,transparent 75%,#d1d5db 75%)"
            : undefined,
          backgroundSize: "10px 10px",
          backgroundPosition: "0 0,0 5px,5px -5px,-5px 0",
        }}
      >
        {/* Hidden native color picker */}
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
        {/* Hover badge — pointer-events-none so clicks pass through to button */}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm">
            <Pencil className="w-3 h-3" /> Modifier
          </span>
        </span>
      </button>

      {/* Label + hex */}
      <div className="mt-2 flex items-center justify-between px-0.5 gap-2">
        <span className="text-xs font-medium text-gray-500 shrink-0">{label}</span>
        <input
          type="text"
          value={value}
          onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
          className="w-[72px] text-right text-xs font-mono text-gray-500 bg-transparent border-0 focus:outline-none focus:bg-gray-100 rounded px-1 transition"
          maxLength={7}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export function BrandKitForm({ brandKit, fonts }: BrandKitFormProps) {
  const [isPending, startTransition] = useTransition();
  const [logoUploading, setLogoUploading] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  // Track whether the current logo URL was set via file upload (hide URL input in that case)
  const [logoFromUpload, setLogoFromUpload] = useState(
    !!(brandKit?.logoUrl && brandKit.logoUrl.includes("firebasestorage.googleapis.com"))
  );
  const [values, setValues] = useState({
    primaryColor: brandKit?.primaryColor ?? "#6366f1",
    secondaryColor: brandKit?.secondaryColor ?? "#8b5cf6",
    fontFamily: brandKit?.fontFamily ?? "Inter",
    bgColor: brandKit?.bgColor ?? "#ffffff",
    textColor: brandKit?.textColor ?? "#1f2937",
    logoUrl: brandKit?.logoUrl ?? "",
  });

  function set(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleLogoFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Image requise"); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const MAX = 400;
        const scale = img.width > MAX ? MAX / img.width : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        setLogoUploading(true);
        const result = await uploadImage(dataUrl, "logos", `brandkit_logo_${Date.now()}`);
        setLogoUploading(false);
        if ("error" in result) { toast.error("Upload échoué : " + result.error); return; }
        set("logoUrl", result.url);
        setLogoFromUpload(true);
        // Auto-save so the logo persists on page reload
        await saveBrandKitLogoUrl(result.url);
        toast.success("Logo sauvegardé !");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(formData: FormData) {
    // Inject current values (color inputs may not serialize properly in all browsers)
    Object.entries(values).forEach(([k, v]) => formData.set(k, v));
    startTransition(async () => {
      await saveBrandKit(formData);
      toast.success("Brand kit saved!");
    });
  }

  // Load the selected font from Google Fonts in the preview
  const googleFontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(values.fontFamily)}:wght@400;600;700&display=swap`;

  return (
    <form action={handleSubmit} className="space-y-8">
      {/* Google Font loader for preview */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={googleFontUrl} />

      {/* Logo */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-gray-900 mb-4">Logo</h2>

        {/* Drop zone */}
        <div
          className="relative border-2 border-dashed border-gray-200 rounded-xl h-28 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-400 transition group"
          onClick={() => !logoUploading && logoFileRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleLogoFile(f); }}
          onDragOver={e => e.preventDefault()}
        >
          {logoUploading ? (
            <><Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              <span className="text-sm text-gray-500">Upload en cours…</span></>
          ) : values.logoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={values.logoUrl} alt="Logo" className="h-14 object-contain" />
              <span className="text-xs text-gray-400">Cliquer pour remplacer</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-primary-500" />
              <span className="text-sm text-gray-600">Glisser-déposer ou <span className="font-medium text-primary-600">parcourir</span></span>
              <span className="text-xs text-gray-400">PNG, SVG, WEBP recommandé</span>
            </>
          )}
        </div>
        <input ref={logoFileRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); e.target.value = ""; }} />

        {/* URL input — only shown when logo was NOT uploaded via file */}
        {!logoFromUpload && (
          <div className="mt-3 flex gap-2 items-center">
            <input
              type="url"
              value={values.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="Ou coller une URL publique…"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
            />
            {values.logoUrl && (
              <button type="button" onClick={() => { set("logoUrl", ""); setLogoFromUpload(false); }}
                className="p-2 text-red-400 hover:text-red-600 transition" title="Supprimer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* If uploaded via file, show a "remove" button to allow switching back to URL input */}
        {logoFromUpload && values.logoUrl && (
          <div className="mt-3 flex items-center justify-end">
            <button
              type="button"
              onClick={() => { set("logoUrl", ""); setLogoFromUpload(false); }}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <X className="w-3.5 h-3.5" /> Supprimer le logo
            </button>
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-gray-900 mb-1">Couleurs</h2>
        <p className="text-xs text-gray-400 mb-5">Cliquez sur une couleur pour la modifier</p>

        <div className="grid grid-cols-2 gap-3">
          {([
            { key: "primaryColor",   label: "Principale" },
            { key: "secondaryColor", label: "Secondaire" },
            { key: "bgColor",        label: "Fond" },
            { key: "textColor",      label: "Texte" },
          ] as { key: keyof typeof values; label: string }[]).map(({ key, label }) => (
            <ColorSwatch
              key={key}
              label={label}
              value={values[key]}
              onChange={v => set(key, v)}
            />
          ))}
        </div>
      </div>

      {/* Font */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-gray-900 mb-4">Typography</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Font Family</label>
          <select
            value={values.fontFamily}
            onChange={(e) => set("fontFamily", e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
          >
            {fonts.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        {/* Font preview */}
        <div
          className="mt-4 p-5 rounded-lg border border-gray-100"
          style={{
            fontFamily: `'${values.fontFamily}', sans-serif`,
            backgroundColor: values.bgColor,
            color: values.textColor,
          }}
        >
          <p className="text-lg font-semibold mb-1">Heading example</p>
          <p className="text-sm">{PREVIEW_TEXT}</p>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-gray-900 mb-4">Preview</h2>
        <div
          className="rounded-xl p-8 border"
          style={{
            backgroundColor: values.bgColor,
            color: values.textColor,
            fontFamily: `'${values.fontFamily}', sans-serif`,
            borderColor: values.primaryColor + "33",
          }}
        >
          {values.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={values.logoUrl} alt="Logo" className="h-10 mb-6 object-contain" />
          )}
          <h2 className="text-2xl font-bold mb-2" style={{ color: values.primaryColor }}>
            Proposal Title
          </h2>
          <p className="text-sm opacity-80 mb-6">
            This is how your proposal content will appear to recipients.
          </p>
          <button
            type="button"
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: values.primaryColor }}
          >
            Accept Proposal
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-full text-sm font-medium transition"
        >
          {isPending ? "Saving…" : "Save Brand Kit"}
        </button>
      </div>
    </form>
  );
}
