"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Alert, buttonStyles } from "../ui";

export type WaitlistRow = {
  id: string;
  serviceName: string;
  staffName: string | null;
};

export default function WaitlistPanel({ initial }: { initial: WaitlistRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (initial.length === 0) return null;

  async function leave(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/waitlist/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Largimi dështoi");
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="mb-6">
      <h2 className="mb-1 text-sm font-semibold text-ink">Lista ime e pritjes</h2>
      <p className="mb-4 text-xs text-ink-faint">
        Do të njoftohesh me përparësi 10-minutëshe nëse lirohet një vend për këto.
      </p>
      {error && (
        <div className="mb-3">
          <Alert message={error} />
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {initial.map((w) => (
          <li
            key={w.id}
            className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-sm"
          >
            <span className="text-ink">
              {w.serviceName}
              {w.staffName && <span className="text-ink-faint"> · vetëm te {w.staffName}</span>}
            </span>
            <button
              onClick={() => leave(w.id)}
              disabled={busyId === w.id}
              className={`${buttonStyles.quiet} px-3 py-1`}
            >
              Largohu
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
