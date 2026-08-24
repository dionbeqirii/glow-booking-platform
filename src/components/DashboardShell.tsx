import type { ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import NotificationBell from "./NotificationBell";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import SettingsMenu from "./SettingsMenu";
import CommandPalette from "./admin/CommandPalette";
import { Wordmark } from "./ui";

function homeFor(role: string): string {
  return role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/client";
}

export default async function DashboardShell({
  name,
  role,
  children,
}: {
  name: string;
  role: string;
  children: ReactNode;
}) {
  // The JWT session carries the name at login time, but name/avatar can
  // change on their own schedule, so both are read fresh here rather than
  // trusting the cookie. Cheap: getSession() is just a cookie read, and
  // this is one indexed lookup per page render.
  const session = await getSession();
  const profile = session
    ? await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, avatarUrl: true } })
    : null;
  const displayName = profile?.name ?? name;
  const avatarUrl = profile?.avatarUrl ?? null;

  return (
    <div className="flex flex-1">
      {/* Persistent left sidebar (desktop only — MobileNav's hamburger
          covers < lg). Sticky so it stays put while the content column
          scrolls independently. */}
      <aside className="sticky top-0 hidden h-screen w-[230px] shrink-0 flex-col border-r border-line bg-surface p-4 lg:flex">
        <Link href={homeFor(role)} className="mb-6 block px-2">
          <Wordmark />
        </Link>

        <Sidebar role={role} />

        <div className="flex-1" />

        <div className="rounded-2xl bg-surface-muted p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Nevojitet ndihmë?
          </div>
          <p className="mt-1.5 mb-3 text-xs text-ink-faint">Jemi këtu për ju.</p>
          <div className="rounded-lg bg-accent px-3 py-2 text-center text-xs font-semibold text-white">Na Kontaktoni</div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95">
          <div className="flex items-center justify-between px-4 py-3 sm:px-8">
            {/* Logo only shows here below lg, where the sidebar is hidden. */}
            <Link href={homeFor(role)} className="shrink-0 lg:hidden">
              <Wordmark />
            </Link>
            <div className="hidden lg:block" />

            <div className="flex items-center gap-1.5">
              {role === "ADMIN" && <CommandPalette />}
              <NotificationBell />
              <SettingsMenu name={displayName} role={role} avatarUrl={avatarUrl} />
              <MobileNav role={role} />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
