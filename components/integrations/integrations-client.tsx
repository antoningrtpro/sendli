"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { CheckCircle2, Plug, Lock } from "lucide-react";
import { saveIntegration, deleteIntegration } from "@/app/actions/integrations";
import type { IntegrationKey } from "@/app/actions/integrations";
import { useLanguage } from "@/contexts/language-context";
import Link from "next/link";

interface IntegrationConfig {
  key: IntegrationKey;
  logo: React.ReactNode;
  nameKey: "integrations_gcal_name" | "integrations_hubspot_name" | "integrations_loom_name";
  descKey: "integrations_gcal_desc" | "integrations_hubspot_desc" | "integrations_loom_desc";
  perVideo?: boolean; // Loom: no stored embed code, configured per block
}

const INTEGRATIONS: IntegrationConfig[] = [
  {
    key: "loom",
    nameKey: "integrations_loom_name",
    descKey: "integrations_loom_desc",
    perVideo: true,
    logo: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <circle cx="24" cy="24" r="22" fill="#625DF5" />
        <circle cx="24" cy="24" r="9" fill="white" />
        <circle cx="24" cy="24" r="4.5" fill="#625DF5" />
        <line x1="24" y1="2" x2="24" y2="15" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="24" y1="33" x2="24" y2="46" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="2" y1="24" x2="15" y2="24" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="33" y1="24" x2="46" y2="24" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "google_calendar",
    nameKey: "integrations_gcal_name",
    descKey: "integrations_gcal_desc",
    logo: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect x="6" y="6" width="36" height="36" rx="4" fill="#fff" stroke="#e0e0e0" />
        <rect x="6" y="14" width="36" height="4" fill="#4285F4" />
        <rect x="6" y="6" width="36" height="8" rx="4" fill="#4285F4" />
        <circle cx="16" cy="7" r="2" fill="#fff" />
        <circle cx="32" cy="7" r="2" fill="#fff" />
        <text x="24" y="34" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#4285F4">
          31
        </text>
      </svg>
    ),
  },
  {
    key: "hubspot",
    nameKey: "integrations_hubspot_name",
    descKey: "integrations_hubspot_desc",
    logo: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <circle cx="24" cy="24" r="22" fill="#FF7A59" />
        <path
          d="M28 18.5a4 4 0 0 0-4-4v-4.5h-4V14.5a4 4 0 0 0-4 4v1a4 4 0 0 0 2.5 3.72v4.78h3v-4.78A4 4 0 0 0 24 19.5h4v-1zm-8 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"
          fill="white"
        />
        <circle cx="30" cy="30" r="5" fill="white" />
        <circle cx="30" cy="30" r="3" fill="#FF7A59" />
      </svg>
    ),
  },
];

interface Props {
  initialIntegrations: Partial<Record<IntegrationKey, { embedCode: string }>>;
  isPremium: boolean;
}

