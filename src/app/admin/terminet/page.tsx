import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, Kpi } from "@/components/ui";
import {
  getAppointments,
  getAppointmentsKpis,
  getStatusBreakdown,
  getTodaySummary,
  parseAppointmentFilters,
  type RawAppointmentSearchParams,
} from "@/lib/appointments";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_PILL } from "@/lib/booking-labels";
import AppointmentsFilters from "@/components/admin/AppointmentsFilters";
import AppointmentsSearch from "@/components/admin/AppointmentsSearch";
import AppointmentsTable from "@/components/admin/AppointmentsTable";
import AppointmentsPageSize from "@/components/admin/AppointmentsPageSize";
import MiniCalendar from "@/components/admin/MiniCalendar";
import NewAppointmentButton from "@/components/admin/NewAppointmentButton";

const PAGE_SIZES = [10, 25, 50];
const STATUS_OPTIONS = (Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[]).map((s) => ({
  value: s,
  label: BOOKING_STATUS_LABEL[s],
}));

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};
function IcCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IcClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}
function IcDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
const MONTHS_SHORT = ["Jan", "Shk", "Mar", "Pri", "Maj", "Qer", "Kor", "Gsh", "Sht", "Tet", "Nën", "Dhj"];
// Day + short month, no year — the table is a near-term operational view (this
// week / this month), and dropping the year keeps every date on one line at
// the column's real width instead of wrapping across two or three.
function fmtRowDate(d: Date): string {
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
// 24-hour, no AM/PM marker — "sq" otherwise spells that out ("e pasdites"),
// which alone was wide enough to force the row (and the whole table) to wrap.
function fmtRowTime(d: Date): string {
  return d.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function rowDurationMin(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

function pctDelta(curr: number, prev: number): string {
  if (prev === 0) return curr > 0 ? "e re këtë muaj" : "asnjë muajin e kaluar";
  const pct = Math.round(((curr - prev) / prev) * 100);
  const arrow = pct >= 0 ? "↑" : "↓";
  return `${arrow} ${Math.abs(pct)}% krahasuar me muajin e kaluar`;
}

function pageWindow(current: number, total: number): (number | "…")[] {
  const pages = new Set<number>([1, total]);
  for (let p = current - 1; p <= current + 1; p++) if (p >= 1 && p <= total) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

export default async function AdminAppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<RawAppointmentSearchParams & { page?: string; pageSize?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;
  const filters = parseAppointmentFilters(sp);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = PAGE_SIZES.includes(Number(sp.pageSize)) ? Number(sp.pageSize) : 10;
  const now = new Date();

  const [staffList, serviceList, { rows, total }, kpis, breakdown, todaySummary, clients, staffWithServices, servicesDetailed] = await Promise.all([
    prisma.user.findMany({ where: { role: "STAFF" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.service.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getAppointments({ ...filters, page, pageSize }),
    getAppointmentsKpis(now),
    getStatusBreakdown(filters),
    getTodaySummary(now),
    prisma.user.findMany({ where: { role: "CLIENT" }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
    prisma.user.findMany({ where: { role: "STAFF" }, orderBy: { name: "asc" }, select: { id: true, name: true, staffServices: { select: { serviceId: true } } } }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, durationMin: true, price: true } }),
  ]);
  const staffForModal = staffWithServices.map((s) => ({ id: s.id, name: s.name, serviceIds: s.staffServices.map((x) => x.serviceId) }));
  const servicesForModal = servicesDetailed.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, price: Number(s.price) }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const breakdownTotal = Object.values(breakdown).reduce((a, b) => a + b, 0);

  function buildParams(overrides: Record<string, string | undefined>): URLSearchParams {
    const params = new URLSearchParams();
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    if (sp.staff) params.set("staff", sp.staff);
    if (sp.service) params.set("service", sp.service);
    if (sp.status) params.set("status", sp.status);
    if (sp.q) params.set("q", sp.q);
    if (pageSize !== 10) params.set("pageSize", String(pageSize));
    for (const [k, v] of Object.entries(overrides)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return params;
  }
  function pageHref(p: number): string {
    const params = buildParams({ page: p === 1 ? undefined : String(p) });
    return `/admin/terminet?${params.toString()}`;
  }
  const exportHref = `/api/admin/appointments/export?${buildParams({}).toString()}`;

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col">
        <PageTitle title="Terminet" hint="Menaxho dhe shiko të gjitha terminet e studios." />

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_280px]">
          <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
            <div className="shrink-0 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                href="/admin/terminet"
                tone="accent"
                icon={<IcCalendar />}
                value={kpis.totalThisMonth}
                label="Termine Gjithsej"
                sub={pctDelta(kpis.totalThisMonth, kpis.totalLastMonth)}
              />
              <Kpi
                href={`/admin/kalendari?view=day&date=${toISODate(now)}`}
                tone="gold"
                icon={<IcCalendar />}
                value={kpis.today}
                label="Terminet e Sotme"
                sub="Shiko orarin e sotëm →"
              />
              <Kpi
                href="/admin/terminet?status=IN_SERVICE"
                tone="purple"
                icon={<IcClock />}
                value={kpis.inProgress}
                label="Në Vazhdim"
                sub="Aktualisht në shërbim"
              />
              <Kpi
                href="/admin/terminet?status=COMPLETED"
                tone="warn"
                icon={<IcCheck />}
                value={kpis.completedThisMonth}
                label="Përfunduar Muajin"
                sub={pctDelta(kpis.completedThisMonth, kpis.completedLastMonth)}
              />
            </div>

            <div className="shrink-0 rounded-xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-end gap-1.5">
                <AppointmentsFilters
                  staff={staffList}
                  services={serviceList}
                  statuses={STATUS_OPTIONS}
                  currentFrom={sp.from ?? ""}
                  currentTo={sp.to ?? ""}
                  currentStaffId={sp.staff ?? ""}
                  currentServiceId={sp.service ?? ""}
                  currentStatus={sp.status ?? ""}
                />
                <AppointmentsSearch currentQuery={sp.q ?? ""} />
                <div className="flex w-[108px] shrink-0 flex-col gap-1.5">
                  <NewAppointmentButton clients={clients} services={servicesForModal} staff={staffForModal} />
                  <a
                    href={exportHref}
                    className="inline-flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    <IcDownload />
                    Eksporto
                  </a>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <AppointmentsTable
                rows={rows.map((b) => ({
                  id: b.id,
                  clientId: b.clientId,
                  clientName: b.clientName,
                  clientPhone: b.clientPhone,
                  serviceName: b.serviceName,
                  staffName: b.staffName,
                  status: b.status,
                  paymentStatus: b.paymentStatus,
                  dateLabel: fmtRowDate(b.startTime),
                  timeLabel: fmtRowTime(b.startTime),
                  durationLabel: `${rowDurationMin(b.startTime, b.endTime)} min`,
                  calendarDate: toISODate(b.startTime),
                }))}
                serviceNames={serviceList.map((s) => s.name)}
              />
            </div>

            <div className="shrink-0 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-faint">
                Duke shfaqur {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} nga {total} termine
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Link
                    href={pageHref(Math.max(1, page - 1))}
                    aria-label="Faqja e mëparshme"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong text-ink-soft transition-colors ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-surface-muted hover:text-ink"}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                  </Link>
                  {pageWindow(page, totalPages).map((p, i) =>
                    p === "…" ? (
                      <span key={`gap-${i}`} className="px-1.5 text-xs text-ink-faint">…</span>
                    ) : (
                      <Link
                        key={p}
                        href={pageHref(p)}
                        className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors ${
                          p === page
                            ? "border-accent bg-accent text-white"
                            : "border-line-strong text-ink-soft hover:bg-surface-muted hover:text-ink"
                        }`}
                      >
                        {p}
                      </Link>
                    )
                  )}
                  <Link
                    href={pageHref(Math.min(totalPages, page + 1))}
                    aria-label="Faqja tjetër"
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-line-strong text-ink-soft transition-colors ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-surface-muted hover:text-ink"}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                  </Link>
                </div>
                <AppointmentsPageSize current={pageSize} />
              </div>
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
            <div className="rounded-xl border border-line bg-surface p-2.5">
              <MiniCalendar
                monthOf={filters.from ?? now}
                selected={filters.from ?? now}
                today={now}
                hrefFor={(d) => {
                  const iso = toISODate(d);
                  return `/admin/terminet?${buildParams({ from: iso, to: iso, page: undefined }).toString()}`;
                }}
              />
            </div>

            <div className="rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Terminet sipas Statusit</p>
              <div className="flex flex-col gap-1">
                {STATUS_OPTIONS.map((s) => {
                  const pill = BOOKING_STATUS_PILL[s.value];
                  const count = breakdown[s.value];
                  return (
                    <div key={s.value} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-ink-soft">
                        <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                        {s.label}
                      </span>
                      <span className="font-semibold text-ink">{count}</span>
                    </div>
                  );
                })}
              </div>
              {breakdownTotal === 0 && <p className="mt-2 text-xs text-ink-faint">Asnjë termin në këtë kërkim.</p>}
            </div>

            <div className="rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Përmbledhja e Sotme</p>
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between"><span className="text-ink-soft">Termine</span><span className="font-semibold text-ink">{todaySummary.total}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Konfirmuar</span><span className="font-semibold text-ink">{todaySummary.confirmed}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-gold" />Në vazhdim</span><span className="font-semibold text-ink">{todaySummary.inProgress}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-purple" />Përfunduar</span><span className="font-semibold text-ink">{todaySummary.completed}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-danger" />Anuluar</span><span className="font-semibold text-ink">{todaySummary.cancelled}</span></div>
              </div>
              <Link href={`/admin/kalendari?view=day&date=${toISODate(now)}`} className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
                Shiko Orarin e Sotëm →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
