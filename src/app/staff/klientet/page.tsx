import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { Kpi } from "@/components/ui";
import {
  getStaffClientKpis,
  getStaffClientRows,
  getClientOverview,
  getTopServicesThisMonth,
} from "@/lib/clients-catalog";
import StaffClientsTable from "@/components/staff/StaffClientsTable";
import NewClientButton from "@/components/admin/NewClientButton";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IcUserPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}
function IcRepeat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M17 2.1 21 6l-4 3.9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 21.9 3 18l4-3.9" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}
function IcStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" />
    </svg>
  );
}
function IcCalendar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IcUserPlusSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}
function IcChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-faint" aria-hidden>
      <path d="m9 18 6-6-6-6" />
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

function OverviewDonut({ activePct, inactivePct, noShowPct }: { activePct: number; inactivePct: number; noShowPct: number }) {
  const size = 88;
  const strokeW = 13;
  const r = (size - strokeW) / 2;
  const c = 2 * Math.PI * r;
  const segments = [
    { pct: activePct, cls: "stroke-ok" },
    { pct: inactivePct, cls: "stroke-ink-faint" },
    { pct: noShowPct, cls: "stroke-warn" },
  ];
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-surface-muted" strokeWidth={strokeW} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((s, i) => {
          if (s.pct <= 0) return null;
          const dash = (s.pct / 100) * c;
          const circle = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              className={s.cls}
              strokeWidth={strokeW}
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return circle;
        })}
      </g>
    </svg>
  );
}

function pctOfTotal(n: number, total: number): string {
  return total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";
}

type T = (key: string, values?: Record<string, string | number>) => string;
function newClientsDeltaLabel(thisMonth: number, lastMonth: number, t: T): string {
  if (lastMonth === 0) return thisMonth > 0 ? t("kpiNewGrowth") : t("kpiNewThisMonth");
  const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  if (pct === 0) return t("kpiNewSame");
  return t("kpiNewDelta", { sign: pct > 0 ? "+" : "", pct });
}

export default async function StaffClientsPage() {
  const session = await requireRole("STAFF");
  const [t, locale] = await Promise.all([getTranslations("StaffClients"), getLocale()]);
  const now = new Date();

  const [kpis, rows, overview, topServices] = await Promise.all([
    getStaffClientKpis(now),
    getStaffClientRows(now, locale),
    getClientOverview(now),
    getTopServicesThisMonth(now),
  ]);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-ink">{t("pageTitle")}</h1>
          <p className="text-sm text-ink-soft">{t("pageHint")}</p>
        </div>

        <div className="shrink-0 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi href="/staff/klientet" tone="accent" icon={<IcUsers />} value={kpis.total} label={t("kpiTotal")} sub={t("kpiTotalSub")} />
          <Kpi href="/staff/klientet" tone="gold" icon={<IcUserPlus />} value={kpis.newThisMonth} label={t("kpiNew")} sub={newClientsDeltaLabel(kpis.newThisMonth, kpis.newLastMonth, t)} />
          <Kpi href="/staff/klientet" tone="ok" icon={<IcRepeat />} value={kpis.returning} label={t("kpiReturning")} sub={t("kpiReturningSub", { pct: pctOfTotal(kpis.returning, kpis.total) })} />
          <Kpi href="/staff/klientet" tone="purple" icon={<IcStar />} value={kpis.loyal} label={t("kpiLoyal")} sub={t("kpiLoyalSub", { pct: pctOfTotal(kpis.loyal, kpis.total) })} />
        </div>

        <div className="flex flex-col gap-3 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_280px]">
          <div className="h-[460px] lg:h-auto lg:min-h-0 lg:flex-1">
            <StaffClientsTable rows={rows} />
          </div>

          <div className="flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-y-auto">
            <div className="shrink-0 rounded-xl border border-line bg-surface p-3">
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("overviewTitle")}</p>
              <div className="flex items-center gap-3">
                <OverviewDonut activePct={overview.activePct} inactivePct={overview.inactivePct} noShowPct={overview.noShowPct} />
                <div className="flex flex-1 flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ok" />{t("overviewActive")}</span>
                    <span className="font-semibold text-ink">{overview.activePct}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ink-faint" />{t("overviewInactive")}</span>
                    <span className="font-semibold text-ink">{overview.inactivePct}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" />{t("noShow")}</span>
                    <span className="font-semibold text-ink">{overview.noShowPct}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-line bg-surface p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("topServicesTitle")}</p>
              {topServices.length === 0 ? (
                <p className="text-xs text-ink-faint">{t("noBookingsThisMonth")}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {topServices.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[9px] font-bold text-ink-soft">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{s.name}</span>
                      <span className="shrink-0 text-ink-faint">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/staff/ofertat" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
                {t("viewAllServicesLink")}
              </Link>
            </div>

            <div className="shrink-0 rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("quickActionsTitle")}</p>
              <div className="flex flex-col">
                <NewClientButton variant="row" />
                <Link href="/staff/radha#shto-klient" className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-muted">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-warn-soft text-warn"><IcUserPlusSmall /></span>
                  <span className="min-w-0 flex-1 truncate">{t("addToQueueLink")}</span>
                  <IcChevron />
                </Link>
                <Link href="/staff/orari" className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-muted">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-soft text-purple"><IcCalendar /></span>
                  <span className="min-w-0 flex-1 truncate">{t("viewMyScheduleLink")}</span>
                  <IcChevron />
                </Link>
              </div>
            </div>

            <div className="relative shrink-0 overflow-hidden rounded-xl bg-ok-soft p-3">
              <span className="shrink-0 text-ok">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" /></svg>
              </span>
              <p className="mt-1.5 text-xs font-semibold text-ok">{t("tipTitle")}</p>
              <p className="mt-0.5 pr-8 text-xs text-ink-soft">{t("tipBody")}</p>
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
