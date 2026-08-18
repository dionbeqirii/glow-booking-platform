"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/lib/booking-labels";
import type { BookingStatus } from "@prisma/client";

export type StaffClientBooking = {
  id: string;
  when: string; // preformatted server-side
  status: BookingStatus;
  serviceName: string;
  clientName: string;
};

type Bucket = "ALL" | "PENDING" | "COMPLETED" | "CANCELLED";

const PENDING_STATUS: BookingStatus[] = ["CONFIRMED", "CHECKED_IN", "IN_SERVICE"];
const CANCELLED_STATUS: BookingStatus[] = ["CANCELLED", "NO_SHOW"];

const BUCKETS: { key: Bucket; label: string }[] = [
  { key: "ALL", label: "Të gjithë" },
  { key: "PENDING", label: "Në pritje" },
  { key: "COMPLETED", label: "Përfunduar" },
  { key: "CANCELLED", label: "Anuluar" },
];

function inBucket(status: BookingStatus, bucket: Bucket): boolean {
  if (bucket === "ALL") return true;
  if (bucket === "PENDING") return PENDING_STATUS.includes(status);
  if (bucket === "COMPLETED") return status === "COMPLETED";
  return CANCELLED_STATUS.includes(status);
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

export default function StaffClients({ bookings }: { bookings: StaffClientBooking[] }) {
  const [bucket, setBucket] = useState<Bucket>("ALL");

  const counts = useMemo(() => {
    const c: Record<Bucket, number> = { ALL: bookings.length, PENDING: 0, COMPLETED: 0, CANCELLED: 0 };
    for (const b of bookings) {
      if (PENDING_STATUS.includes(b.status)) c.PENDING++;
      else if (b.status === "COMPLETED") c.COMPLETED++;
      else c.CANCELLED++;
    }
    return c;
  }, [bookings]);

  const shown = useMemo(() => bookings.filter((b) => inBucket(b.status, bucket)), [bookings, bucket]);

  return (
    <div className="mt-5">
      {/* Status filter pills */}
      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl bg-surface p-2 ring-1 ring-line">
        {BUCKETS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => setBucket(b.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              bucket === b.key ? "bg-accent text-white" : "text-ink-soft hover:bg-surface-muted"
            }`}
          >
            {b.label} ({counts[b.key]})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl bg-surface p-10 text-center ring-1 ring-line">
          <p className="text-sm text-ink-faint">
            {bookings.length === 0 ? "Ende nuk ke klientë me rezervime." : "Asnjë rezervim nuk përputhet me këtë filtër."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3 font-medium">Klienti</th>
                  <th className="px-4 py-3 font-medium">Shërbimi</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Statusi</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                          {initials(b.clientName)}
                        </span>
                        <span className="font-medium text-ink">{b.clientName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{b.serviceName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink-soft">{b.when}</td>
                    <td className="px-4 py-3">
                      <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
