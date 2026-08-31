"use client";

import { useState } from "react";

export default function StatsTipBanner({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="flex shrink-0 items-center gap-3 rounded-xl border border-line bg-ok-soft px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-ok">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m8.5 12 2.5 2.5L16 9" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ok">Këshillë për ju</p>
        <p className="text-xs text-ink-soft">{message}</p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Mbyll këshillën"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface hover:text-ink"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
