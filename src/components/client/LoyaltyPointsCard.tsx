"use client";

import { useEffect, useRef, useState } from "react";

export default function LoyaltyPointsCard({ points }: { points: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0 rounded-xl border border-line bg-surface p-3.5">
      <p className="text-sm font-semibold text-ink">Pikët e Besnikërisë</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
            <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight text-ink">{points}</p>
          <p className="text-xs text-ink-faint">Pikë të Disponueshme</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-3 w-full rounded-lg px-3 py-1.5 text-sm font-medium text-gold ring-1 ring-gold/30 transition-colors hover:bg-gold-soft"
      >
        Shiko Shpërblimet
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-line-strong bg-surface p-3 text-xs text-ink-soft shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]">
          Fito <span className="font-semibold text-ink">1 pikë</span> për çdo <span className="font-semibold text-ink">1 €</span> të shpenzuar, sapo një vizitë përfundon — qoftë termin i rezervuar apo klient pa termin nga radha.
        </div>
      )}
    </div>
  );
}
