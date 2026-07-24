import type { ReactNode } from "react";
import LogoutButton from "./LogoutButton";
import NotificationBell from "./NotificationBell";
import { Wordmark } from "./ui";

// Genitive form, so the header reads "Paneli i administratorit".
const PANEL_LABEL: Record<string, string> = {
  ADMIN: "administratorit",
  STAFF: "stafit",
  CLIENT: "klientit",
};

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
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <Wordmark />
            <p className="text-xs text-ink-faint">Paneli i {PANEL_LABEL[role] ?? role}</p>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
              {initials}
            </span>
            <span className="hidden text-sm text-ink sm:inline">{name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
