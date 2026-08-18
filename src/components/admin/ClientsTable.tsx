"use client";

import { useMemo, useState } from "react";

export type ClientRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  joined: string;
  bookings: number;
  queue: number;
  lastVisit: string | null;
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

export default function ClientsTable({ clients }: { clients: ClientRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        (c.phone ?? "").toLowerCase().includes(query)
    );
  }, [q, clients]);

  return (
    <div className="mt-5">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kërko sipas emrit, email-it ose telefonit…"
            className="w-full rounded-xl border border-line-strong bg-surface py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </div>
        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium text-ink-soft">
          {filtered.length} {filtered.length === 1 ? "klient" : "klientë"}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">Klienti</th>
                <th className="px-4 py-3 font-medium">Kontakti</th>
                <th className="px-4 py-3 font-medium">Anëtar që nga</th>
                <th className="px-4 py-3 text-center font-medium">Rezervime</th>
                <th className="px-4 py-3 font-medium">Vizita e fundit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-faint">
                    {clients.length === 0 ? "Ende nuk ka klientë me llogari." : "Asnjë klient nuk përputhet me kërkimin."}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                          {initials(c.name)}
                        </span>
                        <span className="font-medium text-ink">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-ink">{c.email}</div>
                      <div className="text-xs text-ink-faint">{c.phone ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{c.joined}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink">
                        {c.bookings}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{c.lastVisit ?? <span className="text-ink-faint">Asnjë</span>}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
