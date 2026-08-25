import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle } from "@/components/ui";
import { getWeekSchedule, weekStart } from "@/lib/week-schedule";
import { getDaySchedule } from "@/lib/schedule";
import { getMonthSchedule } from "@/lib/month-schedule";
import { getTodaySummary } from "@/lib/appointments";
import { serviceColorMap, staffColorMap } from "@/lib/service-colors";
import WeekCalendar from "@/components/admin/WeekCalendar";
import DailyScheduleGrid from "@/components/admin/DailyScheduleGrid";
import MonthCalendar from "@/components/admin/MonthCalendar";
import MiniCalendar from "@/components/admin/MiniCalendar";
import CalendarQuickFilters from "@/components/admin/CalendarQuickFilters";
import CalendarViewSwitcher from "@/components/admin/CalendarViewSwitcher";
import NewAppointmentButton from "@/components/admin/NewAppointmentButton";

type CalendarView = "day" | "week" | "month";

function parseDate(raw: string | undefined): Date {
  if (raw) {
    const d = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const MONTHS_SHORT = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gsh", "Sht", "Tet", "Nën", "Dhj"];
const MONTHS_LONG = ["Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor", "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor"];
function fmtShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; hide?: string; service?: string; view?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;
  const date = parseDate(sp.date);
  const view: CalendarView = sp.view === "day" || sp.view === "month" ? sp.view : "week";
  const start = weekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const now = new Date();
  const hiddenIds = new Set((sp.hide ?? "").split(",").filter(Boolean));
  const serviceFilter = sp.service ?? "";

  // Only the active view's schedule actually queries the DB — the other two
  // resolve immediately — so switching views never pays for the ones you're
  // not looking at.
  const [daySchedule, weekSchedule, monthSchedule, summary, clients, staffWithServices, servicesDetailed] = await Promise.all([
    view === "day" ? getDaySchedule(date) : Promise.resolve(null),
    view === "week" ? getWeekSchedule(start) : Promise.resolve(null),
    view === "month" ? getMonthSchedule(date) : Promise.resolve(null),
    getTodaySummary(now),
    prisma.user.findMany({ where: { role: "CLIENT" }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
    prisma.user.findMany({ where: { role: "STAFF" }, orderBy: { name: "asc" }, select: { id: true, name: true, staffServices: { select: { serviceId: true } } } }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, durationMin: true, price: true } }),
  ]);
  const active = daySchedule ?? weekSchedule ?? monthSchedule!;
  const staffForModal = staffWithServices.map((s) => ({ id: s.id, name: s.name, serviceIds: s.staffServices.map((x) => x.serviceId) }));
  const servicesForModal = servicesDetailed.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, price: Number(s.price) }));

  // The grid/legend key by staff NAME (matches WeekBooking.staffName), so the
  // filter set and colour map both work off names too.
  const hiddenStaffNames = new Set(active.staff.filter((s) => hiddenIds.has(s.id)).map((s) => s.name));
  const colorByService = serviceColorMap(active.services.map((s) => s.name));
  const colorByStaff = staffColorMap(active.staff.map((s) => s.name));

  // The top-bar quick-select can only represent "all staff" or "exactly one
  // staff visible" — anything the sidebar's individual checkboxes produced
  // beyond that just shows as "Të gjithë Stafi" there, which is fine (see
  // CalendarQuickFilters).
  const visibleStaff = active.staff.filter((s) => !hiddenIds.has(s.id));
  const currentStaffId = hiddenIds.size === 0 ? "" : visibleStaff.length === 1 ? visibleStaff[0].id : "";

  function hideToggleHref(staffId: string): string {
    const next = new Set(hiddenIds);
    if (next.has(staffId)) next.delete(staffId);
    else next.add(staffId);
    const q = new URLSearchParams();
    q.set("view", view);
    q.set("date", toISODate(date));
    if (next.size > 0) q.set("hide", [...next].join(","));
    return `/admin/kalendari?${q.toString()}`;
  }

  let rangeLabel: string;
  let prevHref: string;
  let nextHref: string;
  if (view === "day") {
    rangeLabel = `${fmtShort(date)}, ${date.getFullYear()}`;
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    prevHref = `/admin/kalendari?view=day&date=${toISODate(prev)}`;
    nextHref = `/admin/kalendari?view=day&date=${toISODate(next)}`;
  } else if (view === "month") {
    rangeLabel = `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
    const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    prevHref = `/admin/kalendari?view=month&date=${toISODate(prev)}`;
    nextHref = `/admin/kalendari?view=month&date=${toISODate(next)}`;
  } else {
    rangeLabel = `${fmtShort(start)} – ${fmtShort(end)}, ${end.getFullYear()}`;
    prevHref = `/admin/kalendari?view=week&date=${toISODate(new Date(start.getTime() - 7 * 86400000))}`;
    nextHref = `/admin/kalendari?view=week&date=${toISODate(new Date(start.getTime() + 7 * 86400000))}`;
  }
  const todayHref = `/admin/kalendari?view=${view}&date=${toISODate(now)}`;

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-7xl">
        <PageTitle title="Kalendari" hint="Menaxho të gjitha terminet dhe oraret." />
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link
            href={todayHref}
            className="rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
          >
            Sot
          </Link>
          <Link
            href={prevHref}
            aria-label="I mëparshmi"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <span className="min-w-[180px] rounded-lg border border-line-strong px-3 py-2 text-center text-sm font-medium text-ink">
            {rangeLabel}
          </span>
          <Link
            href={nextHref}
            aria-label="Tjetri"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </Link>
          <CalendarViewSwitcher currentView={view} />
          <CalendarQuickFilters
            staff={active.staff}
            services={active.services}
            currentStaffId={currentStaffId}
            currentService={serviceFilter}
          />
          <NewAppointmentButton
            clients={clients}
            services={servicesForModal}
            staff={staffForModal}
            defaultDate={toISODate(date)}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 rounded-xl border border-line bg-surface p-3">
            {view === "day" && daySchedule && (
              <DailyScheduleGrid schedule={daySchedule} hiddenStaff={hiddenIds} serviceFilter={serviceFilter || undefined} />
            )}
            {view === "week" && weekSchedule && (
              <WeekCalendar
                schedule={weekSchedule}
                weekStartDate={start}
                hiddenStaff={hiddenStaffNames}
                serviceFilter={serviceFilter || undefined}
                now={now}
              />
            )}
            {view === "month" && monthSchedule && (
              <MonthCalendar
                schedule={monthSchedule}
                monthOf={date}
                hiddenStaff={hiddenStaffNames}
                serviceFilter={serviceFilter || undefined}
                today={now}
                hideParam={sp.hide ?? ""}
              />
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-line bg-surface p-3">
              <MiniCalendar monthOf={date} selected={date} today={now} view={view} />
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Filtro Stafin</p>
              <div className="flex flex-col gap-2">
                {active.staff.map((s) => {
                  const hidden = hiddenIds.has(s.id);
                  const dot = colorByStaff.get(s.name);
                  return (
                    <Link
                      key={s.id}
                      href={hideToggleHref(s.id)}
                      className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-muted ${hidden ? "text-ink-faint" : "text-ink"}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${hidden ? "bg-line-strong" : dot?.dot}`} />
                        <span className="truncate">{s.name}</span>
                      </span>
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${hidden ? "border-line-strong" : "border-accent bg-accent"}`}>
                        {!hidden && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Legjenda e Shërbimeve</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {active.services.map((s) => {
                  const tone = colorByService.get(s.name);
                  return (
                    <span key={s.id} className="flex items-center gap-1.5 truncate text-xs text-ink-soft">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${tone?.dot}`} />
                      <span className="truncate">{s.name}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Përmbledhja e Sotme</p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between"><span className="text-ink-soft">Rezervime</span><span className="font-semibold text-ink">{summary.total}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Konfirmuar</span><span className="font-semibold text-ink">{summary.confirmed}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-gold" />Në vazhdim</span><span className="font-semibold text-ink">{summary.inProgress}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-purple" />Përfunduar</span><span className="font-semibold text-ink">{summary.completed}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-danger" />Anuluar</span><span className="font-semibold text-ink">{summary.cancelled}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
