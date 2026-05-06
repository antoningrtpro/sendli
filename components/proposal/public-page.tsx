"use client";

import { useEffect, useRef, useState } from "react";
import type { ProposalBlock, BrandKitData, BannerData, HeadingBlock } from "@/types/proposal";
import { BlockRenderer } from "@/components/editor/block-renderer";
import { groupBlocksIntoRows } from "@/lib/block-rows";
import { Download, ChevronDown, Phone, Mail, X, MessageCircle, Copy, Check } from "lucide-react";

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
}

function fontUrl(family: string) {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700;800&display=swap`;
}

interface TocEntry { id: string; text: string; level: number }
function extractToc(blocks: ProposalBlock[]): TocEntry[] {
  return blocks
    .filter((b): b is HeadingBlock => b.type === "heading" && !!b.text)
    .map(b => ({ id: b.id, text: b.text, level: b.level }));
}

export function ProposalPublicPage({ proposalId, slug, title, blocks: rawBlocks, brandKit, banner, clientLogoUrl, linkId, authorEmail, authorPhone, authorName, showPdfButton = true }: PublicPageProps) {
  // Strip internal saved-block metadata before rendering
  const blocks = rawBlocks.map(({ _savedBlockId: _a, _savedMode: _b, ...b }) => b as ProposalBlock);
  const startTime = useRef(Date.now());
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const seenBlocks = useRef<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [tocOpen, setTocOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<"email" | "phone" | null>(null);
  const tocRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);
  const primary = brandKit.primaryColor;
  const toc = extractToc(blocks);

  // Track page_view
  useEffect(() => { sendEvent({ eventType: "page_view" }); }, []); // eslint-disable-line

  // Track time_on_page on unload
  useEffect(() => {
    function onUnload() {
      const seconds = Math.round((Date.now() - startTime.current) / 1000);
      navigator.sendBeacon("/api/analytics/event", JSON.stringify({ proposalId, eventType: "time_on_page", durationSeconds: seconds, linkId: linkId ?? null }));
    }
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [proposalId, linkId]);

  // IntersectionObserver → block_visible + active TOC
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const blockId = entry.target.getAttribute("data-block-id");
        if (!blockId) return;
        if (entry.isIntersecting) {
          if (!seenBlocks.current.has(blockId)) {
            seenBlocks.current.add(blockId);
            sendEvent({ eventType: "block_visible", blockId });
          }
          if (toc.some(t => t.id === blockId)) setActiveId(blockId);
        }
      });
    }, { threshold: 0.4, rootMargin: "-80px 0px -40% 0px" });

    blockRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [blocks]); // eslint-disable-line

  // Close TOC dropdown on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (tocRef.current && !tocRef.current.contains(e.target as Node)) setTocOpen(false);
    }
    if (tocOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [tocOpen]);

  // Close contact modal on outside click
  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) setContactOpen(false);
    }
    if (contactOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [contactOpen]);

  function handleBlockClick(blockId: string, blockType: string) {
    sendEvent({ eventType: "block_click", blockId });
    if (blockType === "cta" || blockType === "signature") sendEvent({ eventType: "cta_click", blockId });
  }

  async function sendEvent(payload: { eventType: string; blockId?: string; durationSeconds?: number }) {
    try {
      await fetch("/api/analytics/event", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, linkId: linkId ?? null, ...payload }), keepalive: true,
      });
    } catch { /* non-critical */ }
  }

  function scrollTo(id: string) {
    document.getElementById(`block-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTocOpen(false);
  }

  const widthClass: Record<string, string> = { full: "w-full", "two-thirds": "w-2/3", half: "w-1/2", "one-third": "w-1/3" };
  const activeTocLabel = toc.find(t => t.id === activeId)?.text;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={fontUrl(brandKit.fontFamily)} />

      <div className="min-h-screen" style={{ backgroundColor: brandKit.bgColor, color: brandKit.textColor, fontFamily: `'${brandKit.fontFamily}', sans-serif` }}>

        {/* ── Header ── */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b" style={{ borderColor: primary + "20" }}>
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">

            {/* Logo + titre */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Logo auteur ou carré coloré */}
              {brandKit.logoUrl
                ? <img src={brandKit.logoUrl} alt="Logo" className="h-7 object-contain flex-shrink-0" />
                : <div className="w-5 h-5 rounded flex-shrink-0" style={{ backgroundColor: primary }} />}

              {/* Logo client — remplace/complète le carré quand défini */}
              {clientLogoUrl && (
                <>
                  <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
                  <img src={clientLogoUrl} alt="Client" className="h-7 object-contain flex-shrink-0" />
                </>
              )}

              <span className="text-sm font-semibold text-gray-800 truncate">{title}</span>
            </div>

            {/* Actions droite */}
            <div className="flex items-center gap-2 flex-shrink-0">

              {/* TOC dropdown — seulement si des headings existent */}
              {toc.length > 0 && (
                <div ref={tocRef} className="relative">
                  <button
                    onClick={() => setTocOpen(o => !o)}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition font-medium"
                    style={{
                      color: tocOpen ? "#fff" : primary,
                      backgroundColor: tocOpen ? primary : primary + "15",
                    }}
                  >
                    <span className="hidden sm:inline max-w-[140px] truncate">
                      {activeTocLabel ?? "Sommaire"}
                    </span>
                    <span className="sm:hidden">Sommaire</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${tocOpen ? "rotate-180" : ""}`} />
                  </button>

                  {tocOpen && (
                    <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden z-50"
                      style={{ minWidth: 220, maxWidth: "min(520px, 90vw)" }}>
                      <div className="px-4 py-2.5 border-b border-gray-50">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Sommaire</p>
                      </div>
                      <nav className="py-1.5">
                        {toc.map(entry => (
                          <button
                            key={entry.id}
                            onClick={() => scrollTo(entry.id)}
                            className="w-full text-left py-2 text-sm transition hover:bg-gray-50 flex items-center gap-2.5 pr-5"
                            style={{
                              paddingLeft: entry.level === 1 ? 16 : entry.level === 2 ? 28 : 40,
                              color: activeId === entry.id ? primary : "#374151",
                              fontWeight: activeId === entry.id ? 600 : 400,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-opacity"
                              style={{ backgroundColor: primary, opacity: activeId === entry.id ? 1 : 0 }} />
                            {entry.text}
                          </button>
                        ))}
                      </nav>
                    </div>
                  )}
                </div>
              )}

              {/* PDF */}
              {showPdfButton && (
                <a
                  href={`/api/pdf/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition"
                  style={{ color: primary, backgroundColor: primary + "15" }}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">PDF</span>
                </a>
              )}

              {/* Contact */}
              {(authorEmail || authorPhone) && (
                <div className="relative" ref={contactRef}>
                  <button
                    onClick={() => setContactOpen(o => !o)}
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
                    id={`block-${block.id}`}
                    data-block-id={block.id}
                    ref={el => { if (el) blockRefs.current.set(block.id, el); else blockRefs.current.delete(block.id); }}
                    className={widthClass[block.width] ?? "w-full"}
                    style={{ paddingTop: block.paddingTop, paddingBottom: block.paddingBottom }}
                    onClick={() => handleBlockClick(block.id, block.type)}
                  >
                    <BlockRenderer block={block} onChange={() => {}} brandKit={brandKit} isEditing={false} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
