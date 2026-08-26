"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Field, Alert, buttonStyles, inputStyles } from "@/components/ui";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function roundToNext30(d: Date): Date {
  const next = new Date(d);
  next.setSeconds(0, 0);
  const rem = next.getMinutes() % 30;
  if (rem !== 0) next.setMinutes(next.getMinutes() + (30 - rem));
  return next;
}

type Kind = "break" | "block";

const COPY: Record<Kind, { trigger: string; title: string; reasonPlaceholder: string; icon: React.ReactNode }> = {
  break: {
    trigger: "Shto Pushim",
    title: "Shto Pushim",
    reasonPlaceholder: "P.sh. Dreka",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" /><path d="M6 1v3M10 1v3M14 1v3" />
      </svg>
    ),
  },
  block: {
    trigger: "Blloko Kohë",
    title: "Blloko Kohë",
    reasonPlaceholder: "P.sh. Takim personal",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="12" cy="12" r="9" /><path d="m4.9 4.9 14.2 14.2" />
      </svg>
    ),
  },
};

export default function AddTimeOffButton({ meId, kind }: { meId: string; kind: Kind }) {
  const [open, setOpen] = useState(false);
  const copy = COPY[kind];
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
      >
        <span className="flex items-center gap-2">
          <span className="text-ink-faint">{copy.icon}</span>
          {copy.trigger}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-faint" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
      </button>
      {open && <AddTimeOffModal meId={meId} kind={kind} onClose={() => setOpen(false)} />}
    </>
  );
}

function AddTimeOffModal({ meId, kind, onClose }: { meId: string; kind: Kind; onClose: () => void }) {
  const router = useRouter();
  const copy = COPY[kind];

  const initialFrom = kind === "break" ? roundToNext30(new Date()) : new Date();
  const initialUntil = new Date(initialFrom.getTime() + (kind === "break" ? 30 : 60) * 60000);

  const [from, setFrom] = useState(toLocalInputValue(initialFrom));
  const [until, setUntil] = useState(toLocalInputValue(initialUntil));
  const [reason, setReason] = useState(kind === "break" ? "Pushim" : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${meId}/timeoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from, until, reason: reason || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ruajtja dështoi");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = from && until && new Date(from) < new Date(until) && !busy;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-[0_24px_64px_-24px_rgba(31,42,34,0.35)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{copy.title}</h2>
          <button onClick={onClose} aria-label="Mbyll" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          <Field label="Nga">
            <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className={inputStyles} />
          </Field>
          <Field label="Deri">
            <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className={inputStyles} />
          </Field>
          <Field label="Arsyeja (opsionale)">
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={copy.reasonPlaceholder} className={inputStyles} />
          </Field>
          {error && <Alert message={error} />}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button onClick={onClose} className={buttonStyles.secondary}>Anulo</button>
          <button onClick={submit} disabled={!canSubmit} className={buttonStyles.primary}>
            {busy ? "Duke ruajtur…" : "Ruaj"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
