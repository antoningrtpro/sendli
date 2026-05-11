"use server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;

async function signInWithPassword(email: string, password: string): Promise<string> {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  if (!res.ok) throw new Error("Invalid credentials");
  const data = await res.json();
  return data.idToken as string;
}

async function setSessionCookie(idToken: string) {
  const expiresIn = 60 * 60 * 24 * 14 * 1000;
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
  const jar = await cookies();
  jar.set("__session", sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn / 1000,
  });
}

export async function register(formData: FormData) {
  const name    = (formData.get("name") as string) || "";
  const phone   = (formData.get("phone") as string) || "";
  const company = (formData.get("company") as string) || "";
  const email   = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password || password.length < 8) {
    return { error: "Mot de passe minimum 8 caractères." };
  }

  try {
    const userRecord = await adminAuth.createUser({ email, password, displayName: name || undefined });
    // Create user doc in Firestore
    await adminDb.collection("users").doc(userRecord.uid).set({
      name: name || null,
      email,
      phone: phone || null,
      company: company || null,
      plan: "free",
      lang: "fr",
      createdAt: new Date(),
      onboardingCompleted: false,
    });
    // Create default brand kit
    await adminDb.collection("brandKits").doc(userRecord.uid).set({
      userId: userRecord.uid,
      primaryColor: "#111184",
      secondaryColor: "#1a1ab8",
      fontFamily: "Inter",
      bgColor: "#ffffff",
      textColor: "#1f2937",
      logoUrl: null,
    });
    // Auto sign in
    const idToken = await signInWithPassword(email, password);
    await setSessionCookie(idToken);
  } catch (e: unknown) {
    const msg = (e as Error).message ?? "";
    if (msg.includes("EMAIL_EXISTS") || msg.includes("email-already-exists")) {
      return { error: "Un compte existe déjà avec cet email." };
    }
    if (msg.includes("Invalid credentials")) {
      return { error: "Impossible de se connecter après inscription." };
    }
    return { error: "Erreur lors de la création du compte." };
  }
  redirect("/dashboard");
}

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    const idToken = await signInWithPassword(email, password);
    await setSessionCookie(idToken);
  } catch {
    return { error: "Email ou mot de passe incorrect." };
  }
  redirect("/dashboard");
}

export async function logout() {
  const jar = await cookies();
  jar.set("__session", "", { httpOnly: true, path: "/", maxAge: 0 });
  redirect("/login");
}

export async function sendPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) return { error: "Adresse email requise." };

  try {
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestType: "PASSWORD_RESET", email }),
      }
    );
  } catch {
    // Always return success to avoid email enumeration
  }
  return { success: true };
}
