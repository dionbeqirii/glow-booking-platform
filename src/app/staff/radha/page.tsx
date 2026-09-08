import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { Kpi } from "@/components/ui";
import {
  getQueueKpis,
  getQueueSummary,
  getCurrentQueueRows,
  getQueueSlots,
  getRecentlyServed,
} from "@/lib/queue-catalog";
import { waitTone } from "@/lib/booking-labels";
import StaffQueueTable from "@/components/staff/StaffQueueTable";
import AddWalkinForm from "@/components/admin/AddWalkinForm";
import CallNextButton from "@/components/staff/CallNextButton";

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
function IcWalk() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="13" cy="4" r="2" />
      <path d="m8 21 2-6 2 1 2 5M6 12l2-4 3 1 2-1 3 3M9 8l-2 1" />
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
function IcUserPlus() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}
function IcCheckSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
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

export default async function StaffQueuePage() {
  const session = await requireRole("STAFF");
  const t = await getTranslations("StaffQueue");
  const locale = await getLocale();
  const now = new Date();

  const [kpis, summary, rows, slots, recentlyServed, staff, activeServices] = await Promise.all([
    getQueueKpis(now),
    getQueueSummary(now),
    getCurrentQueueRows(locale),
    getQueueSlots(now, 3, locale),
    getRecentlyServed(5, locale),
    prisma.user.findMany({
      where: { role: "STAFF" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, staffServices: { select: { serviceId: true } } },
    }),
    prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, price: true } }),
  ]);

  const staffOptions = staff.map((s) => ({ id: s.id, name: s.name, serviceIds: s.staffServices.map((x) => x.serviceId) }));
  const serviceOptions = activeServices.map((s) => ({ id: s.id, name: s.name, price: Number(s.price) }));

  const liveQueue = rows.filter((r) => r.status === "WAITING").slice(0, 5);
  const nextWaiting = liveQueue[0] ?? null;

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-ink">{t("pageTitle")}</h1>
          <p className="text-sm text-ink-soft">{t("pageHint")}</p>
        </div>

        <div className="shrink-0 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi href="/staff/radha" tone="purple" icon={<IcUsers />} value={kpis.liveInQueue} label={t("kpiLiveNow")} sub={t("kpiLiveNowSub")} />
          <Kpi href="/staff/radha" tone="accent" icon={<IcClock />} value={`${kpis.avgWaitMin} min`} label={t("kpiAvgWait")} sub={t("kpiAvgWaitSub")} />
          <Kpi href="/staff/statistikat" tone="ok" icon={<IcCheck />} value={kpis.servedToday} label={t("kpiServedToday")} sub={t("kpiServedTodaySub")} />
          <Kpi href="/staff/radha" tone="warn" icon={<IcWalk />} value={kpis.walkInsToday} label={t("kpiWalkinsToday")} sub={t("kpiWalkinsTodaySub")} />
        </div>

        <div className="flex flex-col gap-3 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_290px]">
          <div className="flex flex-col gap-3 lg:h-full lg:min-h-0">
            <div className="flex flex-col lg:min-h-0 lg:flex-1">
              <div className="mb-1.5 shrink-0">
                <p className="text-sm font-semibold text-ink">{t("currentQueueTitle")}</p>
                <p className="text-xs text-ink-faint">{t("currentQueueHint")}</p>
              </div>
              <div className="h-[420px] lg:h-auto lg:min-h-0 lg:flex-1">
                <StaffQueueTable rows={rows} staffOptions={staffOptions} services={serviceOptions} />
              </div>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="text-sm font-semibold text-ink">{t("freeSlotsTitle")}</p>
                <p className="mb-2.5 text-xs text-ink-faint">{t("freeSlotsHint")}</p>
                {slots.length === 0 ? (
                  <p className="text-xs text-ink-faint">{t("noSlotsAvailableToday")}</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {slots.map((s, i) => (
                      <div key={i} className="rounded-lg border border-line-strong px-2 py-2 text-center">
                        <div className="text-xs font-semibold text-ink">{s.timeLabel}</div>
                        <div className="text-[10px] text-ink-faint">{t("todayLabel")}</div>
                      </div>
                    ))}
                    <Link
                      href="/staff/orari"
                      className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong px-2 py-2 text-center text-[11px] font-medium text-accent transition-colors hover:bg-accent-soft"
                    >
                      <IcCalendar />
                      {t("myScheduleLink")}
                    </Link>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-line bg-surface p-3">
                <p className="text-sm font-semibold text-ink">{t("recentlyServedTitle")}</p>
                <p className="mb-2.5 text-xs text-ink-faint">{t("recentlyServedHint")}</p>
                {recentlyServed.length === 0 ? (
                  <p className="text-xs text-ink-faint">{t("noOneServedYet")}</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {recentlyServed.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 text-xs">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
                          <IcCheckSmall />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-ink">{r.clientName ?? t("namelessClientFallback")}</span>
                        <span className="shrink-0 text-ink-faint">{r.servedAtLabel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div id="shto-klient" className="shrink-0">
              <AddWalkinForm services={serviceOptions} />
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:h-full lg:min-h-0 lg:overflow-y-auto">
            <div className="shrink-0 rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("liveQueueTitle")}</p>
              {liveQueue.length === 0 ? (
                <p className="text-xs text-ink-faint">{t("noOneWaiting")}</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {liveQueue.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[9px] font-bold text-ink-soft">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{r.clientName ?? t("namelessClientFallback")}</span>
                      <span className={`shrink-0 font-medium ${waitTone(r.estWaitMin)}`}>~{r.estWaitMin} min</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("todaySummaryTitle")}</p>
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between"><span className="text-ink-soft">{t("walkinsToday")}</span><span className="font-semibold text-ink">{summary.walkInsToday}</span></div>
                <div className="flex items-center justify-between"><span className="text-ink-soft">{t("currentlyWaiting")}</span><span className="font-semibold text-ink">{summary.liveInQueue}</span></div>
                <div className="flex items-center justify-between"><span className="text-ink-soft">{t("served")}</span><span className="font-semibold text-ink">{summary.servedToday}</span></div>
                <div className="flex items-center justify-between"><span className="text-ink-soft">{t("noShow")}</span><span className="font-semibold text-ink">{summary.noShowToday}</span></div>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{t("quickActionsTitle")}</p>
              <div className="flex flex-col gap-1.5">
                <CallNextButton entryId={nextWaiting?.id ?? null} clientName={nextWaiting?.clientName ?? null} />
                <a href="#shto-klient" className="flex items-center gap-2.5 rounded-lg bg-surface-muted px-2.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-accent-soft">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-warn-soft text-warn"><IcUserPlus /></span>
                  {t("addWalkinClientLink")}
                </a>
                <Link href="/staff/orari" className="flex items-center gap-2.5 rounded-lg bg-surface-muted px-2.5 py-2 text-xs font-medium text-ink transition-colors hover:bg-accent-soft">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-soft text-purple"><IcCalendar /></span>
                  {t("viewMyScheduleLink")}
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
