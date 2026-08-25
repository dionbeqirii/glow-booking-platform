import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, Kpi } from "@/components/ui";
import {
  getQueueKpis,
  getQueueSummary,
  getCurrentQueueRows,
  getQueueSlots,
  getQueueInsights,
} from "@/lib/queue-catalog";
import { waitTone } from "@/lib/booking-labels";
import QueueTable from "@/components/admin/QueueTable";
import AddWalkinForm from "@/components/admin/AddWalkinForm";

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
function IcInsightWalkin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}
function IcInsightAlert() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
function IcInsightSlot() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4" />
    </svg>
  );
}

const INSIGHT_ICON = { walkin: IcInsightWalkin, alert: IcInsightAlert, slot: IcInsightSlot };
const INSIGHT_TONE = { walkin: "bg-accent-soft text-accent", alert: "bg-warn-soft text-warn", slot: "bg-ok-soft text-ok" };

export default async function AdminQueuePage() {
  const session = await requireRole("ADMIN");
  const now = new Date();

  const [kpis, summary, rows, slots, insights, staff, activeServices] = await Promise.all([
    getQueueKpis(now),
    getQueueSummary(now),
    getCurrentQueueRows(),
    getQueueSlots(now),
    getQueueInsights(now),
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

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-none">
        <PageTitle title="Radha" hint="Menaxho radhën e klientëve pa termin dhe listën e pritjes." />

        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi href="/admin/radha" tone="purple" icon={<IcUsers />} value={kpis.liveInQueue} label="Në Radhë Tani" sub="Duke pritur" />
              <Kpi href="/admin/radha" tone="accent" icon={<IcClock />} value={`${kpis.avgWaitMin} min`} label="Koha Mesatare e Pritjes" sub="Sot" />
              <Kpi href="/admin/terminet?status=COMPLETED" tone="ok" icon={<IcCheck />} value={kpis.servedToday} label="Shërbyer Sot" sub="Termine" />
              <Kpi href="/admin/radha" tone="warn" icon={<IcWalk />} value={kpis.walkInsToday} label="Klientë pa Termin Sot" sub="Pa termin" />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">Radha Aktuale</p>
              <p className="mb-2 text-xs text-ink-faint">Klientë duke pritur për shërbim pa termin ose termin e ardhshëm.</p>
              <div className="max-h-[420px]">
                <QueueTable rows={rows} staffOptions={staffOptions} services={serviceOptions} />
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="text-sm font-semibold text-ink">Orare të Lira së Shpejti</p>
              <p className="mb-2.5 text-xs text-ink-faint">Oraret e ardhshme të disponueshme për klientë pa termin.</p>
              {slots.length === 0 ? (
                <p className="text-xs text-ink-faint">Asnjë punonjës i disponueshëm sot.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.map((s, i) => (
                    <div key={i} className="rounded-lg border border-line-strong px-2 py-2 text-center">
                      <div className="text-xs font-semibold text-ink">{s.timeLabel}</div>
                      <div className="text-[10px] text-ink-faint">Sot</div>
                    </div>
                  ))}
                  <Link
                    href="/admin/kalendari"
                    className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line-strong px-2 py-2 text-center text-[11px] font-medium text-accent transition-colors hover:bg-accent-soft"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    Kalendari
                  </Link>
                </div>
              )}
            </div>

            <AddWalkinForm services={serviceOptions} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="rounded-xl border border-line bg-surface p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Radha Live (Tani)</p>
              </div>
              {liveQueue.length === 0 ? (
                <p className="text-xs text-ink-faint">Askush në pritje.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {liveQueue.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[9px] font-bold text-ink-soft">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{r.clientName}</span>
                      <span className={`shrink-0 font-medium ${waitTone(r.estWaitMin)}`}>~{r.estWaitMin} min</span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/admin/radha" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
                Shiko Gjithë Radhën →
              </Link>
            </div>

            <div className="rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Përmbledhja e Sotme</p>
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between"><span className="text-ink-soft">Klientë pa Termin</span><span className="font-semibold text-ink">{summary.walkInsToday}</span></div>
                <div className="flex items-center justify-between"><span className="text-ink-soft">Aktualisht në Pritje</span><span className="font-semibold text-ink">{summary.liveInQueue}</span></div>
                <div className="flex items-center justify-between"><span className="text-ink-soft">Shërbyer</span><span className="font-semibold text-ink">{summary.servedToday}</span></div>
                <div className="flex items-center justify-between"><span className="text-ink-soft">Nuk u Paraqit</span><span className="font-semibold text-ink">{summary.noShowToday}</span></div>
              </div>
              <Link href="/admin/historiku" className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">
                Shiko Historikun →
              </Link>
            </div>

            <div className="rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Njoftime</p>
              {insights.length === 0 ? (
                <p className="text-xs text-ink-faint">Asnjë njoftim aktualisht.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {insights.map((ins, i) => {
                    const Icon = INSIGHT_ICON[ins.icon];
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${INSIGHT_TONE[ins.icon]}`}>
                          <Icon />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs text-ink">{ins.text}</p>
                          {ins.timeLabel && <p className="text-[10px] text-ink-faint">{ins.timeLabel}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
