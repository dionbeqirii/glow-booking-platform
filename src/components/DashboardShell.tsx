import type { ReactNode } from "react";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import NotificationBell from "./NotificationBell";
import HeaderNav from "./HeaderNav";
import SettingsMenu from "./SettingsMenu";
import { Wordmark } from "./ui";

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

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur">
        <div className="flex items-center gap-6 px-8 py-3">
          <Link href={homeFor(role)} className="shrink-0">
            <Wordmark />
          </Link>

          <HeaderNav role={role} />

          <div className="ml-auto flex items-center gap-1.5">
            <NotificationBell />
            <SettingsMenu name={name} role={role} />
            <span className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
              {initials}
            </span>
            <span className="hidden text-sm text-ink sm:inline">{name}</span>
            <div className="ml-1">
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-8 py-5">{children}</main>
    </div>
  );
}
