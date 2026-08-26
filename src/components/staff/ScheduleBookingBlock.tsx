"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_PILL } from "@/lib/booking-labels";

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

const CANCELLABLE: BookingStatus[] = ["CONFIRMED", "CHECKED_IN"];

export default function ScheduleBookingBlock({
  id,
  clientName,
  serviceName,
  status,
  timeRangeLabel,
  topPx,
  heightPx,
}: {
  id: string;
  clientName: string;
  serviceName: string;
  status: BookingStatus;
  timeRangeLabel: string;
  topPx: number;
  heightPx: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function cancel() {
    if (!confirm(`Ta anulosh terminin me ${clientName}?`)) return;
    setBusy(true);
    setOpen(false);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const pill = BOOKING_STATUS_PILL[status];
  const canCancel = CANCELLABLE.includes(status);

  return (
    <div
      className={`absolute left-1 right-1 flex items-center gap-2.5 rounded-lg px-2.5 transition-colors hover:brightness-95 ${pill.bg} ${busy ? "opacity-60" : ""}`}
      style={{ top: topPx, height: heightPx }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink-soft ring-1 ring-line">
        {initials(clientName)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{clientName}</p>
        <p className="truncate text-xs text-ink-faint">{serviceName}</p>
      </div>
      <span className={`hidden shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold sm:inline ${pill.text}`}>
        {BOOKING_STATUS_LABEL[status]}
      </span>
      <span className="hidden shrink-0 text-xs text-ink-faint md:inline">{timeRangeLabel}</span>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          aria-label="Më shumë veprime"
          className="flex h-6 w-6 items-center justify-center rounded text-ink-faint transition-colors hover:bg-surface hover:text-ink disabled:opacity-50"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m9 18 6-6-6-6" /></svg>
        </button>
        {open && (
          <div className="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-xl border border-line-strong bg-surface py-1 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]">
            {canCancel ? (
              <button type="button" onClick={cancel} className="w-full px-3.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft">
                Anulo Terminin
              </button>
            ) : (
              <p className="px-3.5 py-2 text-xs text-ink-faint">Ky termin nuk mund të anulohet më</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
