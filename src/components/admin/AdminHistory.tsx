"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, EmptyState, buttonStyles } from "@/components/ui";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  QUEUE_STATUS_LABEL,
  QUEUE_STATUS_TONE,
} from "@/lib/booking-labels";
import type { BookingStatus, QueueStatus } from "@prisma/client";

export type StaffOption = { id: string; name: string; serviceIds: string[] };

export type BookingHistoryRow = {
  id: string;
  when: string; // preformatted server-side to avoid a hydration mismatch
  status: BookingStatus;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  clientName: string;
};

export type QueueHistoryRow = {
  id: string;
  queueNumber: number;
  status: QueueStatus;
  when: string; // preformatted server-side
  serviceName: string;
  staffName: string | null;
  clientName: string;
};

const ACTIVE_BOOKING: BookingStatus[] = ["CONFIRMED", "CHECKED_IN"];

export default function AdminHistory({
  bookings,
  queue,
  staff,
}: {
  bookings: BookingHistoryRow[];
  queue: QueueHistoryRow[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"bookings" | "queue">("bookings");
  const [bookingFilter, setBookingFilter] = useState<BookingStatus | "ALL">("ALL");
  const [queueFilter, setQueueFilter] = useState<QueueStatus | "ALL">("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const shownBookings = useMemo(
    () => bookings.filter((b) => bookingFilter === "ALL" || b.status === bookingFilter),
    [bookings, bookingFilter]
  );
  const shownQueue = useMemo(
    () => queue.filter((q) => queueFilter === "ALL" || q.status === queueFilter),
    [queue, queueFilter]
  );

  async function reassign(bookingId: string, staffId: string) {
    setBusy(bookingId);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", staffId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Ri-caktimi dështoi");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  const tabBtn = (active: boolean) =>
    `rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
      active ? "bg-accent text-white" : "text-ink-soft hover:bg-surface-muted"
    }`;

  return (
    <div>
      <div className="mb-5 flex gap-2">
        <button type="button" className={tabBtn(tab === "bookings")} onClick={() => setTab("bookings")}>
          Rezervimet ({bookings.length})
        </button>
        <button type="button" className={tabBtn(tab === "queue")} onClick={() => setTab("queue")}>
          Radha ({queue.length})
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger ring-1 ring-danger/20">
          {error}
        </p>
      )}

      {tab === "bookings" ? (
        <div>
          <div className="mb-4">
            <select
              value={bookingFilter}
              onChange={(e) => setBookingFilter(e.target.value as BookingStatus | "ALL")}
              className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="ALL">Të gjitha statuset</option>
              {(Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[]).map((s) => (
                <option key={s} value={s}>
                  {BOOKING_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          {shownBookings.length === 0 ? (
            <EmptyState text="Asnjë rezervim për këtë filtër." />
          ) : (
            <div className="overflow-hidden rounded-2xl ring-1 ring-line">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-left text-xs text-ink-soft">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Klienti</th>
                    <th className="px-4 py-3 font-medium">Shërbimi</th>
                    <th className="px-4 py-3 font-medium">Punonjësi</th>
                    <th className="px-4 py-3 font-medium">Statusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shownBookings.map((b) => {
                    const qualified = staff.filter((s) => s.serviceIds.includes(b.serviceId));
                    const canReassign = ACTIVE_BOOKING.includes(b.status);
                    return (
                      <tr key={b.id} className="bg-surface">
                        <td className="whitespace-nowrap px-4 py-3 text-ink">{b.when}</td>
                        <td className="px-4 py-3 text-ink">{b.clientName}</td>
                        <td className="px-4 py-3 text-ink-soft">{b.serviceName}</td>
                        <td className="px-4 py-3">
                          {canReassign ? (
                            <select
                              value={b.staffId}
                              disabled={busy === b.id}
                              onChange={(e) => reassign(b.id, e.target.value)}
                              className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-sm text-ink disabled:opacity-50"
                            >
                              {qualified.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-ink-soft">{b.staffName}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={BOOKING_STATUS_TONE[b.status]}>
                            {BOOKING_STATUS_LABEL[b.status]}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-4">
            <select
              value={queueFilter}
              onChange={(e) => setQueueFilter(e.target.value as QueueStatus | "ALL")}
              className="rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-ink"
            >
              <option value="ALL">Të gjitha statuset</option>
              {(Object.keys(QUEUE_STATUS_LABEL) as QueueStatus[]).map((s) => (
                <option key={s} value={s}>
                  {QUEUE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          {shownQueue.length === 0 ? (
            <EmptyState text="Asnjë hyrje radhe për këtë filtër." />
          ) : (
            <div className="overflow-hidden rounded-2xl ring-1 ring-line">
              <table className="w-full text-sm">
                <thead className="bg-surface-muted text-left text-xs text-ink-soft">
                  <tr>
                    <th className="px-4 py-3 font-medium">Check-in</th>
                    <th className="px-4 py-3 font-medium">Nr.</th>
                    <th className="px-4 py-3 font-medium">Klienti</th>
                    <th className="px-4 py-3 font-medium">Shërbimi</th>
                    <th className="px-4 py-3 font-medium">Punonjësi</th>
                    <th className="px-4 py-3 font-medium">Statusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {shownQueue.map((q) => (
                    <tr key={q.id} className="bg-surface">
                      <td className="whitespace-nowrap px-4 py-3 text-ink">{q.when}</td>
                      <td className="px-4 py-3 text-ink-soft">{q.queueNumber}</td>
                      <td className="px-4 py-3 text-ink">{q.clientName}</td>
                      <td className="px-4 py-3 text-ink-soft">{q.serviceName}</td>
                      <td className="px-4 py-3 text-ink-soft">{q.staffName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={QUEUE_STATUS_TONE[q.status]}>{QUEUE_STATUS_LABEL[q.status]}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
