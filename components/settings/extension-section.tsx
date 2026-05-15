"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Plug, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

export function ExtensionSection() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/extension/token")
      .then((r) => r.json())
      .then((data: { token: string | null }) => setToken(data.token))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

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
    <div
      className="rounded-2xl shadow-soft p-6"
      style={{ background: "var(--surface)" }}
    >
      <div className="flex items-center gap-2 mb-1">
        <Plug className="w-4 h-4" style={{ color: "var(--primary)" }} />
        <h2 className="font-semibold text-gray-900">Extension Chrome</h2>
      </div>
      <p className="text-xs text-gray-400 mb-5">
        Connectez l'extension Sendli pour Chrome pour recevoir vos notifications directement dans votre navigateur.
      </p>

      {loading ? (
        <div className="h-10 w-full bg-gray-100 animate-pulse rounded-xl" />
      ) : (
        <div className="space-y-4">
          {token && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Votre token d'accès
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
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Copiez ce token dans l'extension Sendli pour Chrome
              </p>
            </div>
          )}

          <div className="flex gap-3">
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
              href="https://app.sendli.fr/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition"
            >
              Installer l'extension
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
