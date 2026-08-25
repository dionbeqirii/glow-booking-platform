"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BookingStatus, PaymentStatus } from "@prisma/client";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_PILL } from "@/lib/booking-labels";
import { serviceColorMap } from "@/lib/service-colors";
import PaymentStatusCell from "./PaymentStatusCell";

// Pre-formatted, display-ready shape — every date/time string is computed
// server-side (see terminet/page.tsx) and never re-derived from a Date here.
// This component hydrates on the client, and toLocaleDateString/TimeString
// output for "sq" can differ between Node's and Chromium's ICU data; passing
// raw Dates and formatting them client-side caused a real hydration mismatch
// (same class of bug AdminHistory.tsx's `when: string` comment already flags).
export type AppointmentTableRow = {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  serviceName: string;
  staffName: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  dateLabel: string;
  timeLabel: string;
  durationLabel: string;
  calendarDate: string; // YYYY-MM-DD, for the "view in calendar" link
};

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

export default function AppointmentsTable({ rows, serviceNames }: { rows: AppointmentTableRow[]; serviceNames: string[] }) {
  const router = useRouter();
  const colorByService = serviceColorMap(serviceNames);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the open row menu on any click outside it — the standard
  // "subscribe to an external event, setState in the callback" pattern.
  useEffect(() => {
    if (!openMenu) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenu]);

  const allSelected = rows.length > 0 && selected.size === rows.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function cancelBooking(id: string) {
    setRowBusy(id);
    setOpenMenu(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status: "CANCELLED" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setRowBusy(null);
    }
  }

  async function cancelSelected() {
    setBulkBusy(true);
    try {
      await Promise.all(
        [...selected].map((id) =>
          fetch(`/api/bookings/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "status", status: "CANCELLED" }),
          })
        )
      );
      setSelected(new Set());
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)]">
      {selected.size > 0 && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-accent-soft px-4 py-2.5">
          <span className="text-sm font-medium text-accent">{selected.size} të zgjedhur</span>
          <button
            onClick={cancelSelected}
            disabled={bulkBusy}
            className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-danger/90 disabled:opacity-60"
          >
            {bulkBusy ? "Duke anuluar…" : "Anulo të Zgjedhurat"}
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          {/* Percentage widths (not fixed px) so the table always exactly
              fills its container at any viewport — a fixed-px budget only
              worked above ~1400px and started overflowing below that,
              which is most real laptop screens once Windows display scaling
              is accounted for. Two exceptions stay fixed px: the checkbox
              (a fixed-size control) and Veprime (two fixed-size icon
              buttons) — neither has text that benefits from extra room. */}
          <colgroup>
            <col className="w-8" />
            <col style={{ width: "11%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "11%" }} />
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-surface">
              <th className="px-2 py-1">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Zgjidh të gjitha"
                  className="h-3.5 w-3.5 rounded border-line-strong accent-accent"
                />
              </th>
              <th className="px-2 py-1 font-medium">Termini</th>
              <th className="px-2 py-1 font-medium">Klienti</th>
              <th className="px-2 py-1 font-medium">Shërbimi</th>
              <th className="px-2 py-1 font-medium">Stafi</th>
              <th className="px-2 py-1 font-medium">Data &amp; Ora</th>
              <th className="px-2 py-1 font-medium">Kohëz.</th>
              <th className="px-2 py-1 font-medium">Statusi</th>
              <th className="px-2 py-1 font-medium">Pagesa</th>
              <th className="px-2 py-1 font-medium">Veprime</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-sm text-ink-faint">
                  Asnjë termin nuk përputhet me filtrat.
                </td>
              </tr>
            ) : (
              rows.map((b) => {
                const tone = colorByService.get(b.serviceName);
                const pill = BOOKING_STATUS_PILL[b.status];
                return (
                  <tr key={b.id} className="border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selected.has(b.id)}
                        onChange={() => toggleOne(b.id)}
                        aria-label={`Zgjidh ${b.clientName}`}
                        className="h-3.5 w-3.5 rounded border-line-strong accent-accent"
                      />
                    </td>
                    <td className="overflow-hidden px-2 py-1">
                      <div className="truncate font-medium text-ink">#RV-{b.id.slice(-6).toUpperCase()}</div>
                    </td>
                    <td className="overflow-hidden px-2 py-1">
                      <Link href={`/admin/klientet/${b.clientId}`} className="flex items-center gap-2 hover:underline">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[9px] font-semibold text-accent">
                          {initials(b.clientName)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{b.clientName}</span>
                          <span className="block truncate text-xs text-ink-faint">{b.clientPhone ?? "—"}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="overflow-hidden px-2 py-1">
                      <span className="flex items-center gap-1.5 truncate text-ink">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${tone?.dot ?? "bg-ink-faint"}`} />
                        <span className="truncate">{b.serviceName}</span>
                      </span>
                    </td>
                    <td className="overflow-hidden px-2 py-1">
                      <span className="flex items-center gap-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[8px] font-semibold text-ink-soft">
                          {initials(b.staffName)}
                        </span>
                        <span className="truncate text-ink">{b.staffName}</span>
                      </span>
                    </td>
                    <td className="overflow-hidden px-2 py-1 text-ink">
                      <div className="truncate">{b.dateLabel}, {b.timeLabel}</div>
                    </td>
                    <td className="overflow-hidden px-2 py-1 text-ink-soft">
                      <span className="truncate">{b.durationLabel}</span>
                    </td>
                    <td className="overflow-hidden px-2 py-1">
                      <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${pill.bg} ${pill.text}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pill.dot}`} />
                        <span className="truncate">{BOOKING_STATUS_LABEL[b.status]}</span>
                      </span>
                    </td>
                    <td className="overflow-hidden px-2 py-1">
                      <PaymentStatusCell bookingId={b.id} status={b.paymentStatus} />
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-0.5">
                        <Link
                          href={`/admin/kalendari?view=day&date=${b.calendarDate}`}
                          title="Shiko në kalendar"
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </Link>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenu(openMenu === b.id ? null : b.id)}
                            aria-label="Më shumë veprime"
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <circle cx="12" cy="5" r="1.6" />
                              <circle cx="12" cy="12" r="1.6" />
                              <circle cx="12" cy="19" r="1.6" />
                            </svg>
                          </button>
                          {openMenu === b.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-line-strong bg-surface py-1 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]"
                            >
                              <button
                                type="button"
                                disabled={rowBusy === b.id || b.status === "CANCELLED"}
                                onClick={() => cancelBooking(b.id)}
                                className="w-full px-3.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {rowBusy === b.id ? "Duke anuluar…" : "Anulo Terminin"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
