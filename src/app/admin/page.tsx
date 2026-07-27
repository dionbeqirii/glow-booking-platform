import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";

type Tone = "accent" | "gold" | "ok" | "warn";

const toneClass: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  gold: "bg-gold-soft text-gold",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
};

// ---------- Icons (simple line set) ----------
const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

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
function IcStats() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 16v-4M12 16v-7M17 16v-2" />
    </svg>
  );
}
function IcHistory() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M3 3v5h5" />
      <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function IcAudit() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M12 2 4 5v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V5l-8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

// ---------- Cards ----------
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
      <div className="h-full rounded-2xl bg-surface p-5 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(43,38,34,0.25)] hover:ring-line-strong">
        <div className="flex items-start justify-between">
          <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneClass[tone]}`}>
            {icon}
          </span>
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

function NavCard({
  href,
  tone,
  icon,
  title,
  desc,
}: {
  href: string;
  tone: Tone;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className="flex h-full items-start gap-4 rounded-2xl bg-surface p-5 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(43,38,34,0.25)] hover:ring-line-strong">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass[tone]}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-ink">{title}</p>
            <span className="text-ink-faint opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100">
              <Arrow />
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{desc}</p>
        </div>
      </div>
    </Link>
  );
}

export default async function AdminPage() {
  // Defense in depth: the proxy already guards /admin, but the page re-checks.
  const session = await requireRole("ADMIN");

  const [serviceCount, activeServices, staffCount, staffWithoutHours, queueWaiting, bookingsToday] =
    await Promise.all([
      prisma.service.count(),
      prisma.service.count({ where: { active: true } }),
      prisma.user.count({ where: { role: "STAFF" } }),
      prisma.user.count({ where: { role: "STAFF", workingHours: { none: {} } } }),
      prisma.queueEntry.count({ where: { status: { in: ["WAITING", "CALLED"] } } }),
      prisma.booking.count({
        where: {
          startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: { in: ["CONFIRMED", "CHECKED_IN", "IN_SERVICE"] },
        },
      }),
    ]);

  const firstName = session.name.split(" ")[0];
  const dateStr = new Date().toLocaleDateString("sq", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-5xl">
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
            <h1 className="mt-1.5 font-display text-3xl font-semibold text-ink">
              Mirësevjen, {firstName}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
              Sot ke{" "}
              <strong className="font-semibold text-ink">{bookingsToday}</strong>{" "}
              {bookingsToday === 1 ? "rezervim aktiv" : "rezervime aktive"} dhe{" "}
              <strong className="font-semibold text-ink">{queueWaiting}</strong>{" "}
              {queueWaiting === 1 ? "klient në radhë" : "klientë në radhë"}.
            </p>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            href="/admin/sherbimet"
            tone="accent"
            icon={<IcServices />}
            value={serviceCount}
            label="Shërbime"
            sub={`${activeServices} aktive`}
          />
          <StatCard
            href="/admin/stafi"
            tone="gold"
            icon={<IcStaff />}
            value={staffCount}
            label="Staf"
            sub={staffWithoutHours > 0 ? `${staffWithoutHours} pa orar` : "të gjithë me orar"}
          />
          <StatCard
            href="/admin/radha"
            tone="ok"
            icon={<IcQueue />}
            value={queueWaiting}
            label="Në radhë sot"
            sub="në pritje / thirrur"
          />
          <StatCard
            href="/admin/historiku"
            tone="warn"
            icon={<IcBookings />}
            value={bookingsToday}
            label="Rezervime sot"
            sub="aktive"
          />
        </div>

        {/* Tools */}
        <h2 className="mb-3 mt-9 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Menaxhimi & analiza
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NavCard
            href="/admin/statistika"
            tone="accent"
            icon={<IcStats />}
            title="Statistikat"
            desc="Rezervime, anulime, pritja mesatare dhe shfrytëzimi i stafit."
          />
          <NavCard
            href="/admin/historiku"
            tone="gold"
            icon={<IcHistory />}
            title="Historiku"
            desc="Të gjitha rezervimet dhe radhët, me caktim stafi."
          />
          <NavCard
            href="/admin/audit"
            tone="ok"
            icon={<IcAudit />}
            title="Regjistri"
            desc="Gjurma e veprimeve kritike në sistem."
          />
        </div>
      </div>
    </DashboardShell>
  );
}
