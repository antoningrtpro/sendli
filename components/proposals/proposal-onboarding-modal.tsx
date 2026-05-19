"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  X, ChevronRight, ChevronLeft, FileText, Lock, Upload,
  Eye, EyeOff, Loader2, Download, Check, Euro,
} from "lucide-react";
import { createProposalWithData, duplicateProposalWithData } from "@/app/actions/proposals";
import type { OnboardingData } from "@/app/actions/proposals";
import { useDirectUpload } from "@/lib/use-direct-upload";
import toast from "react-hot-toast";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onChange(!value)}
      onKeyDown={e => { if (e.key === " " || e.key === "Enter") onChange(!value); }}
      className="flex-shrink-0 cursor-pointer select-none"
      style={{
        width: 44, height: 24, borderRadius: 12,
        backgroundColor: value ? "var(--primary)" : "#d1d5db",
        position: "relative",
        transition: "background-color 0.2s",
      }}
    >
      <div style={{
        position: "absolute",
        top: 2, left: value ? 22 : 2,
        width: 20, height: 20,
        borderRadius: "50%",
        backgroundColor: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

interface Props {
  mode: "create" | "duplicate";
  duplicateFromId?: string;
  /** Pre-filled values when duplicating */
  initial?: Partial<OnboardingData>;
  onClose: () => void;
}

const CREATE_STEPS = [
  { label: "Votre propale", icon: FileText },
  { label: "Proposition commerciale", icon: FileText },
  { label: "Accès & sécurité", icon: Lock },
  { label: "Montants", icon: Euro },
];

const DUPLICATE_STEPS = [
  { label: "Votre propale", icon: FileText },
  { label: "Proposition commerciale", icon: FileText },
  { label: "Accès & sécurité", icon: Lock },
];

export function ProposalOnboardingModal({ mode, duplicateFromId, initial = {}, onClose }: Props) {
  const router = useRouter();
  const { uploading, uploadFile } = useDirectUpload();

  const STEPS = CREATE_STEPS; // 4 steps for both create and duplicate

  // ── Form state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(initial.title ?? "");
  const [clientLogoUrl, setClientLogoUrl] = useState(initial.clientLogoUrl ?? "");
  const [showPdfButton, setShowPdfButton] = useState(initial.showPdfButton ?? false);
  const [pdfUrl, setPdfUrl] = useState(initial.commercialPdfUrl ?? "");
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [downloadButtonLabel, setDownloadButtonLabel] = useState(initial.downloadButtonLabel ?? "");
  const [passwordEnabled, setPasswordEnabled] = useState(!!(initial.password));
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [amountMrr, setAmountMrr] = useState<number | null>(null);
  const [amountOneShot, setAmountOneShot] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pdfRef = useRef<HTMLInputElement>(null);

  async function handlePdfFile(file: File) {
    setPdfFileName(file.name);
    const url = await uploadFile(file, "documents");
    if (!url) { setPdfFileName(null); return; }
    setPdfUrl(url);
  }

  const canNext = step === 0 ? title.trim().length > 0 : true;

  async function handleFinish() {
    setSubmitting(true);
    const data: OnboardingData = {
      title: title.trim() || "Nouvelle propale",
      clientLogoUrl: clientLogoUrl.trim() || null,
      showPdfButton,
      commercialPdfUrl: pdfUrl || null,
      downloadButtonLabel: downloadButtonLabel.trim() || null,
      password: passwordEnabled && password ? password : null,
      amountMrr,
      amountOneShot,
    };

    const result = mode === "duplicate" && duplicateFromId
      ? await duplicateProposalWithData(duplicateFromId, data)
      : await createProposalWithData(data);

    setSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    router.push(`/proposals/${result.id}/edit`);
  }

  // ── Step content ──────────────────────────────────────────────────────────
  const stepContent = [
    /* ── Step 1 ────────────────────────────────────────────────────────────── */
    <div key="step1" className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Nom de la propale <span className="text-red-400">*</span>
        </label>
        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && canNext) setStep(1); }}
          placeholder="Ex : Refonte site web — Acme Corp"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Logo du client <span className="text-gray-400 font-normal">(URL — optionnel)</span>
        </label>
        <input
          type="url"
          value={clientLogoUrl}
          onChange={e => setClientLogoUrl(e.target.value)}
          placeholder="https://…/logo.png"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
        />
        {clientLogoUrl && (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={clientLogoUrl} alt="Logo preview" className="h-10 w-auto max-w-[140px] object-contain rounded border border-gray-100" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-700">Bouton export PDF</p>
          <p className="text-xs text-gray-400 mt-0.5">Affiche un bouton pour télécharger la propale en PDF</p>
        </div>
        <Toggle value={showPdfButton} onChange={setShowPdfButton} />
      </div>
    </div>,

    /* ── Step 2 ────────────────────────────────────────────────────────────── */
    <div key="step2" className="space-y-6">
      <p className="text-sm text-gray-400 -mt-1">
        Importez votre proposition commerciale en PDF. Elle sera intégrée directement comme bloc dans la propale.
      </p>

      {/* PDF upload zone */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Fichier PDF <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <div
          className="border-2 border-dashed rounded-xl h-28 flex flex-col items-center justify-center gap-2 cursor-pointer transition"
          style={pdfUrl
            ? { borderColor: "#86efac", backgroundColor: "#f0fdf4" }
            : { borderColor: "#e5e7eb", backgroundColor: "#f9fafb" }}
          onClick={() => !uploading && pdfRef.current?.click()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === "application/pdf") handlePdfFile(f); }}
          onDragOver={e => e.preventDefault()}
        >
          {uploading ? (
            <><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /><span className="text-sm text-gray-500">Upload en cours…</span></>
          ) : pdfUrl ? (
            <>
              <div className="flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5" />
                <span className="text-sm font-medium">{pdfFileName ?? "PDF importé"}</span>
              </div>
              <span className="text-xs text-green-600/70">Cliquer pour remplacer</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-500">Glisser un PDF ou <span className="text-indigo-500 font-medium">parcourir</span></span>
              <span className="text-xs text-gray-400">Max 15 Mo</span>
            </>
          )}
        </div>
        <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfFile(f); e.target.value = ""; }} />
        {pdfUrl && (
          <button type="button" onClick={() => { setPdfUrl(""); setPdfFileName(null); }}
            className="mt-1.5 text-xs text-red-400 hover:text-red-600 transition flex items-center gap-1">
            <X className="w-3 h-3" /> Supprimer le PDF
          </button>
        )}
      </div>

      {/* Button label */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Nom du bouton de téléchargement <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <input
          value={downloadButtonLabel}
          onChange={e => setDownloadButtonLabel(e.target.value)}
          placeholder="Ex : Télécharger la proposition"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
        />
        <p className="text-xs text-gray-400 mt-1">Si vide, le bouton s&apos;appellera &laquo; Proposition commerciale &raquo;</p>
      </div>
    </div>,

    /* ── Step 3 ────────────────────────────────────────────────────────────── */
    <div key="step3" className="space-y-6">
      <p className="text-sm text-gray-400 -mt-1">
        Protégez votre propale par un mot de passe. Vos prospects devront le saisir avant d&apos;accéder au contenu.
      </p>

      <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-700">Activer la protection par mot de passe</p>
          <p className="text-xs text-gray-400 mt-0.5">Optionnel — vous pouvez le modifier plus tard</p>
        </div>
        <Toggle value={passwordEnabled} onChange={setPasswordEnabled} />
      </div>

      {passwordEnabled && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mot de passe</label>
          <div className="relative">
            <input
              autoFocus
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Choisissez un mot de passe…"
              className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {!passwordEnabled && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
            <Download className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">
            Votre propale sera accessible à tous ceux qui ont le lien, sans restriction.
          </p>
        </div>
      )}
    </div>,

    /* ── Step 4 (create only) ──────────────────────────────────────────────── */
    <div key="step4" className="space-y-5">
      <p className="text-sm text-gray-400 -mt-1">
        Renseignez les montants associés à cette propale. Vous pouvez les modifier à tout moment depuis votre tableau de bord.
      </p>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Montant récurrent mensuel <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <div className="relative">
          <input
            type="number"
            min="0"
            step="1"
            value={amountMrr ?? ""}
            onChange={e => setAmountMrr(e.target.value === "" ? null : Number(e.target.value))}
            onKeyDown={e => { if (e.key === "Enter") handleFinish(); }}
            placeholder="0"
            className="w-full pl-4 pr-14 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">€ / m</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Montant one shot <span className="text-gray-400 font-normal">(optionnel)</span>
        </label>
        <div className="relative">
          <input
            type="number"
            min="0"
            step="1"
            value={amountOneShot ?? ""}
            onChange={e => setAmountOneShot(e.target.value === "" ? null : Number(e.target.value))}
            onKeyDown={e => { if (e.key === "Enter") handleFinish(); }}
            placeholder="0"
            className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">€</span>
        </div>
      </div>
    </div>,
  ];

  const modal = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[99990]"
        style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-[99991] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full"
        style={{ maxWidth: 560 }}
      >
        <div
          className="mx-4 rounded-3xl shadow-2xl overflow-hidden"
          style={{ background: "var(--surface)" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 pt-7 pb-0">
            <div>
              <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-1">
                {mode === "duplicate" ? "Dupliquer la propale" : "Nouvelle propale"} · Étape {step + 1} / {STEPS.length}
              </p>
              <h2 className="text-xl font-bold text-gray-900">{STEPS[step].label}</h2>
            </div>
            <button type="button" onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-2 px-8 pt-4 pb-0">
            {STEPS.map((_, i) => (
              <div key={i}
                className="h-1 rounded-full transition-all duration-300"
                style={{
                  flex: i === step ? 3 : 1,
                  backgroundColor: i <= step ? "var(--primary)" : "#e5e7eb",
                }}
              />
            ))}
          </div>

          {/* Body */}
          <div className="px-8 py-7">
            {stepContent[step]}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-8 pb-7">
            <button
              type="button"
              onClick={step === 0 ? onClose : () => setStep(s => s - 1)}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-700 transition px-3 py-2 rounded-xl hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 0 ? "Annuler" : "Retour"}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                disabled={!canNext}
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-1.5 text-sm font-semibold text-white px-6 py-2.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 14px rgba(17,17,132,0.25)" }}
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || uploading}
                onClick={handleFinish}
                className="flex items-center gap-2 text-sm font-semibold text-white px-6 py-2.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 14px rgba(17,17,132,0.25)" }}
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</> : mode === "duplicate" ? "Dupliquer →" : "Créer la propale →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}
