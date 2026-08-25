import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, Kpi } from "@/components/ui";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_PILL } from "@/lib/booking-labels";
import {
  getStaffKpis,
  getStaffOverviewRows,
  getExistingStaffTitles,
  getTodaySchedule,
  getOngoingAppointments,
  getMonthPerformance,
} from "@/lib/staff-catalog";
import StaffOverviewTable from "@/components/admin/StaffOverviewTable";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
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
function IcStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" />
    </svg>
  );
}
function IcChart() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 15v3M12 10v8M17 6v12" />
    </svg>
  );
}
function IcBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}
function IcSmile() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
    </svg>
  );
}
function IcCoin() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}
function IcUserPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}

export default async function StaffPage() {
  const session = await requireRole("ADMIN");
  const now = new Date();

  const [kpis, rows, existingTitles, schedule, ongoing, performance] = await Promise.all([
    getStaffKpis(now),
    getStaffOverviewRows(now),
    getExistingStaffTitles(),
    getTodaySchedule(now),
    getOngoingAppointments(),
    getMonthPerformance(now),
  ]);

  const currentTimeLabel = now.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false });
  const currentDateLabel = now.toLocaleDateString("sq", { day: "numeric", month: "long", year: "numeric" });

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-none">
        <PageTitle title="Stafi" hint="Shiko ekipin, disponueshmërinë dhe performancën e studios." />

        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi href="/admin/kalendari" tone="accent" icon={<IcCalendar />} value={kpis.todayAppointments} label="Terminet e Sotme" sub={`↗ ${kpis.upcomingToday} së shpejti`} />
              <Kpi href="/admin/stafi" tone="purple" icon={<IcClock />} value={currentTimeLabel} label="Ora Aktuale" sub={currentDateLabel} />
              <Kpi href="/admin/klientet" tone="gold" icon={<IcStar />} value={kpis.studioRating || "—"} label="Vlerësimi i Studios" sub={`Bazuar në ${kpis.reviewCount} vlerësime`} />
              <Kpi href="/admin/historiku" tone="ok" icon={<IcChart />} value={kpis.completedThisMonth} label="Shërbime të Kryera" sub="Këtë muaj" />
            </div>

            <StaffOverviewTable rows={rows} existingTitles={existingTitles} />

            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="mb-1 text-sm font-semibold text-ink">Përmbledhja e Performancës</p>
              <p className="mb-3 text-xs text-ink-faint">Ndiq ecurinë e studios këtë muaj.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex items-center gap-2.5 rounded-lg bg-surface-muted p-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><IcBook /></span>
                  <div className="min-w-0">
                    <p className="text-base font-bold leading-tight text-ink">{performance.appointments}</p>
                    <p className="truncate text-[11px] text-ink-faint">Termine Këtë Muaj</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg bg-surface-muted p-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ok-soft text-ok"><IcSmile /></span>
                  <div className="min-w-0">
                    <p className="text-base font-bold leading-tight text-ink">{performance.satisfactionPct || "—"}{performance.satisfactionPct ? "%" : ""}</p>
                    <p className="truncate text-[11px] text-ink-faint">Kënaqësia e Klientëve</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg bg-surface-muted p-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold"><IcCoin /></span>
                  <div className="min-w-0">
                    <p className="text-base font-bold leading-tight text-ink">{performance.revenue.toFixed(0)} €</p>
                    <p className="truncate text-[11px] text-ink-faint">Të Ardhura Këtë Muaj</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg bg-surface-muted p-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-soft text-purple"><IcUserPlus /></span>
                  <div className="min-w-0">
                    <p className="text-base font-bold leading-tight text-ink">{performance.newClients}</p>
                    <p className="truncate text-[11px] text-ink-faint">Klientë të Rinj</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="rounded-xl border border-line bg-surface p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Orari i Sotëm</p>
                <Link href="/admin/kalendari" className="text-[11px] font-semibold text-accent hover:underline">Kalendari</Link>
              </div>
              {schedule.length === 0 ? (
                <p className="text-xs text-ink-faint">Asnjë termin sot.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {schedule.map((s) => {
                    const pill = BOOKING_STATUS_PILL[s.status];
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{s.timeLabel} · {s.serviceName}</p>
                          <p className="truncate text-[11px] text-ink-faint">{s.clientName} · {s.staffName}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${pill.bg} ${pill.text}`}>{BOOKING_STATUS_LABEL[s.status]}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link href="/admin/terminet" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
                Shiko Gjithë Kalendarin →
              </Link>
            </div>

            <div className="rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Terminet Aktuale ({ongoing.length} në vazhdim)</p>
              {ongoing.length === 0 ? (
                <p className="text-xs text-ink-faint">Askush në shërbim tani.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {ongoing.map((o) => (
                    <div key={o.id} className="flex items-center gap-2 text-xs">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[9px] font-bold text-gold">
                        {o.startedLabel}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-ink">{o.clientName}</p>
                        <p className="truncate text-[11px] text-ink-faint">{o.serviceName} · {o.staffName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/admin/terminet?status=IN_SERVICE" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
                Shiko të Gjitha Terminet →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
