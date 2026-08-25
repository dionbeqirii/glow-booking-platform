"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StaffOverviewRow, StaffStatus } from "@/lib/staff-catalog";
import StaffFormModal from "./StaffFormModal";
import NewStaffButton from "./NewStaffButton";

const STATUS_LABEL: Record<StaffStatus, string> = { active: "Aktiv", busy: "Në Shërbim", off_duty: "Jashtë Orarit" };
const STATUS_PILL: Record<StaffStatus, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-ok-soft", text: "text-ok", dot: "bg-ok" },
  busy: { bg: "bg-gold-soft", text: "text-gold", dot: "bg-gold" },
  off_duty: { bg: "bg-surface-muted", text: "text-ink-faint", dot: "bg-ink-faint" },
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

export default function StaffOverviewTable({
  rows,
  existingTitles,
}: {
  rows: StaffOverviewRow[];
  existingTitles: string[];
}) {
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffOverviewRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenu]);

  const filtered = useMemo(
    () => (roleFilter ? rows.filter((r) => r.title === roleFilter) : rows),
    [rows, roleFilter]
  );

  async function remove(r: StaffOverviewRow) {
    setOpenMenu(null);
    if (!confirm(`Të fshihet punonjësja/i "${r.name}"?`)) return;
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/staff/${r.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) alert(data.error ?? "Fshirja dështoi");
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
        <div>
          <p className="text-sm font-semibold text-ink">Pasqyra e Stafit</p>
          <p className="text-xs text-ink-faint">Shiko anëtarët e ekipit dhe disponueshmërinë e tyre.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
          >
            <option value="">Të gjitha Rolet</option>
            {existingTitles.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <NewStaffButton existingTitles={existingTitles} />
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col style={{ width: "26%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "26%" }} />
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2 font-medium">Punonjësi</th>
              <th className="px-3 py-2 font-medium">Roli</th>
              <th className="px-3 py-2 font-medium">Statusi</th>
              <th className="px-3 py-2 font-medium">Orari i Sotëm</th>
              <th className="px-3 py-2 font-medium">Veprime</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-faint">Asnjë punonjës nuk përputhet.</td>
              </tr>
            ) : (
              filtered.map((r) => {
                const pill = STATUS_PILL[r.status];
                return (
                  <tr key={r.id} className={`border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60 ${busyId === r.id ? "opacity-60" : ""}`}>
                    <td className="overflow-hidden px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                          {initials(r.name)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">{r.name}</div>
                          <div className="truncate text-[11px] text-ink-faint">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="overflow-hidden px-3 py-2">
                      {r.title ? (
                        <span className="inline-block max-w-full truncate rounded-full bg-purple-soft px-2 py-0.5 text-[11px] font-medium text-purple">{r.title}</span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${pill.bg} ${pill.text}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pill.dot}`} />
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="overflow-hidden px-3 py-2 text-ink-soft">
                      <div className="truncate">{r.scheduleLabel}</div>
                      <div className="truncate text-[11px] text-ink-faint">{r.appointmentsToday} {r.appointmentsToday === 1 ? "termin sot" : "termine sot"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5">
                        <Link
                          href={`/admin/stafi/${r.id}`}
                          title="Konfiguro orarin"
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <rect x="3" y="4" width="18" height="18" rx="2" />
                            <path d="M16 2v4M8 2v4M3 10h18" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => setEditing(r)}
                          title="Ndrysho"
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}
                            aria-label="Më shumë veprime"
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <circle cx="12" cy="5" r="1.6" />
                              <circle cx="12" cy="12" r="1.6" />
                              <circle cx="12" cy="19" r="1.6" />
                            </svg>
                          </button>
                          {openMenu === r.id && (
                            <div ref={menuRef} className="absolute right-0 top-7 z-20 w-36 overflow-hidden rounded-xl border border-line-strong bg-surface py-1 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]">
                              <button onClick={() => remove(r)} className="w-full px-3.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft">
                                Fshi
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-line px-3 py-2 text-xs text-ink-faint">
        {filtered.length === 0 ? "0" : `1–${filtered.length}`} nga {rows.length} punonjës gjithsej
      </div>

      {editing && <StaffFormModal existing={editing} existingTitles={existingTitles} onClose={() => setEditing(null)} />}
    </div>
  );
}
