import Link from "next/link";
import type { ReactNode } from "react";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import DashboardWidgetGrid from "@/components/admin/DashboardWidgetGrid";
import DailyScheduleGrid from "@/components/admin/DailyScheduleGrid";
import { computeStudioStats } from "@/lib/stats";
import { getDaySchedule } from "@/lib/schedule";
import { normalizeDashboardLayout, type DashboardWidgetId } from "@/lib/dashboard-widgets";
import { Kpi, type Tone } from "@/components/ui";
import type { BookingStatus } from "@prisma/client";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PERIODS = [7, 30, 90] as const;

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

/* ---------------- icons ---------------- */
function IcClients() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M5.5 21a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}
function IcServices() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IcStaff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IcQueue() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcBookings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

/* ---------------- building blocks ---------------- */
function Panel({
  title,
  hint,
  action,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-3.5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {hint && <p className="text-xs text-ink-faint">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value, hint, tone = "accent" }: { label: string; value: string; hint?: string; tone?: Tone }) {
  const dot: Record<Tone, string> = { accent: "bg-accent", gold: "bg-gold", ok: "bg-ok", warn: "bg-warn", purple: "bg-purple" };
  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot[tone]}`} />
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      </div>
      <p className="mt-1.5 text-xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function Bar({ label, right, share, tone = "accent" }: { label: ReactNode; right: ReactNode; share: number; tone?: Tone }) {
  const fill: Record<Tone, string> = { accent: "bg-accent", gold: "bg-gold", ok: "bg-ok", warn: "bg-warn", purple: "bg-purple" };
  return (
    <li>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-ink">{label}</span>
        <span className="shrink-0 text-ink-soft">{right}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className={`h-full rounded-full ${fill[tone]}`} style={{ width: `${Math.max(2, Math.round(share * 100))}%` }} />
      </div>
    </li>
  );
}

function AreaChart({ data }: { data: number[] }) {
  const h = 120;
  const w = 300;
  const max = Math.max(1, ...data);
  const n = data.length;
  const pts = data.map((v, i) => {
    const x = n === 1 ? w / 2 : (i / (n - 1)) * w;
    const y = h - 6 - (v / max) * (h - 16);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="gbdArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gbd-accent)" stopOpacity="0.24" />
          <stop offset="100%" stopColor="var(--gbd-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#gbdArea)" />
      <path d={line} fill="none" stroke="var(--gbd-accent)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const STATUS_TONE: Record<BookingStatus, Tone> = {
  COMPLETED: "ok",
  CONFIRMED: "accent",
  CHECKED_IN: "gold",
  IN_SERVICE: "accent",
  CANCELLED: "warn",
  NO_SHOW: "warn",
};

/* ---------------- page ---------------- */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await requireRole("ADMIN");
  const t = await getTranslations("Admin.Dashboard");
  const tStatus = await getTranslations("Status.booking");
  const locale = await getLocale();
  const sp = await searchParams;
  const days = (PERIODS as readonly number[]).includes(Number(sp.days)) ? Number(sp.days) : 30;

  const now = new Date();
  const from = new Date(now.getTime() - days * 86400000);
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const fromDayStart = new Date(startToday);
  fromDayStart.setDate(fromDayStart.getDate() - (days - 1));

  const [
    clientCount,
    newClients,
    serviceCount,
    activeServices,
    staffCount,
    staffWithoutHours,
    queueWaiting,
    bookingsToday,
    trendRows,
    svcRows,
    topClientRows,
    stats,
    savedLayout,
    todaySchedule,
    liveQueueRows,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.user.count({ where: { role: "CLIENT", createdAt: { gte: from } } }),
    prisma.service.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "STAFF" } }),
    prisma.user.count({ where: { role: "STAFF", workingHours: { none: {} } } }),
    prisma.queueEntry.count({ where: { status: { in: ["WAITING", "CALLED"] } } }),
    prisma.booking.count({
      where: { startTime: { gte: startToday }, status: { in: ["CONFIRMED", "CHECKED_IN", "IN_SERVICE"] } },
    }),
    prisma.booking.findMany({ where: { startTime: { gte: fromDayStart, lte: now } }, select: { startTime: true } }),
    prisma.booking.findMany({
      where: { startTime: { gte: from, lte: now }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      select: { service: { select: { name: true } } },
    }),
    prisma.booking.groupBy({
      by: ["clientId"],
      where: { startTime: { gte: from, lte: now }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      _count: { _all: true },
      orderBy: { _count: { clientId: "desc" } },
      take: 5,
    }),
    computeStudioStats(days, now),
    prisma.dashboardLayout.findUnique({ where: { userId: session.userId }, select: { layout: true } }),
    getDaySchedule(now),
    prisma.queueEntry.findMany({
      where: { status: { in: ["WAITING", "CALLED"] } },
      orderBy: { checkinAt: "asc" },
      take: 5,
      select: {
        id: true,
        estimatedWaitMin: true,
        client: { select: { name: true } },
        clientName: true,
        service: { select: { name: true } },
      },
    }),
  ]);
  const widgetLayout = normalizeDashboardLayout(savedLayout?.layout);

  // Daily booking trend across the selected window.
  const trend = new Array(days).fill(0) as number[];
  for (const b of trendRows) {
    const d = new Date(b.startTime);
    d.setHours(0, 0, 0, 0);
    const idx = Math.round((d.getTime() - fromDayStart.getTime()) / 86400000);
    if (idx >= 0 && idx < days) trend[idx]++;
  }
  const trendTotal = trend.reduce((a, c) => a + c, 0);

  // Most requested services / treatments.
  const svcMap = new Map<string, number>();
  for (const b of svcRows) svcMap.set(b.service.name, (svcMap.get(b.service.name) ?? 0) + 1);
  const topServices = [...svcMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topMax = Math.max(1, ...topServices.map((s) => s.count));

  // Most active clients (resolve names for the grouped ids).
  const topClientIds = topClientRows.map((r) => r.clientId);
  const topClientNames = topClientIds.length
    ? await prisma.user.findMany({ where: { id: { in: topClientIds } }, select: { id: true, name: true } })
    : [];
  const nameById = new Map(topClientNames.map((u) => [u.id, u.name]));
  const topClients = topClientRows.map((r) => ({ name: nameById.get(r.clientId) ?? "—", count: r._count._all }));
  const clientMax = Math.max(1, ...topClients.map((c) => c.count));

  const utilization = [...stats.utilization].sort((a, b) => b.utilization - a.utilization);
  const utilMax = Math.max(0.01, ...utilization.map((u) => u.utilization));

  const statusOrder: BookingStatus[] = ["COMPLETED", "CONFIRMED", "CHECKED_IN", "IN_SERVICE", "CANCELLED", "NO_SHOW"];

  const firstName = session.name.split(" ")[0];
  const dateStr = now.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const short = (d: Date) => d.toLocaleDateString(locale, { day: "numeric", month: "short" });

  const widgets: Partial<Record<DashboardWidgetId, ReactNode>> = {
    kpi: (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi href="/admin/klientet" tone="accent" icon={<IcClients />} value={clientCount} label={t("kpiClients")} sub={newClients > 0 ? t("kpiClientsNew", { count: newClients }) : t("kpiClientsTotal")} />
        <Kpi href="/admin/sherbimet" tone="gold" icon={<IcServices />} value={serviceCount} label={t("kpiServices")} sub={t("kpiServicesActive", { count: activeServices })} />
        <Kpi href="/admin/stafi" tone="ok" icon={<IcStaff />} value={staffCount} label={t("kpiStaff")} sub={staffWithoutHours > 0 ? t("kpiStaffMissingHours", { count: staffWithoutHours }) : t("kpiStaffAllScheduled")} />
        <Kpi href="/admin/historiku" tone="accent" icon={<IcBookings />} value={bookingsToday} label={t("kpiBookingsToday")} sub={t("kpiActive")} />
        <Kpi href="/admin/radha" tone="warn" icon={<IcQueue />} value={queueWaiting} label={t("kpiQueueToday")} sub={t("kpiQueueSub")} />
      </div>
    ),
    scheduleQueue: (
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-xl border border-line bg-surface p-3.5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-ink">{t("dailySchedule")}</h2>
              <span className="text-xs text-ink-faint">{dateStr}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 text-[11px] text-ink-soft">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" />{t("legendBooked")}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-faint" />{t("legendCompleted")}</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-danger" />{t("legendCancelled")}</span>
              </div>
              <Link href="/admin/kalendari" className="shrink-0 text-xs font-medium text-accent hover:underline">{t("calendarLink")}</Link>
            </div>
          </div>
          <DailyScheduleGrid schedule={todaySchedule} />
        </section>

        <section className="rounded-xl border border-line bg-surface p-3.5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink">{t("liveQueue")}</h2>
            <Link
              href="/admin/radha"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
              {t("add")}
            </Link>
          </div>
          {liveQueueRows.length === 0 ? (
            <p className="text-sm text-ink-faint">{t("queueEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {liveQueueRows.map((q, i) => (
                <li key={q.id} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-ink-soft">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{q.client?.name ?? q.clientName ?? t("clientFallback")}</p>
                    <p className="truncate text-xs text-ink-faint">{q.service.name}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-ink-soft">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    {t("minutesShort", { count: q.estimatedWaitMin })}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <p className="text-[11px] text-ink-faint">
              {t("updatedAt", { time: now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }) })}
            </p>
            <Link href="/admin/radha" className="text-xs font-medium text-accent hover:underline">{t("viewQueueLink")}</Link>
          </div>
        </section>
      </div>
    ),
    trend: (
      <Panel title={t("bookingTrend")} hint={t("lastNDays", { count: days })}>
        <div className="mb-2 flex items-end gap-2">
          <p className="text-2xl font-bold leading-none text-ink">{trendTotal}</p>
          <p className="pb-0.5 text-xs text-ink-faint">{t("bookingsTotal")}</p>
        </div>
        <div className="h-48">
          <AreaChart data={trend} />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
          <span>{short(fromDayStart)}</span>
          <span>{short(now)}</span>
        </div>
      </Panel>
    ),
    periodStats: (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label={t("statTotalBookings")} value={String(stats.bookings.total)} hint={t("statInPeriod")} tone="accent" />
        <MiniStat
          label={t("statCompleted")}
          value={String(stats.bookings.byStatus.COMPLETED)}
          hint={stats.bookings.total > 0 ? t("statOfBookings", { pct: pct(stats.bookings.byStatus.COMPLETED / stats.bookings.total) }) : "—"}
          tone="ok"
        />
        <MiniStat label={t("statCancelRate")} value={pct(stats.bookings.cancellationRate)} hint={t("statCancelCount", { count: stats.bookings.byStatus.CANCELLED })} tone="warn" />
        <MiniStat label={t("statNoShowRate")} value={pct(stats.bookings.noShowRate)} hint={t("statNoShowCount", { count: stats.bookings.byStatus.NO_SHOW })} tone="warn" />
      </div>
    ),
    statusBreakdown: (
      <Panel title={t("byStatus")} hint={t("lastNDays", { count: days })}>
        {stats.bookings.total === 0 ? (
          <p className="text-sm text-ink-faint">{t("noBookingsInPeriod")}</p>
        ) : (
          <ul className="space-y-3">
            {statusOrder.map((s) => {
              const count = stats.bookings.byStatus[s];
              const share = stats.bookings.total > 0 ? count / stats.bookings.total : 0;
              return (
                <Bar key={s} label={tStatus(s)} right={`${count} · ${pct(share)}`} share={share} tone={STATUS_TONE[s]} />
              );
            })}
          </ul>
        )}
      </Panel>
    ),
    queue: (
      <Panel title={t("walkinQueue")} hint={t("lastNDays", { count: days })}>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat label={t("checkinsTotal")} value={String(stats.queue.checkins)} tone="accent" />
          <MiniStat label={t("served")} value={String(stats.queue.completed)} tone="ok" />
          <MiniStat label={t("noShow")} value={String(stats.queue.noShow)} tone="warn" />
          <MiniStat
            label={t("avgWait")}
            value={stats.queue.avgWaitMin === null ? "—" : t("minutesShort", { count: stats.queue.avgWaitMin })}
            hint={t("avgWaitHint")}
            tone="gold"
          />
        </div>
      </Panel>
    ),
    staffUtilization: (
      <Panel title={t("staffUtilization")} hint={t("staffUtilizationHint")}>
        {utilization.length === 0 ? (
          <p className="text-sm text-ink-faint">{t("noStaff")}</p>
        ) : (
          <ul className="space-y-3">
            {utilization.map((u) => (
              <Bar
                key={u.staffId}
                label={u.name}
                right={
                  <>
                    {pct(u.utilization)}
                    <span className="text-ink-faint"> ({Math.round(u.bookedMin / 60)}h/{Math.round(u.availableMin / 60)}h)</span>
                  </>
                }
                share={u.utilization / utilMax}
                tone="accent"
              />
            ))}
          </ul>
        )}
      </Panel>
    ),
    topServices: (
      <Panel title={t("topServices")} hint={t("lastNDays", { count: days })} action={<Link href="/admin/sherbimet" className="text-xs font-medium text-accent hover:underline">{t("servicesLink")}</Link>}>
        {topServices.length === 0 ? (
          <p className="text-sm text-ink-faint">{t("noTopServices")}</p>
        ) : (
          <ul className="space-y-3">
            {topServices.map((s, i) => (
              <Bar
                key={s.name}
                label={
                  <>
                    <span className="mr-2 text-ink-faint">{i + 1}.</span>
                    {s.name}
                  </>
                }
                right={String(s.count)}
                share={s.count / topMax}
                tone="gold"
              />
            ))}
          </ul>
        )}
      </Panel>
    ),
    topClients: (
      <Panel
        title={t("topClients")}
        hint={t("lastNDays", { count: days })}
        action={<Link href="/admin/klientet" className="text-xs font-medium text-accent hover:underline">{t("allClientsLink")}</Link>}
      >
        {topClients.length === 0 ? (
          <p className="text-sm text-ink-faint">{t("noTopClients")}</p>
        ) : (
          <ul className="space-y-3">
            {topClients.map((c, i) => (
              <Bar
                key={c.name + i}
                label={
                  <>
                    <span className="mr-2 text-ink-faint">{i + 1}.</span>
                    {c.name}
                  </>
                }
                right={c.count === 1 ? t("bookingsCountOne", { count: c.count }) : t("bookingsCountOther", { count: c.count })}
                share={c.count / clientMax}
                tone="accent"
              />
            ))}
          </ul>
        )}
      </Panel>
    ),
    pdfExport: (
      <Panel title={t("exportReport")} hint={t("exportReportHint")}>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 6].map((m) => (
            <a
              key={m}
              href={`/api/reports/pdf?months=${m}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              </svg>
              {t("monthsShort", { count: m })}
            </a>
          ))}
        </div>
      </Panel>
    ),
  };

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-none space-y-4 pb-4">
        {/* ---- Hero + period filter ---- */}
        <section className="overflow-hidden rounded-xl bg-accent-soft p-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">{dateStr}</p>
              <h1 className="mt-1 text-xl font-bold text-ink">{t("welcome", { name: firstName })}</h1>
              <p className="mt-1 max-w-lg text-sm text-ink-soft">
                {t(`todaySummary_${bookingsToday === 1 ? "1" : "n"}_${queueWaiting === 1 ? "1" : "n"}` as "todaySummary_1_1", {
                  bookings: bookingsToday,
                  queue: queueWaiting,
                })}
              </p>
            </div>
            {/* Period segmented control */}
            <div className="inline-flex rounded-xl bg-surface p-1 ring-1 ring-line">
              {PERIODS.map((d) => (
                <Link
                  key={d}
                  href={`/admin?days=${d}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    d === days ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {t("daysOption", { count: d })}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <DashboardWidgetGrid widgets={widgets} initialLayout={widgetLayout} />
      </div>
    </DashboardShell>
  );
}
