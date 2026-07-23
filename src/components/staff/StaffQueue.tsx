"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, Badge, Alert, EmptyState, buttonStyles } from "../ui";
import { QUEUE_STATUS_LABEL, QUEUE_STATUS_TONE } from "@/lib/booking-labels";

type Entry = {
  id: string;
  queueNumber: number;
  status: "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED" | "NO_SHOW";
  estimatedWaitMin: number;
  checkinAt: string;
  service: { name: string; durationMin: number };
  staff: { id: string; name: string } | null;
  client: { name: string } | null;
  clientName: string | null;
};

export default function StaffQueue({
  meId,
  isAdmin,
  initial,
}: {
  meId: string;
  isAdmin: boolean;
  initial: Entry[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(id: string, action: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Veprimi dështoi");
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const waiting = initial.filter((e) => e.status === "WAITING");
  const called = initial.filter((e) => e.status === "CALLED");
  const inService = initial.filter((e) => e.status === "IN_SERVICE");

  if (initial.length === 0) {
    return (
      <Card>
        <EmptyState text="Radha është bosh për momentin." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert message={error} />}

      {inService.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Në shërbim</p>
          <div className="flex flex-col gap-2">
            {inService.map((e) => (
              <Row key={e.id} e={e} busy={busyId === e.id}>
                {(isAdmin || e.staff?.id === meId) && (
                  <button
                    onClick={() => act(e.id, "complete")}
                    disabled={busyId === e.id}
                    className={`${buttonStyles.primary} px-3 py-1.5`}
                  >
                    ✔ Përfundo
                  </button>
                )}
              </Row>
            ))}
          </div>
        </div>
      )}

      {called.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Thirrur — duke pritur paraqitjen</p>
          <div className="flex flex-col gap-2">
            {called.map((e) => (
              <Row key={e.id} e={e} busy={busyId === e.id}>
                {(isAdmin || e.staff?.id === meId) && (
                  <>
                    <button
                      onClick={() => act(e.id, "start")}
                      disabled={busyId === e.id}
                      className={`${buttonStyles.primary} px-3 py-1.5`}
                    >
                      Fillo shërbimin
                    </button>
                    <button
                      onClick={() => act(e.id, "no_show")}
                      disabled={busyId === e.id}
                      className={`${buttonStyles.danger} px-3 py-1.5`}
                    >
                      No-show
                    </button>
                  </>
                )}
              </Row>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-ink-soft">
          Në pritje ({waiting.length})
        </p>
        {waiting.length === 0 ? (
          <p className="text-sm text-ink-faint">Askush në pritje.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {waiting.map((e, i) => (
              <Row key={e.id} e={e} busy={busyId === e.id} position={i + 1}>
                <button
                  onClick={() => act(e.id, "call")}
                  disabled={busyId === e.id}
                  className={`${buttonStyles.primary} px-3 py-1.5`}
                >
                  Thirre
                </button>
              </Row>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  e,
  busy,
  position,
  children,
}: {
  e: Entry;
  busy: boolean;
  position?: number;
  children?: React.ReactNode;
}) {
  const name = e.client?.name ?? e.clientName ?? "Klient pa emër";
  return (
    <Card className={busy ? "opacity-60" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">
              Nr. {e.queueNumber} · {name}
            </span>
            <Badge tone={QUEUE_STATUS_TONE[e.status]}>{QUEUE_STATUS_LABEL[e.status]}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">
            {e.service.name} ({e.service.durationMin} min)
            {position ? ` · pozicioni ${position}` : ""}
            {e.staff ? ` · sugjeruar: ${e.staff.name}` : ""}
            {e.status === "WAITING" ? ` · ~${e.estimatedWaitMin} min pritje` : ""}
          </p>
        </div>
        <div className="flex gap-2">{children}</div>
      </div>
    </Card>
  );
}
