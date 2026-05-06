"use client";

import { useState, useTransition } from "react";
import { saveBrandKit } from "@/app/actions/brand-kit";
import toast from "react-hot-toast";
interface BrandKit { id?: string; userId?: string; primaryColor: string; secondaryColor: string; fontFamily: string; bgColor: string; textColor: string; logoUrl?: string | null; }

const PREVIEW_TEXT = "The quick brown fox jumps over the lazy dog";

interface BrandKitFormProps {
  brandKit: BrandKit | null;
  fonts: string[];
}

export function BrandKitForm({ brandKit, fonts }: BrandKitFormProps) {
  const [isPending, startTransition] = useTransition();
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Logo URL</label>
          <input
            type="url"
            value={values.logoUrl}
            onChange={(e) => set("logoUrl", e.target.value)}
            placeholder="https://your-cdn.com/logo.png"
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
          />
          <p className="text-xs text-gray-400 mt-1">Paste a public image URL (PNG/SVG recommended)</p>
        </div>
        {values.logoUrl && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={values.logoUrl} alt="Logo preview" className="h-12 object-contain" />
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-gray-900 mb-4">Colors</h2>
        <div className="grid grid-cols-2 gap-5">
          {[
            { key: "primaryColor", label: "Primary Color" },
            { key: "secondaryColor", label: "Secondary Color" },
            { key: "bgColor", label: "Background Color" },
            { key: "textColor", label: "Text Color" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={values[key as keyof typeof values]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={values[key as keyof typeof values]}
                  onChange={(e) => set(key, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
                  placeholder="#000000"
                />
              </div>
            </div>
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
