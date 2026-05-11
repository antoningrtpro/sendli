"use client";

import { useState, useRef } from "react";
import { Plus, Type, Image, Video, Minus, DollarSign, MousePointer, Space, BarChart3, Quote, Clock, HelpCircle, FileText, Heading1, FileSignature, Code2, Users, Target, BookMarked, Lock, Plug, Bookmark, Zap } from "lucide-react";
import type { BlockType, ProposalBlock, LibrarySavedBlock } from "@/types/proposal";
import { nanoid } from "nanoid";
import { FREE_LIMITS } from "@/lib/plan";
import toast from "react-hot-toast";
import type { IntegrationKey } from "@/app/actions/integrations";

/** Transform a Google Calendar embed iframe into a responsive wrapper */
function transformGoogleCalendarEmbed(embedCode: string): string {
  const srcMatch = embedCode.match(/src=["']([^"']+)["']/);
  const src = srcMatch?.[1] ?? "";
  return `<div style="position:relative;padding-bottom:75%;height:0;overflow:hidden;border-radius:12px;"><iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" frameborder="0" scrolling="no"></iframe></div>`;
}

function createIntegrationBlock(key: IntegrationKey, embedCode: string): ProposalBlock {
  const base = { id: nanoid(), width: "full" as const, paddingTop: 16, paddingBottom: 16 };
  let html = embedCode;
  if (key === "google_calendar") {
    html = transformGoogleCalendarEmbed(embedCode);
  }
  return { ...base, type: "embed", html, caption: "", integrationKey: key };
}

const BLOCK_GROUPS = [
  {
    label: "Content",
    items: [
      { type: "heading"     as BlockType, label: "Heading",     icon: <Heading1 className="w-4 h-4" />,     description: "H1, H2 or H3 title" },
      { type: "text"        as BlockType, label: "Text",        icon: <Type className="w-4 h-4" />,          description: "Rich text with formatting" },
      { type: "image"       as BlockType, label: "Image",       icon: <Image className="w-4 h-4" />,         description: "URL or uploaded image" },
      { type: "video"       as BlockType, label: "Video",       icon: <Video className="w-4 h-4" />,         description: "YouTube / Vimeo embed" },
      { type: "pdf"         as BlockType, label: "PDF",         icon: <FileText className="w-4 h-4" />,      description: "Inline PDF viewer" },
      { type: "embed"       as BlockType, label: "Embed",       icon: <Code2 className="w-4 h-4" />,          description: "HTML / iframe embed code" },
    ],
  },
  {
    label: "Sales",
    items: [
      { type: "metrics"     as BlockType, label: "Metrics",     icon: <BarChart3 className="w-4 h-4" />,     description: "3 key numbers in a row" },
      { type: "pricing"     as BlockType, label: "Pricing",     icon: <DollarSign className="w-4 h-4" />,    description: "Line items and total" },
      { type: "testimonial" as BlockType, label: "Testimonial", icon: <Quote className="w-4 h-4" />,         description: "Client quotes (1–3)" },
      { type: "signature"   as BlockType, label: "Signature",   icon: <FileSignature className="w-4 h-4" />, description: "Contract signature link" },
      { type: "team"        as BlockType, label: "Team",        icon: <Users className="w-4 h-4" />,         description: "Team members with photo and contact" },
      { type: "enjeux"      as BlockType, label: "Enjeux",      icon: <Target className="w-4 h-4" />,        description: "Numbered challenges / goals" },
      { type: "case-study"  as BlockType, label: "Case Study",  icon: <BookMarked className="w-4 h-4" />,    description: "Client story with media and quote" },
    ],
  },
  {
    label: "Structure",
    items: [
      { type: "timeline"    as BlockType, label: "Timeline",    icon: <Clock className="w-4 h-4" />,         description: "Ordered steps / phases" },
      { type: "faq"         as BlockType, label: "FAQ",         icon: <HelpCircle className="w-4 h-4" />,    description: "Accordion Q&A" },
      { type: "cta"         as BlockType, label: "CTA Button",  icon: <MousePointer className="w-4 h-4" />,  description: "Call-to-action link" },
      { type: "divider"     as BlockType, label: "Divider",     icon: <Minus className="w-4 h-4" />,         description: "Horizontal rule" },
      { type: "spacer"      as BlockType, label: "Spacer",      icon: <Space className="w-4 h-4" />,         description: "Empty vertical space" },
    ],
  },
];

