import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { computeStudioStats } from "@/lib/stats";
import { BOOKING_STATUS_LABEL } from "@/lib/booking-labels";
import type { BookingStatus } from "@prisma/client";

type Tone = "accent" | "gold" | "ok" | "warn";

const toneChip: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  gold: "bg-gold-soft text-gold",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
};

const toneCard: Record<Tone, string> = {
  accent: "bg-gradient-to-br from-accent-soft/70 to-surface",
  gold: "bg-gradient-to-br from-gold-soft/70 to-surface",
  ok: "bg-gradient-to-br from-ok-soft/70 to-surface",
  warn: "bg-gradient-to-br from-warn-soft/60 to-surface",
};

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
function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...stroke}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
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
function Kpi({
  href,
  tone,
  icon,
  value,
  label,
  sub,
}: {
  href: string;
  tone: Tone;
  icon: ReactNode;
  value: number | string;
  label: string;
  sub: string;
}) {
  return (
    <Link href={href} className="group block">
      <div
        className={`h-full rounded-2xl ${toneCard[tone]} p-4 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_36px_-16px_rgba(43,38,34,0.3)] hover:ring-line-strong`}
      >
        <div className="flex items-center justify-between">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${toneChip[tone]}`}>
            {icon}
          </span>
          <span className="text-ink-faint opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
            <Arrow />
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold leading-none text-ink">{value}</p>
        <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-faint">{sub}</p>
      </div>
    </Link>
  );
}

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
    <section className={`rounded-2xl bg-surface p-5 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)] ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-2">
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
  const dot: Record<Tone, string> = { accent: "bg-accent", gold: "bg-gold", ok: "bg-ok", warn: "bg-warn" };
  return (
    <div className="rounded-2xl bg-surface p-4 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)]">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${dot[tone]}`} />
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

function Bar({ label, right, share, tone = "accent" }: { label: ReactNode; right: ReactNode; share: number; tone?: Tone }) {
  const fill: Record<Tone, string> = { accent: "bg-accent", gold: "bg-gold", ok: "bg-ok", warn: "bg-warn" };
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
  ]);

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
  const dateStr = now.toLocaleDateString("sq", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const short = (d: Date) => d.toLocaleDateString("sq", { day: "numeric", month: "short" });

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-6xl space-y-6 pb-6">
        {/* ---- Hero + period filter ---- */}
        <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-accent-soft via-surface to-gold-soft p-6 ring-1 ring-line">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-soft">{dateStr}</p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Mirësevjen, {firstName}</h1>
              <p className="mt-1 max-w-lg text-sm text-ink-soft">
                Sot ke <strong className="font-semibold text-ink">{bookingsToday}</strong>{" "}
                {bookingsToday === 1 ? "rezervim aktiv" : "rezervime aktive"} dhe{" "}
                <strong className="font-semibold text-ink">{queueWaiting}</strong>{" "}
                {queueWaiting === 1 ? "klient në radhë" : "klientë në radhë"}.
              </p>
            </div>
            {/* Period segmented control */}
            <div className="inline-flex rounded-xl bg-surface/70 p-1 ring-1 ring-line backdrop-blur">
              {PERIODS.map((d) => (
                <Link
                  key={d}
                  href={`/admin?days=${d}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    d === days ? "bg-accent text-white shadow-sm" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {d} ditë
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ---- KPI snapshot ---- */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Kpi href="/admin/klientet" tone="accent" icon={<IcClients />} value={clientCount} label="Klientë" sub={newClients > 0 ? `+${newClients} të rinj` : "gjithsej"} />
          <Kpi href="/admin/sherbimet" tone="gold" icon={<IcServices />} value={serviceCount} label="Shërbime" sub={`${activeServices} aktive`} />
          <Kpi href="/admin/stafi" tone="ok" icon={<IcStaff />} value={staffCount} label="Staf" sub={staffWithoutHours > 0 ? `${staffWithoutHours} pa orar` : "të gjithë me orar"} />
          <Kpi href="/admin/historiku" tone="accent" icon={<IcBookings />} value={bookingsToday} label="Rezervime sot" sub="aktive" />
          <Kpi href="/admin/radha" tone="warn" icon={<IcQueue />} value={queueWaiting} label="Në radhë sot" sub="në pritje / thirrur" />
        </div>

        {/* ---- Trend ---- */}
        <Panel title="Trendi i rezervimeve" hint={`${days} ditët e fundit`}>
          <div className="mb-2 flex items-end gap-2">
            <p className="text-3xl font-bold leading-none text-ink">{trendTotal}</p>
            <p className="pb-0.5 text-xs text-ink-faint">rezervime gjithsej</p>
          </div>
          <div className="h-48">
            <AreaChart data={trend} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
            <span>{short(fromDayStart)}</span>
            <span>{short(now)}</span>
          </div>
        </Panel>

        {/* ---- Period performance ---- */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MiniStat label="Rezervime gjithsej" value={String(stats.bookings.total)} hint="në periudhë" tone="accent" />
          <MiniStat
            label="Të përfunduara"
            value={String(stats.bookings.byStatus.COMPLETED)}
            hint={stats.bookings.total > 0 ? pct(stats.bookings.byStatus.COMPLETED / stats.bookings.total) + " e rezervimeve" : "—"}
            tone="ok"
          />
          <MiniStat label="Norma e anulimeve" value={pct(stats.bookings.cancellationRate)} hint={`${stats.bookings.byStatus.CANCELLED} anulime`} tone="warn" />
          <MiniStat label="Norma e no-show" value={pct(stats.bookings.noShowRate)} hint={`${stats.bookings.byStatus.NO_SHOW} raste`} tone="warn" />
        </div>

        {/* ---- Status breakdown + Queue ---- */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Rezervimet sipas statusit" hint={`${days} ditët e fundit`}>
            {stats.bookings.total === 0 ? (
              <p className="text-sm text-ink-faint">Nuk ka rezervime në këtë periudhë.</p>
            ) : (
              <ul className="space-y-3">
                {statusOrder.map((s) => {
                  const count = stats.bookings.byStatus[s];
                  const share = stats.bookings.total > 0 ? count / stats.bookings.total : 0;
                  return (
                    <Bar
                      key={s}
                      label={BOOKING_STATUS_LABEL[s]}
                      right={`${count} · ${pct(share)}`}
                      share={share}
                      tone={STATUS_TONE[s]}
                    />
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Radha pa termin" hint={`${days} ditët e fundit`}>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Check-in gjithsej" value={String(stats.queue.checkins)} tone="accent" />
              <MiniStat label="Të shërbyer" value={String(stats.queue.completed)} tone="ok" />
              <MiniStat label="No-show" value={String(stats.queue.noShow)} tone="warn" />
              <MiniStat
                label="Pritja mesatare"
                value={stats.queue.avgWaitMin === null ? "—" : `${stats.queue.avgWaitMin} min`}
                hint="deri te thirrja"
                tone="gold"
              />
            </div>
          </Panel>
        </div>

        {/* ---- Staff + Services ---- */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Shfrytëzimi i stafit" hint="Minuta të rezervuara ndaj orarit">
            {utilization.length === 0 ? (
              <p className="text-sm text-ink-faint">Nuk ka staf të regjistruar.</p>
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

          <Panel title="Shërbimet më të kërkuara" hint={`${days} ditët e fundit`} action={<Link href="/admin/sherbimet" className="text-xs font-medium text-accent hover:underline">Shërbimet →</Link>}>
            {topServices.length === 0 ? (
              <p className="text-sm text-ink-faint">Ende pa rezervime në këtë periudhë.</p>
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
        </div>

        {/* ---- Most active clients ---- */}
        <Panel
          title="Klientët më aktivë"
          hint={`${days} ditët e fundit`}
          action={<Link href="/admin/klientet" className="text-xs font-medium text-accent hover:underline">Të gjithë klientët →</Link>}
        >
          {topClients.length === 0 ? (
            <p className="text-sm text-ink-faint">Ende pa aktivitet klientësh në këtë periudhë.</p>
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
                  right={`${c.count} ${c.count === 1 ? "rezervim" : "rezervime"}`}
                  share={c.count / clientMax}
                  tone="accent"
                />
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
