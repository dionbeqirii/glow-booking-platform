import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getScheduleForDay, getDaySummary, getUpcomingTimeOff, getQualifiedServices } from "@/lib/staff-schedule";
import { getBookableOffers } from "@/lib/offers-catalog";
import StaffNewAppointmentButton from "@/components/staff/StaffNewAppointmentButton";
import AddTimeOffButton from "@/components/staff/AddTimeOffButton";
import RemoveTimeOffButton from "@/components/staff/RemoveTimeOffButton";
import DateJumpButton from "@/components/staff/DateJumpButton";
import ScheduleBookingBlock from "@/components/staff/ScheduleBookingBlock";

const HOUR_PX = 44;
const PX_PER_MIN = HOUR_PX / 60;
const MIN_BLOCK_PX = 32;
const DEFAULT_RANGE_START_MIN = 9 * 60;
const DEFAULT_RANGE_END_MIN = 18 * 60;

function minutesSinceMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}
function hourLabel(min: number): string {
  return `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:00`;
}
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseISODate(s: string | undefined): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    const parsed = new Date(y, m - 1, d);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
function shiftDay(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}
function timeRangeLabel(start: Date, end: Date): string {
  const fmt = (d: Date) => d.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${fmt(start)} - ${fmt(end)}`;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IcCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" />
    </svg>
  );
}
function IcPlay() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" /><path d="m10 8 5 4-5 4V8Z" />
    </svg>
  );
}
function IcHourglass() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M6 2h12M6 22h12" /><path d="M6 2c0 5 12 5 12 10s-12 5-12 10" /><path d="M18 2c0 5-12 5-12 10s12 5 12 10" />
    </svg>
  );
}
function LeafDecoration() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ok/40" aria-hidden>
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
      <path d="M9 21h6M12 17v4" />
      <path d="M9 8c1.5-1 3-1 4.5 0" />
    </svg>
  );
}

const LEGEND: { label: string; dot: string }[] = [
  { label: "E konfirmuar", dot: "bg-ok" },
  { label: "Check-in", dot: "bg-teal" },
  { label: "Në shërbim", dot: "bg-gold" },
  { label: "Pushim", dot: "bg-ink-faint" },
];

export default async function StaffSchedulePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await requireRole("STAFF");
  const sp = await searchParams;
  const now = new Date();
  const date = parseISODate(sp.date);
  const isToday = toISODate(date) === toISODate(now);

  const [schedule, summary, upcomingBreaks, services, clients, bookableOffers] = await Promise.all([
    getScheduleForDay(session.userId, date),
    getDaySummary(session.userId, date),
    getUpcomingTimeOff(session.userId, now),
    getQualifiedServices(session.userId),
    prisma.user.findMany({ where: { role: "CLIENT" }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
    getBookableOffers(now),
  ]);

  // Only offers this staff member is actually qualified to deliver — same
  // "authorized services only" rule the modal's own service list follows.
  const qualifiedServiceIds = new Set(services.map((s) => s.id));
  const offers = bookableOffers.filter((o) => qualifiedServiceIds.has(o.bookingServiceId));

  let rangeStart = DEFAULT_RANGE_START_MIN;
  let rangeEnd = DEFAULT_RANGE_END_MIN;
  for (const item of schedule.items) {
    rangeStart = Math.min(rangeStart, minutesSinceMidnight(item.start));
    rangeEnd = Math.max(rangeEnd, minutesSinceMidnight(item.end));
  }
  rangeStart = Math.floor(rangeStart / 60) * 60;
  rangeEnd = Math.ceil(rangeEnd / 60) * 60;
  const totalPx = (rangeEnd - rangeStart) * PX_PER_MIN;
  const hourMarks: number[] = [];
  for (let m = rangeStart; m <= rangeEnd; m += 60) hourMarks.push(m);

  const dateHeaderLabel = date.toLocaleDateString("sq", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const datePillLabel = date.toLocaleDateString("sq", { day: "numeric", month: "long", year: "numeric" });
  const workingHoursLabel = schedule.workingHours.length > 0
    ? `${schedule.workingHours[0].startLabel} - ${schedule.workingHours[schedule.workingHours.length - 1].endLabel}`
    : null;

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-ink">Orari Im</h1>
            <p className="text-sm text-ink-soft">Shiko orarin tënd ditor dhe menaxho terminet.</p>
          </div>
        </div>

        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/staff/orari?date=${toISODate(shiftDay(date, -1))}`} aria-label="Dita e mëparshme" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </Link>
            <Link href={`/staff/orari?date=${toISODate(shiftDay(date, 1))}`} aria-label="Dita tjetër" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink">
              <IcCalendar />
              {datePillLabel}
            </span>
            <DateJumpButton value={toISODate(date)} basePath="/staff/orari" />
            <Link
              href="/staff/orari"
              aria-disabled={isToday}
              className={`rounded-lg border border-line-strong px-3 py-2 text-sm font-medium transition-colors ${isToday ? "pointer-events-none text-ink-faint opacity-60" : "text-ink-soft hover:bg-surface-muted hover:text-ink"}`}
            >
              Sot
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <select className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm font-medium text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent" defaultValue="day">
              <option value="day">Ditë</option>
            </select>
            <StaffNewAppointmentButton meId={session.userId} clients={clients} services={services} offers={offers} defaultDate={toISODate(date)} />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_320px]">
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-line bg-surface p-3.5">
            <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold capitalize text-ink">{dateHeaderLabel}</p>
              <div className="flex flex-wrap items-center gap-3">
                {LEGEND.map((l) => (
                  <span key={l.label} className="flex items-center gap-1.5 text-[11px] text-ink-soft">
                    <span className={`h-2 w-2 rounded-full ${l.dot}`} />
                    {l.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="relative" style={{ height: totalPx }}>
                {hourMarks.map((m) => (
                  <div key={m} className="absolute left-0 right-0 border-t border-line" style={{ top: (m - rangeStart) * PX_PER_MIN }}>
                    <span className="absolute -top-2.5 left-0 bg-surface pr-2 text-[11px] text-ink-faint">{hourLabel(m)}</span>
                  </div>
                ))}
                <div className="absolute inset-y-0 left-14 right-0">
                  {schedule.items.map((item) => {
                    const topPx = (minutesSinceMidnight(item.start) - rangeStart) * PX_PER_MIN;
                    const durationMin = (item.end.getTime() - item.start.getTime()) / 60000;
                    const heightPx = Math.max(MIN_BLOCK_PX, durationMin * PX_PER_MIN);

                    if (item.kind === "break") {
                      return (
                        <div
                          key={`break-${item.id ?? item.start.toISOString()}`}
                          className="absolute left-1 right-1 flex items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface-muted/60 px-3"
                          style={{ top: topPx, height: heightPx }}
                        >
                          <span className="text-ink-faint">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" /><path d="M6 1v3M10 1v3M14 1v3" /></svg>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-ink-soft">{item.reason || "Pushim"}</p>
                          </div>
                          <span className="shrink-0 text-[11px] text-ink-faint">{timeRangeLabel(item.start, item.end)}</span>
                          {item.id && <RemoveTimeOffButton timeOffId={item.id} />}
                        </div>
                      );
                    }

                    return (
                      <ScheduleBookingBlock
                        key={item.id}
                        id={item.id}
                        clientName={item.clientName}
                        serviceName={item.serviceName}
                        status={item.status}
                        timeRangeLabel={timeRangeLabel(item.start, item.end)}
                        topPx={topPx}
                        heightPx={heightPx}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
            <div className="shrink-0 rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Orari Im i Punës</p>
              {workingHoursLabel ? (
                <div className="flex items-center gap-1.5 text-sm text-ink-soft">
                  <span className="text-ink-faint"><IcClock /></span>
                  {workingHoursLabel}
                </div>
              ) : (
                <p className="text-sm text-ink-faint">Jashtë orarit sot.</p>
              )}
              <p className="text-[11px] capitalize text-ink-faint">{date.toLocaleDateString("sq", { weekday: "long" })}</p>
            </div>

            <div className="shrink-0 rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Përmbledhja e Ditës</p>
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><IcCalendar />Termine Gjithsej</span><span className="font-semibold text-ink">{summary.total}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><IcCheck />Përfunduar</span><span className="font-semibold text-ink">{summary.completed}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><IcPlay />Në Vazhdim</span><span className="font-semibold text-ink">{summary.inProgress}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><IcHourglass />Të Ardhshme</span><span className="font-semibold text-ink">{summary.upcoming}</span></div>
                <div className="mt-0.5 flex items-center justify-between border-t border-line pt-1"><span className="text-ink-soft">Kohëzgjatja</span><span className="font-semibold text-ink">{Math.floor(summary.totalDurationMin / 60)}h {summary.totalDurationMin % 60}m</span></div>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Pushimet e Ardhshme</p>
              {upcomingBreaks.length === 0 ? (
                <p className="text-xs text-ink-faint">Asnjë pushim i planifikuar.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {upcomingBreaks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-xs">
                      <span className="text-ink-faint">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" /><path d="M6 1v3M10 1v3M14 1v3" /></svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-ink">{t.fromLabel} - {t.untilLabel}</p>
                        <p className="truncate text-[11px] text-ink-faint">{t.durationLabel} pushim{t.reason ? ` · ${t.reason}` : ""}</p>
                      </div>
                      <RemoveTimeOffButton timeOffId={t.id} />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="shrink-0 rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Veprime të Shpejta</p>
              <div className="flex flex-col gap-1.5">
                <AddTimeOffButton meId={session.userId} kind="break" />
                <AddTimeOffButton meId={session.userId} kind="block" />
              </div>
            </div>

            <div className="relative shrink-0 flex items-start gap-2 overflow-hidden rounded-xl bg-ok-soft p-2.5">
              <span className="mt-0.5 shrink-0 text-ok">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" /></svg>
              </span>
              <div className="min-w-0 flex-1 pr-8">
                <p className="text-xs font-semibold text-ok">Këshillë</p>
                <p className="mt-0.5 text-xs text-ink-soft">Mbaje orarin të përditësuar për të ofruar përvojën më të mirë për klientët.</p>
              </div>
              <div className="absolute -bottom-3 -right-3">
                <LeafDecoration />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
