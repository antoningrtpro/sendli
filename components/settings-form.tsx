"use client";

import { useState, useTransition } from "react";
import { updateProfile, updatePassword, updatePlan, deleteAccount } from "@/app/actions/settings";
import { logout } from "@/app/actions/auth";
import toast from "react-hot-toast";
import { Crown, Zap, AlertTriangle } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  plan: string;
  createdAt: Date;
}

export function SettingsForm({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleProfile(formData: FormData) {
    startTransition(async () => {
      const result = await updateProfile(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Profile updated!");
    });
  }

  function handlePassword(formData: FormData) {
    startTransition(async () => {
      const result = await updatePassword(formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Password updated!");
    });
  }

  function handlePlan(plan: "free" | "pro") {
    startTransition(async () => {
      await updatePlan(plan);
      toast.success(`Plan updated to ${plan === "pro" ? "Pro" : "Free"}!`);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteAccount();
      await logout();
    });
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <div className="mb-4">
          <h2 className="font-semibold text-gray-900">Profile</h2>
          <p className="text-xs text-gray-400 mt-0.5">Ces informations sont affichées dans le bouton Contact de vos propositions.</p>
        </div>
        <form action={handleProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
            <input
              name="name"
              type="text"
              defaultValue={user.name ?? ""}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
            <input
              name="email"
              type="email"
              defaultValue={user.email}
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
            <input
              name="phone"
              type="tel"
              defaultValue={user.phone ?? ""}
              placeholder="+33 6 00 00 00 00"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-full text-sm font-medium transition"
          >
            Save changes
          </button>
        </form>
      </div>

      {/* Password */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
        <form action={handlePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current password</label>
            <input
              name="currentPassword"
              type="password"
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <input
              name="newPassword"
              type="password"
              minLength={8}
              required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-gray-50 focus:bg-white transition"
              placeholder="Min. 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white px-5 py-2 rounded-full text-sm font-medium transition"
          >
            Update password
          </button>
        </form>
      </div>

      {/* Plan */}
      <div className="rounded-2xl shadow-soft p-6" style={{ background: "var(--surface)" }}>
        <h2 className="font-semibold text-gray-900 mb-4">Subscription</h2>
        <div className="grid grid-cols-2 gap-4">
          {/* Free */}
          <div
            className={`rounded-xl border-2 p-5 cursor-pointer transition ${
              user.plan === "free" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handlePlan("free")}
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-gray-900">Free</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">$0<span className="text-sm font-normal text-gray-500">/mo</span></p>
            <ul className="text-xs text-gray-500 space-y-1 mt-3">
              <li>• Up to 5 proposals</li>
              <li>• Basic analytics</li>
              <li>• PDF export</li>
            </ul>
          </div>
          {/* Pro */}
          <div
            className={`rounded-xl border-2 p-5 cursor-pointer transition ${
              user.plan === "pro" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300"
            }`}
            onClick={() => handlePlan("pro")}
          >
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-gray-900">Pro</span>
              <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Popular</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">$29<span className="text-sm font-normal text-gray-500">/mo</span></p>
            <ul className="text-xs text-gray-500 space-y-1 mt-3">
              <li>• Unlimited proposals</li>
              <li>• Advanced analytics</li>
              <li>• Custom domain</li>
              <li>• Priority support</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Current plan: <strong className="capitalize">{user.plan}</strong> · Member since {new Date(user.createdAt).toLocaleDateString("fr-FR")}
        </p>
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid rgba(239,68,68,0.25)", boxShadow: "var(--shadow-soft)" }}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h2 className="font-semibold text-red-700">Danger Zone</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-full text-sm font-medium transition"
          >
            Delete account
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded-full text-sm font-medium transition"
            >
              Yes, delete my account
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
