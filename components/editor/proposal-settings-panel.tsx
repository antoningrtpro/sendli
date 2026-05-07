"use client";

import { useState, useTransition, useRef } from "react";
import { X, Eye, EyeOff, RefreshCw, Check, Trash2, FileDown, Upload, Link, Loader2 } from "lucide-react";
import { updateProposalSettings } from "@/app/actions/proposals";
import { uploadImage } from "@/app/actions/upload";
import toast from "react-hot-toast";

type ProposalStatus = "pending" | "won" | "lost";

const STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending: { label: "En attente", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  won:     { label: "Gagné",      color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
  lost:    { label: "Perdu",      color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
};

interface ProposalSettingsPanelProps {
  proposalId: string;
  initialClientLogoUrl: string | null;
  initialHasPassword: boolean;
  initialShowPdfButton: boolean;
  initialDownloadUrl?: string | null;
  initialDownloadButtonLabel?: string | null;
  // Deal info (lifted from editor)
  status: ProposalStatus;
  onStatusChange: (s: ProposalStatus) => void;
  amountOneShot: string;
  amountMrr: string;
  onAmountOneShotChange: (v: string) => void;
  onAmountMrrChange: (v: string) => void;
  onClose: () => void;
}

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function ProposalSettingsPanel({
  proposalId,
  initialClientLogoUrl,
  initialHasPassword,
  initialShowPdfButton,
  initialDownloadUrl,
  initialDownloadButtonLabel,
  status, onStatusChange,
  amountOneShot, amountMrr, onAmountOneShotChange, onAmountMrrChange,
  onClose,
}: ProposalSettingsPanelProps) {
  const [clientLogoUrl, setClientLogoUrl] = useState(initialClientLogoUrl ?? "");
  const [logoSaved, setLogoSaved] = useState(false);
  const [showPdfButton, setShowPdfButton] = useState(initialShowPdfButton);

  // Download link
  const [downloadTab, setDownloadTab] = useState<"url" | "file">("url");
  const [downloadUrl, setDownloadUrl] = useState(initialDownloadUrl ?? "");
  const [downloadButtonLabel, setDownloadButtonLabel] = useState(initialDownloadButtonLabel ?? "");
  const [downloadSaved, setDownloadSaved] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const downloadFileRef = useRef<HTMLInputElement>(null);

  const [passwordEnabled, setPasswordEnabled] = useState(initialHasPassword);
  const [passwordValue, setPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(initialHasPassword && passwordValue === "");

  const [isPending, startTransition] = useTransition();

  function saveLogo() {
    startTransition(async () => {
      await updateProposalSettings(proposalId, { clientLogoUrl: clientLogoUrl.trim() || null });
      setLogoSaved(true);
      toast.success("Logo client enregistré");
      setTimeout(() => setLogoSaved(false), 2000);
    });
  }

  function removeLogo() {
    setClientLogoUrl("");
    startTransition(async () => {
      await updateProposalSettings(proposalId, { clientLogoUrl: null });
      toast.success("Logo client supprimé");
    });
  }

  function handleTogglePassword() {
    if (passwordEnabled) {
      setPasswordEnabled(false);
      setPasswordValue("");
      setPasswordSaved(false);
      startTransition(async () => {
        await updateProposalSettings(proposalId, { password: null });
        toast.success("Protection par mot de passe désactivée");
      });
    } else {
      setPasswordEnabled(true);
    }
  }

  function handleGenerate() {
    const p = generatePassword();
    setPasswordValue(p);
    setShowPassword(true);
    setPasswordSaved(false);
  }

  function savePassword() {
    if (!passwordValue.trim()) return;
    startTransition(async () => {
      await updateProposalSettings(proposalId, { password: passwordValue.trim() });
      setPasswordSaved(true);
      toast.success("Mot de passe enregistré");
    });
  }

  function saveDownloadUrl() {
    const trimmed = downloadUrl.trim();
    const labelTrimmed = downloadButtonLabel.trim();
    startTransition(async () => {
      await updateProposalSettings(proposalId, {
        downloadUrl: trimmed || null,
        downloadButtonLabel: labelTrimmed || null,
      });
      setDownloadSaved(true);
      toast.success(trimmed ? "Lien de téléchargement enregistré" : "Lien de téléchargement supprimé");
      setTimeout(() => setDownloadSaved(false), 2000);
    });
  }

  async function handleDownloadFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("Fichier trop volumineux — limite 15 Mo");
      return;
    }
    setFileUploading(true);
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const result = await uploadImage(dataUrl, "documents", `doc_${proposalId}_${Date.now()}`);
      setFileUploading(false);
      if ("error" in result) {
        toast.error("Upload échoué : " + result.error);
        setUploadedFileName(null);
        return;
      }
      setDownloadUrl(result.url);
      startTransition(async () => {
        await updateProposalSettings(proposalId, {
          downloadUrl: result.url,
          downloadButtonLabel: downloadButtonLabel.trim() || null,
        });
        toast.success("Fichier uploadé et enregistré !");
      });
    };
    reader.readAsDataURL(file);
  }

  const logoPreviewUrl = clientLogoUrl.trim();

  return (
    <div className="absolute inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto w-[440px] h-full flex flex-col" style={{ background: "var(--surface)" }}>

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
        >
          <h2 className="font-bold text-base" style={{ color: "var(--foreground)" }}>Paramètres</h2>
          <button onClick={onClose} className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

          {/* ── Deal info ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Deal</h3>

            {/* Status */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <div className="flex gap-2">
                {(["pending", "won", "lost"] as ProposalStatus[]).map(s => {
                  const c = STATUS_CONFIG[s];
                  const active = status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onStatusChange(s)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-full transition border"
                      style={active
                        ? { backgroundColor: c.bg, color: c.color, borderColor: c.color + "40" }
                        : { backgroundColor: "transparent", color: "#9ca3af", borderColor: "#e5e7eb" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: active ? c.dot : "#d1d5db" }} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">One Shot (€)</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 focus-within:bg-white focus-within:border-primary-300 transition">
                  <span className="px-3 text-xs text-gray-400 border-r border-gray-200 h-full flex items-center py-2">€</span>
                  <input
                    type="number" min="0" step="100"
                    value={amountOneShot}
                    onChange={e => onAmountOneShotChange(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-2 py-2 text-sm text-gray-800 focus:outline-none bg-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">MRR (€/mois)</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 focus-within:bg-white focus-within:border-primary-300 transition">
                  <span className="px-3 text-xs text-gray-400 border-r border-gray-200 h-full flex items-center py-2">€</span>
                  <input
                    type="number" min="0" step="100"
                    value={amountMrr}
                    onChange={e => onAmountMrrChange(e.target.value)}
                    placeholder="0"
                    className="flex-1 px-2 py-2 text-sm text-gray-800 focus:outline-none bg-transparent"
                  />
                </div>
              </div>
            </div>
          </section>

          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }} />

          {/* ── Client logo ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Logo client</h3>
            <p className="text-xs text-gray-400 mb-3">
              Affiché dans le header de la proposition publique.
            </p>

            {logoPreviewUrl && (
              <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                <img
                  src={logoPreviewUrl}
                  alt="Aperçu logo client"
                  className="h-8 object-contain max-w-[120px]"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="text-xs text-gray-400">Aperçu</span>
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="url"
                value={clientLogoUrl}
                onChange={e => { setClientLogoUrl(e.target.value); setLogoSaved(false); }}
                placeholder="https://exemple.com/logo.png"
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition"
              />
              <button
                onClick={saveLogo}
                disabled={isPending}
                className="px-3 py-2 text-sm rounded-xl font-medium transition text-white disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                style={{ backgroundColor: logoSaved ? "#10b981" : "var(--primary)" }}
              >
                {logoSaved ? <Check className="w-3.5 h-3.5" /> : null}
                {logoSaved ? "OK" : "Enregistrer"}
              </button>
            </div>

            {logoPreviewUrl && (
              <button
                onClick={removeLogo}
                disabled={isPending}
                className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition"
              >
                <Trash2 className="w-3 h-3" /> Supprimer le logo
              </button>
            )}
          </section>

          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }} />

          {/* ── Affichage PDF ────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--primary)" + "14" }}>
                  <FileDown className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-800">Bouton PDF</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Visible dans le header de la proposition</p>
                </div>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const next = !showPdfButton;
                  setShowPdfButton(next);
                  startTransition(async () => {
                    await updateProposalSettings(proposalId, { showPdfButton: next });
                    toast.success(next ? "Bouton PDF affiché" : "Bouton PDF masqué");
                  });
                }}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none flex-shrink-0"
                style={{ backgroundColor: showPdfButton ? "var(--primary)" : "#e5e7eb" }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  style={{ transform: showPdfButton ? "translateX(18px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          </section>

          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }} />

          {/* ── Download link ────────────────────────────────────────── */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Lien de téléchargement</h3>
            <p className="text-xs text-gray-400 mb-4 mt-1">
              Un bouton s&apos;affiche dans le header de la proposition pour télécharger le document.
            </p>

            {/* Button label */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Texte du bouton</label>
              <input
                type="text"
                value={downloadButtonLabel}
                onChange={e => { setDownloadButtonLabel(e.target.value); setDownloadSaved(false); }}
                placeholder="Télécharger"
                maxLength={40}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition"
              />
              <p className="text-[11px] text-gray-400 mt-1">Laissez vide pour afficher « Télécharger »</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-4">
              {([
                { key: "url" as const, icon: Link, label: "Lien URL" },
                { key: "file" as const, icon: Upload, label: "Fichier" },
              ]).map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDownloadTab(key)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition"
                  style={downloadTab === key
                    ? { backgroundColor: "var(--surface)", color: "var(--foreground)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                    : { color: "#9ca3af" }}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>

            {downloadTab === "url" ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={downloadUrl}
                    onChange={e => { setDownloadUrl(e.target.value); setDownloadSaved(false); }}
                    placeholder="https://exemple.com/document.pdf"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 transition"
                  />
                  <button
                    onClick={saveDownloadUrl}
                    disabled={isPending}
                    className="px-3 py-2 text-sm rounded-xl font-medium transition text-white disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
                    style={{ backgroundColor: downloadSaved ? "#10b981" : "var(--primary)" }}
                  >
                    {downloadSaved ? <Check className="w-3.5 h-3.5" /> : null}
                    {downloadSaved ? "OK" : "Enregistrer"}
                  </button>
                </div>
                {downloadUrl.trim() && (
                  <button
                    type="button"
                    onClick={() => { setDownloadUrl(""); saveDownloadUrl(); }}
                    disabled={isPending}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-3 h-3" /> Supprimer le lien
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  className="relative border-2 border-dashed border-gray-200 rounded-xl h-24 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-gray-400 transition"
                  onClick={() => !fileUploading && downloadFileRef.current?.click()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleDownloadFile(f); }}
                  onDragOver={e => e.preventDefault()}
                >
                  {fileUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} />
                      <span className="text-xs text-gray-500">Upload en cours…</span>
                    </>
                  ) : downloadUrl.trim() && !downloadUrl.startsWith("https://") === false && uploadedFileName ? (
                    <>
                      <FileDown className="w-5 h-5 text-green-500" />
                      <span className="text-xs text-green-700 font-medium">{uploadedFileName}</span>
                      <span className="text-xs text-gray-400">Cliquer pour remplacer</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-600">Glisser-déposer ou <span className="font-medium" style={{ color: "var(--primary)" }}>parcourir</span></span>
                      <span className="text-xs text-gray-400">PDF, DOCX, PPTX, XLSX…</span>
                    </>
                  )}
                </div>
                <input
                  ref={downloadFileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleDownloadFile(f); e.target.value = ""; }}
                />
                {downloadUrl.trim() && (
                  <div className="flex items-center justify-between px-3 py-2 bg-green-50 border border-green-100 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      <span className="text-xs text-green-700 truncate">Fichier disponible</span>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setDownloadUrl("");
                        setUploadedFileName(null);
                        startTransition(async () => {
                          await updateProposalSettings(proposalId, { downloadUrl: null });
                          toast.success("Fichier supprimé");
                        });
                      }}
                      className="text-xs text-red-400 hover:text-red-600 transition flex-shrink-0 ml-2"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }} />

          {/* ── Password ─────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Mot de passe</h3>
              <button
                type="button"
                onClick={handleTogglePassword}
                disabled={isPending}
                className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none"
                style={{ backgroundColor: passwordEnabled ? "var(--primary)" : "#e5e7eb" }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform"
                  style={{ transform: passwordEnabled ? "translateX(18px)" : "translateX(2px)" }}
                />
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4 mt-1">
              Les visiteurs devront entrer ce mot de passe pour accéder à la proposition.
            </p>

            {passwordEnabled && (
              <div className="space-y-3">
                {passwordSaved && passwordValue === "" && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" />
                    Un mot de passe est actif. Saisissez-en un nouveau pour le changer.
                  </div>
                )}

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordValue}
                    onChange={e => { setPasswordValue(e.target.value); setPasswordSaved(false); }}
                    placeholder={initialHasPassword ? "Nouveau mot de passe…" : "Choisir un mot de passe…"}
                    className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-200 font-mono tracking-wider transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Générer
                  </button>
                  <button
                    type="button"
                    onClick={savePassword}
                    disabled={isPending || !passwordValue.trim()}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-full font-medium text-white transition disabled:opacity-40"
                    style={{ backgroundColor: "var(--primary)" }}
                  >
                    {isPending ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>

                {showPassword && passwordValue && (
                  <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-3 py-2">
                    ⚠️ Copiez ce mot de passe maintenant — il ne sera plus affiché en clair après enregistrement.
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