export function IntegrationsClient({ initialIntegrations, isPremium }: Props) {
  const { t } = useLanguage();
  const [integrations, setIntegrations] =
    useState<Partial<Record<IntegrationKey, { embedCode: string }>>>(initialIntegrations);
  const [expandedKey, setExpandedKey] = useState<IntegrationKey | null>(null);
  const [embedInputs, setEmbedInputs] = useState<Partial<Record<IntegrationKey, string>>>({});
  const [saving, setSaving] = useState<IntegrationKey | null>(null);

  function handleCardClick(key: IntegrationKey) {
    if (expandedKey === key) {
      setExpandedKey(null);
    } else {
      setExpandedKey(key);
      setEmbedInputs(prev => ({
        ...prev,
        [key]: integrations[key]?.embedCode ?? "",
      }));
    }
  }

  async function handleSave(key: IntegrationKey) {
    const code = (embedInputs[key] ?? "").trim();
    if (!code) return;
    setSaving(key);
    const res = await saveIntegration(key, code);
    setSaving(null);
    if (res.success) {
      setIntegrations(prev => ({ ...prev, [key]: { embedCode: code } }));
      setExpandedKey(null);
      toast.success(t("integrations_saved"));
    } else {
      toast.error(res.error ?? "Error");
    }
  }

  async function handleDisconnect(key: IntegrationKey) {
    const res = await deleteIntegration(key);
    if (res.success) {
      setIntegrations(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setExpandedKey(null);
      toast.success(t("integrations_removed"));
    } else {
      toast.error(res.error ?? "Error");
    }
  }

  return (
    <div className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-indigo-50">
            <Plug className="w-5 h-5 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t("integrations_title")}</h1>
        </div>
        <p className="text-gray-500 text-sm">{t("integrations_subtitle")}</p>
      </div>

      {/* Premium gate banner */}
      {!isPremium && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 border border-amber-200 bg-amber-50">
          <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700 flex-1">
            Les intégrations sont réservées aux abonnés Premium.
          </p>
          <Link
            href="/settings"
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition hover:opacity-90"
            style={{ backgroundColor: "#f59e0b" }}
          >
            Passer Premium
          </Link>
        </div>
      )}

      {/* Cards */}
      <div className="flex flex-col gap-4">
        {INTEGRATIONS.map(({ key, logo, nameKey, descKey, perVideo }) => {
          const connected = !!integrations[key];
          const isExpanded = expandedKey === key;

          return (
            <div
              key={key}
              className="relative rounded-2xl border bg-white shadow-sm overflow-hidden transition-all"
              style={{ borderColor: isPremium ? "#e5e7eb" : "#f3f4f6" }}
            >
              {/* Card header row */}
              <button
                type="button"
                onClick={() => (isPremium && !perVideo) ? handleCardClick(key) : undefined}
                disabled={!isPremium || !!perVideo}
                className={`w-full flex items-center gap-4 p-5 text-left transition-colors ${(isPremium && !perVideo) ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex-shrink-0">{logo}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold ${isPremium ? "text-gray-900" : "text-gray-400"}`}>{t(nameKey)}</span>
                    {isPremium && perVideo && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        {t("integrations_loom_badge")}
                      </span>
                    )}
                    {isPremium && !perVideo && connected && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        {t("integrations_connected")}
                      </span>
                    )}
                    {isPremium && !perVideo && !connected && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">
                        {t("integrations_not_connected")}
                      </span>
                    )}
                    {!isPremium && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">
                        <Lock className="w-3 h-3" />
                        Premium
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-0.5 truncate ${isPremium ? "text-gray-500" : "text-gray-400"}`}>{t(descKey)}</p>
                </div>
                {isPremium && !perVideo && (
                  <span className="flex-shrink-0 text-xs font-medium text-indigo-600">
                    {connected ? t("integrations_edit") : t("integrations_configure")}
                  </span>
                )}
              </button>

              {/* Expandable embed input — not shown for per-video integrations like Loom */}
              {isExpanded && !perVideo && (
                <div className="border-t border-gray-100 bg-gray-50 p-5 flex flex-col gap-3">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Embed code
                  </label>
                  <textarea
                    className="w-full rounded-xl border border-gray-200 bg-white text-sm font-mono p-3 min-h-[110px] resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder={t("integrations_placeholder")}
                    value={embedInputs[key] ?? ""}
                    onChange={e =>
                      setEmbedInputs(prev => ({ ...prev, [key]: e.target.value }))
                    }
                  />
                  <div className="flex items-center gap-2 justify-end">
                    {connected && (
                      <button
                        type="button"
                        onClick={() => handleDisconnect(key)}
                        className="text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        {t("integrations_disconnect")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedKey(null)}
                      className="text-sm text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      type="button"
                      disabled={saving === key || !(embedInputs[key] ?? "").trim()}
                      onClick={() => handleSave(key)}
                      className="text-sm font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {saving === key ? t("loading") : t("integrations_save")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
