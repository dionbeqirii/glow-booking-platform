"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function IcPhone() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

export default function CallNextButton({ entryId, clientName }: { entryId: string | null; clientName: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function callNext() {
    if (!entryId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/queue/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "call" }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Veprimi dështoi");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={callNext}
        disabled={!entryId || busy}
        className="flex w-full items-center gap-2.5 rounded-lg bg-surface-muted px-2.5 py-2 text-left transition-colors hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
          <IcPhone />
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
          {busy ? "Duke thirrur…" : entryId ? `Thirr: ${clientName}` : "Radha është bosh"}
        </span>
      </button>
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
