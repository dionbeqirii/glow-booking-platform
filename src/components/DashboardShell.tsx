import type { ReactNode } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import NotificationBell from "./NotificationBell";
import HeaderNav from "./HeaderNav";
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
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur">
        <div className="relative flex items-center justify-between px-4 py-3 sm:px-8">
          {/* Left: brand only */}
          <Link href={homeFor(role)} className="shrink-0">
            <Wordmark />
          </Link>

          {/* Center: navigation, centered on large screens */}
          <HeaderNav role={role} />

          {/* Right: command palette (admin), notifications, profile
              (avatar + name + settings, all one trigger), hamburger */}
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
  );
}
