"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { label: string; href: string };

// Categories per role — the sidebar navigation (shared with the mobile menu).
export const TABS: Record<string, Tab[]> = {
  ADMIN: [
    { label: "Paneli", href: "/admin" },
    { label: "Kalendari", href: "/admin/kalendari" },
    { label: "Terminet", href: "/admin/terminet" },
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

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function TabIcon({ label }: { label: string }) {
  switch (label) {
    case "Paneli":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "Kalendari":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "Terminet":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M9 11.5 11 13.5 15.5 9" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "Shërbimet":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M20.5 7.3 12 12l-8.5-4.7" />
          <path d="M12 22V12" />
          <path d="m20.5 16.7-8.5 4.7-8.5-4.7" />
          <path d="M20.5 7.3v9.4L12 21.3l-8.5-4.6V7.3L12 2.7l8.5 4.6Z" />
        </svg>
      );
    case "Ofertat":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M20.6 12.3 12.7 20a2 2 0 0 1-2.8 0l-8-8V4h8l8 8a2 2 0 0 1 0 2.8Z" />
          <circle cx="7.5" cy="7.5" r="1" />
        </svg>
      );
    case "Stafi":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "Klientët":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "Radha":
    case "Radha e sotme":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "Historiku":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 5v5h5" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
    case "Statistikat e mia":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M3 3v18h18" />
          <path d="M7 15v3M12 10v8M17 6v12" />
        </svg>
      );
    case "Terminet":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "Rezervo":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M12 14v4M10 16h4" />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const tabs = TABS[role] ?? [];
  const home = tabs[0]?.href;

  return (
    <nav className="flex flex-col gap-0.5">
      {tabs.map((t) => {
        // The home tab matches exactly; the others also match their subpages.
        const active = pathname === t.href || (t.href !== home && pathname.startsWith(t.href));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              active ? "bg-accent-soft font-semibold text-accent" : "font-medium text-ink-soft hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <TabIcon label={t.label} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
