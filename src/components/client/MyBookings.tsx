"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { Card, Badge, Alert, buttonStyles, inputStyles } from "../ui";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/lib/booking-labels";

export type BookingRow = {
  id: string;
  startTime: string;
  status: BookingStatus;
  serviceName: string;
  serviceDuration: number;
  staffName: string;
  staffId: string;
  canManage: boolean; // upcoming and still active
};

type Slot = { time: string; staff: { id: string; name: string }[] };

export default function MyBookings({
  serviceIdByBooking,
  bookings,
}: {
  serviceIdByBooking: Record<string, string>;
  bookings: BookingRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Inline reschedule state
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  async function cancel(b: BookingRow) {
    if (!confirm(`Të anulohet rezervimi për ${b.serviceName}?`)) return;
    setBusyId(b.id);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Anulimi dështoi");
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function openReschedule(b: BookingRow) {
    setReschedId(b.id);
    setSlots([]);
    setError(null);
    const d = new Date(b.startTime);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    setDate(iso);
    await loadSlots(b, iso);
  }

  async function loadSlots(b: BookingRow, forDate: string) {
    const serviceId = serviceIdByBooking[b.id];
    if (!serviceId || !forDate) return;
    setLoadingSlots(true);
    try {
      const q = new URLSearchParams({ serviceId, date: forDate, staffId: b.staffId });
      const res = await fetch(`/api/availability?${q.toString()}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function reschedule(b: BookingRow, time: string) {
    setBusyId(b.id);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", staffId: b.staffId, startTime: time }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Riplanifikimi dështoi");
        return;
      }
      setReschedId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (bookings.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-ink-faint">
          Nuk ke ende rezervime. Kliko “Rezervo një termin” për të filluar.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <Alert message={error} />}

      {bookings.map((b) => {
        const when = new Date(b.startTime).toLocaleString("sq", {
          weekday: "long",
          day: "numeric",
          month: "long",
          hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
        });
        return (
          <Card key={b.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-ink">{b.serviceName}</h3>
                  <Badge tone={BOOKING_STATUS_TONE[b.status]}>
                    {BOOKING_STATUS_LABEL[b.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {when} · {b.serviceDuration} min · me {b.staffName}
                </p>
              </div>

              {b.canManage && (
                <div className="flex gap-2">
                  <button
                    onClick={() => (reschedId === b.id ? setReschedId(null) : openReschedule(b))}
                    disabled={busyId === b.id}
                    className={`${buttonStyles.secondary} px-3 py-1.5`}
                  >
                    Riplanifiko
                  </button>
                  <button
                    onClick={() => cancel(b)}
                    disabled={busyId === b.id}
                    className={`${buttonStyles.danger} px-3 py-1.5`}
                  >
                    Anulo
                  </button>
                </div>
              )}
            </div>

            {reschedId === b.id && (
              <div className="mt-4 border-t border-line pt-4">
                <div className="max-w-xs">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-ink">Data e re</span>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        loadSlots(b, e.target.value);
                      }}
                      className={inputStyles}
                    />
                  </label>
                </div>
                <div className="mt-3">
                  {loadingSlots ? (
                    <p className="text-sm text-ink-faint">Duke ngarkuar oraret…</p>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-ink-faint">Nuk ka orare të lira për këtë ditë.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {slots.map((s) => {
                        const label = new Date(s.time).toLocaleTimeString("sq", {
                          hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                        });
                        return (
                          <button
                            key={s.time}
                            onClick={() => reschedule(b, s.time)}
                            disabled={busyId === b.id}
                            className="rounded-full bg-surface px-4 py-1.5 text-sm font-medium text-ink ring-1 ring-line-strong hover:bg-accent-soft"
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
