"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import {
  LayoutDashboard, FileText, Palette, Settings, LogOut,
  BookOpen, ShieldCheck, Plug, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "@/components/notifications-panel";
import { useLanguage } from "@/contexts/language-context";
import type { TranslationKey } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",   labelKey: "nav_dashboard",    icon: LayoutDashboard },
  { href: "/proposals",   labelKey: "nav_proposals",    icon: FileText },
  { href: "/library",     labelKey: "nav_library",      icon: BookOpen },
  { href: "/brand-kit",   labelKey: "nav_brandkit",     icon: Palette },
  { href: "/integrations",labelKey: "nav_integrations", icon: Plug },
  { href: "/settings",    labelKey: "nav_settings",     icon: Settings },
];

const ADMIN_ITEM: NavItem = { href: "/admin", labelKey: "nav_admin", icon: ShieldCheck };

export function MobileNav({ isAdmin = false, isPremium = true }: { isAdmin?: boolean; isPremium?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  // Close drawer on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* ── Mobile top bar ── */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 flex items-center justify-between px-4"
        style={{ background: "var(--surface)", borderBottom: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 8px rgba(17,17,132,0.06)" }}
      >
        <Link href="/dashboard" className="inline-flex items-center transition-opacity hover:opacity-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="sendli" className="h-6 w-auto object-contain" />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-black/[0.05] transition-all"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Backdrop ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Slide-out drawer ── */}
      <aside
        className={cn(
          "md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "var(--surface)",
          borderRight: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "4px 0 24px rgba(17,17,132,0.10)",
        }}
      >
        {/* Drawer header */}
        <div className="h-14 flex items-center justify-between px-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
          <Link href="/dashboard" className="inline-flex items-center transition-opacity hover:opacity-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="sendli" className="h-6 w-auto object-contain" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-black/[0.05] transition-all"
            aria-label="Fermer le menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, labelKey, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            const isAdminLink = href === "/admin";
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "text-white"
                    : isAdminLink
                      ? "text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50"
                      : "text-gray-500 hover:text-gray-900 hover:bg-black/[0.04]"
                )}
                style={isActive ? {
                  backgroundColor: isAdminLink ? "#4f46e5" : "var(--primary)",
                  boxShadow: "0 2px 8px rgba(17,17,132,0.25)",
                } : {}}
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-white" : isAdminLink ? "text-indigo-400" : "text-gray-400")} />
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 space-y-1" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-3 px-3 py-1.5">
            <NotificationsPanel isPremium={isPremium} />
            <span className="text-sm font-medium text-gray-400">{t("nav_notifications")}</span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-black/[0.04] transition-all duration-200 w-full"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {t("nav_sign_out")}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
