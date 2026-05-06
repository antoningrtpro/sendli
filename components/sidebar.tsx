"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { LayoutDashboard, FileText, Palette, Settings, Zap, LogOut, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard",  label: "Dashboard",     icon: LayoutDashboard },
  { href: "/proposals",  label: "My Proposals",  icon: FileText },
  { href: "/library",    label: "Library",        icon: BookOpen },
  { href: "/brand-kit",  label: "Brand Kit",      icon: Palette },
  { href: "/settings",   label: "Settings",       icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 min-h-screen flex flex-col fixed left-0 top-0"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "2px 0 12px rgba(17,17,132,0.04)",
      }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5" style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-105 text-white font-bold text-base select-none leading-none"
            style={{ backgroundColor: "var(--primary)" }}
          >
            s.
          </div>
          <span className="text-base font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            sendli
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-black/[0.04]"
              )}
              style={isActive ? {
                backgroundColor: "var(--primary)",
                boxShadow: "0 2px 8px rgba(17,17,132,0.25)",
              } : {}}
            >
              <Icon
                className={cn(
                  "w-4 h-4 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-white" : "text-gray-400"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-black/[0.04] transition-all duration-200 w-full"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
