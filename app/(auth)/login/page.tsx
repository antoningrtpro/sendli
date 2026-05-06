"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await login(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 group-hover:scale-105 text-white font-bold text-lg select-none leading-none"
              style={{ backgroundColor: "var(--primary)", boxShadow: "0 4px 14px rgba(17,17,132,0.30)" }}
            >
              p.
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>sendli</span>
          </Link>
          <h1 className="mt-8 text-2xl font-bold" style={{ color: "var(--foreground)" }}>Bon retour</h1>
          <p className="mt-1.5 text-sm text-gray-400">Connectez-vous à votre compte</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{ background: "var(--surface)", boxShadow: "var(--shadow-soft)" }}
        >
          <form action={handleSubmit} className="space-y-5">
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mot de passe
              </label>
              <input
                id="password" name="password" type="password" autoComplete="current-password" required
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent transition-all duration-150"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full text-white font-semibold py-3 rounded-full text-sm transition-all duration-200 disabled:opacity-60 hover:opacity-90 mt-2"
              style={{
                backgroundColor: "var(--primary)",
                boxShadow: "0 4px 14px rgba(17,17,132,0.28)",
              }}
            >
              {isPending ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>

        <p className="mt-7 text-center text-sm text-gray-400">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-semibold hover:opacity-80 transition-opacity" style={{ color: "var(--primary)" }}>
            Créer un compte gratuit
          </Link>
        </p>
      </div>
    </div>
  );
}
