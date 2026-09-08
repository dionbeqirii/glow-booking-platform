"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

// `key` is a stable, language-independent id — used both to look up the
// translated label (messages/*.json → Nav.<key>) and to pick the icon below.
// Never localize this value itself; only what it looks up.
export type Tab = { key: string; href: string };

// Categories per role — the sidebar navigation (shared with the mobile menu).
export const TABS: Record<string, Tab[]> = {
  ADMIN: [
    { key: "panel", href: "/admin" },
    { key: "calendar", href: "/admin/kalendari" },
    { key: "appointments", href: "/admin/terminet" },
    { key: "services", href: "/admin/sherbimet" },
    { key: "offers", href: "/admin/ofertat" },
    { key: "staff", href: "/admin/stafi" },
    { key: "clients", href: "/admin/klientet" },
    { key: "queue", href: "/admin/radha" },
    { key: "history", href: "/admin/historiku" },
    { key: "auditLog", href: "/admin/audit-log" },
  ],
  STAFF: [
    { key: "panel", href: "/staff" },
    { key: "mySchedule", href: "/staff/orari" },
    { key: "queue", href: "/staff/radha" },
    { key: "clients", href: "/staff/klientet" },
    { key: "offers", href: "/staff/ofertat" },
    { key: "myStats", href: "/staff/statistikat" },
  ],
  CLIENT: [
    { key: "panel", href: "/client" },
    { key: "myAppointments", href: "/client/terminet" },
    { key: "queue", href: "/client/radha" },
    { key: "book", href: "/client/rezervo" },
    { key: "offers", href: "/client/ofertat" },
    { key: "history", href: "/client/historiku" },
  ],
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function TabIcon({ tabKey }: { tabKey: string }) {
  switch (tabKey) {
    case "panel":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "calendar":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "appointments":
    case "myAppointments":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M9 11.5 11 13.5 15.5 9" />
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case "services":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M20.5 7.3 12 12l-8.5-4.7" />
          <path d="M12 22V12" />
          <path d="m20.5 16.7-8.5 4.7-8.5-4.7" />
          <path d="M20.5 7.3v9.4L12 21.3l-8.5-4.6V7.3L12 2.7l8.5 4.6Z" />
        </svg>
      );
    case "offers":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M20.6 12.3 12.7 20a2 2 0 0 1-2.8 0l-8-8V4h8l8 8a2 2 0 0 1 0 2.8Z" />
          <circle cx="7.5" cy="7.5" r="1" />
        </svg>
      );
    case "staff":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "clients":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "mySchedule":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
          <path d="M8 14h2M8 17h5" />
        </svg>
      );
    case "queue":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "history":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 5v5h5" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
    case "auditLog":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
    case "myStats":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M3 3v18h18" />
          <path d="M7 15v3M12 10v8M17 6v12" />
        </svg>
      );
    case "book":
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
  const t = useTranslations("Nav");
  const tabs = TABS[role] ?? [];
  const home = tabs[0]?.href;

  return (
    <nav className="flex flex-col gap-0.5">
      {tabs.map((tab) => {
        // The home tab matches exactly; the others also match their subpages.
        const active = pathname === tab.href || (tab.href !== home && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              active ? "bg-accent-soft font-semibold text-accent" : "font-medium text-ink-soft hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <TabIcon tabKey={tab.key} />
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
