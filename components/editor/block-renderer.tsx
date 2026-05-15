"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { generateHTML } from "@tiptap/html";
import LinkExt from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { nanoid } from "nanoid";
import { Trash2, Plus, FileSignature, ChevronDown, ChevronUp, BookOpen, Save, X, Download, Users, Upload, Link, Loader2, Plug, FileText } from "lucide-react";
import { useState, useTransition, useRef, useEffect } from "react";
import { saveTestimonial, saveCaseStudy } from "@/app/actions/library";
import { useDirectUpload } from "@/lib/use-direct-upload";
import toast from "react-hot-toast";
import type {
  ProposalBlock, BrandKitData,
  HeadingBlock, TextBlock, ImageBlock, VideoBlock, PdfBlock, EmbedBlock,
  DividerBlock, PricingBlock, CtaBlock, SpacerBlock,
  MetricsBlock, TestimonialBlock, TimelineBlock,
  FaqBlock, SignatureBlock, TeamBlock, TeamMember, EnjeuxBlock, EnjeuxItem, EnjeuxSection,
  CaseStudyBlock, CaseStudyMetric,
  PricingItem, MetricItem, TimelineItem, FaqItem, TestimonialData,
  LibraryTestimonial, LibraryCaseStudy,
} from "@/types/proposal";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function safeParseContent(content: string) {
  if (!content || content === '""' || content === "null") return null;
  try { return JSON.parse(content); } catch { return null; }
}

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com")) return `https://player.vimeo.com/video${u.pathname}`;
    return null;
  } catch { return null; }
}

