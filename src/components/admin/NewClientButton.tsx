"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Field, Alert, buttonStyles, inputStyles } from "@/components/ui";

function NewClientModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, phone, email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Regjistrimi dështoi");
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

  const canSubmit = firstName.trim().length >= 1 && lastName.trim().length >= 1 && phone.trim().length >= 1 && !busy;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-[0_24px_64px_-24px_rgba(31,42,34,0.35)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Klient i Ri</h2>
          <button
            onClick={onClose}
            aria-label="Mbyll"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Emri">
              <input className={inputStyles} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Arta" />
            </Field>
            <Field label="Mbiemri">
              <input className={inputStyles} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Krasniqi" />
            </Field>
          </div>
          <Field label="Numri i Telefonit">
            <input className={inputStyles} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+383 4X XXX XXX" />
          </Field>
          <Field label="Email (opsional)">
            <input type="email" className={inputStyles} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="arta@example.com" />
          </Field>

          {error && <Alert message={error} />}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button onClick={onClose} className={buttonStyles.secondary}>Anulo</button>
          <button onClick={submit} disabled={!canSubmit} className={buttonStyles.primary}>
            {busy ? "Duke regjistruar…" : "Regjistro Klientin"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function NewClientButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        Klient i Ri
      </button>
      {open && <NewClientModal onClose={() => setOpen(false)} />}
    </>
  );
}
