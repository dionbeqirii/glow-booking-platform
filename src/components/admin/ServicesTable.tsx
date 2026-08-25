"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ServiceListRow } from "@/lib/services-catalog";
import ServiceFormModal from "./ServiceFormModal";

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

const CATEGORY_TONES = [
  { bg: "bg-accent-soft", text: "text-accent" },
  { bg: "bg-gold-soft", text: "text-gold" },
  { bg: "bg-purple-soft", text: "text-purple" },
  { bg: "bg-warn-soft", text: "text-warn" },
  { bg: "bg-teal-soft", text: "text-teal" },
  { bg: "bg-ok-soft", text: "text-ok" },
];
function categoryTone(category: string, allCategories: string[]) {
  const idx = allCategories.indexOf(category);
  return CATEGORY_TONES[(idx < 0 ? 0 : idx) % CATEGORY_TONES.length];
}

export default function ServicesTable({
  rows,
  allCategories,
  existingCategories,
}: {
  rows: ServiceListRow[];
  allCategories: string[];
  existingCategories: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [toggleBusy, setToggleBusy] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<ServiceListRow | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenu]);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleActive(s: ServiceListRow) {
    setToggleBusy(s.id);
    try {
      const res = await fetch(`/api/services/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !s.active }),
      });
      if (res.ok) router.refresh();
    } finally {
      setToggleBusy(null);
    }
  }

  async function bulkSetActive(active: boolean) {
    setBulkBusy(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/services/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active }),
          })
        )
      );
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  async function remove(s: ServiceListRow) {
    setOpenMenu(null);
    if (!confirm(`Të fshihet shërbimi "${s.name}"?`)) return;
    await fetch(`/api/services/${s.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface ring-1 ring-line/0">
      {selected.size > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-accent-soft px-4 py-2">
          <span className="text-sm font-medium text-accent">{selected.size} të zgjedhur</span>
          <div className="flex items-center gap-2">
            <button onClick={() => bulkSetActive(true)} disabled={bulkBusy} className="rounded-lg bg-ok px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60">
              Aktivizo
            </button>
            <button onClick={() => bulkSetActive(false)} disabled={bulkBusy} className="rounded-lg bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-line disabled:opacity-60">
              Çaktivizo
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col className="w-8" />
            <col className="w-10" />
            <col style={{ width: "27%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col className="w-14" />
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-surface">
              <th className="px-2 py-1.5">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Zgjidh të gjitha" className="h-3.5 w-3.5 rounded border-line-strong accent-accent" />
              </th>
              <th className="px-2 py-1.5 font-medium">#</th>
              <th className="px-2 py-1.5 font-medium">Shërbimi</th>
              <th className="px-2 py-1.5 font-medium">Kategoria</th>
              <th className="px-2 py-1.5 font-medium">Kohëzgjatja</th>
              <th className="px-2 py-1.5 font-medium">Çmimi</th>
              <th className="px-2 py-1.5 font-medium">Statusi</th>
              <th className="px-2 py-1.5 font-medium">Rezervime</th>
              <th className="px-2 py-1.5 font-medium">Veprime</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-ink-faint">Asnjë shërbim nuk përputhet me filtrat.</td>
              </tr>
            ) : (
              rows.map((s, i) => {
                const tone = s.category ? categoryTone(s.category, allCategories) : null;
                return (
                  <tr key={s.id} className="border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
                    <td className="px-2 py-1">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} aria-label={`Zgjidh ${s.name}`} className="h-3.5 w-3.5 rounded border-line-strong accent-accent" />
                    </td>
                    <td className="px-2 py-1 text-ink-faint">{i + 1}</td>
                    <td className="overflow-hidden px-2 py-1">
                      <div className="flex items-center gap-2">
                        {s.imageUrl ? (
                          <img src={s.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-line" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[10px] font-semibold text-accent">
                            {initials(s.name)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">{s.name}</div>
                          {s.description && <div className="truncate text-[11px] text-ink-faint">{s.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="overflow-hidden px-2 py-1">
                      {s.category ? (
                        <span className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-medium ${tone?.bg} ${tone?.text}`}>
                          {s.category}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-ink-soft">{s.durationMin} min</td>
                    <td className="whitespace-nowrap px-2 py-1 text-ink-soft">{s.price.toFixed(2)} €</td>
                    <td className="px-2 py-1">
                      <button
                        onClick={() => toggleActive(s)}
                        disabled={toggleBusy === s.id}
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity disabled:opacity-60 ${s.active ? "bg-ok-soft text-ok" : "bg-surface-muted text-ink-faint"}`}
                      >
                        {s.active ? "Aktiv" : "Joaktiv"}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-ink-soft">{s.bookingCount}</td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => setEditing(s)}
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
                            onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
                            aria-label="Më shumë veprime"
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <circle cx="12" cy="5" r="1.6" />
                              <circle cx="12" cy="12" r="1.6" />
                              <circle cx="12" cy="19" r="1.6" />
                            </svg>
                          </button>
                          {openMenu === s.id && (
                            <div ref={menuRef} className="absolute right-0 top-7 z-20 w-36 overflow-hidden rounded-xl border border-line-strong bg-surface py-1 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]">
                              <button onClick={() => remove(s)} className="w-full px-3.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft">
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

      {editing && <ServiceFormModal existing={editing} existingCategories={existingCategories} onClose={() => setEditing(null)} />}
    </div>
  );
}
