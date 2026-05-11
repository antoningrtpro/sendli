"use client";

import { useState, useTransition, useRef } from "react";
import { adminSetUserPlan, adminSetUserRole, adminDeleteUser } from "@/app/actions/admin";
import type { AdminUser } from "@/app/actions/admin";
import type { Plan } from "@/lib/plan";
import { Crown, Zap, FileText, Calendar, Search, ShieldCheck, ShieldOff, Building2, Trash2, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

interface Props {
  users: AdminUser[];
  currentUserId: string;
}

function PlanBadge({ plan, t }: { plan: Plan; t: (k: string) => string }) {
  return plan === "premium" ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
      <Crown className="w-3 h-3" /> Premium
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      <Zap className="w-3 h-3" /> Free
    </span>
  );
}

export function AdminPanel({ users: initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { t } = useLanguage();
  const confirmRef = useRef<HTMLDivElement>(null);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (u.company ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function handleSetPlan(userId: string, plan: Plan) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u));
    startTransition(async () => {
      await adminSetUserPlan(userId, plan);
      toast.success(t("admin_plan_updated").replace("{p}", plan === "premium" ? "Premium" : "Free"));
    });
  }

  async function handleDeleteUser(userId: string) {
    setDeleting(userId);
    try {
      await adminDeleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setConfirmDeleteId(null);
      toast.success("Utilisateur supprimé");
    } catch (err) {
      toast.error((err as Error).message ?? "Erreur lors de la suppression");
    } finally {
      setDeleting(null);
    }
  }

  function handleToggleAdmin(userId: string, currentRole: string | null) {
    const newRole = currentRole === "admin" ? null : "admin";
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? { ...u, role: newRole, plan: newRole === "admin" ? "premium" : u.plan }
        : u
    ));
    startTransition(async () => {
      await adminSetUserRole(userId, newRole);
      toast.success(newRole === "admin" ? t("admin_admin_granted") : t("admin_admin_revoked"));
    });
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
      {/* Search bar */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder={t("admin_search")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-300 placeholder-gray-300"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b border-gray-100 bg-gray-50/50">
              <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("admin_col_user")}</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("admin_col_plan")}</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("admin_col_proposals")}</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("admin_col_date")}</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("admin_col_actions")}</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("admin_col_role")}</th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                  {t("admin_no_user")}
                </td>
              </tr>
            )}
            {filtered.map(user => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                  {/* User info */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        {(user.name ?? user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.name ?? <span className="text-gray-400 italic">{t("admin_no_name")}</span>}
                          </p>
                          {user.role === "admin" && (
                            <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 flex items-center gap-0.5">
                              <ShieldCheck className="w-2.5 h-2.5" /> admin
                            </span>
                          )}
                          {isSelf && (
                            <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{t("admin_you")}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        {user.company && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 truncate mt-0.5">
                            <Building2 className="w-3 h-3 flex-shrink-0" />
                            {user.company}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Plan badge */}
                  <td className="px-6 py-4">
                    <PlanBadge plan={user.plan} t={t as (k: string) => string} />
                  </td>

                  {/* Proposal count */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      {user.proposalCount}
                    </span>
                  </td>

                  {/* Created at */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </td>

                  {/* Change plan */}
                  <td className="px-6 py-4">
                    {user.plan === "free" ? (
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => handleSetPlan(user.id, "premium")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <Crown className="w-3 h-3" />
                        {t("plan_upgrade")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSelf || user.role === "admin"}
                        onClick={() => handleSetPlan(user.id, "free")}
                        title={user.role === "admin" ? t("admin_revoke_first") : undefined}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <Zap className="w-3 h-3" />
                        {t("plan_downgrade")}
                      </button>
                    )}
                  </td>

                  {/* Toggle admin role */}
                  <td className="px-6 py-4">
                    {user.role === "admin" ? (
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => handleToggleAdmin(user.id, user.role)}
                        title={isSelf ? t("admin_revoke_hint") : t("admin_revoke_admin")}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ShieldOff className="w-3 h-3" />
                        {t("admin_revoke_admin")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => handleToggleAdmin(user.id, user.role)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                      >
                        <ShieldCheck className="w-3 h-3" />
                        {t("admin_grant_admin")}
                      </button>
                    )}
                  </td>

                  {/* Delete */}
                  <td className="px-6 py-4">
                    {confirmDeleteId === user.id ? (
                      <div ref={confirmRef} className="flex items-center gap-2 p-2 rounded-xl border border-red-100 bg-red-50">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-red-700 font-medium whitespace-nowrap">Supprimer définitivement ?</span>
                        <button
                          type="button"
                          disabled={deleting === user.id}
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition whitespace-nowrap"
                        >
                          {deleting === user.id ? "…" : "Confirmer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-xs text-gray-500 hover:text-gray-700 transition px-1.5 py-1 rounded-lg hover:bg-white"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isSelf}
                        onClick={() => setConfirmDeleteId(user.id)}
                        title={isSelf ? "Impossible de supprimer votre propre compte" : "Supprimer cet utilisateur"}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        Supprimer
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
