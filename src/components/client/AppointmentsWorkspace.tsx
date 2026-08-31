"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@prisma/client";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_PILL } from "@/lib/booking-labels";
import { buttonStyles, inputStyles } from "@/components/ui";
import type { AppointmentRow } from "@/lib/client-appointments";

type Tab = "upcoming" | "past" | "cancelled";
type Range = "all" | "week" | "month";
type Slot = { time: string; staff: { id: string; name: string }[] };

const UPCOMING_STATUSES: BookingStatus[] = ["CONFIRMED", "CHECKED_IN", "IN_SERVICE"];
const PAST_STATUSES: BookingStatus[] = ["COMPLETED", "NO_SHOW"];

const TABS: { key: Tab; label: string }[] = [
  { key: "upcoming", label: "Të Ardhshme" },
  { key: "past", label: "Të Kaluara" },
  { key: "cancelled", label: "Të Anuluara" },
];

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

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcStar() {
  return <svg width="15" height="15" viewBox="0 0 24 24" {...stroke} aria-hidden><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" /></svg>;
}
function IcCalendarTab() {
  return <svg width="15" height="15" viewBox="0 0 24 24" {...stroke} aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IcXCircle() {
  return <svg width="15" height="15" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="m9.5 9.5 5 5m0-5-5 5" /></svg>;
}
const TAB_ICON: Record<Tab, React.ReactNode> = { upcoming: <IcStar />, past: <IcCalendarTab />, cancelled: <IcXCircle /> };

function IcSearch() {
  return <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
}
function IcFilter() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
}
function IcCalendar() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IcClock() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
function IcUser() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></svg>;
}
function IcChevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-sm text-ink-faint">{text}</p>;
}

