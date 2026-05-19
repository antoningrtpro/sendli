"use client";

import { useState, useTransition, useRef } from "react";
import { adminSetUserPlan, adminSetUserRole, adminDeleteUser, adminHandlePremiumRequest } from "@/app/actions/admin";
import type { AdminUser, PremiumRequestAdmin } from "@/app/actions/admin";
import type { Plan } from "@/lib/plan";
import { Crown, Zap, FileText, Calendar, Search, ShieldCheck, ShieldOff, Trash2, AlertTriangle, CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/contexts/language-context";

interface Props {
  users: AdminUser[];
  premiumRequests: PremiumRequestAdmin[];
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

export function AdminPanel({ users: initialUsers, premiumRequests: initialRequests, currentUserId }: Props) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [requests, setRequests] = useState<PremiumRequestAdmin[]>(initialRequests);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null); // modale confirmation premium
  const [handlingRequest, setHandlingRequest] = useState(false);
  const [, startTransition] = useTransition();
  const { t } = useLanguage();
  const confirmRef = useRef<HTMLDivElement>(null);
  const [requestsTab, setRequestsTab] = useState<"pending" | "approved" | "denied">("pending");

  const pendingRequests = requests.filter(r => r.status === "pending");
  const filteredRequests = requests.filter(r => r.status === requestsTab);

  async function handlePremiumRequest(requestId: string, action: "approve" | "deny") {
    setHandlingRequest(true);
    try {
      await adminHandlePremiumRequest(requestId, action);
      setRequests(prev => prev.map(r =>
        r.id === requestId ? { ...r, status: action === "approve" ? "approved" : "denied" } : r
      ));
      if (action === "approve") {
        const req = requests.find(r => r.id === requestId);
        if (req) setUsers(prev => prev.map(u => u.id === req.userId ? { ...u, plan: "premium" } : u));
        toast.success("Accès Premium activé ✓");
      } else {
        toast("Demande refusée.");
      }
      setPendingRequestId(null);
    } catch {
      toast.error("Erreur lors du traitement de la demande");
    } finally {
      setHandlingRequest(false);
    }
  }

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

  const activeRequest = pendingRequestId ? requests.find(r => r.id === pendingRequestId) : null;

  return (
    <>
    {/* ── Modale confirmation demande premium ── */}
    {activeRequest && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !handlingRequest && setPendingRequestId(null)} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Demande Premium</h2>
              <p className="text-xs text-gray-400">Activer l'abonnement Premium pour cet utilisateur</p>
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor: "var(--primary)", color: "white" }}>
                {(activeRequest.userName ?? activeRequest.userEmail).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{activeRequest.userName ?? <span className="text-gray-400 italic">Sans nom</span>}</p>
                <p className="text-xs text-gray-400 truncate">{activeRequest.userEmail}</p>
              </div>
            </div>
            {activeRequest.userCompany && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Building2 className="w-3 h-3 text-gray-400" />
                {activeRequest.userCompany}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${activeRequest.billingPeriod === "annual" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {activeRequest.billingPeriod === "annual" ? "Annuel · 100€/an" : "Mensuel · 9,90€/mois"}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                Demande le {new Date(activeRequest.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            En approuvant cette demande, l'utilisateur passera immédiatement en <strong>plan Premium</strong> et sera notifié.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handlePremiumRequest(activeRequest.id, "approve")}
              disabled={handlingRequest}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ backgroundColor: "#f59e0b" }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Approuver
            </button>
            <button
              type="button"
              onClick={() => handlePremiumRequest(activeRequest.id, "deny")}
              disabled={handlingRequest}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-60"
            >
              <XCircle className="w-4 h-4" />
              Refuser
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPendingRequestId(null)}
            disabled={handlingRequest}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Annuler
          </button>
        </div>
      </div>
    )}

    <div className="space-y-6">

    {/* ── Section demandes Premium ── */}
    {requests.length > 0 && (
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-900">Demandes Premium</h2>
            {pendingRequests.length > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white bg-amber-500">{pendingRequests.length}</span>
            )}
          </div>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-2 pt-2 gap-1">
          {(["pending", "approved", "denied"] as const).map(status => {
            const count = requests.filter(r => r.status === status).length;
            const labels = { pending: "En attente", approved: "Acceptées", denied: "Refusées" };
            const colors = {
              pending: requestsTab === "pending" ? "border-amber-500 text-amber-600" : "border-transparent text-gray-400 hover:text-gray-600",
              approved: requestsTab === "approved" ? "border-green-500 text-green-600" : "border-transparent text-gray-400 hover:text-gray-600",
              denied: requestsTab === "denied" ? "border-gray-500 text-gray-700" : "border-transparent text-gray-400 hover:text-gray-600",
            };
            return (
              <button
                key={status}
                type="button"
                onClick={() => setRequestsTab(status)}
                className={`flex items-center gap-1.5 px-3 pb-2 text-xs font-semibold border-b-2 transition-colors ${colors[status]}`}
              >
                {labels[status]}
                {count > 0 && <span className="text-[10px] font-bold">{count}</span>}
              </button>
            );
          })}
        </div>
        {/* List */}
        <div className="divide-y divide-gray-50">
          {filteredRequests.length === 0 ? (
            <p className="px-6 py-8 text-sm text-center text-gray-400">Aucune demande</p>
          ) : filteredRequests.map(req => (
            <div key={req.id} className="flex items-center gap-4 px-6 py-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: "var(--primary)" }}>
                {(req.userName ?? req.userEmail).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.userName ?? <span className="italic text-gray-400">Sans nom</span>}</p>
                  {req.userCompany && <span className="text-xs text-gray-400 truncate">{req.userCompany}</span>}
                </div>
                <p className="text-xs text-gray-400 truncate">{req.userEmail}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${req.billingPeriod === "annual" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {req.billingPeriod === "annual" ? "Annuel" : "Mensuel"}
                </span>
                <span className="text-xs text-gray-400">{new Date(req.createdAt).toLocaleDateString("fr-FR")}</span>
                {req.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => setPendingRequestId(req.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                  >
                    Traiter
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

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

      {filtered.length === 0 && (
        <div className="px-6 py-12 text-center text-sm text-gray-400">{t("admin_no_user")}</div>
      )}

      {/* ── Mobile cards (hidden md+) ── */}
      <div className="md:hidden divide-y divide-gray-50">
        {filtered.map(user => {
          const isSelf = user.id === currentUserId;
          return (
            <div key={user.id} className="px-4 py-4 space-y-3">
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: "var(--primary)" }}>
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name ?? <span className="text-gray-400 italic">{t("admin_no_name")}</span>}</p>
                    {user.role === "admin" && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">admin</span>}
                    {isSelf && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{t("admin_you")}</span>}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <PlanBadge plan={user.plan} t={t as (k: string) => string} />
                  {user.plan === "premium" && user.trialEndsAt && user.trialEndsAt > new Date() && user.role !== "admin" && (() => {
                    const daysLeft = Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${daysLeft <= 3 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                        <Clock className="w-2.5 h-2.5" />
                        Essai · J-{daysLeft}
                      </span>
                    );
                  })()}
                </div>
              </div>
              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{user.proposalCount} propales</span>
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {user.plan === "free" ? (
                  <button type="button" disabled={isSelf} onClick={() => handleSetPlan(user.id, "premium")}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 transition">
                    <Crown className="w-3 h-3" />{t("plan_upgrade")}
                  </button>
                ) : (
                  <button type="button" disabled={isSelf} onClick={() => handleSetPlan(user.id, "free")}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition">
                    <Zap className="w-3 h-3" />{t("plan_downgrade")}
                  </button>
                )}
                {user.role === "admin" ? (
                  <button type="button" disabled={isSelf} onClick={() => handleToggleAdmin(user.id, user.role)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 transition">
                    <ShieldOff className="w-3 h-3" />{t("admin_revoke_admin")}
                  </button>
                ) : (
                  <button type="button" disabled={isSelf} onClick={() => handleToggleAdmin(user.id, user.role)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 transition">
                    <ShieldCheck className="w-3 h-3" />{t("admin_grant_admin")}
                  </button>
                )}
                {confirmDeleteId === user.id ? (
                  <div ref={confirmRef} className="flex items-center gap-1.5 p-2 rounded-xl border border-red-100 bg-red-50">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <button type="button" disabled={deleting === user.id} onClick={() => handleDeleteUser(user.id)}
                      className="text-xs font-bold px-2 py-1 rounded-lg bg-red-500 text-white disabled:opacity-50 transition">
                      {deleting === user.id ? "…" : "Confirmer"}
                    </button>
                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-500 px-1.5 py-1 rounded-lg hover:bg-white transition">Annuler</button>
                  </div>
                ) : (
                  <button type="button" disabled={isSelf} onClick={() => setConfirmDeleteId(user.id)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition">
                    <Trash2 className="w-3 h-3" />Supprimer
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table (hidden on mobile) ── */}
      <div className="hidden md:block overflow-x-auto">
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
            {filtered.map(user => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: "var(--primary)" }}>
                        {(user.name ?? user.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name ?? <span className="text-gray-400 italic">{t("admin_no_name")}</span>}</p>
                          {user.role === "admin" && <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 flex items-center gap-0.5"><ShieldCheck className="w-2.5 h-2.5" /> admin</span>}
                          {isSelf && <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{t("admin_you")}</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        {user.company && <p className="text-xs text-gray-400 flex items-center gap-1 truncate mt-0.5"><Building2 className="w-3 h-3 flex-shrink-0" />{user.company}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <PlanBadge plan={user.plan} t={t as (k: string) => string} />
                      {user.plan === "premium" && user.trialEndsAt && user.trialEndsAt > new Date() && user.role !== "admin" && (() => {
                        const daysLeft = Math.ceil((user.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                        return (
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${daysLeft <= 3 ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                            <Clock className="w-2.5 h-2.5" />
                            Essai · J-{daysLeft}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 text-sm text-gray-700"><FileText className="w-3.5 h-3.5 text-gray-400" />{user.proposalCount}</span></td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 text-xs text-gray-400"><Calendar className="w-3 h-3" />{new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span></td>
                  <td className="px-6 py-4">
                    {user.plan === "free" ? (
                      <button type="button" disabled={isSelf} onClick={() => handleSetPlan(user.id, "premium")} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed transition"><Crown className="w-3 h-3" />{t("plan_upgrade")}</button>
                    ) : (
                      <button type="button" disabled={isSelf} onClick={() => handleSetPlan(user.id, "free")} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition"><Zap className="w-3 h-3" />{t("plan_downgrade")}</button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.role === "admin" ? (
                      <button type="button" disabled={isSelf} onClick={() => handleToggleAdmin(user.id, user.role)} title={isSelf ? t("admin_revoke_hint") : t("admin_revoke_admin")} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"><ShieldOff className="w-3 h-3" />{t("admin_revoke_admin")}</button>
                    ) : (
                      <button type="button" disabled={isSelf} onClick={() => handleToggleAdmin(user.id, user.role)} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition"><ShieldCheck className="w-3 h-3" />{t("admin_grant_admin")}</button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {confirmDeleteId === user.id ? (
                      <div ref={confirmRef} className="flex items-center gap-2 p-2 rounded-xl border border-red-100 bg-red-50">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        <span className="text-xs text-red-700 font-medium whitespace-nowrap">Supprimer définitivement ?</span>
                        <button type="button" disabled={deleting === user.id} onClick={() => handleDeleteUser(user.id)} className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition whitespace-nowrap">{deleting === user.id ? "…" : "Confirmer"}</button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-500 hover:text-gray-700 transition px-1.5 py-1 rounded-lg hover:bg-white">Annuler</button>
                      </div>
                    ) : (
                      <button type="button" disabled={isSelf} onClick={() => setConfirmDeleteId(user.id)} title={isSelf ? "Impossible de supprimer votre propre compte" : "Supprimer cet utilisateur"} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition"><Trash2 className="w-3 h-3" />Supprimer</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    </div> {/* end space-y-6 */}
    </> /* end fragment */
  );
}
