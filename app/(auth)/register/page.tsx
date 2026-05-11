"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { register } from "@/app/actions/auth";

export default function RegisterPage() {
  const [error, setError]             = useState<string | null>(null);
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdError, setPwdError]       = useState<string | null>(null);
  const [isPending, startTransition]  = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm  = formData.get("confirm") as string;

    if (password !== confirm) {
      setPwdError("Les mots de passe ne correspondent pas.");
      return;
    }
    setPwdError(null);
    setError(null);
    startTransition(async () => {
      const result = await register(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-md">
        <div className="rounded-3xl p-8" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>

          {/* ── Logo ── */}
          <div className="flex flex-col items-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 group mb-6">
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 text-white font-bold text-lg select-none leading-none"
                style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 14px rgba(17,17,132,0.30)" }}
              >
                s.
              </div>
              <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>sendli</span>
            </Link>
            <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Créez votre compte</h1>
            <p className="mt-1.5 text-sm text-gray-400">Commencez à créer de belles proposals</p>
          </div>

          {/* ── Form ── */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {(error || pwdError) && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
                {pwdError ?? error}
              </div>
            )}

            {/* Nom + Entreprise */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom complet
                </label>
                <input
                  id="name" name="name" type="text" autoComplete="name"
                  placeholder="Jane Smith"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition-all duration-150"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">
                  Entreprise
                </label>
                <input
                  id="company" name="company" type="text" autoComplete="organization"
                  placeholder="Acme Inc."
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition-all duration-150"
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                id="phone" name="phone" type="tel" autoComplete="tel"
                placeholder="+33 6 00 00 00 00"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition-all duration-150"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Adresse email
              </label>
              <input
                id="email" name="email" type="email" autoComplete="email" required
                placeholder="vous@entreprise.com"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition-all duration-150"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password" required minLength={8}
                  placeholder="Min. 8 caractères"
                  className="w-full px-4 py-3 pr-11 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition-all duration-150"
                />
                <button
                  type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  id="confirm" name="confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password" required minLength={8}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition-all duration-150"
                />
                <button
                  type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={isPending}
              className="w-full text-white font-semibold py-3 rounded-full text-sm transition-all duration-200 disabled:opacity-60 hover:opacity-90 mt-2"
              style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 14px rgba(17,17,132,0.28)" }}
            >
              {isPending ? "Création…" : "Créer mon compte gratuit"}
            </button>

            <p className="text-center text-sm text-gray-400 pt-2">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: "var(--primary)" }}>
                Se connecter
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
