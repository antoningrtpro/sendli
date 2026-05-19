"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProposalBlock, BrandKitData, BannerData } from "@/types/proposal";
import { BlockRenderer } from "@/components/editor/block-renderer";
import { groupBlocksIntoRows } from "@/lib/block-rows";
import { Download, Phone, Mail, X, MessageCircle, Copy, Check } from "lucide-react";
import { BlockCommentZone, useComments } from "@/components/proposal/block-comments";
import type { ProposalComment } from "@/components/proposal/block-comments";

interface PublicPageProps {
  proposalId: string;
  slug: string;
  title: string;
  blocks: ProposalBlock[];
  brandKit: BrandKitData;
  banner?: BannerData | null;
  clientLogoUrl?: string | null;
  linkId?: string;
  authorEmail?: string;
  authorPhone?: string;
  authorName?: string;
  showPdfButton?: boolean;
  downloadUrl?: string | null;
  downloadButtonLabel?: string | null;
  preview?: boolean;
  commentsEnabled?: boolean;
  initialComments?: ProposalComment[];
}

// Block types that count as an "interaction" (CTA click notification)
const INTERACTIVE_TYPES = new Set(["cta", "signature", "pdf", "embed"]);

function fontUrl(family: string) {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700;800&display=swap`;
}

export function ProposalPublicPage({ proposalId, slug, title, blocks: rawBlocks, brandKit, banner, clientLogoUrl, linkId, authorEmail, authorPhone, authorName, showPdfButton = true, downloadUrl, downloadButtonLabel, preview = false, commentsEnabled = false, initialComments = [] }: PublicPageProps) {
  // Strip internal saved-block metadata before rendering
  const blocks = rawBlocks.map(({ _savedBlockId: _a, _savedMode: _b, ...b }) => b as ProposalBlock);
  const startTime = useRef(Date.now());
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const seenBlocks = useRef<Set<string>>(new Set());
  const [contactOpen, setContactOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"email" | "phone" | null>(null);
  const [commentBannerDismissed, setCommentBannerDismissed] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);
  const primary = brandKit.primaryColor;

  // Comments (premium feature)
  const { comments, setComments } = useComments(proposalId, initialComments);
  // Map blockId → effective analytics label (blockName if set, else block type)
  const blockLabelMap = useMemo(
    () => Object.fromEntries(blocks.map(b => [b.id, b.blockName ?? b.type])),
    [blocks],
  );

  // Track page_view
  useEffect(() => { sendEvent({ eventType: "page_view" }); }, []); // eslint-disable-line

  // Track time_on_page on unload
  useEffect(() => {
    if (preview) return;
    function onUnload() {
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      navigator.sendBeacon("/api/analytics/event", JSON.stringify({ proposalId, eventType: "time_on_page", durationSeconds: seconds, linkId: linkId ?? null }));
    }
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [proposalId, linkId, preview]);

  // IntersectionObserver → block_visible
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const blockId = entry.target.getAttribute("data-block-id");
        if (!blockId) return;
        if (entry.isIntersecting && !seenBlocks.current.has(blockId)) {
          seenBlocks.current.add(blockId);
          const blockLabel = entry.target.getAttribute("data-block-label") ?? undefined;
          sendEvent({ eventType: "block_visible", blockId, blockLabel });
        }
      });
    }, { threshold: 0.4, rootMargin: "-80px 0px -40% 0px" });

    blockRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [blocks]); // eslint-disable-line

  // Close contact modal on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) setContactOpen(false);
    }
    if (contactOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [contactOpen]);


  function handleBlockClick(blockId: string, blockType: string) {
    const blockLabel = blockLabelMap[blockId];
    sendEvent({ eventType: "block_click", blockId, blockLabel });
    if (INTERACTIVE_TYPES.has(blockType)) {
      sendEvent({ eventType: "cta_click", blockId, blockLabel });
    }
  }

  async function sendEvent(payload: { eventType: string; blockId?: string; blockLabel?: string; durationSeconds?: number }) {
    if (preview) return;
    try {
      await fetch("/api/analytics/event", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, linkId: linkId ?? null, ...payload }), keepalive: true,
      });
    } catch { /* non-critical */ }
  }

  const widthClass: Record<string, string> = { full: "w-full", "two-thirds": "w-2/3", half: "w-1/2", "one-third": "w-1/3" };

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl(brandKit.fontFamily)} />

      <div className="min-h-screen" style={{ backgroundColor: brandKit.bgColor, color: brandKit.textColor, fontFamily: `'${brandKit.fontFamily}', sans-serif` }}>

        {/* ── Comment hint banner ── */}
        {commentsEnabled && !commentBannerDismissed && (
          <div className="relative flex items-center justify-center px-10 py-2 bg-gray-100 text-gray-600 text-xs">
            <span>Vous pouvez laisser un commentaire n&apos;importe où sur cette propale en faisant <strong>clic droit</strong>.</span>
            <button
              type="button"
              onClick={() => setCommentBannerDismissed(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200 transition"
              aria-label="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b" style={{ borderColor: primary + "20" }}>
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">

            {/* Logo + titre */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Logo auteur ou carré coloré */}
              {brandKit.logoUrl
                ? <img src={brandKit.logoUrl} alt="Logo" className="h-5 object-contain flex-shrink-0" />
                : <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: primary }} />}

              {/* Logo client — remplace/complète le carré quand défini */}
              {clientLogoUrl && (
                <>
                  <div className="w-px h-4 bg-gray-200 flex-shrink-0" />
                  <img src={clientLogoUrl} alt="Client" className="h-5 object-contain flex-shrink-0" />
                </>
              )}

              <span className="text-sm font-semibold text-gray-800 truncate">{title}</span>
            </div>

            {/* Actions droite */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* PDF */}
              {showPdfButton && (
                <a
                  href={`/api/pdf/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => sendEvent({ eventType: "cta_click", blockId: "__header_pdf__", blockLabel: "PDF export" })}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition"
                  style={{ color: primary, backgroundColor: primary + "15" }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </a>
              )}

              {/* Download document */}
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  onClick={() => sendEvent({ eventType: "cta_click", blockId: "__header_download__", blockLabel: downloadButtonLabel?.trim() || "Télécharger" })}
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition"
                  style={{ color: primary, backgroundColor: primary + "15" }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{downloadButtonLabel?.trim() || "Télécharger"}</span>
                </a>
              )}

              {/* Contact */}
              {(authorEmail || authorPhone) && (
                <div className="relative" ref={contactRef}>
                  <button
                    onClick={() => { if (!contactOpen) sendEvent({ eventType: "cta_click", blockId: "__header_contact__", blockLabel: "Contact" }); setContactOpen(o => !o); }}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition"
                    style={{ color: primary, backgroundColor: primary + "15" }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Contact</span>
                  </button>

                  {contactOpen && (
                    <div
                      className="absolute right-0 top-full mt-2 rounded-2xl shadow-xl overflow-hidden z-50"
                      style={{ background: "#fff", border: `1px solid ${primary}20`, boxShadow: `0 8px 32px ${primary}18, 0 2px 8px rgba(0,0,0,0.08)`, minWidth: "18rem", width: "max-content", maxWidth: "calc(100vw - 2rem)" }}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${primary}15` }}>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{authorName || "Contact"}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Votre interlocuteur</p>
                        </div>
                        <button onClick={() => setContactOpen(false)}
                          className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Contact details */}
                      <div className="p-4 space-y-3">
                        {authorEmail && (
                          <div
                            className="flex items-center gap-3 px-4 py-3 rounded-xl group"
                            style={{ backgroundColor: primary + "0d" }}
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: primary + "20" }}>
                              <Mail className="w-4 h-4" style={{ color: primary }} />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-gray-400">Email</p>
                              <a href={`mailto:${authorEmail}`}
                                className="text-sm font-medium text-gray-800 hover:underline whitespace-nowrap">
                                {authorEmail}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(authorEmail);
                                setCopiedField("email");
                                setTimeout(() => setCopiedField(null), 2000);
                              }}
                              title="Copier l'email"
                              className="p-1.5 rounded-lg transition flex-shrink-0"
                              style={{ color: copiedField === "email" ? primary : "#9ca3af" }}
                            >
                              {copiedField === "email"
                                ? <Check className="w-3.5 h-3.5" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                        {authorPhone && (
                          <div
                            className="flex items-center gap-3 px-4 py-3 rounded-xl group"
                            style={{ backgroundColor: primary + "0d" }}
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: primary + "20" }}>
                              <Phone className="w-4 h-4" style={{ color: primary }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-gray-400">Téléphone</p>
                              <a href={`tel:${authorPhone}`}
                                className="text-sm font-medium text-gray-800 hover:underline block">
                                {authorPhone}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(authorPhone);
                                setCopiedField("phone");
                                setTimeout(() => setCopiedField(null), 2000);
                              }}
                              title="Copier le téléphone"
                              className="p-1.5 rounded-lg transition flex-shrink-0"
                              style={{ color: copiedField === "phone" ? primary : "#9ca3af" }}
                            >
                              {copiedField === "phone"
                                ? <Check className="w-3.5 h-3.5" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="max-w-5xl mx-auto px-6 py-10">
          <BlockCommentZone
            blockId="__page__"
            proposalId={proposalId}
            comments={comments}
            onCommentAdded={(c) =>
              setComments(prev => {
                const idx = prev.findIndex(x => x.id === c.id);
                if (idx >= 0) {
                  const next = [...prev];
                  next[idx] = c;
                  return next;
                }
                return [...prev, c];
              })
            }
            primaryColor={primary}
            enabled={commentsEnabled}
            className="relative"
            ownerName={preview ? authorName : undefined}
          >

          {/* Banner */}
          {banner && (
            banner.imageOnly && banner.bgImageUrl ? (
              <div className="rounded-2xl overflow-hidden mb-12 h-56">
                <img src={banner.bgImageUrl} alt={banner.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden mb-12 relative h-56 flex items-center justify-center"
                style={{
                  backgroundColor: banner.bgColor,
                  backgroundImage: banner.bgImageUrl ? `url(${banner.bgImageUrl})` : undefined,
                  backgroundSize: "cover", backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-black/25" />
                <div className="relative z-10 text-center px-8">
                  {banner.logoUrl && <img src={banner.logoUrl} alt="Logo" className="h-10 object-contain mx-auto mb-3" />}
                  {banner.title && <h1 className="text-4xl font-extrabold" style={{ color: banner.textColor }}>{banner.title}</h1>}
                  {banner.subtitle && <p className="mt-2 text-base opacity-80" style={{ color: banner.textColor }}>{banner.subtitle}</p>}
                </div>
              </div>
            )
          )}

          {/* Blocks */}
          <div className="space-y-0">
            {groupBlocksIntoRows(blocks).map((row) => (
              <div key={row.map(b => b.id).join("|")} className={row.length > 1 ? "flex items-start gap-4" : undefined}>
                {row.map(block => (
                  <div
                    key={block.id}
                    className={widthClass[block.width] ?? "w-full"}
                  >
                    <div
                      id={`block-${block.id}`}
                      data-block-id={block.id}
                      data-block-label={block.analyticsSection ?? undefined}
                      data-block-name={block.blockName ?? undefined}
                      ref={el => { if (el) blockRefs.current.set(block.id, el); else blockRefs.current.delete(block.id); }}
                      style={{ paddingTop: block.paddingTop, paddingBottom: block.paddingBottom }}
                      onClick={() => handleBlockClick(block.id, block.type)}
                    >
                      <BlockRenderer block={block} onChange={() => {}} brandKit={brandKit} isEditing={false} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          </BlockCommentZone>
        </main>
      </div>
    </>
  );
}