// Fully self-contained: owns its own expand/reschedule/cancel state so it
// never needs to be re-created by a parent re-render (React flags recreating
// a component function during render — it would reset this state on every
// keystroke in the search box above).
function AppointmentCard({ b }: { b: AppointmentRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reschedOpen, setReschedOpen] = useState(false);
  const [reschedDate, setReschedDate] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pill = BOOKING_STATUS_PILL[b.status];

  async function loadSlots(forDate: string) {
    if (!forDate) return;
    setLoadingSlots(true);
    try {
      const q = new URLSearchParams({ serviceId: b.serviceId, date: forDate, staffId: b.staffId });
      const res = await fetch(`/api/availability?${q.toString()}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function openReschedule() {
    setReschedOpen(true);
    setSlots([]);
    setError(null);
    const d = new Date(b.startTime);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setReschedDate(iso);
    await loadSlots(iso);
  }

  async function reschedule(time: string) {
    setBusy(true);
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
      setReschedOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function cancelBooking() {
    if (!confirm(`Të anulohet rezervimi për ${b.serviceName}?`)) return;
    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-accent">
          {initials(b.serviceName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{b.serviceName}</p>
          {b.serviceDescription && <p className="truncate text-xs text-ink-faint">{b.serviceDescription}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            <span className="flex items-center gap-1"><IcCalendar />{b.dateLabel}</span>
            <span className="flex items-center gap-1"><IcClock />{b.timeLabel} ({b.serviceDuration} min)</span>
            <span className="flex items-center gap-1"><IcUser />{b.staffName}{b.staffTitle ? ` · ${b.staffTitle}` : ""}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${pill.bg} ${pill.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
            {BOOKING_STATUS_LABEL[b.status]}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-soft ring-1 ring-line-strong transition-colors hover:bg-surface-muted"
          >
            Shiko Detajet
            <IcChevron open={open} />
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 border-t border-line pt-3">
          {error && <div className="mb-2.5 rounded-lg bg-danger-soft px-3 py-1.5 text-xs text-danger">{error}</div>}
          {b.canManage ? (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => (reschedOpen ? setReschedOpen(false) : openReschedule())}
                  disabled={busy}
                  className={`${buttonStyles.secondary} px-3 py-1.5 text-xs`}
                >
                  Riplanifiko
                </button>
                <button type="button" onClick={cancelBooking} disabled={busy} className={`${buttonStyles.danger} px-3 py-1.5 text-xs`}>
                  Anulo Terminin
                </button>
              </div>
              {reschedOpen && (
                <div className="mt-3">
                  <label className="flex max-w-xs flex-col gap-1.5">
                    <span className="text-xs font-medium text-ink">Data e re</span>
                    <input
                      type="date"
                      value={reschedDate}
                      onChange={(e) => { setReschedDate(e.target.value); loadSlots(e.target.value); }}
                      className={`${inputStyles} text-sm`}
                    />
                  </label>
                  <div className="mt-2.5">
                    {loadingSlots ? (
                      <p className="text-xs text-ink-faint">Duke ngarkuar oraret…</p>
                    ) : slots.length === 0 ? (
                      <p className="text-xs text-ink-faint">Nuk ka orare të lira për këtë ditë.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {slots.map((s) => {
                          const label = new Date(s.time).toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false });
                          return (
                            <button
                              key={s.time}
                              type="button"
                              onClick={() => reschedule(s.time)}
                              disabled={busy}
                              className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-ink ring-1 ring-line-strong hover:bg-accent-soft"
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
            </>
          ) : (
            <p className="text-xs text-ink-faint">Ky termin nuk mund të menaxhohet më.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AppointmentsWorkspace({ bookings }: { bookings: AppointmentRow[] }) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState<Range>("all");
  const [staffFilter, setStaffFilter] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const staffOptions = useMemo(() => {
    const map = new Map<string, string>();
    bookings.forEach((b) => map.set(b.staffId, b.staffName));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [bookings]);

  const upcoming = useMemo(
    () => bookings.filter((b) => UPCOMING_STATUSES.includes(b.status)).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings]
  );
  const past = useMemo(
    () => bookings.filter((b) => PAST_STATUSES.includes(b.status)).sort((a, b) => b.startTime.localeCompare(a.startTime)),
    [bookings]
  );
  const cancelled = useMemo(
    () => bookings.filter((b) => b.status === "CANCELLED").sort((a, b) => b.startTime.localeCompare(a.startTime)),
    [bookings]
  );

  function applyFilters(list: AppointmentRow[]): AppointmentRow[] {
    const q = query.trim().toLowerCase();
    return list.filter((b) => {
      if (staffFilter && b.staffId !== staffFilter) return false;
      if (range === "week" && !(b.daysFromNow >= 0 && b.daysFromNow <= 7)) return false;
      if (range === "month" && !(b.daysFromNow >= 0 && b.daysFromNow <= 31)) return false;
      if (q && !b.serviceName.toLowerCase().includes(q) && !b.staffName.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  const filteredUpcoming = applyFilters(upcoming);
  const filteredPast = applyFilters(past);
  const filteredCancelled = applyFilters(cancelled);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex shrink-0 items-center gap-1 border-b border-line">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              tab === key ? "border-accent text-accent" : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            {TAB_ICON[key]}
            {label}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <div className="relative min-w-[160px] flex-1 basis-56">
          <IcSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kërko sipas shërbimit ose terapistes…"
            className="w-full rounded-lg border border-line-strong bg-surface py-2 pl-7 pr-2 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as Range)}
          className="w-[190px] shrink-0 truncate rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
        >
          <option value="all">{tab === "upcoming" ? "Të Gjitha të Ardhshme" : tab === "past" ? "Të Gjitha të Kaluara" : "Të Gjitha të Anuluara"}</option>
          <option value="week">Këtë Javë</option>
          <option value="month">Këtë Muaj</option>
        </select>
        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              staffFilter ? "border-accent bg-accent-soft text-accent" : "border-line-strong text-ink-soft hover:text-ink"
            }`}
          >
            <IcFilter />
            Filtro
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-xl border border-line-strong bg-surface p-2.5 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]">
              <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Terapistja</p>
              <button
                type="button"
                onClick={() => { setStaffFilter(""); setFilterOpen(false); }}
                className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${!staffFilter ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface-muted"}`}
              >
                Të gjitha
              </button>
              {staffOptions.map(([id, name]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => { setStaffFilter(id); setFilterOpen(false); }}
                  className={`block w-full truncate rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${staffFilter === id ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface-muted"}`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tab === "upcoming" && (
        <>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Terminet e Ardhshme</p>
            {filteredUpcoming.length === 0 ? (
              <EmptyRow text={upcoming.length === 0 ? "Ende s'ke termine të ardhshme." : "Asnjë termin nuk përputhet me filtrat."} />
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredUpcoming.map((b) => <AppointmentCard key={b.id} b={b} />)}
              </div>
            )}
          </div>

          {past.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Terminet e Kaluara</p>
                <button type="button" onClick={() => setTab("past")} className="text-xs font-semibold text-accent hover:underline">
                  Shiko të Gjitha →
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                {past.slice(0, 2).map((b) => <AppointmentCard key={b.id} b={b} />)}
              </div>
            </div>
          )}
        </>
      )}

      {tab === "past" && (
        <div>
          {filteredPast.length === 0 ? (
            <EmptyRow text={past.length === 0 ? "Ende pa termine të kaluara." : "Asnjë termin nuk përputhet me filtrat."} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredPast.map((b) => <AppointmentCard key={b.id} b={b} />)}
            </div>
          )}
        </div>
      )}

      {tab === "cancelled" && (
        <div>
          {filteredCancelled.length === 0 ? (
            <EmptyRow text={cancelled.length === 0 ? "Ende pa termine të anuluara." : "Asnjë termin nuk përputhet me filtrat."} />
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredCancelled.map((b) => <AppointmentCard key={b.id} b={b} />)}
            </div>
          )}
        </div>
      )}

      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-soft to-accent-soft p-4">
        <p className="text-base font-bold text-ink">Gati për shkëlqimin tënd tjetër?</p>
        <p className="mt-1 max-w-md text-sm text-ink-soft">Rezervo terminin tënd të ardhshëm dhe lëre kujdesin tënd në duart tona.</p>
        <Link href="/client/rezervo" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-purple px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:brightness-95">
          <IcCalendar />
          Rezervo Termin të Ri
        </Link>
      </div>
    </div>
  );
}
