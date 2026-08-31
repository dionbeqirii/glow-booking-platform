"use client";

import { useState } from "react";
import type { MyServiceRow } from "@/lib/staff-stats";

const COLLAPSED_COUNT = 6;

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

export default function MyServicesPanel({ services }: { services: MyServiceRow[] }) {
  const [view, setView] = useState<"list" | "grid">("list");
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? services : services.slice(0, COLLAPSED_COUNT);
  const hasMore = services.length > COLLAPSED_COUNT;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1 flex shrink-0 items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">Shërbimet e mia</p>
          <p className="text-xs text-ink-faint">Shërbimet që keni autorizuar t&apos;i kryeni.</p>
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-lg bg-surface-muted p-0.5 text-xs font-medium">
          <button type="button" onClick={() => setView("list")} className={`rounded-md px-2.5 py-1 transition-colors ${view === "list" ? "bg-surface text-ink shadow-sm" : "text-ink-faint hover:text-ink"}`}>
            Listë
          </button>
          <button type="button" onClick={() => setView("grid")} className={`rounded-md px-2.5 py-1 transition-colors ${view === "grid" ? "bg-surface text-ink shadow-sm" : "text-ink-faint hover:text-ink"}`}>
            Grid
          </button>
        </div>
      </div>

      {services.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-xs text-ink-faint">
          Ende s&apos;ke shërbime të autorizuara. Kontakto administratorin.
        </p>
      ) : view === "list" ? (
        <div className="mt-1 flex min-h-0 flex-1 flex-col divide-y divide-line overflow-y-auto">
          {visible.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5 py-2 text-sm">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                {initials(s.name)}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink">
                {s.name}
                {!s.active && <span className="ml-1.5 text-xs text-ink-faint">(joaktiv)</span>}
              </span>
              <span className="shrink-0 text-xs text-ink-faint">{s.durationMin} min</span>
              <span className="shrink-0 text-sm font-semibold text-ok">{s.price.toFixed(2)} €</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-faint" aria-hidden>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-1.5 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto">
          {visible.map((s) => (
            <div key={s.id} className="rounded-xl border border-line p-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
                {initials(s.name)}
              </span>
              <p className="mt-1.5 truncate text-xs font-medium text-ink">
                {s.name}
                {!s.active && <span className="ml-1 text-ink-faint">(joaktiv)</span>}
              </p>
              <p className="text-[11px] text-ink-faint">{s.durationMin} min</p>
              <p className="text-xs font-semibold text-ok">{s.price.toFixed(2)} €</p>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 flex shrink-0 items-center justify-center gap-1 py-1 text-xs font-medium text-accent hover:underline"
        >
          {expanded ? "Shfaq më pak" : "Shfaq më shumë"}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      )}
    </div>
  );
}
