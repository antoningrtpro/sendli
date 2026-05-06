"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { createBanner, saveBanner, deleteBanner } from "@/app/actions/banners";
import toast from "react-hot-toast";
import { Plus, Trash2, Check, Upload, Link, X, ImageIcon, Move } from "lucide-react";
export interface Banner { id: string; userId?: string; name: string; bgColor: string; bgImageUrl?: string | null; title: string; subtitle: string; textColor: string; logoUrl?: string | null; imageOnly: boolean; createdAt?: Date; updatedAt?: Date; }

interface BannersManagerProps {
  initialBanners: Banner[];
  onSelect?: (banner: Banner) => void;
  selectedId?: string | null;
}

// ─── Manual crop image uploader ──────────────────────────────────────────────
const ASPECT = 4; // 4:1 ratio (1200x300)

interface CropState { y: number; scale: number } // y = 0..1, scale = 1..3

function ImageUploader({ current, onConfirm, onClear }: {
  current?: string | null;
  onConfirm: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const [bgMode, setBgMode] = useState<"upload" | "url">("upload");
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [rawSize, setRawSize] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<CropState>({ y: 0.5, scale: 1 });
  const [urlInput, setUrlInput] = useState(current ?? "");
  const [dragging, setDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartCropY = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function loadFile(file: File) {
    if (!file.type.startsWith("image/")) { toast.error("Fichier invalide — image requise"); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setRawSrc(src);
        setRawSize({ w: img.width, h: img.height });
        setCrop({ y: 0.5, scale: 1 });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }

  // Natural ratio vs 4:1: does it need cropping?
  const needsCrop = rawSize ? (rawSize.w / rawSize.h) !== ASPECT : false;

  function applyAndConfirm() {
    if (!rawSrc || !rawSize) return;
    const canvas = canvasRef.current!;
    const TARGET_W = 1200, TARGET_H = 300;
    canvas.width = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = () => {
      // Compute source rect based on crop state
      const scaleW = rawSize.w * crop.scale;
      const scaleH = rawSize.h * crop.scale;
      // How many px of scaled image fit in target?
      const displayW = Math.min(scaleW, scaleH * ASPECT);
      const displayH = displayW / ASPECT;
      // Position in scaled image
      const srcX = (scaleW - displayW) / 2;
      const srcY = (scaleH - displayH) * crop.y;
      // Back to original coordinates
      const ox = srcX / crop.scale;
      const oy = srcY / crop.scale;
      const ow = displayW / crop.scale;
      const oh = displayH / crop.scale;
      ctx.drawImage(img, ox, oy, ow, oh, 0, 0, TARGET_W, TARGET_H);
      onConfirm(canvas.toDataURL("image/jpeg", 0.88));
      toast.success("Image appliquée !");
    };
    img.src = rawSrc;
  }

  // Drag handler on the preview strip
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStartY.current = e.clientY;
    dragStartCropY.current = crop.y;
  }, [crop.y]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !previewRef.current) return;
    const height = previewRef.current.clientHeight;
    const dy = (e.clientY - dragStartY.current) / height;
    setCrop(c => ({ ...c, y: Math.max(0, Math.min(1, dragStartCropY.current - dy)) }));
  }, [dragging]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="hidden" />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg w-fit">
        {([["upload", "Importer"] as const, ["url", "URL"] as const]).map(([key, label]) => (
          <button key={key} type="button" onClick={() => { setBgMode(key); setRawSrc(null); }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md transition font-medium"
            style={bgMode === key ? { backgroundColor: "var(--primary)", color: "#fff" } : { color: "#6b7280" }}>
            {label}
          </button>
        ))}
      </div>

      {bgMode === "url" ? (
        <div className="flex gap-2">
          <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
            placeholder="https://…"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
          <button type="button" onClick={() => { if (urlInput.trim()) { onConfirm(urlInput.trim()); toast.success("Image appliquée !"); } }}
            className="px-3 py-2 text-white text-sm rounded-lg transition"
            style={{ backgroundColor: "var(--primary)" }}>
            OK
          </button>
          {current && (
            <button type="button" onClick={onClear} title="Supprimer l'image"
              className="px-2 py-2 text-red-400 hover:text-red-600 border border-red-100 rounded-lg transition">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : rawSrc && rawSize ? (
        /* ── Manual crop UI ── */
        <div className="space-y-2">
          {needsCrop && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
              ⚠ Ratio différent de 4:1 — glissez la fenêtre pour choisir la zone à recadrer
            </p>
          )}

          {/* Preview with draggable crop overlay */}
          <div
            ref={previewRef}
            className="relative rounded-xl overflow-hidden border border-gray-200 select-none"
            style={{ height: 160, cursor: needsCrop ? "grab" : "default", background: "#000" }}
            onMouseDown={needsCrop ? onMouseDown : undefined}
            onMouseMove={needsCrop ? onMouseMove : undefined}
            onMouseUp={needsCrop ? onMouseUp : undefined}
            onMouseLeave={needsCrop ? onMouseUp : undefined}
          >
            {/* Full image dimmed */}
            <img src={rawSrc} alt="Source" className="absolute inset-0 w-full h-full object-contain opacity-30" />

            {/* Crop window (4:1 ratio, centered horizontally, positioned by crop.y) */}
            {(() => {
              // In display space (160px height, full width), compute crop window
              const containerH = 160;
              const containerW = previewRef.current?.clientWidth ?? 480;
              const imgDisplayW = Math.min(containerW, containerH * (rawSize.w / rawSize.h));
              const imgDisplayH = imgDisplayW / (rawSize.w / rawSize.h);
              const cropDisplayW = Math.min(imgDisplayW, imgDisplayH * ASPECT);
              const cropDisplayH = cropDisplayW / ASPECT;
              const cropTop = ((imgDisplayH - cropDisplayH) * (1 - crop.y)) + (containerH - imgDisplayH) / 2;
              const cropLeft = (containerW - cropDisplayW) / 2;
              return (
                <div className="absolute border-2 border-white shadow-lg"
                  style={{ left: cropLeft, top: cropTop, width: cropDisplayW, height: cropDisplayH, pointerEvents: "none" }}>
                  <img src={rawSrc} alt="Crop preview"
                    className="absolute w-full h-full object-cover"
                    style={{ objectPosition: `50% ${crop.y * 100}%` }} />
                  {needsCrop && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Move className="w-5 h-5 text-white drop-shadow" />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Scale slider */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-12 flex-shrink-0">Zoom</span>
            <input type="range" min="100" max="300" step="5"
              value={Math.round(crop.scale * 100)}
              onChange={e => setCrop(c => ({ ...c, scale: parseInt(e.target.value) / 100 }))}
              className="flex-1" />
            <span className="text-xs text-gray-400 w-10 text-right">{Math.round(crop.scale * 100)}%</span>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={applyAndConfirm}
              className="flex-1 py-2 text-white text-sm font-medium rounded-lg transition"
              style={{ backgroundColor: "var(--primary)" }}>
              ✓ Valider
            </button>
            <button type="button" onClick={() => setRawSrc(null)}
              className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              Annuler
            </button>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div>
          <div
            className="relative border-2 border-dashed border-gray-200 rounded-xl h-24 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-400 transition group"
            onClick={() => inputRef.current?.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) loadFile(f); }}
            onDragOver={e => e.preventDefault()}
          >
            {current ? (
              <>
                <img src={current} alt="bg" className="absolute inset-0 w-full h-full object-cover rounded-xl opacity-50" />
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <ImageIcon className="w-5 h-5 text-gray-500" />
                  <span className="text-xs text-gray-600 font-medium">Remplacer l'image</span>
                </div>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-gray-400" style={{ color: "var(--primary)" }} />
                <span className="text-xs text-gray-500">Glisser-déposer ou <span className="font-medium" style={{ color: "var(--primary)" }}>parcourir</span></span>
              </>
            )}
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }} />
          {current && (
            <button type="button" onClick={onClear}
              className="mt-1.5 text-xs text-red-400 hover:text-red-600 transition flex items-center gap-1">
              <X className="w-3 h-3" /> Supprimer l'image
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Banner preview (shared between list card and editor) ─────────────────────
function BannerPreview({ banner, className = "" }: { banner: Banner; className?: string }) {
  if (banner.imageOnly && banner.bgImageUrl) {
    return (
      <div className={`overflow-hidden ${className}`}>
        <img src={banner.bgImageUrl} alt={banner.name} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-center relative overflow-hidden ${className}`}
      style={{
        backgroundColor: banner.bgColor,
        backgroundImage: banner.bgImageUrl ? `url(${banner.bgImageUrl})` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
      {banner.bgImageUrl && <div className="absolute inset-0 bg-black/20" />}
      <div className="relative z-10 text-center px-4">
        {banner.logoUrl && <img src={banner.logoUrl} alt="Logo" className="h-5 object-contain mx-auto mb-1" />}
        {(banner.title || banner.subtitle) && (
          <>
            <p className="font-bold text-sm truncate" style={{ color: banner.textColor }}>{banner.title}</p>
            {banner.subtitle && <p className="text-xs opacity-70 truncate" style={{ color: banner.textColor }}>{banner.subtitle}</p>}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function BannersManager({ initialBanners, onSelect, selectedId }: BannersManagerProps) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    startTransition(async () => {
      const { id } = await createBanner();
      const newBanner: Banner = {
        id, userId: "", name: "Nouvelle bannière", bgColor: "#111184", bgImageUrl: null,
        title: "", subtitle: "", textColor: "#ffffff", logoUrl: null, imageOnly: false,
        createdAt: new Date(), updatedAt: new Date(),
      };
      setBanners(prev => [newBanner, ...prev]);
      setEditing(newBanner);
    });
  }

  function handleSave() {
    if (!editing) return;
    startTransition(async () => {
      await saveBanner(editing.id, {
        name: editing.name,
        bgColor: editing.bgColor,
        bgImageUrl: editing.bgImageUrl ?? null,
        title: editing.title,
        subtitle: editing.subtitle,
        textColor: editing.textColor,
        logoUrl: editing.logoUrl ?? null,
        imageOnly: editing.imageOnly,
      });
      setBanners(prev => prev.map(b => b.id === editing.id ? editing : b));
      toast.success("Bannière sauvegardée !");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteBanner(id);
      setBanners(prev => prev.filter(b => b.id !== id));
      if (editing?.id === id) setEditing(null);
      toast.success("Bannière supprimée");
    });
  }

  function update<K extends keyof Banner>(field: K, val: Banner[K]) {
    if (!editing) return;
    setEditing((prev: Banner | null) => prev ? { ...prev, [field]: val } : null);
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left: banner list */}
      <div className="col-span-4 space-y-3">
        <button onClick={handleCreate} disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition disabled:opacity-50">
          <Plus className="w-4 h-4" /> Nouvelle bannière
        </button>

        {banners.map(banner => (
          <div key={banner.id}
            className={`relative rounded-xl border-2 cursor-pointer transition group overflow-hidden ${editing?.id === banner.id ? "" : "border-gray-100 hover:border-gray-300"}`}
            style={editing?.id === banner.id ? { borderColor: "var(--primary)" } : {}}
            onClick={() => setEditing(banner)}>

            {/* Visual preview */}
            <BannerPreview banner={banner} className="h-16" />

            {/* Name row */}
            <div className="px-3 py-2 flex items-center justify-between bg-white">
              <span className="text-xs font-medium text-gray-700 truncate">{banner.name}</span>
              <div className="flex items-center gap-1">
                {onSelect && selectedId === banner.id && <Check className="w-3.5 h-3.5 text-green-500" />}
                {onSelect && (
                  <button type="button" onClick={e => { e.stopPropagation(); onSelect(banner); }}
                    className="text-xs px-2 py-0.5 rounded text-white transition"
                    style={{ backgroundColor: "var(--primary)" }}>
                    Utiliser
                  </button>
                )}
                <button type="button" onClick={e => { e.stopPropagation(); handleDelete(banner.id); }}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition p-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {banners.length === 0 && !isPending && (
          <p className="text-sm text-gray-400 text-center py-6">Aucune bannière. Créez-en une !</p>
        )}
      </div>

      {/* Right: editor */}
      <div className="col-span-8">
        {editing ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">

            {/* Live preview */}
            <BannerPreview banner={editing} className="rounded-xl h-32" />

            {/* Internal name */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom interne</label>
              <input value={editing.name} onChange={e => update("name", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
            </div>

            {/* Mode toggle */}
            <div className="flex items-center justify-between py-2 border-t border-b border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-700">Image complète</p>
                <p className="text-xs text-gray-400">Utiliser l'image directement comme bannière, sans titre ni texte</p>
              </div>
              <button
                type="button"
                onClick={() => update("imageOnly", !editing.imageOnly)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors`}
                style={{ backgroundColor: editing.imageOnly ? "var(--primary)" : "#d1d5db" }}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${editing.imageOnly ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>

            {editing.imageOnly ? (
              /* Image-only mode: just the image uploader */
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Image de la bannière</label>
                <ImageUploader
                  current={editing.bgImageUrl}
                  onConfirm={dataUrl => update("bgImageUrl", dataUrl)}
                  onClear={() => update("bgImageUrl", null)}
                />
                {!editing.bgImageUrl && (
                  <p className="mt-2 text-xs text-amber-600">⚠ Ajoutez une image pour que la bannière soit visible.</p>
                )}
              </div>
            ) : (
              /* Text overlay mode */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
                    <input value={editing.title} onChange={e => update("title", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Sous-titre</label>
                    <input value={editing.subtitle} onChange={e => update("subtitle", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Couleur de fond</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editing.bgColor} onChange={e => update("bgColor", e.target.value)}
                        className="w-9 h-9 rounded-lg border border-gray-200 p-0.5 cursor-pointer flex-shrink-0" />
                      <input value={editing.bgColor} onChange={e => update("bgColor", e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Couleur du texte</label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={editing.textColor} onChange={e => update("textColor", e.target.value)}
                        className="w-9 h-9 rounded-lg border border-gray-200 p-0.5 cursor-pointer flex-shrink-0" />
                      <input value={editing.textColor} onChange={e => update("textColor", e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none" />
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-2">Image de fond (optionnel)</label>
                    <ImageUploader
                      current={editing.bgImageUrl}
                      onConfirm={dataUrl => update("bgImageUrl", dataUrl)}
                      onClear={() => update("bgImageUrl", null)}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">URL du logo (optionnel)</label>
                    <input value={editing.logoUrl ?? ""} onChange={e => update("logoUrl", e.target.value || null)}
                      placeholder="https://…"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                Annuler
              </button>
              <button onClick={handleSave} disabled={isPending}
                className="px-5 py-2 rounded-lg text-white text-sm font-medium transition disabled:opacity-60"
                style={{ backgroundColor: "var(--primary)" }}>
                {isPending ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 h-60 flex items-center justify-center text-sm text-gray-400">
            Sélectionner une bannière pour l'éditer
          </div>
        )}
      </div>
    </div>
  );
}
