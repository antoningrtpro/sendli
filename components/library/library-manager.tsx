"use client";

import { useState, useTransition, useEffect } from "react";
import { saveTestimonial, deleteTestimonial, saveCaseStudy, deleteCaseStudy } from "@/app/actions/library";
import toast from "react-hot-toast";
import { Plus, Trash2, Pencil, Check, X, MessageSquare, Briefcase } from "lucide-react";
import type { LibraryTestimonial, LibraryCaseStudy, CaseStudyMetric } from "@/types/proposal";
import { nanoid } from "nanoid";

interface LibraryManagerProps {
  initialTestimonials: LibraryTestimonial[];
  initialCaseStudies: LibraryCaseStudy[];
}

// ─── Testimonials tab ─────────────────────────────────────────────────────────

function TestimonialsTab({ initial, triggerNew = 0 }: { initial: LibraryTestimonial[]; triggerNew?: number }) {
  const [items, setItems] = useState<LibraryTestimonial[]>(initial);
  const [editing, setEditing] = useState<LibraryTestimonial | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [isPending, startTransition] = useTransition();

  const blank: Omit<LibraryTestimonial, "id"> = { quote: "", author: "", role: "", company: "", avatarUrl: "" };

  function handleEdit(item: LibraryTestimonial) {
    setEditing({ ...item });
    setIsNew(false);
  }

  function handleNew() {
    setEditing({ id: "", ...blank });
    setIsNew(true);
  }

  useEffect(() => { if (triggerNew > 0) handleNew(); }, [triggerNew]); // eslint-disable-line

  function handleSave() {
    if (!editing) return;
    startTransition(async () => {
      await saveTestimonial({
        id: isNew ? undefined : editing.id,
        quote: editing.quote,
        author: editing.author,
        role: editing.role,
        company: editing.company,
        avatarUrl: editing.avatarUrl || undefined,
      });
      if (isNew) {
        setItems(prev => [{ ...editing, id: Date.now().toString() }, ...prev]);
      } else {
        setItems(prev => prev.map(i => i.id === editing.id ? editing : i));
      }
      setEditing(null);
      toast.success(isNew ? "Testimonial saved to library!" : "Updated!");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteTestimonial(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success("Deleted");
    });
  }

  return (
    <div className="space-y-4">
      {editing && (
        <div className="rounded-2xl shadow-soft p-4 space-y-3" style={{ background: "var(--surface)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{isNew ? "New testimonial" : "Edit testimonial"}</p>
          <textarea
            value={editing.quote}
            onChange={e => setEditing({ ...editing, quote: e.target.value })}
            placeholder="Quote…"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none bg-gray-50 focus:bg-white transition"
          />
          <div className="grid grid-cols-2 gap-2">
            <input value={editing.author} onChange={e => setEditing({ ...editing, author: e.target.value })}
              placeholder="Author name *" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-gray-50 focus:bg-white transition" />
            <input value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })}
              placeholder="Role" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-gray-50 focus:bg-white transition" />
            <input value={editing.company} onChange={e => setEditing({ ...editing, company: e.target.value })}
              placeholder="Company" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-gray-50 focus:bg-white transition" />
            <input value={editing.avatarUrl ?? ""} onChange={e => setEditing({ ...editing, avatarUrl: e.target.value })}
              placeholder="Avatar URL (optional)" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none bg-gray-50 focus:bg-white transition" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={isPending || !editing.author}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-full disabled:opacity-50 transition"
              style={{ backgroundColor: "var(--primary)" }}>
              <Check className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={() => setEditing(null)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !editing ? (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No testimonials saved yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="rounded-2xl shadow-soft card-lift p-4 group" style={{ background: "var(--surface)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm italic text-gray-700 mb-2 line-clamp-2">&ldquo;{item.quote}&rdquo;</p>
                  <div className="flex items-center gap-2">
                    {item.avatarUrl
                      ? <img src={item.avatarUrl} alt={item.author} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: "var(--primary)" }}>
                          {item.author.charAt(0).toUpperCase()}
                        </div>
                    }
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{item.author}</p>
                      <p className="text-xs text-gray-400">{[item.role, item.company].filter(Boolean).join(", ")}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                  <button onClick={() => handleEdit(item)}
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(item.id)} disabled={isPending}
                    className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Case Studies tab ─────────────────────────────────────────────────────────

const blankCaseStudy: Omit<LibraryCaseStudy, "id"> = {
  title: "",
  tags: [],
  description: "",
  quote: "",
  authorName: "",
  authorRole: "",
  authorAvatarUrl: "",
  linkLabel: "",
  linkUrl: "",
  mediaUrl: "",
  metrics: [],
};

function CaseStudiesTab({ initial, triggerNew = 0 }: { initial: LibraryCaseStudy[]; triggerNew?: number }) {
  const [items, setItems] = useState<LibraryCaseStudy[]>(initial);
  const [editing, setEditing] = useState<LibraryCaseStudy | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleEdit(item: LibraryCaseStudy) {
    setEditing({ ...item, tags: [...item.tags], metrics: [...item.metrics] });
    setIsNew(false);
    setTagInput("");
  }

  function handleNew() {
    setEditing({ id: "", ...blankCaseStudy, tags: [], metrics: [] });
    setIsNew(true);
    setTagInput("");
  }

  useEffect(() => { if (triggerNew > 0) handleNew(); }, [triggerNew]); // eslint-disable-line

  function addTag() {
    if (!editing) return;
    const t = tagInput.trim();
    if (!t || editing.tags.includes(t)) return;
    setEditing({ ...editing, tags: [...editing.tags, t] });
    setTagInput("");
  }

  function removeTag(t: string) {
    if (!editing) return;
    setEditing({ ...editing, tags: editing.tags.filter(x => x !== t) });
  }

  function addMetric() {
    if (!editing || editing.metrics.length >= 3) return;
    setEditing({ ...editing, metrics: [...editing.metrics, { id: nanoid(), value: "", label: "" }] });
  }

  function updateMetric(id: string, field: keyof CaseStudyMetric, val: string) {
    if (!editing) return;
    setEditing({ ...editing, metrics: editing.metrics.map(m => m.id === id ? { ...m, [field]: val } : m) });
  }

  function removeMetric(id: string) {
    if (!editing) return;
    setEditing({ ...editing, metrics: editing.metrics.filter(m => m.id !== id) });
  }

  function handleSave() {
    if (!editing || !editing.title) return;
    startTransition(async () => {
      await saveCaseStudy({
        id: isNew ? undefined : editing.id,
        title: editing.title,
        tags: editing.tags,
        description: editing.description,
        quote: editing.quote ?? undefined,
        authorName: editing.authorName ?? undefined,
        authorRole: editing.authorRole ?? undefined,
        authorAvatarUrl: editing.authorAvatarUrl ?? undefined,
        linkLabel: editing.linkLabel ?? undefined,
        linkUrl: editing.linkUrl ?? undefined,
        mediaUrl: editing.mediaUrl ?? undefined,
        metrics: editing.metrics,
      });
      if (isNew) {
        setItems(prev => [{ ...editing, id: Date.now().toString() }, ...prev]);
      } else {
        setItems(prev => prev.map(i => i.id === editing.id ? editing : i));
      }
      setEditing(null);
      toast.success(isNew ? "Case study saved!" : "Updated!");
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteCaseStudy(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success("Deleted");
    });
  }

  return (
    <div className="space-y-4">
      {/* Edit form */}
      {editing && (
        <div className="rounded-2xl shadow-soft p-4 space-y-4" style={{ background: "var(--surface)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{isNew ? "New case study" : "Edit case study"}</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Left */}
            <div className="space-y-3">
              <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })}
                placeholder="Titre du case study *"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none bg-gray-50 focus:bg-white transition" />

              {/* Tags */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1.5">
                  {editing.tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: "var(--primary-light, #e0e7ff)", color: "var(--primary)" }}>
                      {t}
                      <button type="button" onClick={() => removeTag(t)} className="hover:opacity-60 transition"><X className="w-2.5 h-2.5" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Ajouter un tag…"
                    className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none bg-gray-50 focus:bg-white transition" />
                  <button type="button" onClick={addTag}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium border border-gray-200 hover:bg-gray-50 transition">+</button>
                </div>
              </div>

              <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}
                placeholder="Description…" rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none bg-gray-50 focus:bg-white transition" />

              {/* Quote */}
              <div className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
                <p className="text-xs font-medium text-gray-500">Citation client (optionnel)</p>
                <textarea value={editing.quote ?? ""} onChange={e => setEditing({ ...editing, quote: e.target.value })}
                  placeholder="« Notre ROI a triplé en 6 mois »" rows={2}
                  className="w-full px-2 py-1.5 border border-gray-100 rounded-lg text-sm italic bg-white resize-none focus:outline-none" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={editing.authorName ?? ""} onChange={e => setEditing({ ...editing, authorName: e.target.value })}
                    placeholder="Nom" className="px-2 py-1 text-xs border border-gray-100 rounded-lg bg-white focus:outline-none" />
                  <input value={editing.authorRole ?? ""} onChange={e => setEditing({ ...editing, authorRole: e.target.value })}
                    placeholder="Poste, Entreprise" className="px-2 py-1 text-xs border border-gray-100 rounded-lg bg-white focus:outline-none" />
                </div>
                <input value={editing.authorAvatarUrl ?? ""} onChange={e => setEditing({ ...editing, authorAvatarUrl: e.target.value })}
                  placeholder="URL avatar (optionnel)" className="w-full px-2 py-1 text-xs border border-gray-100 rounded-lg bg-white focus:outline-none" />
              </div>

              {/* Link */}
              <div className="flex gap-2">
                <input value={editing.linkLabel ?? ""} onChange={e => setEditing({ ...editing, linkLabel: e.target.value })}
                  placeholder="Libellé CTA" className="w-1/3 px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none bg-gray-50 focus:bg-white transition" />
                <input value={editing.linkUrl ?? ""} onChange={e => setEditing({ ...editing, linkUrl: e.target.value })}
                  placeholder="https://…" className="flex-1 px-2 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none bg-gray-50 focus:bg-white transition" />
              </div>
            </div>

            {/* Right — media + metrics */}
            <div className="space-y-3">
              {editing.mediaUrl ? (
                <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100">
                  <img src={editing.mediaUrl} alt="Media" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setEditing({ ...editing, mediaUrl: "" })}
                    className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 shadow transition">
                    <X className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-200 rounded-2xl aspect-[4/3] flex flex-col items-center justify-center gap-2 bg-gray-50">
                  <div className="text-gray-300"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg></div>
                  <p className="text-xs text-gray-400 text-center">Image du case study</p>
                </div>
              )}
              <input value={editing.mediaUrl ?? ""} onChange={e => setEditing({ ...editing, mediaUrl: e.target.value })}
                placeholder="URL de l'image"
                className="w-full px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-gray-500 focus:outline-none bg-gray-50 focus:bg-white transition" />

              {/* Metrics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-500">Chiffres clés (max 3)</p>
                  {editing.metrics.length < 3 && (
                    <button type="button" onClick={addMetric}
                      className="text-xs font-medium transition" style={{ color: "var(--primary)" }}>+ Ajouter</button>
                  )}
                </div>
                {editing.metrics.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {editing.metrics.map(m => (
                      <div key={m.id} className="relative border border-gray-200 rounded-xl p-2 bg-gray-50 space-y-1">
                        <button type="button" onClick={() => removeMetric(m.id)}
                          className="absolute top-1 right-1 text-gray-300 hover:text-red-400 transition"><X className="w-3 h-3" /></button>
                        <input value={m.value} onChange={e => updateMetric(m.id, "value", e.target.value)}
                          placeholder="+200%" className="w-full px-2 py-1 text-xs font-bold border border-gray-100 rounded-lg bg-white focus:outline-none text-center" />
                        <input value={m.label} onChange={e => updateMetric(m.id, "label", e.target.value)}
                          placeholder="Label" className="w-full px-2 py-1 text-xs border border-gray-100 rounded-lg bg-white focus:outline-none text-center text-gray-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <button onClick={handleSave} disabled={isPending || !editing.title}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-full disabled:opacity-50 transition"
              style={{ backgroundColor: "var(--primary)" }}>
              <Check className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={() => setEditing(null)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {items.length === 0 && !editing ? (
        <div className="text-center py-12 text-gray-400">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No case studies saved yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="rounded-2xl shadow-soft card-lift p-4 group" style={{ background: "var(--surface)" }}>
              <div className="flex items-start gap-4">
                {/* Media thumbnail */}
                {item.mediaUrl && (
                  <img src={item.mediaUrl} alt={item.title} className="w-16 h-12 rounded-xl object-cover flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.tags.map(t => (
                            <span key={t} className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: "var(--primary-light, #e0e7ff)", color: "var(--primary)" }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                      <button onClick={() => handleEdit(item)}
                        className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item.id)} disabled={isPending}
                        className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {item.metrics.length > 0 && (
                    <div className="flex gap-4 mt-2">
                      {item.metrics.map(m => (
                        <div key={m.id} className="text-center">
                          <p className="text-sm font-bold" style={{ color: "var(--primary)" }}>{m.value}</p>
                          <p className="text-xs text-gray-400">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LibraryManager({ initialTestimonials, initialCaseStudies }: LibraryManagerProps) {
  const [tab, setTab] = useState<"testimonials" | "case-studies">("testimonials");
  const [triggerNew, setTriggerNew] = useState(0);

  const TABS = [
    { key: "testimonials" as const, label: "Témoignages" },
    { key: "case-studies" as const, label: "Case Studies" },
  ];

  const addLabel = tab === "testimonials" ? "Ajouter un témoignage" : "Ajouter un case study";

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-8">
        <div className="flex gap-1">
          {TABS.map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                tab === key
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}>
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setTriggerNew(n => n + 1)}
          className="flex items-center gap-1.5 px-3.5 py-2 mb-px rounded-full text-sm font-medium text-white transition hover:opacity-90"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <Plus className="w-3.5 h-3.5" />
          {addLabel}
        </button>
      </div>

      {tab === "testimonials" && <TestimonialsTab initial={initialTestimonials} triggerNew={triggerNew} />}
      {tab === "case-studies" && <CaseStudiesTab initial={initialCaseStudies} triggerNew={triggerNew} />}
    </div>
  );
}
