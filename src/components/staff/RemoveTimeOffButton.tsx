"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoveTimeOffButton({ timeOffId }: { timeOffId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Ta heqësh këtë pushim?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/timeoff/${timeOffId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      title="Hiq"
      aria-label="Hiq pushimin"
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
    </button>
  );
}
