"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { Globe, Lock, Eye, BarChart2, Trash2 } from "lucide-react";
import { updateProposalMeta, deleteProposal } from "@/app/actions/proposals";
import { DuplicateButton } from "@/components/proposal/duplicate-button";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

type ProposalStatus = "pending" | "won" | "lost";

const STATUS_CONFIG: Record<ProposalStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "#92400e", bg: "#fef3c7" },
  won:     { label: "Gagné",      color: "#065f46", bg: "#d1fae5" },
  lost:    { label: "Perdu",      color: "#991b1b", bg: "#fee2e2" },
};

function fmt(n: number | null) {
  if (n === null || n === undefined) return null;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

interface ProposalRowProps {
  id: string;
  title: string;
  published: boolean;
  updatedAt: Date;
  status: string;
  amountOneShot: number | null;
  amountMrr: number | null;
  viewCount: number;
}

// ── Status dropdown rendered via portal (bypasses overflow:hidden) ──────────

function StatusDropdown({
  status,
  onChangeStatus,
  isPending,
}: {
  status: ProposalStatus;
  onChangeStatus: (s: ProposalStatus) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

  function openDropdown() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX });
    setOpen(true);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  // Close on scroll
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  function handleSelect(s: ProposalStatus) {
    setOpen(false);
    onChangeStatus(s);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDropdown}
        disabled={isPending}
        className="inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer hover:opacity-80 transition disabled:opacity-50"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}
      >
        {cfg.label}
      </button>

      {open && pos && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden py-1 min-w-[140px]"
          style={{ top: pos.top, left: pos.left }}
        >
          {(["pending", "won", "lost"] as ProposalStatus[]).map(s => {
            const c = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSelect(s)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-xs hover:bg-gray-50 transition text-left"
                style={{ color: s === status ? c.color : "#374151", fontWeight: s === status ? 600 : 400 }}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                {c.label}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

export function ProposalRow({ id, title, published, updatedAt, status: initialStatus, amountOneShot: initialOneShot, amountMrr: initialMrr, viewCount }: ProposalRowProps) {
  const [status, setStatus] = useState<ProposalStatus>((initialStatus as ProposalStatus) ?? "pending");
  const [oneShot, setOneShot] = useState<string>(initialOneShot?.toString() ?? "");
  const [mrr, setMrr] = useState<string>(initialMrr?.toString() ?? "");
  const [editingAmount, setEditingAmount] = useState<"oneShot" | "mrr" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmPos, setConfirmPos] = useState<{ top: number; left: number } | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deleteRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  function openConfirm() {
    if (!deleteRef.current) return;
    const rect = deleteRef.current.getBoundingClientRect();
    setConfirmPos({ top: rect.bottom + window.scrollY + 4, left: rect.right + window.scrollX });
    setConfirmDelete(true);
  }

  useEffect(() => {
    if (!confirmDelete) return;
    function onOutside(e: MouseEvent) {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node) &&
          deleteRef.current && !deleteRef.current.contains(e.target as Node)) {
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [confirmDelete]);

  function handleDelete() {
    startTransition(async () => {
      await deleteProposal(id);
      setDeleted(true);
      setConfirmDelete(false);
      toast.success("Proposition supprimée");
    });
  }

  function changeStatus(s: ProposalStatus) {
    setStatus(s);
    startTransition(async () => {
      await updateProposalMeta(id, { status: s });
    });
  }

  function saveAmounts() {
    setEditingAmount(null);
    startTransition(async () => {
      await updateProposalMeta(id, {
        amountOneShot: oneShot !== "" ? parseFloat(oneShot) : null,
        amountMrr: mrr !== "" ? parseFloat(mrr) : null,
      });
      toast.success("Montants mis à jour");
    });
  }

  if (deleted) return null;

  return (
    <tr
      className="transition-colors duration-150"
      style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.018)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {/* Title */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${published ? "bg-green-400" : "bg-gray-300"}`} />
          <Link href={`/proposals/${id}/edit`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors whitespace-nowrap">
            {title}
          </Link>
          {published
            ? <Globe className="w-3 h-3 text-green-500 flex-shrink-0" />
            : <Lock className="w-3 h-3 text-gray-300 flex-shrink-0" />}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <StatusDropdown status={status} onChangeStatus={changeStatus} isPending={isPending} />
      </td>

      {/* MRR */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {editingAmount === "mrr" ? (
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" step="100"
              value={mrr}
              onChange={e => setMrr(e.target.value)}
              onBlur={saveAmounts}
              onKeyDown={e => { if (e.key === "Enter") saveAmounts(); if (e.key === "Escape") setEditingAmount(null); }}
              autoFocus
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="0"
            />
            <span className="text-xs text-gray-400">€/m</span>
          </div>
        ) : (
          <button type="button" onClick={() => setEditingAmount("mrr")}
            className="hover:text-indigo-600 transition cursor-text font-semibold text-gray-900">
            {fmt(mrr !== "" ? parseFloat(mrr) : null)
              ? <>{fmt(mrr !== "" ? parseFloat(mrr) : null)}<span className="text-gray-400 font-normal text-xs">/m</span></>
              : <span className="text-gray-300 font-normal">—</span>}
          </button>
        )}
      </td>

      {/* One Shot */}
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        {editingAmount === "oneShot" ? (
          <div className="flex items-center gap-1">
            <input
              type="number" min="0" step="100"
              value={oneShot}
              onChange={e => setOneShot(e.target.value)}
              onBlur={saveAmounts}
              onKeyDown={e => { if (e.key === "Enter") saveAmounts(); if (e.key === "Escape") setEditingAmount(null); }}
              autoFocus
              className="w-24 px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
              placeholder="0"
            />
            <span className="text-xs text-gray-400">€</span>
          </div>
        ) : (
          <button type="button" onClick={() => setEditingAmount("oneShot")}
            className="text-gray-500 font-medium hover:text-indigo-600 transition cursor-text">
            {fmt(oneShot !== "" ? parseFloat(oneShot) : null) ?? <span className="text-gray-300 font-normal">—</span>}
          </button>
        )}
      </td>

      {/* Views */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="flex items-center gap-1 text-sm text-gray-500">
          <Eye className="w-3.5 h-3.5 text-gray-400" />
          {viewCount}
        </span>
      </td>

      {/* Updated */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
        {new Date(updatedAt).toLocaleDateString("fr-FR")}
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-1">
          <Link href={`/proposals/${id}/edit`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all duration-150 whitespace-nowrap">
            Éditer
          </Link>
          <Link href={`/proposals/${id}/analytics`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-all duration-150">
            <BarChart2 className="w-3 h-3" />
            Stats
          </Link>
          <DuplicateButton proposalId={id} />

          {/* Delete */}
          <button
            ref={deleteRef}
            type="button"
            onClick={openConfirm}
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full border transition-all duration-150 ${confirmDelete ? "border-red-200 text-red-500 bg-red-50" : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50"}`}
            title="Supprimer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Confirm portal */}
          {confirmDelete && confirmPos && createPortal(
            <div
              ref={confirmRef}
              className="fixed z-[9999] rounded-xl border border-red-100 shadow-xl overflow-hidden py-2 px-3 flex flex-col gap-2"
              style={{ top: confirmPos.top, right: window.innerWidth - confirmPos.left, background: "#fff", boxShadow: "0 8px 24px rgba(239,68,68,0.12), 0 2px 8px rgba(0,0,0,0.08)" }}
            >
              <p className="text-xs font-medium text-gray-700 whitespace-nowrap">Supprimer « {title} » ?</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-full bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50 whitespace-nowrap"
                >
                  {isPending ? "…" : "Supprimer"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition whitespace-nowrap"
                >
                  Annuler
                </button>
              </div>
            </div>,
            document.body,
          )}
        </div>
      </td>
    </tr>
  );
}
