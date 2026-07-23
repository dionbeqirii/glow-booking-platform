"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Alert, EmptyState, buttonStyles } from "../ui";
import { QUEUE_STATUS_LABEL, QUEUE_STATUS_TONE } from "@/lib/booking-labels";

type Service = { id: string; name: string; durationMin: number };

type Entry = {
  id: string;
  queueNumber: number;
  status: "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED" | "NO_SHOW";
  estimatedWaitMin: number;
  position: number | null;
  service: { name: string; durationMin: number };
  staff: { name: string } | null;
};

export default function QueueView({
  services,
  initialEntry,
}: {
  services: Service[];
  initialEntry: Entry | null;
}) {
  const router = useRouter();
  const [entry, setEntry] = useState<Entry | null>(initialEntry);
  const [serviceId, setServiceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Poll for position/wait-time updates while checked in (FR-09: "rifreskohet
  // kur radha ndryshon" — the client sees this without reloading the page).
  useEffect(() => {
    if (!entry || entry.status === "COMPLETED" || entry.status === "NO_SHOW") return;
    const id = setInterval(async () => {
      const res = await fetch("/api/queue");
      const data = await res.json();
      const mine = (data.entries ?? []).find((e: Entry) => e.id === entry.id);
      if (mine) setEntry(mine);
      else {
        // No longer active (called through to completion elsewhere, etc.)
        setEntry(null);
        router.refresh();
      }
    }, 8000);
    return () => clearInterval(id);
  }, [entry, router]);

  async function checkin() {
    if (!serviceId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Check-in dështoi");
        return;
      }
      router.refresh();
      // Fetch full entry (with position) for immediate display.
      const list = await fetch("/api/queue").then((r) => r.json());
      const mine = (list.entries ?? []).find((e: Entry) => e.id === data.entry.id);
      if (mine) setEntry(mine);
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!entry) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/queue/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      if (res.ok) {
        setEntry(null);
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Largimi dështoi");
      }
    } finally {
      setBusy(false);
    }
  }

  // ---------- Already in the queue ----------
  if (entry) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Radha ime</h2>
          <span className="text-sm text-ink-faint">Nr. {entry.queueNumber}</span>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Badge tone={QUEUE_STATUS_TONE[entry.status]}>{QUEUE_STATUS_LABEL[entry.status]}</Badge>
          <span className="text-sm text-ink-soft">{entry.service.name}</span>
        </div>

        {entry.status === "WAITING" && (
          <>
            <div className="mt-5 rounded-xl bg-canvas p-4 text-center">
              <p className="text-xs text-ink-faint">Pozicioni në radhë</p>
              <p className="mt-1 font-display text-4xl font-semibold text-ink">
                {entry.position ?? "—"}
              </p>
              <p className="text-xs text-ink-faint">klientë përpara teje</p>
            </div>
            <div className="mt-3 rounded-xl bg-accent-soft p-4 text-center">
              <p className="text-xs text-ink-soft">Koha e parashikuar e pritjes</p>
              <p className="mt-1 font-display text-4xl font-semibold text-accent">
                ~{entry.estimatedWaitMin} min
              </p>
              <p className="text-xs text-ink-soft">Shërbimi: {entry.service.name} ({entry.service.durationMin} min)</p>
            </div>
            <p className="mt-4 text-sm text-ink-soft">
              🔔 Do të njoftohesh kur të afrohet radha jote.
            </p>
          </>
        )}

        {entry.status === "CALLED" && (
          <p className="mt-5 rounded-xl bg-ok-soft p-4 text-center text-sm font-medium text-ok">
            Radha jote erdhi{entry.staff ? ` te ${entry.staff.name}` : ""}! Paraqitu te studioja.
          </p>
        )}

        {entry.status === "IN_SERVICE" && (
          <p className="mt-5 rounded-xl bg-accent-soft p-4 text-center text-sm text-ink">
            Je duke u shërbyer. Faleminderit për durimin!
          </p>
        )}

        {error && (
          <div className="mt-4">
            <Alert message={error} />
          </div>
        )}

        {entry.status === "WAITING" && (
          <div className="mt-5 text-right">
            <button onClick={leave} disabled={busy} className={buttonStyles.secondary}>
              Largohu nga radha
            </button>
          </div>
        )}
      </Card>
    );
  }

  // ---------- Not in the queue: offer check-in ----------
  return (
    <Card>
      <h2 className="text-lg font-semibold text-ink">Bëj check-in</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Erdhe pa termin? Zgjidh shërbimin dhe fut hyrjen tënde në radhë.
      </p>

      {services.length === 0 ? (
        <div className="mt-4">
          <EmptyState text="Studioja nuk ka ende shërbime të disponueshme." />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => setServiceId(s.id)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  serviceId === s.id ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-muted"
                }`}
              >
                <span className="block font-medium text-ink">{s.name}</span>
                <span className="text-sm text-ink-soft">{s.durationMin} min</span>
              </button>
            ))}
          </div>

          {error && <Alert message={error} />}

          <div className="text-right">
            <button onClick={checkin} disabled={!serviceId || busy} className={buttonStyles.primary}>
              {busy ? "Duke u regjistruar…" : "Fut check-in"}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
