"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserRound, Wrench, CalendarClock, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/availability", label: "Availability", icon: CalendarClock },
];

export function ProviderNav() {
  const pathname = usePathname();
  const { user, status, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-(--z-nav) border-b border-border-default bg-surface-raised/95 backdrop-blur-sm">
      <div className="container-servora flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-medium text-ink-900">
            Servora
            <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white">
              Provider
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="Provider dashboard">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)]",
                    active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                  )}
                >
                  <Icon size={15} aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {status === "authenticated" && user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-text-secondary sm:inline">{user.email}</span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
            >
              <LogOut size={15} aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        ) : null}
      </div>
      <nav
        className="flex items-center gap-1 overflow-x-auto border-t border-border-subtle px-4 py-2 sm:hidden"
        aria-label="Provider dashboard"
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium",
                active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50",
              )}
            >
              <Icon size={14} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