function createBlock(type: BlockType): ProposalBlock {
  const base = { id: nanoid(), width: "full" as const, paddingTop: 16, paddingBottom: 16 };
  switch (type) {
    case "heading":     return { ...base, type, level: 2, text: "", align: "left" };
    case "text":        return { ...base, type, content: "" };
    case "image":       return { ...base, type, url: "", alt: "" };
    case "video":       return { ...base, type, url: "" };
    case "pdf":         return { ...base, type, url: "", label: "", height: 600 };
    case "embed":       return { ...base, type, html: "", caption: "" };
    case "divider":     return { ...base, type };
    case "spacer":      return { ...base, type, height: 48 };
    case "cta":         return { ...base, type, label: "Get started", url: "#", align: "center" };
    case "pricing":     return { ...base, type, title: "Project Pricing", currency: "USD", showTotal: true, items: [{ id: nanoid(), description: "Service", quantity: 1, unitPrice: 1000 }] };
    case "metrics":     return { ...base, type, items: [{ id: nanoid(), value: "10x", label: "ROI", description: "" }, { id: nanoid(), value: "+200%", label: "Growth", description: "" }, { id: nanoid(), value: "48h", label: "Delivery", description: "" }] };
    case "testimonial": return { ...base, type, testimonials: [{ quote: "", author: "", role: "", company: "" }] };
    case "timeline":    return { ...base, type, title: "Our Process", items: [{ id: nanoid(), date: "Week 1", title: "Discovery", description: "" }, { id: nanoid(), date: "Week 2", title: "Execution", description: "" }] };
    case "faq":         return { ...base, type, title: "FAQ", items: [{ id: nanoid(), question: "", answer: "" }] };
    case "signature":   return { ...base, type, contractUrl: "", buttonLabel: "Sign the contract", description: "Ready to move forward? Sign below." };
    case "team":        return { ...base, type, members: [
      { id: nanoid(), name: "", role: "", photoUrl: "", email: "", phone: "" },
      { id: nanoid(), name: "", role: "", photoUrl: "", email: "", phone: "" },
      { id: nanoid(), name: "", role: "", photoUrl: "", email: "", phone: "" },
    ] };
    case "enjeux":      return { ...base, type, sections: [
      { id: nanoid(), tag: "Enjeux", title: "", subtitle: "", items: [
        { id: nanoid(), title: "", description: "" },
        { id: nanoid(), title: "", description: "" },
      ]},
    ]};
    case "case-study":  return { ...base, type, title: "", tags: [], description: "", quote: "", authorName: "", authorRole: "", authorAvatarUrl: "", linkLabel: "Voir le case study", linkUrl: "", mediaUrl: "", metrics: [] };
  }
}

const INTEGRATION_META: Record<IntegrationKey, { label: string; description: string; logo: React.ReactNode }> = {
  google_calendar: {
    label: "Google Calendar",
    description: "Calendrier de prise de rendez-vous",
    logo: (
      <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="3" fill="#fff" stroke="#e0e0e0" />
        <rect x="2" y="9" width="28" height="3" fill="#4285F4" />
        <rect x="2" y="2" width="28" height="7" rx="3" fill="#4285F4" />
        <circle cx="10" cy="4.5" r="1.5" fill="#fff" />
        <circle cx="22" cy="4.5" r="1.5" fill="#fff" />
        <text x="16" y="24" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#4285F4">31</text>
      </svg>
    ),
  },
  hubspot: {
    label: "HubSpot",
    description: "Page de réunion HubSpot",
    logo: (
      <svg viewBox="0 0 32 32" className="w-4 h-4" fill="none">
        <circle cx="16" cy="16" r="14" fill="#FF7A59" />
        <path d="M19 12a3 3 0 0 0-3-3V6h-2v3a3 3 0 0 0-3 3v.5a3 3 0 0 0 1.5 2.6v3.4h2v-3.4A3 3 0 0 0 16 13h3v-1z" fill="white" />
        <circle cx="20" cy="21" r="3.5" fill="white" />
        <circle cx="20" cy="21" r="2" fill="#FF7A59" />
      </svg>
    ),
  },
};

