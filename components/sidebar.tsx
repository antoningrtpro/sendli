"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { LayoutDashboard, FileText, Palette, Settings, LogOut, BookOpen, ShieldCheck, Plug, Eye, EyeOff, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "@/components/notifications-panel";
import { useLanguage } from "@/contexts/language-context";
import { useBlur } from "@/contexts/blur-context";
import type { TranslationKey } from "@/lib/i18n";

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",  labelKey: "nav_dashboard", icon: LayoutDashboard },
  { href: "/proposals",  labelKey: "nav_proposals",  icon: FileText },
  { href: "/library",    labelKey: "nav_library",    icon: BookOpen },
  { href: "/brand-kit",     labelKey: "nav_brandkit",     icon: Palette },
  { href: "/integrations",  labelKey: "nav_integrations", icon: Plug },
  { href: "/feedback",      labelKey: "nav_feedback",     icon: MessageSquare },
  { href: "/settings",      labelKey: "nav_settings",     icon: Settings },
];

const ADMIN_ITEM: NavItem = { href: "/admin", labelKey: "nav_admin", icon: ShieldCheck };

interface SidebarProps {
  isAdmin?: boolean;
  isPremium?: boolean;
}

export function Sidebar({ isAdmin = false, isPremium = true }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { blurProposals, toggleBlur } = useBlur();

  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <aside
      className="w-64 min-h-screen hidden md:flex flex-col fixed left-0 top-0"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "2px 0 12px rgba(17,17,132,0.04)",
      }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-center px-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Link href="/dashboard" className="inline-flex items-center group transition-opacity hover:opacity-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <Image src="/logo.png" alt="sendli" width={120} height={28} className="h-7 w-auto object-contain" priority />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map(({ href, labelKey, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          const isAdminLink = href === "/admin";
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
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
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-white" : isAdminLink ? "text-indigo-400" : "text-gray-400"
                )}
              />
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

        <div className="flex items-center gap-1">
          <form action={logout} className="flex-1">
            <button
              type="submit"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-black/[0.04] transition-all duration-200 w-full"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {t("nav_sign_out")}
            </button>
          </form>

          {isAdmin && (
            <button
              type="button"
              onClick={toggleBlur}
              title={blurProposals ? "Afficher les noms de propales" : "Masquer les noms de propales"}
              className={cn(
                "flex-shrink-0 p-2.5 rounded-xl transition-all duration-200",
                blurProposals
                  ? "text-indigo-500 bg-indigo-50 hover:bg-indigo-100"
                  : "text-gray-300 hover:text-gray-500 hover:bg-black/[0.04]"
              )}
            >
              {blurProposals
                ? <EyeOff className="w-4 h-4" />
                : <Eye className="w-4 h-4" />
              }
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
