"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { BookingStatus, QueueStatus } from "@prisma/client";
import { BOOKING_STATUS_PILL, QUEUE_STATUS_PILL } from "@/lib/booking-labels";
import type { AdminBookingRow, AdminQueueRow, StaffOption } from "@/lib/admin-history";

const PAGE_SIZES = [10, 25, 50];
const BOOKING_STATUS_KEYS: BookingStatus[] = ["CONFIRMED", "CHECKED_IN", "IN_SERVICE", "COMPLETED", "CANCELLED", "NO_SHOW"];
const QUEUE_STATUS_KEYS: QueueStatus[] = ["WAITING", "CALLED", "IN_SERVICE", "COMPLETED", "NO_SHOW"];
const ACTIVE_BOOKING: BookingStatus[] = ["CONFIRMED", "CHECKED_IN"];
// The five statuses the admin corrects a booking to from the history table
// (Check-in is intentionally left out — nothing else in the app sets it,
// so it never needs to be a target, only a possible starting value).
const STATUS_TARGETS: BookingStatus[] = ["CONFIRMED", "IN_SERVICE", "COMPLETED", "CANCELLED", "NO_SHOW"];

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
function daySpan(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000) + 1;
}
function initials(name: string): string {
  return (
    name.split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, "")).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"
  );
}
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcCalendar() {
  return <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IcCalendarSmall() {
  return <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} className="shrink-0 text-ink-faint" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IcCheck() {
  return <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>;
}
function IcClock() {
  return <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
function IcX() {
  return <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="m9.5 9.5 5 5m0-5-5 5" /></svg>;
}
function IcQueue() {
  return <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
function IcSort({ dir }: { dir: "asc" | "desc" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${dir === "asc" ? "rotate-180" : ""}`} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IcTrash() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
function IcChevron({ open }: { open: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  return url ? (
    <img src={url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">{initials(name)}</span>
  );
}

function StatCard({ icon, tone, value, label, sub }: { icon: React.ReactNode; tone: "ok" | "info" | "gold" | "danger"; value: number; label: string; sub: string | null }) {
  const toneCls = {
    ok: "bg-ok-soft text-ok",
    info: "bg-teal-soft text-teal",
    gold: "bg-gold-soft text-gold",
    danger: "bg-danger-soft text-danger",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-4">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${toneCls}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight text-ink">{value}</p>
        <p className="truncate text-xs font-medium text-ink-soft">{label}</p>
        {sub && <p className="truncate text-[11px] text-ink-faint">{sub}</p>}
      </div>
    </div>
  );
}

export default function AdminHistory({ bookings, queue, staff }: { bookings: AdminBookingRow[]; queue: AdminQueueRow[]; staff: StaffOption[] }) {
  const router = useRouter();
  const t = useTranslations("AdminHistoriku");
  const tStatusBooking = useTranslations("Status.booking");
  const tStatusQueue = useTranslations("Status.queue");
  const [tab, setTab] = useState<"bookings" | "queue">("bookings");
  const today = isoDate(new Date());
  const [from, setFrom] = useState(addDays(today, -13));
  const [to, setTo] = useState(today);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | "ALL">("ALL");
  const [queueStatus, setQueueStatus] = useState<QueueStatus | "ALL">("ALL");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  function changeRange(nextFrom: string, nextTo: string) {
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(1);
  }

  // ---------- Bookings: range + prior-period (for the delta) + stats ----------
  const rangeBookings = useMemo(
    () => bookings.filter((b) => b.startTime.slice(0, 10) >= from && b.startTime.slice(0, 10) <= to),
    [bookings, from, to]
  );
  const priorBookingsCount = useMemo(() => {
    const span = daySpan(from, to);
    const priorTo = addDays(from, -1);
    const priorFrom = addDays(priorTo, -(span - 1));
    return bookings.filter((b) => b.startTime.slice(0, 10) >= priorFrom && b.startTime.slice(0, 10) <= priorTo).length;
  }, [bookings, from, to]);
  const bookingDelta = priorBookingsCount > 0 ? Math.round(((rangeBookings.length - priorBookingsCount) / priorBookingsCount) * 100) : null;
  const bookingsCompleted = rangeBookings.filter((b) => b.status === "COMPLETED").length;
  const bookingsPending = rangeBookings.filter((b) => ACTIVE_BOOKING.includes(b.status) || b.status === "IN_SERVICE").length;
  const bookingsCancelled = rangeBookings.filter((b) => b.status === "CANCELLED" || b.status === "NO_SHOW").length;

  // ---------- Queue: same shape, mirrored ----------
  const rangeQueue = useMemo(
    () => queue.filter((q) => q.checkinAt.slice(0, 10) >= from && q.checkinAt.slice(0, 10) <= to),
    [queue, from, to]
  );
  const priorQueueCount = useMemo(() => {
    const span = daySpan(from, to);
    const priorTo = addDays(from, -1);
    const priorFrom = addDays(priorTo, -(span - 1));
    return queue.filter((q) => q.checkinAt.slice(0, 10) >= priorFrom && q.checkinAt.slice(0, 10) <= priorTo).length;
  }, [queue, from, to]);
  const queueDelta = priorQueueCount > 0 ? Math.round(((rangeQueue.length - priorQueueCount) / priorQueueCount) * 100) : null;
  const queueCompleted = rangeQueue.filter((q) => q.status === "COMPLETED").length;
  const queuePending = rangeQueue.filter((q) => q.status === "WAITING" || q.status === "CALLED" || q.status === "IN_SERVICE").length;
  const queueNoShow = rangeQueue.filter((q) => q.status === "NO_SHOW").length;

  const pct = (n: number, total: number) => (total > 0 ? t("ofTotal", { pct: ((n / total) * 100).toFixed(1) }) : "—");

  // ---------- Filter (status) + sort + paginate the active tab ----------
  const filteredBookings = useMemo(() => {
    const list = bookingStatus === "ALL" ? rangeBookings : rangeBookings.filter((b) => b.status === bookingStatus);
    return [...list].sort((a, b) => (sortDir === "desc" ? b.startTime.localeCompare(a.startTime) : a.startTime.localeCompare(b.startTime)));
  }, [rangeBookings, bookingStatus, sortDir]);
  const filteredQueue = useMemo(() => {
    const list = queueStatus === "ALL" ? rangeQueue : rangeQueue.filter((q) => q.status === queueStatus);
    return [...list].sort((a, b) => (sortDir === "desc" ? b.checkinAt.localeCompare(a.checkinAt) : a.checkinAt.localeCompare(b.checkinAt)));
  }, [rangeQueue, queueStatus, sortDir]);

  const activeList = tab === "bookings" ? filteredBookings : filteredQueue;
  const totalPages = Math.max(1, Math.ceil(activeList.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeFromN = activeList.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeToN = Math.min(safePage * pageSize, activeList.length);
  const pageBookings = tab === "bookings" ? filteredBookings.slice((safePage - 1) * pageSize, safePage * pageSize) : [];
  const pageQueue = tab === "queue" ? filteredQueue.slice((safePage - 1) * pageSize, safePage * pageSize) : [];

  function switchTab(next: "bookings" | "queue") {
    setTab(next);
    setPage(1);
  }

  // ---------- Real actions, unchanged from before (admin-only override) ----------
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
      if (!res.ok) setError(data.error ?? t("reassignFailed"));
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }
  async function setBookingStatusAction(bookingId: string, status: BookingStatus) {
    setBusy(bookingId);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status", status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? t("statusChangeFailed"));
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }
  // Permanent — unlike a status change to Cancelled, this removes the
  // record entirely (and any feedback left on it). Confirmed before firing,
  // same as the client-side cancel action elsewhere in the app.
  async function deleteBooking(bookingId: string, label: string) {
    if (!confirm(t("confirmDeleteBooking", { label }))) return;
    setBusy(bookingId);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? t("deleteFailed"));
      else router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const selectCls = "rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => switchTab("bookings")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === "bookings" ? "bg-accent text-white" : "text-ink-soft ring-1 ring-line-strong hover:bg-surface-muted"}`}
          >
            <IcCalendarSmall />
            {t("tabBookings", { count: bookings.length })}
          </button>
          <button
            type="button"
            onClick={() => switchTab("queue")}
            className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${tab === "queue" ? "bg-accent text-white" : "text-ink-soft ring-1 ring-line-strong hover:bg-surface-muted"}`}
          >
            <IcQueue />
            {t("tabQueue", { count: queue.length })}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-lg border border-line-strong bg-surface py-1 pl-1.5 pr-1">
            <input type="date" value={from} onChange={(e) => changeRange(e.target.value, to)} className="w-[132px] shrink-0 border-0 bg-transparent p-1 text-sm text-ink-soft outline-none" />
            <span className="shrink-0 text-ink-faint">–</span>
            <input type="date" value={to} onChange={(e) => changeRange(from, e.target.value)} className="w-[132px] shrink-0 border-0 bg-transparent p-1 text-sm text-ink-soft outline-none" />
          </div>
          {tab === "bookings" ? (
            <select value={bookingStatus} onChange={(e) => { setBookingStatus(e.target.value as BookingStatus | "ALL"); setPage(1); }} className={selectCls}>
              <option value="ALL">{t("allStatuses")}</option>
              {BOOKING_STATUS_KEYS.map((s) => <option key={s} value={s}>{tStatusBooking(s)}</option>)}
            </select>
          ) : (
            <select value={queueStatus} onChange={(e) => { setQueueStatus(e.target.value as QueueStatus | "ALL"); setPage(1); }} className={selectCls}>
              <option value="ALL">{t("allStatuses")}</option>
              {QUEUE_STATUS_KEYS.map((s) => <option key={s} value={s}>{tStatusQueue(s)}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {tab === "bookings" ? (
          <>
            <StatCard icon={<IcCalendar />} tone="ok" value={rangeBookings.length} label={t("statTotalBookings")} sub={bookingDelta === null ? null : t("statDeltaFromPrior", { sign: bookingDelta >= 0 ? "+" : "", pct: bookingDelta })} />
            <StatCard icon={<IcCheck />} tone="info" value={bookingsCompleted} label={t("statConfirmed")} sub={pct(bookingsCompleted, rangeBookings.length)} />
            <StatCard icon={<IcClock />} tone="gold" value={bookingsPending} label={t("statPending")} sub={pct(bookingsPending, rangeBookings.length)} />
            <StatCard icon={<IcX />} tone="danger" value={bookingsCancelled} label={t("statCancelled")} sub={pct(bookingsCancelled, rangeBookings.length)} />
          </>
        ) : (
          <>
            <StatCard icon={<IcCalendar />} tone="ok" value={rangeQueue.length} label={t("statTotalQueue")} sub={queueDelta === null ? null : t("statDeltaFromPrior", { sign: queueDelta >= 0 ? "+" : "", pct: queueDelta })} />
            <StatCard icon={<IcCheck />} tone="info" value={queueCompleted} label={t("statServed")} sub={pct(queueCompleted, rangeQueue.length)} />
            <StatCard icon={<IcClock />} tone="gold" value={queuePending} label={t("statPending")} sub={pct(queuePending, rangeQueue.length)} />
            <StatCard icon={<IcX />} tone="danger" value={queueNoShow} label={t("statNoShow")} sub={pct(queueNoShow, rangeQueue.length)} />
          </>
        )}
      </div>

      {error && <p className="shrink-0 rounded-xl bg-danger-soft px-4 py-2.5 text-sm text-danger ring-1 ring-danger/20">{error}</p>}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface">
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col style={{ width: "13%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "16%" }} />
            </colgroup>
            <thead>
              <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:overflow-hidden [&>th]:bg-surface">
                <th className="px-3 py-2 font-medium">
                  <button type="button" onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))} className="flex items-center gap-1 transition-colors hover:text-ink">
                    {t("colDateTime")}
                    <IcSort dir={sortDir} />
                  </button>
                </th>
                <th className="px-3 py-2 font-medium">{t("colClient")}</th>
                <th className="px-3 py-2 font-medium">{t("colService")}</th>
                <th className="px-3 py-2 font-medium">{t("colStaff")}</th>
                <th className="px-3 py-2 font-medium">{t("colType")}</th>
                <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {tab === "bookings" ? (
                pageBookings.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-faint">{bookings.length === 0 ? t("noBookings") : t("noBookingsMatch")}</td></tr>
                ) : (
                  pageBookings.map((b) => (
                    <BookingRow key={b.id} b={b} staff={staff} busy={busy === b.id} onReassign={reassign} onSetStatus={setBookingStatusAction} onDelete={deleteBooking} />
                  ))
                )
              ) : pageQueue.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-faint">{queue.length === 0 ? t("noQueueEntries") : t("noQueueMatch")}</td></tr>
              ) : (
                pageQueue.map((q) => <QueueRow key={q.id} q={q} />)
              )}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-xs text-ink-faint">
          <span>{t("showingRange", { from: rangeFromN, to: rangeToN, total: activeList.length })}</span>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{t("perPage", { count: s })}</option>)}
            </select>
            <div className="flex items-center gap-0.5">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)} aria-label={t("prevPage")} className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-30">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              {pageNumbers(safePage, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`e${i}`} className="px-1 text-ink-faint">…</span>
                ) : (
                  <button key={p} type="button" onClick={() => setPage(p)} className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1 text-xs font-medium transition-colors ${p === safePage ? "bg-accent text-white" : "text-ink-soft hover:bg-surface-muted hover:text-ink"}`}>
                    {p}
                  </button>
                )
              )}
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)} aria-label={t("nextPage")} className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-30">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Self-contained: owns its own expand/menu state so it never resets when a
// sibling row or the filters above re-render (react-hooks/static-components).
function BookingRow({
  b, staff, busy, onReassign, onSetStatus, onDelete,
}: {
  b: AdminBookingRow;
  staff: StaffOption[];
  busy: boolean;
  onReassign: (id: string, staffId: string) => void;
  onSetStatus: (id: string, status: BookingStatus) => void;
  onDelete: (id: string, label: string) => void;
}) {
  const t = useTranslations("AdminHistoriku");
  const tStatusBooking = useTranslations("Status.booking");
  const [open, setOpen] = useState(false);
  const pill = BOOKING_STATUS_PILL[b.status];
  const qualified = staff.filter((s) => s.serviceIds.includes(b.serviceId));
  const canReassign = ACTIVE_BOOKING.includes(b.status);

  return (
    <>
      <tr className="border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
        <td className="overflow-hidden px-3 py-2 text-ink-soft">
          <span className="block truncate">{b.dateLabel}, {b.timeLabel}</span>
          <span className="block truncate text-[11px] text-ink-faint">{b.weekdayLabel}</span>
        </td>
        <td className="overflow-hidden px-3 py-2">
          <div className="flex items-center gap-2">
            <Avatar name={b.clientName} url={b.clientAvatarUrl} />
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{b.clientName}</p>
              {b.clientPhone && <p className="truncate text-[11px] text-ink-faint">{b.clientPhone}</p>}
            </div>
          </div>
        </td>
        <td className="overflow-hidden px-3 py-2 text-ink-soft"><span className="block truncate">{b.serviceName}</span></td>
        <td className="overflow-hidden px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Avatar name={b.staffName} url={b.staffAvatarUrl} />
            <span className="min-w-0 truncate text-ink-soft">{b.staffName}</span>
          </div>
        </td>
        <td className="overflow-hidden px-3 py-2">
          <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-1 text-[11px] font-semibold text-ink-soft">{t("typeBooking")}</span>
        </td>
        <td className="overflow-hidden px-3 py-2">
          <span className={`inline-flex max-w-full items-center rounded-full px-2 py-1 text-[11px] font-semibold ${pill.bg} ${pill.text}`}>
            <span className="truncate">{tStatusBooking(b.status)}</span>
          </span>
        </td>
        <td className="overflow-hidden px-3 py-2 text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t("closeDetails") : t("viewDetails")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <IcChevron open={open} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-line bg-canvas last:border-0">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex flex-wrap items-end gap-x-8 gap-y-3 text-xs">
              <div>
                <p className="mb-0.5 font-semibold uppercase tracking-wide text-ink-faint">{t("duration")}</p>
                <p className="text-ink">{b.serviceDurationMin} min</p>
              </div>
              <div>
                <p className="mb-0.5 font-semibold uppercase tracking-wide text-ink-faint">{t("price")}</p>
                <p className="text-ink">{b.servicePrice.toFixed(2)} €</p>
              </div>
              <div>
                <p className="mb-0.5 font-semibold uppercase tracking-wide text-ink-faint">{t("client")}</p>
                <p className="text-ink">{b.clientPhone ?? t("noPhone")}</p>
              </div>
              {canReassign && (
                <div>
                  <p className="mb-0.5 font-semibold uppercase tracking-wide text-ink-faint">{t("changeStaff")}</p>
                  <select value={b.staffId} disabled={busy} onChange={(e) => onReassign(b.id, e.target.value)} className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs text-ink disabled:opacity-50">
                    {qualified.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <p className="mb-0.5 font-semibold uppercase tracking-wide text-ink-faint">{t("changeStatus")}</p>
                <select value={b.status} disabled={busy} onChange={(e) => onSetStatus(b.id, e.target.value as BookingStatus)} aria-label={t("changeStatus")} className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs text-ink disabled:opacity-50">
                  {b.status === "CHECKED_IN" && <option value="CHECKED_IN">{tStatusBooking("CHECKED_IN")}</option>}
                  {STATUS_TARGETS.map((s) => <option key={s} value={s}>{tStatusBooking(s)}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={() => onDelete(b.id, `${b.serviceName} — ${b.clientName}`)}
                disabled={busy}
                title={t("deleteBooking")}
                aria-label={t("deleteBooking")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-danger ring-1 ring-danger/30 transition-colors hover:bg-danger-soft disabled:opacity-50"
              >
                <IcTrash />
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function QueueRow({ q }: { q: AdminQueueRow }) {
  const t = useTranslations("AdminHistoriku");
  const tStatusQueue = useTranslations("Status.queue");
  const [open, setOpen] = useState(false);
  const pill = QUEUE_STATUS_PILL[q.status];
  const clientLabel = q.clientName ?? t("walkinFallback");

  return (
    <>
      <tr className="border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
        <td className="overflow-hidden px-3 py-2 text-ink-soft">
          <span className="block truncate">{q.dateLabel}, {q.timeLabel}</span>
          <span className="block truncate text-[11px] text-ink-faint">{q.weekdayLabel}</span>
        </td>
        <td className="overflow-hidden px-3 py-2">
          <div className="flex items-center gap-2">
            <Avatar name={clientLabel} url={q.clientAvatarUrl} />
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{clientLabel}</p>
              {q.clientPhone && <p className="truncate text-[11px] text-ink-faint">{q.clientPhone}</p>}
            </div>
          </div>
        </td>
        <td className="overflow-hidden px-3 py-2 text-ink-soft"><span className="block truncate">{q.serviceName}</span></td>
        <td className="overflow-hidden px-3 py-2">
          {q.staffName ? (
            <div className="flex items-center gap-1.5">
              <Avatar name={q.staffName} url={q.staffAvatarUrl} />
              <span className="min-w-0 truncate text-ink-soft">{q.staffName}</span>
            </div>
          ) : (
            <span className="text-ink-faint">—</span>
          )}
        </td>
        <td className="overflow-hidden px-3 py-2">
          <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-1 text-[11px] font-semibold text-ink-soft">{t("typeQueue")}</span>
        </td>
        <td className="overflow-hidden px-3 py-2">
          <span className={`inline-flex max-w-full items-center rounded-full px-2 py-1 text-[11px] font-semibold ${pill.bg} ${pill.text}`}>
            <span className="truncate">{tStatusQueue(q.status)}</span>
          </span>
        </td>
        <td className="overflow-hidden px-3 py-2 text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t("closeDetails") : t("viewDetails")}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <IcChevron open={open} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-line bg-canvas last:border-0">
          <td colSpan={7} className="px-4 py-3">
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs">
              <div>
                <p className="mb-0.5 font-semibold uppercase tracking-wide text-ink-faint">{t("queueNumber")}</p>
                <p className="text-ink">#{q.queueNumber}</p>
              </div>
              <div>
                <p className="mb-0.5 font-semibold uppercase tracking-wide text-ink-faint">{t("client")}</p>
                <p className="text-ink">{q.clientPhone ?? t("noPhone")}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
