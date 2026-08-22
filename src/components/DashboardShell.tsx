import type { ReactNode } from "react";
import Link from "next/link";
import NotificationBell from "./NotificationBell";
import HeaderNav from "./HeaderNav";
import MobileNav from "./MobileNav";
import SettingsMenu from "./SettingsMenu";
import CommandPalette from "./admin/CommandPalette";
import { Wordmark } from "./ui";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  STAFF: "Staf",
  CLIENT: "Klient",
};

function homeFor(role: string): string {
  return role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/client";
}

export default function DashboardShell({
  name,
  role,
  children,
}: {
  name: string;
  role: string;
  children: ReactNode;
}) {
  // Only real words count, so "Diellza (Administratore)" yields "DA", not "D(".
  const initials =
    name
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?";

  // Strip a trailing role note like "(Administratore)" so the name shows once,
  // with the role rendered separately below it (#3).
  const displayName = name.replace(/\s*\([^)]*\)\s*/g, " ").trim() || name;
  const roleLabel = ROLE_LABEL[role] ?? role;

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur">
        <div className="relative flex items-center justify-between px-4 py-3 sm:px-8">
          {/* Left: brand only */}
          <Link href={homeFor(role)} className="shrink-0">
            <Wordmark />
          </Link>

          {/* Center: navigation, centered on large screens */}
          <HeaderNav role={role} />

          {/* Right: command palette (admin), notifications, settings, profile, hamburger */}
          <div className="flex items-center gap-1.5">
            {role === "ADMIN" && <CommandPalette />}
            <NotificationBell />
            <SettingsMenu name={name} role={role} />
            <span className="ml-1 hidden h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent sm:flex">
              {initials}
            </span>
            <div className="ml-0.5 hidden leading-tight sm:block">
              <p className="text-sm font-medium text-ink">{displayName}</p>
              <p className="text-xs font-medium text-accent">{roleLabel}</p>
            </div>
            <MobileNav role={role} />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-5 sm:px-8">{children}</main>
    </div>
  );
}
