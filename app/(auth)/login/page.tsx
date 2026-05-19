"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { login, sendPasswordReset } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, setError]         = useState<string | null>(null);
  const [showPwd, setShowPwd]     = useState(false);
  const [view, setView]           = useState<"login" | "reset" | "reset-sent">("login");
  const [isPending, startTransition] = useTransition();

  function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await sendPasswordReset(formData);
      setView("reset-sent");
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-md">
        <div className="rounded-3xl p-8" style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}>

          {/* ── Logo ── */}
          <div className="flex flex-col items-center mb-8">
            <Link href="/" className="inline-flex items-center group mb-6 transition-opacity hover:opacity-80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <Image src="/logo.png" alt="sendli" width={120} height={36} className="h-9 w-auto object-contain" priority />
            </Link>

            {view === "login" && (
              <>
                <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Connexion</h1>
                <p className="mt-1.5 text-sm text-gray-400">Connectez-vous à votre compte</p>
              </>
            )}
            {view === "reset" && (
              <>
                <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Mot de passe oublié</h1>
                <p className="mt-1.5 text-sm text-gray-400 text-center">On vous envoie un lien de réinitialisation</p>
              </>
            )}
            {view === "reset-sent" && (
              <>
                <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>Email envoyé !</h1>
                <p className="mt-1.5 text-sm text-gray-400 text-center">Vérifiez votre boîte mail et suivez le lien.</p>
              </>
            )}
          </div>

          {/* ── Login form ── */}
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-2xl px-4 py-3">
                  {error}
                </div>
              )}
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
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => setView("reset")}
                    className="text-xs font-medium hover:opacity-70 transition-opacity"
                    style={{ color: "var(--primary)" }}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password" name="password"
                    type={showPwd ? "text" : "password"}
                    autoComplete="current-password" required
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition-all duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit" disabled={isPending}
                className="w-full text-white font-semibold py-3 rounded-full text-sm transition-all duration-200 disabled:opacity-60 hover:opacity-90 mt-2"
                style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 14px rgba(17,17,132,0.28)" }}
              >
                {isPending ? "Connexion…" : "Se connecter"}
              </button>

              <p className="text-center text-sm text-gray-400 pt-2">
                Pas encore de compte ?{" "}
                <Link href="/register" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: "var(--primary)" }}>
                  Créer un compte gratuit
                </Link>
              </p>
            </form>
          )}

          {/* ── Reset form ── */}
          {view === "reset" && (
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <input
                  id="reset-email" name="email" type="email" autoComplete="email" required
                  placeholder="vous@entreprise.com"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition-all duration-150"
                />
              </div>
              <button
                type="submit" disabled={isPending}
                className="w-full text-white font-semibold py-3 rounded-full text-sm transition-all duration-200 disabled:opacity-60 hover:opacity-90"
                style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 14px rgba(17,17,132,0.28)" }}
              >
                {isPending ? "Envoi…" : "Envoyer le lien"}
              </button>
              <button
                type="button"
                onClick={() => setView("login")}
                className="flex items-center gap-1.5 mx-auto text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
              </button>
            </form>
          )}

          {/* ── Reset sent ── */}
          {view === "reset-sent" && (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto text-2xl" style={{ backgroundColor: "var(--primary-light)" }}>
                ✉️
              </div>
              <button
                type="button"
                onClick={() => setView("login")}
                className="flex items-center gap-1.5 mx-auto text-sm font-medium hover:opacity-70 transition-opacity"
                style={{ color: "var(--primary)" }}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
