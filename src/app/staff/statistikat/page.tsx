import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import {
  getStaffStatsKpis,
  getWeeklyPerformance,
  getMostRequestedServices,
  getMyServices,
  type StaffStatsKpis,
} from "@/lib/staff-stats";
import { weekdayFullLabelsMondayFirst } from "@/lib/calendar-labels";
import WeeklyPerformanceChart from "@/components/staff/WeeklyPerformanceChart";
import MyServicesPanel from "@/components/staff/MyServicesPanel";
import StatsTipBanner from "@/components/staff/StatsTipBanner";

const PERIODS = [7, 30, 90] as const;

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IcEuro() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M17 6.5a6 6 0 1 0 0 11" />
      <path d="M4 10h9M4 14h7" />
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
function IcTrend() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M3 17 9 11l4 4 8-8" />
      <path d="M15 7h6v6" />
    </svg>
  );
}

type T = (key: string, values?: Record<string, string | number>) => string;

function DeltaBadge({ pct, t }: { pct: number | null; t: T }) {
  if (pct === null) return <span className="text-xs text-ink-faint">{t("deltaFirstPeriod")}</span>;
  if (pct === 0) return <span className="text-xs text-ink-faint">{t("deltaSame")}</span>;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-ok" : "text-danger"}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {up ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
      </svg>
      {t("deltaChange", { pct: Math.abs(pct) })}
    </span>
  );
}

function tipMessage(kpis: StaffStatsKpis, t: T): string {
  const diff = kpis.utilizationPct - kpis.studioAvgUtilizationPct;
  const values = { pct: kpis.utilizationPct, avg: kpis.studioAvgUtilizationPct };
  if (diff > 3) return t("tipGoodWork", values);
  if (diff < -3) return t("tipBelowAvg", values);
  return t("tipNearAvg", values);
}

type Search = { searchParams: Promise<{ days?: string }> };

export default async function StaffStatsPage({ searchParams }: Search) {
  const session = await requireRole("STAFF");
  const [t, tWeekday, locale] = await Promise.all([
    getTranslations("StaffStats"),
    getTranslations("Weekday"),
    getLocale(),
  ]);
  const weekdayLabels = weekdayFullLabelsMondayFirst(tWeekday);
  const sp = await searchParams;
  const days = (PERIODS as readonly number[]).includes(Number(sp.days)) ? Number(sp.days) : 30;
  const now = new Date();

  const [kpis, weeklyRaw, requested, myServices] = await Promise.all([
    getStaffStatsKpis(session.userId, days, now, locale),
    getWeeklyPerformance(session.userId, days, now),
    getMostRequestedServices(session.userId, days, now),
    getMyServices(session.userId),
  ]);
  const weekly = weeklyRaw.map((p) => ({ label: weekdayLabels[p.weekday], current: p.current, prior: p.prior }));

  const requestedMax = Math.max(1, ...requested.map((r) => r.count));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-ink">{t("pageTitle")}</h1>
            <p className="text-sm text-ink-soft">{t("pageHint")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
              {PERIODS.map((d) => (
                <Link
                  key={d}
                  href={`/staff/statistikat?days=${d}`}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    d === days ? "bg-accent text-white" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {t("daysOption", { count: d })}
                </Link>
              ))}
            </div>
            <span className="flex items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink-soft">
              <IcCalendar />
              {kpis.fromLabel} – {kpis.toLabel}
            </span>
          </div>
        </div>

        <div className="shrink-0 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ok-soft text-ok"><IcCalendar /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t("kpiCompleted")}</p>
              <p className="text-xl font-bold leading-tight text-ink">{kpis.completedCount}</p>
              <p className="truncate text-xs text-ink-faint">{t("kpiCompletedSub", { count: days })}</p>
              <DeltaBadge pct={kpis.completedDeltaPct} t={t} />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal"><IcEuro /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t("kpiRevenue")}</p>
              <p className="text-xl font-bold leading-tight text-ink">{kpis.revenue.toFixed(2)} €</p>
              <p className="truncate text-xs text-ink-faint">{t("kpiRevenueSub")}</p>
              <DeltaBadge pct={kpis.revenueDeltaPct} t={t} />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><IcClock /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t("kpiBookedHours")}</p>
              <p className="text-xl font-bold leading-tight text-ink">{kpis.bookedHours.toFixed(1)}</p>
              <p className="truncate text-xs text-ink-faint">{t("kpiBookedHoursSub", { hours: kpis.availableHours.toFixed(1) })}</p>
              <DeltaBadge pct={kpis.bookedHoursDeltaPct} t={t} />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-soft text-purple"><IcTrend /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{t("kpiUtilization")}</p>
              <p className="text-xl font-bold leading-tight text-ink">{kpis.utilizationPct}%</p>
              <p className="truncate text-xs text-ink-faint">{t("kpiUtilizationSub")}</p>
              <DeltaBadge pct={kpis.utilizationDeltaPct} t={t} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-2">
          <div className="h-[420px] rounded-xl border border-line bg-surface p-3.5 lg:h-auto lg:min-h-0">
            <MyServicesPanel services={myServices} />
          </div>

          <div className="flex flex-col gap-3 lg:min-h-0">
            <div className="h-[280px] shrink-0 rounded-xl border border-line bg-surface p-3.5">
              <p className="text-sm font-semibold text-ink">{t("weeklyPerformanceTitle")}</p>
              <div className="h-[calc(100%-24px)]">
                <WeeklyPerformanceChart points={weekly} />
              </div>
            </div>

            <div className="min-h-0 flex-1 rounded-xl border border-line bg-surface p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{t("mostRequestedTitle")}</p>
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{t("completedLabel")}</p>
              </div>
              {requested.length === 0 ? (
                <p className="text-xs text-ink-faint">{t("noCompletedInPeriod")}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {requested.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-2.5 text-xs">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok-soft text-[10px] font-bold text-ok">{i + 1}</span>
                      <span className="w-32 shrink-0 truncate text-ink-soft sm:w-40">{r.name}</span>
                      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                        <div className="h-full rounded-full bg-ok" style={{ width: `${Math.max(6, Math.round((r.count / requestedMax) * 100))}%` }} />
                      </div>
                      <span className="w-4 shrink-0 text-right font-semibold text-ink">{r.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <StatsTipBanner message={tipMessage(kpis, t)} />
      </div>
    </DashboardShell>
  );
}
