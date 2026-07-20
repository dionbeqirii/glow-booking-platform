import type { ReactNode } from "react";
import LogoutButton from "./LogoutButton";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  STAFF: "Staf",
  CLIENT: "Klient",
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
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <div>
          <p className="text-sm font-bold text-neutral-900">Glow By Diellza</p>
          <p className="text-xs text-neutral-500">Paneli i {ROLE_LABEL[role] ?? role}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-700">{name}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1 bg-neutral-50 p-6">{children}</main>
    </div>
  );
}