const BLOCK_LABELS: Record<string, string> = {
  heading: "Titre", text: "Texte", image: "Image", video: "Vidéo", embed: "Embed",
  pdf: "PDF", divider: "Séparateur", spacer: "Espace", pricing: "Pricing",
  cta: "CTA", metrics: "Métriques", testimonial: "Témoignage",
  timeline: "Timeline", faq: "FAQ", signature: "Signature",
  team: "Équipe", enjeux: "Enjeux", "case-study": "Case Study",
};

interface AddBlockMenuProps {
  onAdd: (block: ProposalBlock) => void;
  isPremium?: boolean;
  blockCount?: number;
  integrations?: Partial<Record<IntegrationKey, { embedCode: string }>>;
  savedBlocks?: LibrarySavedBlock[];
  proposalCommercialPdfUrl?: string | null;
}

export function AddBlockMenu({ onAdd, isPremium = true, blockCount = 0, integrations = {}, savedBlocks = [], proposalCommercialPdfUrl }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{
    triggerTop: number;
    triggerBottom: number;
    left: number;
    openUp: boolean;
    maxHeight: number;
  } | null>(null);

  const atBlockLimit = !isPremium && blockCount >= FREE_LIMITS.blocks;

  function openMenu() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const MENU_WIDTH = 288; // w-72
    const GAP = 8;
    const VIEWPORT_PADDING = 12;

    const spaceBelow = window.innerHeight - rect.bottom - GAP - VIEWPORT_PADDING;
    const spaceAbove = rect.top - GAP - VIEWPORT_PADDING;

    // Open upward only when space below is insufficient AND space above is larger
    const openUp = spaceBelow < 340 && spaceAbove > spaceBelow;

    // Clamp left so menu stays within viewport
    const rawLeft = rect.left + rect.width / 2 - MENU_WIDTH / 2;
    const left = Math.max(VIEWPORT_PADDING, Math.min(rawLeft, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING));

    setMenuPos({
      triggerTop: rect.top,
      triggerBottom: rect.bottom,
      left,
      openUp,
      maxHeight: Math.min(openUp ? spaceAbove : spaceBelow, window.innerHeight * 0.75),
    });
    setOpen(true);
  }

  function handleBlockClick(type: BlockType) {
    if (atBlockLimit) {
      toast.error(`Plan Free limité à ${FREE_LIMITS.blocks} blocs. Passez en Premium pour continuer.`);
      return;
    }
    onAdd(createBlock(type));
    setOpen(false);
  }

  function handleFavoriteClick(saved: LibrarySavedBlock) {
    let data: Omit<ProposalBlock, "id">;
    try { data = JSON.parse(saved.data); } catch { return; }
    const block: ProposalBlock = {
      ...data,
      id: nanoid(),
      ...(saved.mode === "ultra" ? { _savedBlockId: saved.id, _savedMode: "ultra" as const } : {}),
    } as ProposalBlock;
    onAdd(block);
    setOpen(false);
    toast.success(`"${saved.name}" ajouté`);
  }

  return (
    <div
      className="relative flex justify-center items-center my-0.5 h-8 group/add"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        ref={btnRef}
        type="button"
        onClick={() => { if (open) setOpen(false); else openMenu(); }}
        className="relative z-10 flex items-center gap-1.5 rounded-full transition-all duration-200"
        style={hovered || open
          ? {
              paddingLeft: 12, paddingRight: 14, paddingTop: 5, paddingBottom: 5,
              backgroundColor: "var(--primary)",
              color: "#fff",
              boxShadow: "0 2px 10px rgba(17,17,132,0.22)",
            }
          : {
              width: 20, height: 20,
              backgroundColor: "transparent",
              color: "transparent",
            }
        }
      >
        <Plus className="w-3 h-3 flex-shrink-0" />
        {(hovered || open) && (
          <span className="text-xs font-semibold whitespace-nowrap leading-none">Ajouter un bloc</span>
        )}
      </button>

      {open && menuPos && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[9999] rounded-2xl p-3 w-72 overflow-y-auto"
            style={{
              background: "var(--surface)",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "var(--shadow-dropdown)",
              top: menuPos.openUp ? undefined : menuPos.triggerBottom + 8,
              bottom: menuPos.openUp ? window.innerHeight - menuPos.triggerTop + 8 : undefined,
              left: menuPos.left,
              maxHeight: menuPos.maxHeight,
            }}
          >
            {/* Free plan limit banner */}
            {atBlockLimit && (
              <div className="mb-3 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
                style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a" }}>
                <Lock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#92400e" }} />
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#92400e" }}>Limite Free atteinte</p>
                  <p className="text-[11px]" style={{ color: "#b45309" }}>{FREE_LIMITS.blocks} blocs max · Passez en Premium</p>
                </div>
              </div>
            )}

            {BLOCK_GROUPS.map(group => (
              <div key={group.label} className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 px-2 pb-1.5 uppercase tracking-widest">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map(({ type, label, icon, description }) => (
                    <button key={type} type="button"
                      onClick={() => handleBlockClick(type)}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl transition text-left group/item ${
                        atBlockLimit
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition ${
                        atBlockLimit ? "bg-gray-100 text-gray-300" : "bg-gray-100 group-hover/item:bg-gray-200 text-gray-500"
                      }`}>
                        {atBlockLimit ? <Lock className="w-3.5 h-3.5" /> : icon}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${atBlockLimit ? "text-gray-400" : "text-gray-800"}`}>{label}</p>
                        <p className="text-xs text-gray-400">{description}</p>
                      </div>
                      {atBlockLimit && (
                        <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: "#e8e8ff", color: "#111184" }}>
                          Premium
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Commercial proposal block — only shown if a PDF was uploaded in onboarding */}
            {proposalCommercialPdfUrl && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 px-2 pb-1.5 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-3 h-3" />
                  Proposition commerciale
                </p>
                <div className="space-y-0.5">
                  <button type="button"
                    onClick={() => {
                      onAdd({
                        id: nanoid(),
                        type: "pdf",
                        url: proposalCommercialPdfUrl,
                        label: "Proposition commerciale",
                        height: 700,
                        width: "full",
                        paddingTop: 16,
                        paddingBottom: 16,
                        isCommercialProposal: true,
                      });
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition text-left group/item hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-rose-50 group-hover/item:bg-rose-100 text-rose-500">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Proposition commerciale</p>
                      <p className="text-xs text-gray-400">Viewer PDF importé depuis l&apos;onboarding</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Favorites group — only shown when saved blocks exist */}
            {savedBlocks.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 px-2 pb-1.5 uppercase tracking-widest flex items-center gap-1.5">
                  <Bookmark className="w-3 h-3" />
                  Favoris
                  <span className="ml-auto normal-case font-normal text-gray-300">{savedBlocks.length}</span>
                </p>
                <div className="space-y-0.5">
                  {savedBlocks.map(saved => (
                    <button key={saved.id} type="button"
                      onClick={() => handleFavoriteClick(saved)}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition text-left group/item hover:bg-gray-50"
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 group-hover/item:bg-indigo-100 text-indigo-500 flex-shrink-0">
                        {saved.mode === "ultra"
                          ? <Zap className="w-3.5 h-3.5" />
                          : <Bookmark className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{saved.name}</p>
                        <p className="text-xs text-gray-400">{BLOCK_LABELS[saved.blockType] ?? saved.blockType}</p>
                      </div>
                      {saved.mode === "ultra" && (
                        <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: "#e8e8ff", color: "#111184" }}>
                          Ultra
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Integrations group — only shown when at least one integration is configured */}
            {Object.keys(integrations).length > 0 && (
              <div className="mb-1">
                <p className="text-[10px] font-semibold text-gray-400 px-2 pb-1.5 uppercase tracking-widest flex items-center gap-1.5">
                  <Plug className="w-3 h-3" />
                  Intégrations
                </p>
                <div className="space-y-0.5">
                  {(Object.keys(integrations) as IntegrationKey[]).map(key => {
                    const meta = INTEGRATION_META[key];
                    const embedCode = integrations[key]!.embedCode;
                    return (
                      <button key={key} type="button"
                        onClick={() => {
                          onAdd(createIntegrationBlock(key, embedCode));
                          setOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl transition text-left group/item hover:bg-gray-50"
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-100 group-hover/item:bg-gray-200">
                          {meta.logo}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{meta.label}</p>
                          <p className="text-xs text-gray-400">{meta.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
