"use client";

import { useState, useTransition } from "react";
import { verifyProposalPassword } from "@/app/actions/proposals";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff } from "lucide-react";

interface PasswordGateProps {
  proposalId: string;
  proposalTitle: string;
  logoUrl?: string | null;
  clientLogoUrl?: string | null;
  primaryColor: string;
}

export function PasswordGate({ proposalId, proposalTitle, logoUrl, clientLogoUrl, primaryColor }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    startTransition(async () => {
      const ok = await verifyProposalPassword(proposalId, password);
      if (ok) {
        router.refresh();
      } else {
        setError(true);
        setPassword("");
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logos */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {logoUrl && <img src={logoUrl} alt="Logo" className="h-8 object-contain opacity-60" />}
          {logoUrl && clientLogoUrl && <div className="w-px h-6 bg-gray-300" />}
          {clientLogoUrl && <img src={clientLogoUrl} alt="Client" className="h-8 object-contain" />}
          {!logoUrl && !clientLogoUrl && (
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
              <Lock className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <div className="text-center mb-6">
            <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: primaryColor + "15" }}>
              <Lock className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-1">{proposalTitle}</h1>
            <p className="text-sm text-gray-500">Ce document est protégé par un mot de passe.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(false); }}
                  placeholder="Entrez le mot de passe…"
                  autoFocus
                  className={`w-full px-3 py-2.5 pr-10 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
                    error ? "border-red-300 focus:ring-red-200" : "border-gray-200 focus:ring-indigo-100"
                  }`}
                  style={{}}
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-red-500 mt-1.5">Mot de passe incorrect.</p>}
            </div>

            <button type="submit" disabled={isPending || !password}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}>
              {isPending ? "Vérification…" : "Accéder au document"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
