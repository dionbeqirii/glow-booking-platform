import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { computeStudioStats } from "@/lib/stats";

type Tone = "accent" | "gold" | "ok" | "warn";

const toneClass: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  gold: "bg-gold-soft text-gold",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
};

// Soft tinted gradient per tone, echoing the reference's pastel cards.
const cardBg: Record<Tone, string> = {
  accent: "bg-gradient-to-br from-accent-soft/70 to-surface",
  gold: "bg-gradient-to-br from-gold-soft/70 to-surface",
  ok: "bg-gradient-to-br from-ok-soft/70 to-surface",
  warn: "bg-gradient-to-br from-warn-soft/70 to-surface",
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// ---------- Icons ----------
function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke}>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
function IcServices() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2c.6 4.6 3 7 7.6 7.6C15 10.2 12.6 12.6 12 17.2 11.4 12.6 9 10.2 4.4 9.6 9 9 11.4 6.6 12 2Z" />
    </svg>
  );
}
function IcStaff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IcQueue() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcBookings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
// ---------- Building blocks ----------
function IconChip({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${toneClass[tone]}`}
    >
      {children}
    </span>
  );
}

function StatCard({
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
  value: number;
  label: string;
  sub: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className={`h-full rounded-2xl ${cardBg[tone]} p-5 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)] transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_36px_-16px_rgba(43,38,34,0.3)] hover:ring-line-strong`}>
        <div className="flex items-start justify-between">
          <IconChip tone={tone}>{icon}</IconChip>
          <span className="text-ink-faint opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
            <Arrow />
          </span>
        </div>
        <p className="mt-4 text-3xl font-bold text-ink">{value}</p>
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-faint">{sub}</p>
      </div>
    </Link>
  );
}

function Panel({
  title,
  hint,
  children,
  className = "",
  action,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl bg-surface p-5 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)] ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{title}</p>
          {hint && <p className="text-xs text-ink-faint">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Server-rendered area chart (no library, no hydration). */
function AreaChart({ data }: { data: number[] }) {
  const h = 120;
  const w = 300;
  const max = Math.max(1, ...data);
  const n = data.length;
  const pts = data.map((v, i) => {
    const x = n === 1 ? w / 2 : (i / (n - 1)) * w;
    const y = h - 8 - (v / max) * (h - 20);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-28 w-full" aria-hidden>
      <defs>
        <linearGradient id="gbdArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--gbd-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--gbd-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#gbdArea)" />
      <path
        d={line}
        fill="none"
        stroke="var(--gbd-accent)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Bar({ label, value, max, valueLabel }: { label: string; value: number; max: number; valueLabel: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <li>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="text-ink-soft">{valueLabel}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export default async function AdminPage() {
  const session = await requireRole("ADMIN");

  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const from14 = new Date(startToday);
  from14.setDate(from14.getDate() - 13);
  const from30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    serviceCount,
    activeServices,
    staffCount,
    staffWithoutHours,
    queueWaiting,
    bookingsToday,
    trendRows,
    svcRows,
    stats,
  ] = await Promise.all([
    prisma.service.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "STAFF" } }),
    prisma.user.count({ where: { role: "STAFF", workingHours: { none: {} } } }),
    prisma.queueEntry.count({ where: { status: { in: ["WAITING", "CALLED"] } } }),
    prisma.booking.count({
      where: {
        startTime: { gte: startToday },
        status: { in: ["CONFIRMED", "CHECKED_IN", "IN_SERVICE"] },
      },
    }),
    prisma.booking.findMany({
      where: { startTime: { gte: from14, lte: now } },
      select: { startTime: true },
    }),
    prisma.booking.findMany({
      where: { startTime: { gte: from30, lte: now }, status: { notIn: ["CANCELLED", "NO_SHOW"] } },
      select: { service: { select: { name: true } } },
    }),
    computeStudioStats(30, now),
  ]);

  // Trend: bookings per day over the last 14 days.
  const trend = new Array(14).fill(0) as number[];
  for (const b of trendRows) {
    const d = new Date(b.startTime);
    d.setHours(0, 0, 0, 0);
    const idx = Math.round((d.getTime() - from14.getTime()) / 86400000);
    if (idx >= 0 && idx < 14) trend[idx]++;
  }
  const trendTotal = trend.reduce((a, c) => a + c, 0);

  // Top services (last 30 days).
  const svcMap = new Map<string, number>();
  for (const b of svcRows) svcMap.set(b.service.name, (svcMap.get(b.service.name) ?? 0) + 1);
  const topServices = [...svcMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const topMax = Math.max(1, ...topServices.map((s) => s.count));

  const utilization = [...stats.utilization].sort((a, b) => b.utilization - a.utilization);
  const utilMax = Math.max(0.01, ...utilization.map((u) => u.utilization));

  const firstName = session.name.split(" ")[0];
  const dateStr = now.toLocaleDateString("sq", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const short = (d: Date) => d.toLocaleDateString("sq", { day: "numeric", month: "short" });

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-6xl">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-soft via-surface to-gold-soft p-8 ring-1 ring-line">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="currentColor"
            className="pointer-events-none absolute -right-8 -top-10 h-48 w-48 text-accent/10"
          >
            <path d="M12 2c.6 4.6 3 7 7.6 7.6C15 10.2 12.6 12.6 12 17.2 11.4 12.6 9 10.2 4.4 9.6 9 9 11.4 6.6 12 2Z" />
          </svg>
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-soft">{dateStr}</p>
            <h1 className="mt-1.5 font-display text-3xl font-semibold text-ink">Mirësevjen, {firstName}</h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
              Sot ke <strong className="font-semibold text-ink">{bookingsToday}</strong>{" "}
              {bookingsToday === 1 ? "rezervim aktiv" : "rezervime aktive"} dhe{" "}
              <strong className="font-semibold text-ink">{queueWaiting}</strong>{" "}
              {queueWaiting === 1 ? "klient në radhë" : "klientë në radhë"}.
            </p>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard href="/admin/sherbimet" tone="accent" icon={<IcServices />} value={serviceCount} label="Shërbime" sub={`${activeServices} aktive`} />
          <StatCard href="/admin/stafi" tone="gold" icon={<IcStaff />} value={staffCount} label="Staf" sub={staffWithoutHours > 0 ? `${staffWithoutHours} pa orar` : "të gjithë me orar"} />
          <StatCard href="/admin/radha" tone="ok" icon={<IcQueue />} value={queueWaiting} label="Në radhë sot" sub="në pritje / thirrur" />
          <StatCard href="/admin/historiku" tone="warn" icon={<IcBookings />} value={bookingsToday} label="Rezervime sot" sub="aktive" />
        </div>

        {/* Trend + snapshot */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Panel
            title="Rezervimet — 14 ditët e fundit"
            hint="Aktiviteti ditor i studios"
            className="lg:col-span-2"
            action={
              <Link href="/admin/statistika" className="text-xs font-medium text-accent hover:underline">
                Statistikat →
              </Link>
            }
          >
            <div className="mb-2 flex items-end gap-2">
              <p className="text-3xl font-bold text-ink">{trendTotal}</p>
              <p className="pb-1 text-xs text-ink-faint">rezervime gjithsej</p>
            </div>
            <AreaChart data={trend} />
            <div className="mt-1 flex justify-between text-[11px] text-ink-faint">
              <span>{short(from14)}</span>
              <span>{short(now)}</span>
            </div>
          </Panel>

          <Panel title="Përmbledhje" hint="30 ditët e fundit">
            <ul className="space-y-3.5">
              <li className="flex items-center justify-between">
                <span className="text-sm text-ink-soft">Rezervime gjithsej</span>
                <span className="font-semibold text-ink">{stats.bookings.total}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-sm text-ink-soft">Pritja mesatare</span>
                <span className="font-semibold text-ink">
                  {stats.queue.avgWaitMin === null ? "—" : `${stats.queue.avgWaitMin} min`}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-sm text-ink-soft">Norma e anulimeve</span>
                <span className="font-semibold text-ink">{pct(stats.bookings.cancellationRate)}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-sm text-ink-soft">Norma e no-show</span>
                <span className="font-semibold text-ink">{pct(stats.bookings.noShowRate)}</span>
              </li>
            </ul>
          </Panel>
        </div>

        {/* Utilization + top services */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Shfrytëzimi i stafit" hint="Minuta të rezervuara ndaj orarit">
            {utilization.length === 0 ? (
              <p className="text-sm text-ink-faint">Nuk ka staf të regjistruar.</p>
            ) : (
              <ul className="space-y-4">
                {utilization.map((u) => (
                  <Bar key={u.staffId} label={u.name} value={u.utilization} max={utilMax} valueLabel={pct(u.utilization)} />
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Shërbimet më të kërkuara" hint="30 ditët e fundit">
            {topServices.length === 0 ? (
              <p className="text-sm text-ink-faint">Ende pa rezervime.</p>
            ) : (
              <ul className="space-y-4">
                {topServices.map((s, i) => (
                  <li key={s.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink">
                        <span className="mr-2 text-ink-faint">{i + 1}.</span>
                        {s.name}
                      </span>
                      <span className="text-ink-soft">{s.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round((s.count / topMax) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

      </div>
    </DashboardShell>
  );
}
