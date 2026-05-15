"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Plug, RefreshCw, Lock, Crown, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

export function ExtensionSection({ isPremium = false }: { isPremium?: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isPremium) {
      setToken(null); // clear any stale token from before downgrade
      setLoading(false);
      return;
    }
    fetch("/api/extension/token")
      .then((r) => r.json())
      .then((data: { token: string | null }) => setToken(data.token))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, [isPremium]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const r = await fetch("/api/extension/token", { method: "POST" });
      const data = (await r.json()) as { token: string };
      setToken(data.token);
      toast.success("Token généré !");
    } catch {
      toast.error("Erreur lors de la génération du token");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Token copié !");
  }

  return (
    <div className="rounded-2xl shadow-soft p-6 relative overflow-hidden" style={{ background: "var(--surface)" }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4" style={{ color: isPremium ? "var(--primary)" : "#9ca3af" }} />
          <h2 className={`font-semibold ${isPremium ? "text-gray-900" : "text-gray-400"}`}>Extension Chrome</h2>
        </div>
        {!isPremium && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
            <Crown className="w-3 h-3" /> Premium
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Connectez l&apos;extension sendli pour Chrome pour recevoir vos notifications directement dans votre navigateur.
      </p>

      <div className={`space-y-4 ${!isPremium ? "opacity-40 pointer-events-none select-none" : ""}`}>
        {loading ? (
          <div className="h-10 w-full bg-gray-100 animate-pulse rounded-xl" />
        ) : (
          <>
            {token && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Votre token d&apos;accès
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={token}
                    className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copier le token"
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600 transition text-sm"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Copiez ce token dans l&apos;extension sendli pour Chrome
                </p>
              </div>
            )}

            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition disabled:opacity-60"
                style={{ backgroundColor: "var(--primary)" }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                {token ? "Réinitialiser le token" : "Générer un token"}
              </button>
              <a
                href="https://chromewebstore.google.com/detail/komicnnjkplomgicnhiibcfhcpnbjgbe"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Installer l&apos;extension
              </a>
            </div>
          </>
        )}
      </div>

      {!isPremium && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl" style={{ background: "transparent" }}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-md border border-gray-100 text-xs font-semibold text-gray-500">
            <Lock className="w-3.5 h-3.5" />
            Fonctionnalité Premium
          </div>
        </div>
      )}
    </div>
  );
}