const currency = (n: number, cur = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(n);

// ─── Heading Block ────────────────────────────────────────────────────────────
function HeadingEditor({ block, onChange }: { block: HeadingBlock; onChange: (b: HeadingBlock) => void }) {
  const sizes: Record<number, string> = { 1: "text-4xl font-extrabold", 2: "text-2xl font-bold", 3: "text-xl font-semibold" };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(l => (
          <button key={l} type="button" onClick={() => onChange({ ...block, level: l as 1 | 2 | 3 })}
            className={`px-2.5 py-1 text-xs rounded font-bold transition ${block.level === l ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
            style={block.level === l ? { backgroundColor: "var(--primary)" } : {}}>
            H{l}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-2">
          {(["left", "center", "right"] as const).map(a => (
            <button key={a} type="button" onClick={() => onChange({ ...block, align: a })}
              className={`px-2 py-0.5 text-xs rounded transition ${block.align === a ? "bg-gray-200" : "text-gray-400 hover:bg-gray-100"}`}>
              {a === "left" ? "←" : a === "center" ? "↔" : "→"}
            </button>
          ))}
        </div>
      </div>
      <input
        type="text"
        value={block.text}
        onChange={e => onChange({ ...block, text: e.target.value })}
        placeholder={`Heading ${block.level}…`}
        className={`w-full bg-transparent border-0 border-b-2 border-dashed border-gray-200 focus:border-gray-400 focus:outline-none py-1 ${sizes[block.level]}`}
        style={{ textAlign: block.align || "left" }}
      />
    </div>
  );
}

function HeadingView({ block, brandKit }: { block: HeadingBlock; brandKit?: BrandKitData }) {
  const sizes: Record<number, string> = { 1: "text-4xl font-extrabold", 2: "text-2xl font-bold", 3: "text-xl font-semibold" };
  const cls = `${sizes[block.level]} leading-tight`;
  const style: React.CSSProperties = { textAlign: block.align || "left", color: block.level === 1 ? brandKit?.primaryColor : undefined };
  if (block.level === 1) return <h1 className={cls} style={style}>{block.text}</h1>;
  if (block.level === 2) return <h2 className={cls} style={style}>{block.text}</h2>;
  return <h3 className={cls} style={style}>{block.text}</h3>;
}

// ─── Text Block ───────────────────────────────────────────────────────────────
const textAlignExt = TextAlign.configure({ types: ["heading", "paragraph"] });

function TextEditor({ block, onChange }: { block: TextBlock; onChange: (b: TextBlock) => void }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, LinkExt.configure({ openOnClick: false }), textAlignExt],
    content: safeParseContent(block.content) ?? { type: "doc", content: [{ type: "paragraph" }] },
    editorProps: {
      attributes: { class: "prose prose-sm max-w-none focus:outline-none min-h-[60px] px-1" },
    },
    onUpdate({ editor }) {
      onChange({ ...block, content: JSON.stringify(editor.getJSON()) });
    },
  });

  return (
    <div className="border border-transparent hover:border-gray-200 focus-within:border-primary-600 rounded-xl transition">
      {editor && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2 py-1.5 border-b border-gray-100 flex-wrap">
            {[
              { label: "B",  cmd: () => editor.chain().focus().toggleBold().run(),                   active: () => editor.isActive("bold") },
              { label: "I",  cmd: () => editor.chain().focus().toggleItalic().run(),                  active: () => editor.isActive("italic") },
              { label: "H1", cmd: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),     active: () => editor.isActive("heading", { level: 1 }) },
              { label: "H2", cmd: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),     active: () => editor.isActive("heading", { level: 2 }) },
              { label: "H3", cmd: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),     active: () => editor.isActive("heading", { level: 3 }) },
              { label: "•",  cmd: () => editor.chain().focus().toggleBulletList().run(),              active: () => editor.isActive("bulletList") },
              { label: "1.", cmd: () => editor.chain().focus().toggleOrderedList().run(),             active: () => editor.isActive("orderedList") },
              { label: "❝",  cmd: () => editor.chain().focus().toggleBlockquote().run(),             active: () => editor.isActive("blockquote") },
              { label: "—",  cmd: () => editor.chain().focus().setHorizontalRule().run(),            active: () => false },
            ].map(({ label, cmd, active }) => (
              <button key={label} type="button" onMouseDown={e => { e.preventDefault(); cmd(); }}
                className={`px-2 py-0.5 text-xs rounded font-medium transition ${active() ? "text-white" : "text-gray-500 hover:bg-gray-100"}`}
                style={active() ? { backgroundColor: "var(--primary)" } : {}}>
                {label}
              </button>
            ))}
            {/* Separator */}
            <div className="w-px h-4 bg-gray-200 mx-0.5" />
            {/* Alignment */}
            {[
              { label: "⬅", align: "left"   as const, title: "Aligner à gauche"  },
              { label: "↔", align: "center" as const, title: "Centrer"           },
              { label: "➡", align: "right"  as const, title: "Aligner à droite"  },
            ].map(({ label, align, title }) => (
              <button key={align} type="button" title={title}
                onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign(align).run(); }}
                className={`px-2 py-0.5 text-xs rounded font-medium transition ${editor.isActive({ textAlign: align }) ? "text-white" : "text-gray-500 hover:bg-gray-100"}`}
                style={editor.isActive({ textAlign: align }) ? { backgroundColor: "var(--primary)" } : {}}>
                {label}
              </button>
            ))}
          </div>
          <div className="p-2">
            <EditorContent editor={editor} />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Image Block ──────────────────────────────────────────────────────────────
function ImageEditor({ block, onChange }: { block: ImageBlock; onChange: (b: ImageBlock) => void }) {
  return (
    <div className="space-y-2">
      <input type="url" value={block.url} onChange={e => onChange({ ...block, url: e.target.value })}
        placeholder="Paste image URL…"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
      {block.url
        ? <img src={block.url} alt={block.alt || ""} className="rounded-lg max-w-full max-h-96 object-cover" />
        : <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl h-40 flex items-center justify-center text-sm text-gray-400">Enter an image URL above</div>
      }
      <input type="text" value={block.caption ?? ""} onChange={e => onChange({ ...block, caption: e.target.value })}
        placeholder="Caption (optional)"
        className="w-full px-3 py-1.5 border border-gray-100 rounded text-xs text-gray-500 focus:outline-none" />
    </div>
  );
}

// ─── Video Block ──────────────────────────────────────────────────────────────
function VideoEditor({ block, onChange }: { block: VideoBlock; onChange: (b: VideoBlock) => void }) {
  const embedUrl = getEmbedUrl(block.url);
  return (
    <div className="space-y-2">
      <input type="url" value={block.url} onChange={e => onChange({ ...block, url: e.target.value })}
        placeholder="YouTube or Vimeo URL…"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
      {embedUrl
        ? <div className="relative" style={{ paddingBottom: "56.25%" }}>
            <iframe src={embedUrl} className="absolute inset-0 w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video" />
          </div>
        : <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl h-40 flex items-center justify-center text-sm text-gray-400">Enter a YouTube or Vimeo URL above</div>
      }
    </div>
  );
}

// ─── PDF Block ────────────────────────────────────────────────────────────────
function PdfEditor({ block, onChange }: { block: PdfBlock; onChange: (b: PdfBlock) => void }) {
  // Commercial proposal blocks are read-only — PDF comes from onboarding
  if (block.isCommercialProposal) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
          <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          <p className="text-xs text-indigo-700">
            Proposition commerciale — modifiable depuis l&apos;onboarding de la propale
          </p>
        </div>
        {block.url && !block.url.includes("GoogleAccessId") && (
          <iframe
            src={block.url}
            style={{ height: block.height ?? 700 }}
            className="w-full rounded-xl border border-gray-200"
            title="Proposition commerciale"
          />
        )}
      </div>
    );
  }

  const isStorageUrl = (block.url ?? "").includes("firebasestorage.googleapis.com");
  const [srcTab, setSrcTab] = useState<"url" | "file">(isStorageUrl ? "file" : "url");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploading, uploadFile } = useDirectUpload();
  const hasUrl = !!(block.url?.trim());

  async function handleFile(file: File) {
    setUploadedFileName(file.name);
    const url = await uploadFile(file, "documents");
    if (!url) { setUploadedFileName(null); return; }
    onChange({ ...block, url });
    toast.success("PDF uploadé !");
  }

  return (
    <div className="space-y-3">
      {/* Source — URL or File */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-500">Fichier PDF</label>
          {hasUrl && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
              <Download className="w-3 h-3" />
              Bouton télécharger actif
            </span>
          )}
        </div>
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-2">
          {([
            { key: "url" as const, icon: Link, label: "Lien URL" },
            { key: "file" as const, icon: Upload, label: "Fichier" },
          ]).map(({ key, icon: Icon, label }) => (
            <button key={key} type="button" onClick={() => setSrcTab(key)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition"
              style={srcTab === key
                ? { backgroundColor: "#fff", color: "#374151", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                : { color: "#9ca3af" }}>
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>

        {srcTab === "url" ? (
          <input type="url" value={block.url} onChange={e => onChange({ ...block, url: e.target.value })}
            placeholder="https://…/document.pdf"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
        ) : (
          <div>
            <div
              className="border-2 border-dashed rounded-lg h-16 flex items-center justify-center gap-2 cursor-pointer transition text-xs"
              style={hasUrl
                ? { borderColor: "#86efac", backgroundColor: "#f0fdf4", color: "#15803d" }
                : { borderColor: "#e5e7eb", color: "#6b7280" }}
              onClick={() => !uploading && fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onDragOver={e => e.preventDefault()}
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 animate-spin text-blue-500" /><span className="text-gray-500">Upload…</span></>
                : hasUrl
                  ? <><Download className="w-4 h-4 text-green-600 flex-shrink-0" /><span className="font-medium">{uploadedFileName ?? "Fichier configuré"}</span><span className="text-green-600/60 ml-1">— cliquer pour remplacer</span></>
                  : <><Upload className="w-4 h-4 text-gray-400" /><span>Glisser un PDF ou <span className="text-blue-500 font-medium">parcourir</span></span></>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500">Hauteur du viewer (px) :</label>
        <input type="number" value={block.height ?? 600} min={300} max={1200} step={50}
          onChange={e => onChange({ ...block, height: Number(e.target.value) })}
          className="w-24 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none" />
      </div>
      {block.url && (
        <div>
          {/* Detect expired/invalid signed PUT URLs (contain GoogleAccessId + Expires) */}
          {block.url.includes("GoogleAccessId") ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <span>⚠️</span>
              <span>URL expirée — re-uploadez le fichier via l'onglet <strong>Fichier</strong> ci-dessus.</span>
            </div>
          ) : (
            <div>
              <iframe src={block.url} style={{ height: block.height ?? 600 }} className="w-full rounded-xl border border-gray-200" title={block.label || "PDF"} />
              <div className="flex items-center justify-end mt-2">
                <a href={block.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition flex-shrink-0">
                  <Download className="w-3.5 h-3.5" />
                  Télécharger
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Metrics Block ────────────────────────────────────────────────────────────
function MetricsEditor({ block, onChange, brandKit }: { block: MetricsBlock; onChange: (b: MetricsBlock) => void; brandKit?: BrandKitData }) {
  function update(id: string, field: keyof MetricItem, val: string) {
    onChange({ ...block, items: block.items.map(i => i.id === id ? { ...i, [field]: val } : i) });
  }
  return (
    <div className="grid grid-cols-3 gap-4">
      {block.items.map(item => (
        <div key={item.id} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100 space-y-1">
          <input type="text" value={item.value} onChange={e => update(item.id, "value", e.target.value)}
            placeholder="10x" className="w-full text-center text-3xl font-extrabold bg-transparent border-b border-dashed border-gray-300 focus:outline-none"
            style={{ color: brandKit?.primaryColor || "var(--primary)" }} />
          <input type="text" value={item.label} onChange={e => update(item.id, "label", e.target.value)}
            placeholder="Label" className="w-full text-center text-sm font-semibold bg-transparent focus:outline-none text-gray-700" />
          <input type="text" value={item.description ?? ""} onChange={e => update(item.id, "description", e.target.value)}
            placeholder="Description (optional)" className="w-full text-center text-xs bg-transparent focus:outline-none text-gray-400" />
        </div>
      ))}
    </div>
  );
}

// ─── Testimonial Block ────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className="transition" style={{ color: n <= value ? "#FBBF24" : "#D1D5DB" }}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function TestimonialEditor({
  block, onChange, library = [],
}: {
  block: TestimonialBlock;
  onChange: (b: TestimonialBlock) => void;
  library?: LibraryTestimonial[];
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update(idx: number, field: keyof TestimonialData, val: string | number) {
    onChange({ ...block, testimonials: block.testimonials.map((t, i) => i === idx ? { ...t, [field]: val } : t) });
  }
  function add() {
    onChange({ ...block, testimonials: [...block.testimonials, { quote: "", author: "", role: "", company: "", rating: 5 }] });
  }
  function remove(idx: number) {
    onChange({ ...block, testimonials: block.testimonials.filter((_, i) => i !== idx) });
  }
  function addFromLibrary(item: LibraryTestimonial) {
    if (block.testimonials.length >= 3) return;
    onChange({ ...block, testimonials: [...block.testimonials, { quote: item.quote, author: item.author, role: item.role, company: item.company, avatarUrl: item.avatarUrl ?? undefined, rating: 5 }] });
    setShowPicker(false);
  }
  function saveToLibrary(t: TestimonialData) {
    if (!t.author) return;
    startTransition(async () => {
      await saveTestimonial({ quote: t.quote, author: t.author, role: t.role, company: t.company, avatarUrl: t.avatarUrl });
      toast.success("Saved to library!");
    });
  }

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="space-y-2">
        <input value={block.title ?? ""} onChange={e => onChange({ ...block, title: e.target.value })}
          placeholder="Titre de la section (ex : Témoignages)"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary-200" />
        <textarea value={block.description ?? ""} onChange={e => onChange({ ...block, description: e.target.value })}
          placeholder="Description de la section (optionnel)" rows={2}
          className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm text-gray-500 resize-none focus:outline-none" />
      </div>

      {/* Cards header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 font-medium">Témoignages ({block.testimonials.length}/3)</span>
        <div className="flex items-center gap-2">
          {library.length > 0 && block.testimonials.length < 3 && (
            <div className="relative">
              <button type="button" onClick={() => setShowPicker(o => !o)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-dashed transition"
                style={{ color: "var(--primary)", borderColor: "var(--primary)" }}>
                <BookOpen className="w-3 h-3" /> Depuis la bibliothèque
              </button>
              {showPicker && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-2 space-y-1 max-h-60 overflow-y-auto">
                  <div className="flex items-center justify-between px-2 pb-1 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-600">Choisir un témoignage</span>
                    <button type="button" onClick={() => setShowPicker(false)}><X className="w-3.5 h-3.5 text-gray-400" /></button>
                  </div>
                  {library.map(item => (
                    <button key={item.id} type="button" onClick={() => addFromLibrary(item)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                      <p className="text-xs font-semibold text-gray-900">{item.author}</p>
                      <p className="text-xs text-gray-500 truncate">{item.quote}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(block.testimonials.length, 1)}, 1fr)` }}>
        {block.testimonials.map((t, idx) => (
          <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-2 relative group">
            {/* Actions */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
              <button type="button" onClick={() => saveToLibrary(t)} disabled={isPending || !t.author}
                title="Sauvegarder" className="text-gray-400 hover:text-primary-600 transition disabled:opacity-30">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => remove(idx)} className="text-red-400 hover:text-red-600 transition">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Stars */}
            <StarRating value={t.rating ?? 5} onChange={n => update(idx, "rating", n)} />
            {/* Media */}
            {t.mediaUrl
              ? <div className="relative rounded-lg overflow-hidden aspect-video bg-gray-200">
                  <img src={t.mediaUrl} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => update(idx, "mediaUrl", "")}
                    className="absolute top-1 right-1 bg-white/80 rounded-full p-0.5 hover:bg-white transition">
                    <X className="w-3 h-3 text-gray-600" />
                  </button>
                </div>
              : <div className="border border-dashed border-gray-200 rounded-lg aspect-video flex flex-col items-center justify-center gap-1 bg-white">
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                  <input value={t.mediaUrl ?? ""} onChange={e => update(idx, "mediaUrl", e.target.value)}
                    placeholder="URL image (optionnel)" className="text-xs text-gray-400 bg-transparent text-center focus:outline-none w-full px-2" />
                </div>}
            {/* Quote */}
            <textarea value={t.quote} onChange={e => update(idx, "quote", e.target.value)}
              placeholder="Citation…" rows={3}
              className="w-full text-sm text-gray-700 bg-white border border-gray-100 rounded-lg px-2 py-1.5 resize-none focus:outline-none" />
            {/* Author */}
            <div className="flex items-center gap-2 pt-1">
              {t.avatarUrl
                ? <img src={t.avatarUrl} alt={t.author} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"/></svg>
                  </div>}
              <div className="flex-1 space-y-1 min-w-0">
                <input value={t.author} onChange={e => update(idx, "author", e.target.value)}
                  placeholder="Prénom Nom" className="w-full text-xs font-semibold bg-transparent focus:outline-none" />
                <input value={[t.role, t.company].filter(Boolean).join(" at ")} onChange={e => {
                  const parts = e.target.value.split(" at ");
                  update(idx, "role", parts[0] ?? "");
                  update(idx, "company", parts[1] ?? "");
                }}
                  placeholder="Poste at Entreprise" className="w-full text-xs text-gray-500 bg-transparent focus:outline-none" />
                <input value={t.avatarUrl ?? ""} onChange={e => update(idx, "avatarUrl", e.target.value)}
                  placeholder="URL avatar" className="w-full text-xs text-gray-300 bg-transparent focus:outline-none" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {block.testimonials.length < 3 && (
        <button type="button" onClick={add}
          className="flex items-center gap-1.5 text-sm transition" style={{ color: "var(--primary)" }}>
          <Plus className="w-3.5 h-3.5" /> Ajouter un témoignage
        </button>
      )}
    </div>
  );
}

function TestimonialView({ block, brandKit }: { block: TestimonialBlock; brandKit?: BrandKitData }) {
  const primary = brandKit?.primaryColor ?? "var(--primary)";
  const cols = block.testimonials.length || 1;

  return (
    <div className="space-y-6">
      {/* Section header */}
      {(block.title || block.description) && (
        <div className="space-y-2">
          {block.title && <h2 className="text-2xl font-bold text-gray-900">{block.title}</h2>}
          {block.description && <p className="text-sm text-gray-500 leading-relaxed">{block.description}</p>}
        </div>
      )}

      {/* Cards */}
      <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {block.testimonials.map((t, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 space-y-4 flex-1">
              {/* Stars */}
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <svg key={n} className="w-4 h-4" fill={(t.rating ?? 5) >= n ? "#FBBF24" : "#E5E7EB"} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Media */}
              {t.mediaUrl && (
                <div className="rounded-xl overflow-hidden aspect-video bg-gray-100">
                  <img src={t.mediaUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Quote */}
              {t.quote && (
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{t.quote}</p>
              )}
            </div>

            {/* Author footer */}
            <div className="px-5 py-4 border-t border-gray-50 flex items-center gap-3">
              {t.avatarUrl
                ? <img src={t.avatarUrl} alt={t.author} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                : <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-100">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>}
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">{t.author}</p>
                <p className="text-xs text-gray-500">{[t.role, t.company].filter(Boolean).join(" at ")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Use Case Block ───────────────────────────────────────────────────────────
// ─── Timeline Block ───────────────────────────────────────────────────────────
function TimelineEditor({ block, onChange }: { block: TimelineBlock; onChange: (b: TimelineBlock) => void }) {
  function update(id: string, field: keyof TimelineItem, val: string) {
    onChange({ ...block, items: block.items.map(i => i.id === id ? { ...i, [field]: val } : i) });
  }
  return (
    <div className="space-y-4">
      {/* Title */}
      <input
        value={block.title ?? ""}
        onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder="Titre de la roadmap…"
        className="w-full text-xl font-bold border-b-2 border-dashed border-gray-200 bg-transparent focus:outline-none focus:border-gray-400 py-1 transition"
      />

      {/* Steps */}
      <div className="space-y-2 pt-1">
        {block.items.map((item, idx) => (
          <div key={item.id} className="flex gap-3 group/step">
            {/* Left: number + connector */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0"
                style={{ backgroundColor: "var(--primary)" }}>
                {String(idx + 1).padStart(2, "0")}
              </div>
              {idx < block.items.length - 1 && (
                <div className="w-0.5 flex-1 min-h-[12px] mt-1.5 rounded-full" style={{ backgroundColor: "var(--primary)", opacity: 0.18 }} />
              )}
            </div>

            {/* Card */}
            <div className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 space-y-2 mb-2 group-hover/step:border-gray-300 transition">
              <div className="flex items-start gap-2">
                <input
                  value={item.date}
                  onChange={e => update(item.id, "date", e.target.value)}
                  placeholder="Phase / Semaine…"
                  className="flex-1 text-xs font-semibold bg-transparent focus:outline-none placeholder-gray-300"
                  style={{ color: "var(--primary)" }}
                />
                <button
                  type="button"
                  onClick={() => onChange({ ...block, items: block.items.filter(i => i.id !== item.id) })}
                  className="opacity-0 group-hover/step:opacity-100 text-gray-300 hover:text-red-400 transition flex-shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                value={item.title}
                onChange={e => update(item.id, "title", e.target.value)}
                placeholder="Titre de l'étape"
                className="w-full text-sm font-semibold text-gray-800 bg-transparent focus:outline-none placeholder-gray-300"
              />
              <textarea
                value={item.description}
                onChange={e => update(item.id, "description", e.target.value)}
                placeholder="Description… (optionnel)"
                rows={2}
                className="w-full text-sm text-gray-400 bg-transparent focus:outline-none resize-none placeholder-gray-300 leading-relaxed"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Add step */}
      <button
        type="button"
        onClick={() => onChange({ ...block, items: [...block.items, { id: nanoid(), date: "", title: "", description: "" }] })}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-dashed border-gray-300 w-full justify-center hover:border-current transition"
        style={{ color: "var(--primary)" }}>
        <Plus className="w-4 h-4" /> Ajouter une étape
      </button>
    </div>
  );
}

// ─── FAQ Block ────────────────────────────────────────────────────────────────
function FaqEditor({ block, onChange }: { block: FaqBlock; onChange: (b: FaqBlock) => void }) {
  function update(id: string, field: keyof FaqItem, val: string) {
    onChange({ ...block, items: block.items.map(i => i.id === id ? { ...i, [field]: val } : i) });
  }
  return (
    <div className="space-y-3">
      <input value={block.title ?? ""} onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder="FAQ title…"
        className="w-full text-lg font-semibold border-b border-dashed border-gray-200 bg-transparent focus:outline-none py-1" />
      <div className="space-y-2">
        {block.items.map(item => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-3 space-y-2 group relative">
            <button type="button" onClick={() => onChange({ ...block, items: block.items.filter(i => i.id !== item.id) })}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <input value={item.question} onChange={e => update(item.id, "question", e.target.value)}
              placeholder="Question?" className="w-full text-sm font-semibold bg-transparent focus:outline-none pr-8" />
            <textarea value={item.answer} onChange={e => update(item.id, "answer", e.target.value)}
              placeholder="Answer…" rows={2}
              className="w-full text-sm text-gray-600 bg-transparent focus:outline-none resize-none" />
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange({ ...block, items: [...block.items, { id: nanoid(), question: "", answer: "" }] })}
        className="flex items-center gap-1.5 text-sm transition" style={{ color: "var(--primary)" }}>
        <Plus className="w-3.5 h-3.5" /> Add question
      </button>
    </div>
  );
}

// ─── Signature Block ──────────────────────────────────────────────────────────
function SignatureEditor({ block, onChange, brandKit }: { block: SignatureBlock; onChange: (b: SignatureBlock) => void; brandKit?: BrandKitData }) {
  return (
    <div className="space-y-3 border-2 border-dashed rounded-xl p-5" style={{ borderColor: brandKit?.primaryColor || "var(--primary)" }}>
      <div className="flex items-center gap-2 mb-1">
        <FileSignature className="w-5 h-5" style={{ color: brandKit?.primaryColor || "var(--primary)" }} />
        <span className="font-semibold text-gray-800">Signature block</span>
      </div>
      <input value={block.contractUrl} onChange={e => onChange({ ...block, contractUrl: e.target.value })}
        placeholder="Contract / signature link (DocuSign, etc.)"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
      <input value={block.buttonLabel} onChange={e => onChange({ ...block, buttonLabel: e.target.value })}
        placeholder="Button label (e.g. Sign the contract)"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
      <textarea value={block.description ?? ""} onChange={e => onChange({ ...block, description: e.target.value })}
        placeholder="Optional message to the client…" rows={2}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none resize-none" />
      {/* Preview */}
      <div className="flex justify-center mt-2">
        <span className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold" style={{ backgroundColor: brandKit?.primaryColor || "var(--primary)" }}>
          {block.buttonLabel || "Sign the contract"}
        </span>
      </div>
    </div>
  );
}

// ─── Pricing Block ────────────────────────────────────────────────────────────
function PricingEditor({ block, onChange, brandKit }: { block: PricingBlock; onChange: (b: PricingBlock) => void; brandKit?: BrandKitData }) {
  const total = block.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  function updateItem(id: string, field: keyof PricingItem, val: string | number) {
    onChange({ ...block, items: block.items.map(i => i.id === id ? { ...i, [field]: val } : i) });
  }
  return (
    <div className="space-y-3">
      <input value={block.title ?? ""} onChange={e => onChange({ ...block, title: e.target.value })}
        placeholder="Pricing table title…"
        className="w-full px-3 py-2 text-lg font-semibold border-0 border-b border-gray-200 focus:outline-none" />
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 text-gray-500 font-medium">Description</th>
            <th className="text-right py-2 text-gray-500 font-medium w-20">Qty</th>
            <th className="text-right py-2 text-gray-500 font-medium w-28">Unit Price</th>
            <th className="text-right py-2 text-gray-500 font-medium w-28">Total</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {block.items.map(item => (
            <tr key={item.id} className="border-b border-gray-50 group">
              <td className="py-2"><input value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)} placeholder="Item" className="w-full focus:outline-none" /></td>
              <td className="py-2"><input type="number" value={item.quantity} onChange={e => updateItem(item.id, "quantity", Number(e.target.value))} className="w-full text-right focus:outline-none" min={0} /></td>
              <td className="py-2"><input type="number" value={item.unitPrice} onChange={e => updateItem(item.id, "unitPrice", Number(e.target.value))} className="w-full text-right focus:outline-none" min={0} step={0.01} /></td>
              <td className="py-2 text-right font-medium">{currency(item.quantity * item.unitPrice, block.currency)}</td>
              <td className="py-2 text-center">
                <button type="button" onClick={() => onChange({ ...block, items: block.items.filter(i => i.id !== item.id) })}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        {block.showTotal && (
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-3 text-right font-semibold text-gray-700">Total</td>
              <td className="pt-3 text-right font-bold text-lg" style={{ color: brandKit?.primaryColor || "var(--primary)" }}>
                {currency(total, block.currency)}
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
      <button type="button" onClick={() => onChange({ ...block, items: [...block.items, { id: nanoid(), description: "", quantity: 1, unitPrice: 0 }] })}
        className="flex items-center gap-1.5 text-sm transition" style={{ color: "var(--primary)" }}>
        <Plus className="w-3.5 h-3.5" /> Add line item
      </button>
    </div>
  );
}

// ─── CTA Block ────────────────────────────────────────────────────────────────
function CtaEditor({ block, onChange, brandKit }: { block: CtaBlock; onChange: (b: CtaBlock) => void; brandKit?: BrandKitData }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <input value={block.label} onChange={e => onChange({ ...block, label: e.target.value })} placeholder="Button label"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
        <input value={block.url} onChange={e => onChange({ ...block, url: e.target.value })} type="url" placeholder="https://…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2" />
      </div>
      <div className={`flex ${block.align === "right" ? "justify-end" : block.align === "center" ? "justify-center" : "justify-start"}`}>
        <span className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white" style={{ backgroundColor: brandKit?.primaryColor || "var(--primary)" }}>
          {block.label || "Click me"}
        </span>
      </div>
      <select value={block.align} onChange={e => onChange({ ...block, align: e.target.value as CtaBlock["align"] })}
        className="px-2 py-1 border border-gray-200 rounded text-xs text-gray-500 focus:outline-none">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
    </div>
  );
}

// ─── Embed Block ─────────────────────────────────────────────────────────────

/** Parse a raw iframe tag and extract src, width, height */
function parseIframeAttrs(html: string): { src: string; width: number; height: number } | null {
  const tag = html.match(/<iframe[^>]*>/i)?.[0];
  if (!tag) return null;
  const src = tag.match(/src=["']([^"']+)["']/i)?.[1] ?? "";
  const w = parseInt(tag.match(/width=["']?(\d+)/i)?.[1] ?? "0");
  const h = parseInt(tag.match(/height=["']?(\d+)/i)?.[1] ?? "0");
  if (!src || !w || !h) return null;
  return { src, width: w, height: h };
}


// Script injecté dans le srcdoc pour les embeds génériques sans dimensions fixes
const EMBED_RESIZE_SCRIPT = `<script>(function(){
  function send(){
    var h=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight);
    window.parent.postMessage({type:'propaly-embed',h:h},'*');
  }
  if(document.readyState==='complete'){send();}else{window.addEventListener('load',send);}
  if(typeof ResizeObserver!=='undefined'){new ResizeObserver(send).observe(document.body);}
  setTimeout(send,500);
})()\x3c/script>`;

function buildSrcDoc(html: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden}*{box-sizing:border-box}</style></head><body>${html}${EMBED_RESIZE_SCRIPT}</body></html>`;
}

/** Responsive container with fixed aspect ratio — for iframes with explicit width/height */
function AspectRatioEmbed({ src, width, height, caption, downloadUrl, rounded }: {
  src: string; width: number; height: number; caption?: string; downloadUrl?: string; rounded?: boolean;
}) {
  const ratio = (height / width) * 100;

  return (
    <div>
      <div
        className={`relative w-full overflow-hidden ${rounded ? "rounded-xl" : ""}`}
        style={{ paddingBottom: `${ratio.toFixed(3)}%` }}
      >
        <iframe
          src={src}
          className="absolute inset-0 w-full h-full"
          style={{ border: 0 }}
          allowFullScreen
          title={caption || "Embed"}
        />
      </div>
      {(caption || downloadUrl) && (
        <div className="flex items-center justify-between mt-2 gap-2">
          {caption ? <p className="text-sm text-gray-400">{caption}</p> : <span />}
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Auto-resize generic embed via postMessage (for script-based embeds without explicit dims) */
function GenericEmbed({ html, caption, downloadUrl, rounded }: { html: string; caption?: string; downloadUrl?: string; rounded?: boolean }) {
  const [height, setHeight] = useState(80);
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      if (e.data?.type === "propaly-embed" && typeof e.data.h === "number" && e.data.h > 0) {
        setHeight(e.data.h);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div>
      <iframe
        ref={ref}
        srcDoc={buildSrcDoc(html)}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        scrolling="no"
        className={rounded ? "w-full rounded-xl" : "w-full"}
        style={{ height, border: 0, display: "block" }}
        title={caption || "Embed"}
      />
      {(caption || downloadUrl) && (
        <div className="flex items-center justify-between mt-2 gap-2">
          {caption ? <p className="text-sm text-gray-400">{caption}</p> : <span />}
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger
            </a>
          )}
        </div>
      )}
    </div>
  );
}

/** Entry-point: routes to the right renderer based on iframe attributes */
function EmbedFrame({ html, caption, downloadUrl, rounded = false }: { html: string; caption?: string; downloadUrl?: string; rounded?: boolean }) {
  // Google Calendar: bypass srcdoc (nested iframes break in sandboxed contexts on mobile)
  // Render as a direct fixed-height iframe
  if (html.includes("calendar.google.com")) {
    const srcMatch = html.match(/src=["']([^"']+)["']/i);
    const src = srcMatch?.[1] ?? "";
    if (src) {
      return (
        <div>
          <div className={`overflow-hidden ${rounded ? "rounded-xl" : ""}`} style={{ height: 600 }}>
            <iframe
              src={src}
              style={{ width: "100%", height: "100%", border: 0 }}
              title="Google Calendar"
            />
          </div>
          {(caption || downloadUrl) && (
            <div className="flex items-center justify-between mt-2 gap-2">
              {caption ? <p className="text-sm text-gray-400">{caption}</p> : <span />}
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition flex-shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  Télécharger
                </a>
              )}
            </div>
          )}
        </div>
      );
    }
  }

  const parsed = parseIframeAttrs(html);
  if (parsed) {
    return <AspectRatioEmbed {...parsed} caption={caption} downloadUrl={downloadUrl} rounded={rounded} />;
  }
  return <GenericEmbed html={html} caption={caption} downloadUrl={downloadUrl} rounded={rounded} />;
}

function extractLoomId(url: string): string | null {
  const match = url.trim().match(/loom\.com\/(?:share|embed)\/([a-f0-9]+)/i);
  return match?.[1] ?? null;
}
function buildLoomEmbed(videoId: string): string {
  return `<div style="position: relative; padding-bottom: 56.25%; height: 0;"><iframe src="https://www.loom.com/embed/${videoId}" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"></iframe></div>`;
}

function EmbedEditor({ block, onChange }: { block: EmbedBlock; onChange: (b: EmbedBlock) => void }) {
  // Loom integration: editable URL, updates embed HTML in place
  if (block.integrationKey === "loom") {
    const currentIdMatch = block.html.match(/loom\.com\/embed\/([a-f0-9]+)/i);
    const currentUrl = currentIdMatch ? `https://www.loom.com/embed/${currentIdMatch[1]}` : "";
    return (
      <div className="space-y-2">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Lien de la vidéo Loom</label>
          <div className="flex gap-2">
            <input
              type="text"
              defaultValue={currentUrl}
              placeholder="https://www.loom.com/share/…"
              onBlur={e => {
                const id = extractLoomId(e.target.value);
                if (id) onChange({ ...block, html: buildLoomEmbed(id) });
                else if (e.target.value.trim()) toast.error("Lien Loom invalide");
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const id = extractLoomId((e.target as HTMLInputElement).value);
                  if (id) onChange({ ...block, html: buildLoomEmbed(id) });
                  else toast.error("Lien Loom invalide");
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 bg-gray-50"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Accepte les liens /share/ et /embed/ — Entrée pour valider</p>
        </div>
        {block.html.trim() && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <EmbedFrame html={block.html} downloadUrl={block.downloadUrl} />
          </div>
        )}
      </div>
    );
  }

  // Other integration blocks (Google Calendar, HubSpot) are read-only in the editor
  if (block.integrationKey) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
          <Plug className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
          <p className="text-xs text-indigo-700">
            Bloc intégration — modifiable depuis l&apos;onglet <strong>Intégrations</strong>
          </p>
        </div>
        {block.html.trim() && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <EmbedFrame html={block.html} downloadUrl={block.downloadUrl} />
          </div>
        )}
      </div>
    );
  }

  const hasHtml = block.html.trim().length > 0;
  // Default to "file" tab if the existing downloadUrl looks like a Storage URL
  const isStorageUrl = (block.downloadUrl ?? "").includes("firebasestorage.googleapis.com");
  const [dlTab, setDlTab] = useState<"url" | "file">(isStorageUrl ? "file" : "url");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploading: fileUploading, uploadFile } = useDirectUpload();

  const hasDownload = !!(block.downloadUrl?.trim());

  async function handleFile(file: File) {
    setUploadedFileName(file.name);
    const url = await uploadFile(file, "documents");
    if (!url) { setUploadedFileName(null); return; }
    onChange({ ...block, downloadUrl: url });
    toast.success("Fichier uploadé !");
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Code embed (iframe, script…)</label>
        <textarea
          value={block.html}
          onChange={e => onChange({ ...block, html: e.target.value })}
          placeholder={'<iframe src="https://…" width="100%" height="400" frameborder="0"></iframe>'}
          rows={5}
          spellCheck={false}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 resize-y bg-gray-50"
        />
      </div>

      {/* Download link — URL or File */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-500">Lien de téléchargement (optionnel)</label>
          {/* Status badge — visible as soon as a URL is configured */}
          {hasDownload && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
              <Download className="w-3 h-3" />
              Bouton actif sur la propale
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-2">
          {([
            { key: "url" as const, icon: Link, label: "Lien URL" },
            { key: "file" as const, icon: Upload, label: "Fichier" },
          ]).map(({ key, icon: Icon, label }) => (
            <button key={key} type="button" onClick={() => setDlTab(key)}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition"
              style={dlTab === key
                ? { backgroundColor: "#fff", color: "#374151", boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }
                : { color: "#9ca3af" }}>
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>

        {dlTab === "url" ? (
          <input
            type="url"
            value={block.downloadUrl ?? ""}
            onChange={e => onChange({ ...block, downloadUrl: e.target.value || undefined })}
            placeholder="https://… — affiche un bouton « Télécharger »"
            className="w-full px-3 py-1.5 border border-gray-100 rounded-lg text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        ) : (
          <div>
            <div
              className="border-2 border-dashed rounded-lg h-16 flex items-center justify-center gap-2 cursor-pointer transition text-xs"
              style={hasDownload
                ? { borderColor: "#86efac", backgroundColor: "#f0fdf4", color: "#15803d" }
                : { borderColor: "#e5e7eb", color: "#6b7280" }}
              onClick={() => !fileUploading && fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onDragOver={e => e.preventDefault()}
            >
              {fileUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin text-blue-500" /><span className="text-gray-500">Upload en cours…</span></>
              ) : hasDownload ? (
                <>
                  <Download className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="font-medium truncate max-w-[160px]">
                    {uploadedFileName ?? "Fichier configuré"}
                  </span>
                  <span className="text-green-600/60">— cliquer pour remplacer</span>
                </>
              ) : (
                <><Upload className="w-4 h-4 text-gray-400" /><span>Glisser un fichier ou <span className="text-blue-500 font-medium">parcourir</span></span></>
              )}
            </div>
            <input ref={fileRef} type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
            {hasDownload && (
              <button type="button" onClick={() => { onChange({ ...block, downloadUrl: undefined }); setUploadedFileName(null); }}
                className="mt-1 text-xs text-red-400 hover:text-red-600 transition flex items-center gap-1">
                <X className="w-3 h-3" /> Supprimer le fichier
              </button>
            )}
          </div>
        )}
      </div>

      <input
        type="text"
        value={block.caption ?? ""}
        onChange={e => onChange({ ...block, caption: e.target.value })}
        placeholder="Légende (optionnel)"
        className="w-full px-3 py-1.5 border border-gray-100 rounded text-xs text-gray-500 focus:outline-none"
      />
      {hasHtml && (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <p className="text-xs text-gray-400 px-3 py-1.5 bg-gray-50 border-b border-gray-100 font-medium">Aperçu</p>
          <EmbedFrame html={block.html} downloadUrl={block.downloadUrl} />
        </div>
      )}
    </div>
  );
}

function EmbedView({ block }: { block: EmbedBlock }) {
  if (!block.html.trim()) return null;
  return <EmbedFrame html={block.html} caption={block.caption} downloadUrl={block.downloadUrl} rounded />;
}

// ─── Read-only views ──────────────────────────────────────────────────────────
function FaqAccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition">
        <span className="font-semibold text-sm pr-4">{item.question}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-6 pb-6 pt-4 text-sm text-gray-500 leading-relaxed border-t border-gray-100">
          {item.answer}
        </div>
      )}
    </div>
  );
}

// ─── Case Study Block ────────────────────────────────────────────────────────
function CaseStudyEditor({ block, onChange, library = [] }: { block: CaseStudyBlock; onChange: (b: CaseStudyBlock) => void; library?: LibraryCaseStudy[] }) {
  const [tagInput, setTagInput] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Track which library entry this block was loaded from (to update instead of duplicate)
  const [libraryId, setLibraryId] = useState<string | undefined>(undefined);

  function addTag() {
    const t = tagInput.trim();
    if (!t || block.tags.includes(t)) return;
    onChange({ ...block, tags: [...block.tags, t] });
    setTagInput("");
  }
  function removeTag(t: string) { onChange({ ...block, tags: block.tags.filter(x => x !== t) }); }

  function updateMetric(id: string, field: keyof CaseStudyMetric, val: string) {
    onChange({ ...block, metrics: (block.metrics ?? []).map(m => m.id === id ? { ...m, [field]: val } : m) });
  }
  const metrics = block.metrics ?? [];

  function loadFromLibrary(item: LibraryCaseStudy) {
    onChange({
      ...block,
      title: item.title,
      tags: item.tags,
      description: item.description,
      quote: item.quote ?? undefined,
      authorName: item.authorName ?? undefined,
      authorRole: item.authorRole ?? undefined,
      authorAvatarUrl: item.authorAvatarUrl ?? undefined,
      linkLabel: item.linkLabel ?? undefined,
      linkUrl: item.linkUrl ?? undefined,
      mediaUrl: item.mediaUrl ?? undefined,
      metrics: item.metrics,
    });
    setLibraryId(item.id); // remember origin so save = update, not duplicate
    setShowPicker(false);
  }

  function saveToLibrary() {
    if (!block.title) return;
    startTransition(async () => {
      await saveCaseStudy({
        id: libraryId, // undefined → create new; set → update existing
        title: block.title,
        tags: block.tags,
        description: block.description,
        quote: block.quote,
        authorName: block.authorName,
        authorRole: block.authorRole,
        authorAvatarUrl: block.authorAvatarUrl,
        linkLabel: block.linkLabel,
        linkUrl: block.linkUrl,
        mediaUrl: block.mediaUrl,
        metrics: block.metrics ?? [],
      });
      toast.success(libraryId ? "Case study mis à jour dans la bibliothèque" : "Case study sauvegardé dans la bibliothèque");
    });
  }

  return (
    <div className="space-y-4">
      {/* Library toolbar */}
      <div className="flex items-center justify-between">
        <div className="relative">
          {library.length > 0 && (
            <>
              <button type="button" onClick={() => setShowPicker(o => !o)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-dashed transition"
                style={{ color: "var(--primary)", borderColor: "var(--primary)" }}>
                <BookOpen className="w-3 h-3" /> Depuis la bibliothèque
              </button>
              {showPicker && (
                <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg z-20 p-2 space-y-1 max-h-60 overflow-y-auto">
                  <div className="flex items-center justify-between px-2 pb-1 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-600">Charger un case study</span>
                    <button type="button" onClick={() => setShowPicker(false)}><X className="w-3.5 h-3.5 text-gray-400" /></button>
                  </div>
                  {library.map(item => (
                    <button key={item.id} type="button" onClick={() => loadFromLibrary(item)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                      <p className="text-xs font-semibold text-gray-900">{item.title}</p>
                      {item.tags.length > 0 && (
                        <p className="text-xs text-gray-400 truncate">{item.tags.join(", ")}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <button type="button" onClick={saveToLibrary} disabled={isPending || !block.title}
          title="Sauvegarder dans la bibliothèque"
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-dashed transition text-gray-400 hover:text-primary-600 hover:border-primary-400 disabled:opacity-30">
          <Save className="w-3 h-3" /> Sauvegarder
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* ── Left column ── */}
        <div className="space-y-3">
          {/* Title */}
          <input value={block.title} onChange={e => onChange({ ...block, title: e.target.value })}
            placeholder="Titre du case study"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary-200" />

          {/* Tags */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {block.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}>
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:opacity-60 transition"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Ajouter un tag service…"
                className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none" />
              <button type="button" onClick={addTag}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50 transition">+</button>
            </div>
          </div>

          {/* Description */}
          <textarea value={block.description} onChange={e => onChange({ ...block, description: e.target.value })}
            placeholder="Description du case study" rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 resize-none focus:outline-none" />

          {/* Quote */}
          <div className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
            <textarea value={block.quote ?? ""} onChange={e => onChange({ ...block, quote: e.target.value })}
              placeholder="Citation client (optionnel)" rows={3}
              className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-sm italic bg-white resize-none focus:outline-none" />
            <div className="flex items-center gap-2">
              <input value={block.authorAvatarUrl ?? ""} onChange={e => onChange({ ...block, authorAvatarUrl: e.target.value })}
                placeholder="URL avatar" className="flex-1 px-2 py-1 text-xs border border-gray-100 rounded bg-white focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={block.authorName ?? ""} onChange={e => onChange({ ...block, authorName: e.target.value })}
                placeholder="Nom auteur" className="px-2 py-1 text-xs font-semibold border border-gray-100 rounded bg-white focus:outline-none" />
              <input value={block.authorRole ?? ""} onChange={e => onChange({ ...block, authorRole: e.target.value })}
                placeholder="Poste chez Entreprise" className="px-2 py-1 text-xs border border-gray-100 rounded bg-white focus:outline-none" />
            </div>
          </div>

          {/* Link */}
          <div className="flex gap-2">
            <input value={block.linkLabel ?? ""} onChange={e => onChange({ ...block, linkLabel: e.target.value })}
              placeholder="Libellé du lien" className="w-1/3 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
            <input value={block.linkUrl ?? ""} onChange={e => onChange({ ...block, linkUrl: e.target.value })}
              placeholder="https://…" className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none" />
          </div>
        </div>

        {/* ── Right column : media ── */}
        <div className="space-y-3">
          {block.mediaUrl ? (
            <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
              <img src={block.mediaUrl} alt="Media" className="w-full h-full object-cover" />
              <button type="button" onClick={() => onChange({ ...block, mediaUrl: "" })}
                className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 shadow transition">
                <X className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-200 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center gap-3 bg-gray-50">
              <div className="text-gray-300"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg></div>
              <p className="text-xs text-gray-400 text-center px-4">Image ou vidéo<br /><span className="text-gray-300">PNG, JPEG, WEBP, GIF, MP4</span></p>
            </div>
          )}
          <input value={block.mediaUrl ?? ""} onChange={e => onChange({ ...block, mediaUrl: e.target.value })}
            placeholder="URL de l'image / vidéo"
            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-500 focus:outline-none" />
        </div>
      </div>

      {/* ── Key metrics (optional, up to 3) ── */}
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500">Chiffres clés (optionnel — max 3)</p>
          {metrics.length < 3 && (
            <button type="button"
              onClick={() => onChange({ ...block, metrics: [...metrics, { id: nanoid(), value: "", label: "" }] })}
              className="text-xs text-primary-600 hover:underline">+ Ajouter</button>
          )}
        </div>
        {metrics.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {metrics.map(m => (
              <div key={m.id} className="relative border border-gray-200 rounded-xl p-2 bg-gray-50 space-y-1">
                <button type="button" onClick={() => onChange({ ...block, metrics: metrics.filter(x => x.id !== m.id) })}
                  className="absolute top-1.5 right-1.5 text-gray-300 hover:text-red-400 transition"><X className="w-3 h-3" /></button>
                <input value={m.value} onChange={e => updateMetric(m.id, "value", e.target.value)}
                  placeholder="+200%" className="w-full px-2 py-1 text-sm font-bold border border-gray-100 rounded bg-white focus:outline-none text-center" />
                <input value={m.label} onChange={e => updateMetric(m.id, "label", e.target.value)}
                  placeholder="Label" className="w-full px-2 py-1 text-xs border border-gray-100 rounded bg-white focus:outline-none text-center text-gray-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CaseStudyView({ block, brandKit }: { block: CaseStudyBlock; brandKit?: BrandKitData }) {
  const primary = brandKit?.primaryColor ?? "var(--primary)";
  const primaryLight = primary + "14";
  const hasQuote = !!block.quote;
  const hasLink = !!(block.linkUrl && block.linkLabel);
  const metrics = (block.metrics ?? []).filter(m => m.value || m.label);
  const isVideo = block.mediaUrl?.match(/\.(mp4|webm|ogg)$/i);
  const hasMedia = !!block.mediaUrl;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
      {/* ── Main : content + media ── */}
      <div className={`grid gap-10 items-center ${hasMedia ? "grid-cols-[1fr_1.1fr]" : "grid-cols-1"}`}>

        {/* Left — text content */}
        <div className="space-y-4">
          {/* Tags + Title + byline — groupe serré */}
          <div className="space-y-2">
            {block.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {block.tags.map(t => (
                  <span key={t} className="px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase"
                    style={{ backgroundColor: primaryLight, color: primary }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
            {block.title && (
              <h2 className="text-2xl font-bold text-gray-900 leading-snug">{block.title}</h2>
            )}
            {block.authorName && (
              <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "8px" }}>
                {block.authorAvatarUrl
                  ? <img src={block.authorAvatarUrl} alt={block.authorName}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                  : <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", backgroundColor: primary, minWidth: "1.5rem", width: "1.5rem", height: "1.5rem", borderRadius: "9999px", color: "#fff", fontSize: "10px", fontWeight: 700, flexShrink: 0 }}>
                      {block.authorName.charAt(0).toUpperCase()}
                    </span>}
                <span className="text-sm text-gray-500">
                  <span className="font-medium text-gray-700">{block.authorName}</span>
                  {block.authorRole && <span className="text-gray-400"> · {block.authorRole}</span>}
                </span>
              </div>
            )}
          </div>

          {block.description && (
            <p className="text-[15px] text-gray-500 leading-relaxed">{block.description}</p>
          )}

          {/* Citation seule, sans répéter l'auteur */}
          {block.quote && (
            <div className="pl-4 border-l-2" style={{ borderColor: primary }}>
              <p className="text-sm italic text-gray-600 leading-relaxed">
                &ldquo;{block.quote}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Right — media */}
        {hasMedia && (
          <div className="rounded-2xl overflow-hidden shadow-md"
            style={{ aspectRatio: "16/10" }}>
            {isVideo
              ? <video src={block.mediaUrl} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              : <img src={block.mediaUrl!} alt={block.title} className="w-full h-full object-cover" />}
          </div>
        )}
      </div>

      {/* ── Bottom : métriques (+ CTA intégré si lien) ── */}
      {metrics.length > 0 && (
        <div className="mt-8 flex items-stretch rounded-2xl overflow-hidden border border-gray-100">
          {metrics.map((m, i) => (
            <div key={m.id}
              className={`flex-1 flex flex-col items-center justify-center py-5 px-4 ${i > 0 ? "border-l border-gray-100" : ""}`}
              style={{ backgroundColor: primaryLight }}>
              <p className="text-2xl font-extrabold leading-none" style={{ color: primary }}>{m.value}</p>
              <p className="text-xs text-gray-500 mt-1.5 text-center">{m.label}</p>
            </div>
          ))}
          {hasLink && (
            <div className="border-l border-gray-100 flex items-center justify-center px-6 py-4"
              style={{ backgroundColor: primaryLight }}>
              <a href={block.linkUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap transition hover:opacity-70"
                style={{ color: primary }}>
                {block.linkLabel}
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>
          )}
        </div>
      )}

      {/* CTA seul, sans métriques */}
      {hasLink && metrics.length === 0 && (
        <div className="mt-6 flex justify-end">
          <a href={block.linkUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold transition hover:opacity-70"
            style={{ color: primary }}>
            {block.linkLabel}
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}

// ─── Enjeux Block ────────────────────────────────────────────────────────────

const ENJEUX_ICONS = ["✅","⚡","🎯","💡","🔥","⭐","🚀","💎","🛡️","📈","🤝","🏆","👉","⚠️","❓"];

/** Normalize block to always use sections array (backward compat) */
function normalizeEnjeuxSections(block: EnjeuxBlock): EnjeuxSection[] {
  if (block.sections && block.sections.length > 0) return block.sections;
  // Legacy flat mode
  return [{
    id: block.id + "_s0",
    tag: block.tag,
    title: block.title,
    subtitle: block.subtitle,
    items: block.items ?? [],
  }];
}

function EnjeuxSectionEditor({
  section, idx, onChange, onRemove, canRemove, sectionStartIdx,
}: {
  section: EnjeuxSection;
  idx: number;
  onChange: (s: EnjeuxSection) => void;
  onRemove: () => void;
  canRemove: boolean;
  sectionStartIdx: number;
}) {
  const markerType = section.markerType ?? "number";
  const [iconPickerOpen, setIconPickerOpen] = useState<string | null>(null); // item id

  function updateItem(id: string, field: keyof EnjeuxItem, val: string) {
    onChange({ ...section, items: section.items.map(it => it.id === id ? { ...it, [field]: val } : it) });
  }
  function addItem() {
    onChange({ ...section, items: [...section.items, { id: nanoid(), title: "", description: "", icon: ENJEUX_ICONS[0] }] });
  }
  function removeItem(id: string) {
    onChange({ ...section, items: section.items.filter(it => it.id !== id) });
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-gray-50/50">
      {/* Section header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Section {idx + 1}</span>
          {/* Toggle chiffres / icônes par section */}
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden text-xs font-medium bg-white">
            <button type="button"
              onClick={() => onChange({ ...section, markerType: "number" })}
              className={`px-2.5 py-1 transition ${markerType === "number" ? "text-white" : "text-gray-400 hover:bg-gray-50"}`}
              style={markerType === "number" ? { backgroundColor: "var(--primary)" } : {}}>
              🔢
            </button>
            <button type="button"
              onClick={() => onChange({ ...section, markerType: "icon" })}
              className={`px-2.5 py-1 transition ${markerType === "icon" ? "text-white" : "text-gray-400 hover:bg-gray-50"}`}
              style={markerType === "icon" ? { backgroundColor: "var(--primary)" } : {}}>
              ✨
            </button>
          </div>
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 transition">
            <X className="w-3 h-3" /> Supprimer la section
          </button>
        )}
      </div>

      {/* Header fields */}
      <div className="space-y-2">
        <input value={section.tag ?? ""} onChange={e => onChange({ ...section, tag: e.target.value })}
          placeholder="Tag / étiquette (ex : Enjeux)" maxLength={40}
          className="px-3 py-1.5 border border-gray-200 rounded-full text-xs font-medium text-gray-500 w-full focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white" />
        <input value={section.title ?? ""} onChange={e => onChange({ ...section, title: e.target.value })}
          placeholder="Titre de la section"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-base font-semibold focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white" />
        <input value={section.subtitle ?? ""} onChange={e => onChange({ ...section, subtitle: e.target.value })}
          placeholder="Sous-titre ou description (optionnel)"
          className="w-full px-3 py-1.5 border border-gray-100 rounded-lg text-sm text-gray-500 focus:outline-none bg-white" />
      </div>

      {/* Items */}
      <div className="space-y-2">
        {section.items.map((item, iIdx) => (
          <div key={item.id} className="flex gap-3 items-start bg-white border border-gray-200 rounded-xl p-3">
            {/* Marker : number or icon picker */}
            {markerType === "icon" ? (
              <div className="relative flex-shrink-0">
                <button type="button"
                  onClick={() => setIconPickerOpen(iconPickerOpen === item.id ? null : item.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:ring-2 transition"
                  style={{ backgroundColor: "var(--primary-light)" }}
                  title="Choisir une icône">
                  {item.icon || ENJEUX_ICONS[0]}
                </button>
                {iconPickerOpen === item.id && (
                  <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg p-2 grid grid-cols-6 gap-1 w-44">
                    {ENJEUX_ICONS.map(ic => (
                      <button key={ic} type="button"
                        onClick={() => { updateItem(item.id, "icon", ic); setIconPickerOpen(null); }}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg text-base hover:bg-gray-100 transition ${item.icon === ic ? "ring-2 ring-primary-400 bg-primary-50" : ""}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}>
                {String(sectionStartIdx + iIdx + 1).padStart(2, "0")}
              </span>
            )}
            <div className="flex-1 space-y-1.5">
              <input value={item.title} onChange={e => updateItem(item.id, "title", e.target.value)}
                placeholder="Titre de l'enjeu"
                className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-semibold bg-white focus:outline-none" />
              <textarea value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)}
                placeholder="Description… (optionnel)"
                rows={2}
                className="w-full px-2 py-1 border border-gray-100 rounded text-sm text-gray-500 bg-white resize-none focus:outline-none" />
            </div>
            <button type="button" onClick={() => removeItem(item.id)}
              className="text-gray-300 hover:text-red-400 transition flex-shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-gray-300 text-sm text-gray-400 hover:border-primary-400 hover:text-primary-600 transition">
          <Plus className="w-4 h-4" /> Ajouter un enjeu
        </button>
      </div>
    </div>
  );
}

function EnjeuxEditor({ block, onChange }: { block: EnjeuxBlock; onChange: (b: EnjeuxBlock) => void }) {
  const sections = normalizeEnjeuxSections(block);
  const resetPerSection = block.resetPerSection ?? false;
  const hasMultipleNumberSections = sections.length > 1 && sections.some(s => (s.markerType ?? "number") === "number");

  function set(patch: Partial<EnjeuxBlock>) {
    onChange({ ...block, ...patch, tag: undefined, title: undefined, subtitle: undefined, items: undefined });
  }
  function updateSection(idx: number, updated: EnjeuxSection) {
    set({ sections: sections.map((s, i) => i === idx ? updated : s) });
  }
  function addSection() {
    set({ sections: [...sections, { id: nanoid(), tag: "", title: "", subtitle: "", items: [], markerType: "number" }] });
  }
  function removeSection(idx: number) {
    set({ sections: sections.filter((_, i) => i !== idx) });
  }

  // Numérotation continue : compte uniquement les sections "number" précédentes
  function getSectionStartIdx(idx: number) {
    if (resetPerSection) return 0;
    let count = 0;
    for (let i = 0; i < idx; i++) {
      if ((sections[i].markerType ?? "number") === "number") count += sections[i].items.length;
    }
    return count;
  }

  return (
    <div className="space-y-3">
      {/* Option reset — si plusieurs sections "number" */}
      {hasMultipleNumberSections && (
        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
          <input type="checkbox" checked={resetPerSection}
            onChange={e => set({ resetPerSection: e.target.checked })}
            className="rounded border-gray-300 accent-primary-600" />
          Recommencer à 01 à chaque section numérotée
        </label>
      )}

      {sections.map((section, idx) => (
        <EnjeuxSectionEditor
          key={section.id}
          section={section}
          idx={idx}
          onChange={updated => updateSection(idx, updated)}
          onRemove={() => removeSection(idx)}
          canRemove={sections.length > 1}
          sectionStartIdx={getSectionStartIdx(idx)}
        />
      ))}
      <button type="button" onClick={addSection}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-400 hover:border-primary-300 hover:text-primary-600 transition">
        <Plus className="w-4 h-4" /> Ajouter une section
      </button>
    </div>
  );
}

function EnjeuxSectionView({
  section, brandKit, startIdx, markerType,
}: {
  section: EnjeuxSection;
  brandKit?: BrandKitData;
  startIdx: number;
  markerType: "number" | "icon";
}) {
  const primary = brandKit?.primaryColor ?? "var(--primary)";
  const primaryLight = primary + "18";

  return (
    <div className="space-y-5">
      {/* Section header */}
      {(section.tag || section.title || section.subtitle) && (
        <div className="space-y-2">
          {section.tag && (
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: primaryLight, color: primary }}>
              {section.tag}
            </span>
          )}
          {section.title && (
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">{section.title}</h2>
          )}
          {section.subtitle && (
            <p className="text-sm text-gray-500 leading-relaxed">{section.subtitle}</p>
          )}
        </div>
      )}

      {/* Items */}
      <div className="space-y-3">
        {section.items.map((item, idx) => {
          const hasDesc = !!item.description?.trim();
          return (
            <div key={item.id}
              className={`flex gap-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${hasDesc ? "items-start" : "items-center"}`}>
              {/* Marker */}
              {markerType === "icon" ? (
                <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-base"
                  style={{ backgroundColor: primaryLight }}>
                  {item.icon || ENJEUX_ICONS[0]}
                </div>
              ) : (
                <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: primaryLight, color: primary }}>
                  {String(startIdx + idx + 1).padStart(2, "0")}
                </div>
              )}
              {/* Content */}
              <div className="flex-1 min-w-0">
                {item.title && (
                  <p className={`font-semibold text-sm text-gray-900 ${hasDesc ? "mb-1" : ""}`}>{item.title}</p>
                )}
                {hasDesc && (
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EnjeuxView({ block, brandKit }: { block: EnjeuxBlock; brandKit?: BrandKitData }) {
  const sections = normalizeEnjeuxSections(block);
  const resetPerSection = block.resetPerSection ?? false;
  let runningIdx = 0;

  return (
    <div className="space-y-10">
      {sections.map(section => {
        const sectionMarkerType = section.markerType ?? "number";
        const startIdx = (resetPerSection || sectionMarkerType === "icon") ? 0 : runningIdx;
        const view = (
          <EnjeuxSectionView
            key={section.id}
            section={section}
            brandKit={brandKit}
            startIdx={startIdx}
            markerType={sectionMarkerType}
          />
        );
        if (sectionMarkerType === "number") runningIdx += section.items.length;
        return view;
      })}
    </div>
  );
}

// ─── Team Block ───────────────────────────────────────────────────────────────
function TeamEditor({ block, onChange }: { block: TeamBlock; onChange: (b: TeamBlock) => void }) {
  const count = block.members.length;

  function updateMember(id: string, field: keyof TeamMember, val: string) {
    onChange({ ...block, members: block.members.map(m => m.id === id ? { ...m, [field]: val } : m) });
  }

  function setCount(n: number) {
    if (n > count) {
      const added: TeamMember[] = Array.from({ length: n - count }, () => ({
        id: nanoid(), name: "", role: "", photoUrl: "", email: "", phone: "",
      }));
      onChange({ ...block, members: [...block.members, ...added] });
    } else {
      onChange({ ...block, members: block.members.slice(0, n) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Users className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">Team members</span>
        <div className="flex items-center gap-1 ml-auto">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button key={n} type="button" onClick={() => setCount(n)}
              className={`w-6 h-6 rounded text-xs font-medium transition ${count === n ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
              style={count === n ? { backgroundColor: "var(--primary)" } : {}}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {block.members.map(member => (
          <div key={member.id} className="border border-gray-200 rounded-xl p-3 bg-gray-50 space-y-2">
            <div className="flex items-start gap-3">
              {/* Avatar preview */}
              <div className="flex-shrink-0">
                {member.photoUrl
                  ? <img src={member.photoUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                  : <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                      {member.name ? member.name.charAt(0).toUpperCase() : "?"}
                    </div>}
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <input value={member.name} onChange={e => updateMember(member.id, "name", e.target.value)}
                    placeholder="Name" className="px-2 py-1 text-sm font-semibold bg-white border border-gray-200 rounded focus:outline-none" />
                  <input value={member.role} onChange={e => updateMember(member.id, "role", e.target.value)}
                    placeholder="Job title" className="px-2 py-1 text-sm text-gray-600 bg-white border border-gray-200 rounded focus:outline-none" />
                </div>
                <input value={member.photoUrl ?? ""} onChange={e => updateMember(member.id, "photoUrl", e.target.value)}
                  placeholder="Photo URL (optional)" className="w-full px-2 py-1 text-xs text-gray-400 bg-white border border-gray-100 rounded focus:outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={member.email ?? ""} onChange={e => updateMember(member.id, "email", e.target.value)}
                    placeholder="Email (optional)" className="px-2 py-1 text-xs text-gray-500 bg-white border border-gray-100 rounded focus:outline-none" />
                  <input value={member.phone ?? ""} onChange={e => updateMember(member.id, "phone", e.target.value)}
                    placeholder="Phone (optional)" className="px-2 py-1 text-xs text-gray-500 bg-white border border-gray-100 rounded focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Number of grid columns based on member count */
function teamCols(n: number): number {
  if (n <= 5) return n;
  if (n === 6) return 3;
  if (n <= 8) return 4;
  if (n === 9) return 3;
  return 5; // 10
}

function TeamView({ block, brandKit }: { block: TeamBlock; brandKit?: BrandKitData }) {
  const primary = brandKit?.primaryColor || "var(--primary)";
  const cols = teamCols(block.members.length);

  return (
    <div
      className="grid gap-x-6 gap-y-8"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {block.members.map(member => (
        <div key={member.id} className="flex flex-col items-center text-center gap-1.5">
          {/* Avatar */}
          {member.photoUrl
            ? <img src={member.photoUrl} alt={member.name} className="w-20 h-20 rounded-full object-cover flex-shrink-0 mb-3" />
            : <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 mb-3"
                style={{ backgroundColor: primary }}>
                {member.name ? member.name.charAt(0).toUpperCase() : "?"}
              </div>}

          {/* Name — fixed single line */}
          <p className="font-semibold text-sm text-gray-900 leading-tight w-full truncate">
            {member.name || "\u00A0"}
          </p>

          {/* Role — fixed 2-line slot so all cards stay the same height */}
          <p className="text-xs text-gray-500 leading-snug line-clamp-2 min-h-[2.5rem] w-full">
            {member.role || "\u00A0"}
          </p>

          {/* Contact links */}
          {member.email && (
            <a href={`mailto:${member.email}`} className="text-xs text-primary-600 hover:underline truncate w-full">
              {member.email}
            </a>
          )}
          {member.phone && (
            <a href={`tel:${member.phone}`} className="text-xs text-gray-400 hover:underline">
              {member.phone}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Renderer ────────────────────────────────────────────────────────────
interface BlockRendererProps {
  block: ProposalBlock;
  onChange: (updated: ProposalBlock) => void;
  brandKit?: BrandKitData;
  isEditing?: boolean;
  libraryTestimonials?: LibraryTestimonial[];
  libraryCaseStudies?: LibraryCaseStudy[];
}

export function BlockRenderer({ block, onChange, brandKit, isEditing = true, libraryTestimonials, libraryCaseStudies }: BlockRendererProps) {
  const primary = brandKit?.primaryColor || "var(--primary)";

  switch (block.type) {
    // ── Heading ──
    case "heading":
      return isEditing
        ? <HeadingEditor block={block} onChange={onChange} />
        : <HeadingView block={block} brandKit={brandKit} />;

    // ── Text ──
    case "text":
      return isEditing
        ? <TextEditor block={block} onChange={onChange} />
        : <div className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: safeParseContent(block.content)
              ? generateHTML(safeParseContent(block.content)!, [StarterKit, LinkExt, textAlignExt])
              : "" }} />;

    // ── Image ──
    case "image":
      return isEditing
        ? <ImageEditor block={block} onChange={onChange} />
        : block.url
          ? <figure>
              <img src={block.url} alt={block.alt || ""} className="rounded-xl max-w-full" />
              {block.caption && <figcaption className="text-sm text-center text-gray-400 mt-2">{block.caption}</figcaption>}
            </figure>
          : null;

    // ── Video ──
    case "video":
      return isEditing
        ? <VideoEditor block={block} onChange={onChange} />
        : getEmbedUrl(block.url)
          ? <div className="relative" style={{ paddingBottom: "56.25%" }}>
              <iframe src={getEmbedUrl(block.url)!} className="absolute inset-0 w-full h-full rounded-xl"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video" />
            </div>
          : null;

    // ── PDF ──
    case "pdf":
      return isEditing
        ? <PdfEditor block={block} onChange={onChange} />
        : block.url && !block.url.includes("GoogleAccessId")
          ? <div>
              <iframe src={block.url} style={{ height: block.height ?? 600 }} className="w-full rounded-xl border border-gray-200" title={block.label || "PDF"} />
              <div className="flex items-center justify-end mt-2">
                <a href={block.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition flex-shrink-0">
                  <Download className="w-3.5 h-3.5" />
                  Télécharger
                </a>
              </div>
            </div>
          : null;

    // ── Embed ──
    case "embed":
      return isEditing
        ? <EmbedEditor block={block} onChange={onChange} />
        : <EmbedView block={block} />;

    // ── Divider ──
    case "divider":
      return <hr style={{ borderColor: block.color || "#e5e7eb", borderTopWidth: block.thickness || 1 }} />;

    // ── Spacer ──
    case "spacer":
      return isEditing
        ? <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-50 border border-dashed border-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-400" style={{ height: block.height }}>
              Spacer ({block.height}px)
            </div>
            <input type="range" min={8} max={200} value={block.height}
              onChange={e => onChange({ ...block, height: Number(e.target.value) })} className="w-24" />
          </div>
        : <div style={{ height: block.height }} />;

    // ── Pricing ──
    case "pricing":
      return isEditing
        ? <PricingEditor block={block} onChange={onChange} brandKit={brandKit} />
        : <PricingReadOnly block={block} primary={primary} />;

    // ── CTA ──
    case "cta":
      return isEditing
        ? <CtaEditor block={block} onChange={onChange} brandKit={brandKit} />
        : <div className={`flex ${block.align === "right" ? "justify-end" : block.align === "center" ? "justify-center" : "justify-start"}`}>
            <a href={block.url} target="_blank" rel="noopener noreferrer"
              className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white inline-block"
              style={{ backgroundColor: primary }}>
              {block.label}
            </a>
          </div>;

    // ── Metrics ──
    case "metrics":
      return isEditing
        ? <MetricsEditor block={block} onChange={onChange} brandKit={brandKit} />
        : <div className="grid grid-cols-3 gap-6">
            {block.items.map(item => (
              <div key={item.id} className="text-center p-6 rounded-2xl" style={{ background: primary + "11" }}>
                <div className="text-4xl font-extrabold mb-1" style={{ color: primary }}>{item.value}</div>
                <div className="font-semibold text-gray-800 mb-1">{item.label}</div>
                {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
              </div>
            ))}
          </div>;

    // ── Testimonial ──
    case "testimonial":
      return isEditing
        ? <TestimonialEditor block={block} onChange={onChange} library={libraryTestimonials} />
        : <TestimonialView block={block} brandKit={brandKit} />;

    // ── Timeline ──
    case "timeline":
      return isEditing
        ? <TimelineEditor block={block} onChange={onChange} />
        : (
          <div>
            {block.title && (
              <h3 className="text-2xl font-bold text-gray-900 mb-8">{block.title}</h3>
            )}
            <div className="space-y-0">
              {block.items.map((item, idx) => (
                <div key={item.id} className="flex gap-5">
                  {/* Left: step number + connector */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: primary }}>
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    {idx < block.items.length - 1 && (
                      <div
                        className="w-0.5 flex-1 min-h-[1.75rem] mt-2 mb-2 rounded-full"
                        style={{ backgroundColor: primary + "33" }}
                      />
                    )}
                  </div>

                  {/* Right: card */}
                  <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-3">
                    {item.date && (
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2"
                        style={{ backgroundColor: primary + "14", color: primary }}>
                        {item.date}
                      </span>
                    )}
                    {item.title && (
                      <p className="font-semibold text-gray-900 leading-snug">{item.title}</p>
                    )}
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

    // ── FAQ ──
    case "faq":
      return isEditing
        ? <FaqEditor block={block} onChange={onChange} />
        : <div className="space-y-3">
            {block.title && <h3 className="text-xl font-bold mb-4">{block.title}</h3>}
            {block.items.map(item => <FaqAccordionItem key={item.id} item={item} />)}
          </div>;

    // ── Signature ──
    case "signature":
      return isEditing
        ? <SignatureEditor block={block} onChange={onChange} brandKit={brandKit} />
        : (
          <div className="relative rounded-2xl overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary}12 0%, ${primary}06 100%)` }}>
            {/* Barre d'accent gauche */}
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: primary }} />

            <div className="px-10 py-10 text-center">
              {block.description && (
                <p className="text-gray-800 text-base font-medium mb-7 max-w-lg mx-auto leading-relaxed">{block.description}</p>
              )}

              <a href={block.contractUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-9 py-3.5 rounded-xl text-white font-semibold text-sm transition hover:opacity-90"
                style={{ backgroundColor: primary, boxShadow: `0 6px 20px ${primary}45` }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                </svg>
                {block.buttonLabel || "Sign the contract"}
              </a>

              <p className="text-xs text-gray-400 mt-5 flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                Signature électronique sécurisée
              </p>
            </div>
          </div>
        );

    // ── Team ──
    case "team":
      return isEditing
        ? <TeamEditor block={block} onChange={onChange} />
        : <TeamView block={block} brandKit={brandKit} />;

    // ── Case Study ──
    case "case-study":
      return isEditing
        ? <CaseStudyEditor block={block} onChange={onChange} library={libraryCaseStudies} />
        : <CaseStudyView block={block} brandKit={brandKit} />;

    // ── Enjeux ──
    case "enjeux":
      return isEditing
        ? <EnjeuxEditor block={block} onChange={onChange} />
        : <EnjeuxView block={block} brandKit={brandKit} />;

    default:
      return null;
  }
}

function PricingReadOnly({ block, primary }: { block: PricingBlock; primary: string }) {
  const total = block.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  return (
    <div>
      {block.title && <h3 className="text-lg font-semibold mb-3">{block.title}</h3>}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2" style={{ borderColor: primary }}>
            <th className="text-left py-2 font-semibold">Description</th>
            <th className="text-right py-2 font-semibold w-16">Qty</th>
            <th className="text-right py-2 font-semibold w-28">Unit Price</th>
            <th className="text-right py-2 font-semibold w-28">Total</th>
          </tr>
        </thead>
        <tbody>
          {block.items.map(item => (
            <tr key={item.id} className="border-b border-gray-100">
              <td className="py-2.5">{item.description}</td>
              <td className="py-2.5 text-right">{item.quantity}</td>
              <td className="py-2.5 text-right">{currency(item.unitPrice, block.currency)}</td>
              <td className="py-2.5 text-right">{currency(item.quantity * item.unitPrice, block.currency)}</td>
            </tr>
          ))}
        </tbody>
        {block.showTotal && (
          <tfoot>
            <tr>
              <td colSpan={3} className="pt-4 text-right font-bold text-base">Total</td>
              <td className="pt-4 text-right font-bold text-xl" style={{ color: primary }}>
                {currency(total, block.currency)}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
