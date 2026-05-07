"use client";

import { useState } from "react";
import { Plus, Type, Image, Video, Minus, DollarSign, MousePointer, Space, BarChart3, Quote, Clock, HelpCircle, FileText, Heading1, FileSignature, Code2, Users, Target, BookMarked } from "lucide-react";
import type { BlockType, ProposalBlock } from "@/types/proposal";
import { nanoid } from "nanoid";

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
    case "pdf":         return { ...base, type, url: "", label: "Document", height: 600 };
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

interface AddBlockMenuProps {
  onAdd: (block: ProposalBlock) => void;
}

export function AddBlockMenu({ onAdd }: AddBlockMenuProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex justify-center items-center my-0.5 h-8 group/add"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
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

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-2 z-30 rounded-2xl p-3 w-72 max-h-[70vh] overflow-y-auto"
            style={{ background: "var(--surface)", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "var(--shadow-dropdown)" }}>
            {BLOCK_GROUPS.map(group => (
              <div key={group.label} className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 px-2 pb-1.5 uppercase tracking-widest">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map(({ type, label, icon, description }) => (
                    <button key={type} type="button"
                      onClick={() => { onAdd(createBlock(type)); setOpen(false); }}
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition text-left group/item">
                      <div className="w-8 h-8 bg-gray-100 group-hover/item:bg-gray-200 rounded-xl flex items-center justify-center text-gray-500 transition flex-shrink-0">
                        {icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-400">{description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
