"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { label: string; href: string };

// Categories per role — the top-bar navigation (shared with the mobile menu).
export const TABS: Record<string, Tab[]> = {
  ADMIN: [
    { label: "Paneli", href: "/admin" },
    { label: "Shërbimet", href: "/admin/sherbimet" },
    { label: "Ofertat", href: "/admin/ofertat" },
    { label: "Stafi", href: "/admin/stafi" },
    { label: "Klientët", href: "/admin/klientet" },
    { label: "Radha", href: "/admin/radha" },
    { label: "Historiku", href: "/admin/historiku" },
  ],
  STAFF: [
    { label: "Radha e sotme", href: "/staff" },
    { label: "Klientët", href: "/staff/klientet" },
    { label: "Ofertat", href: "/staff/ofertat" },
    { label: "Statistikat e mia", href: "/staff/statistikat" },
  ],
  CLIENT: [
    { label: "Terminet", href: "/client" },
    { label: "Rezervo", href: "/client/rezervo" },
    { label: "Ofertat", href: "/client/ofertat" },
    { label: "Radha", href: "/client/radha" },
    { label: "Historiku", href: "/client/historiku" },
  ],
};

export default function HeaderNav({ role }: { role: string }) {
  const pathname = usePathname();
  const tabs = TABS[role] ?? [];
  const home = tabs[0]?.href;

  return (
    <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex">
      {tabs.map((t) => {
        // The home tab matches exactly; the others also match their subpages.
        const active = pathname === t.href || (t.href !== home && pathname.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
              active
                ? "bg-accent text-white shadow-[0_6px_18px_-6px_rgba(193,84,108,0.6)]"
                : "text-ink-soft hover:bg-white/50 hover:text-ink hover:backdrop-blur-sm"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
