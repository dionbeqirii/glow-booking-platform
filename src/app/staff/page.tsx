import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { Kpi } from "@/components/ui";
import {
  getStaffDashboardKpis,
  getMySchedule,
  getUpcomingAppointments,
  getTodayWorkingMinutes,
} from "@/lib/staff-dashboard";
import { getCurrentQueueRows } from "@/lib/queue-catalog";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_PILL, waitTone } from "@/lib/booking-labels";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
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
function IcStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" />
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
function IcUsersSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IcCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}
function IcChevron() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function parseISODate(s: string | undefined): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    const parsed = new Date(y, m - 1, d);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}
function shiftDay(d: Date, delta: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + delta);
  return next;
}

export default async function StaffDashboardPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const session = await requireRole("STAFF");
  const sp = await searchParams;
  const now = new Date();
  const scheduleDate = parseISODate(sp.date);

  const [kpis, schedule, upcoming, workingMin, queueRows] = await Promise.all([
    getStaffDashboardKpis(session.userId, now),
    getMySchedule(session.userId, scheduleDate),
    getUpcomingAppointments(session.userId, now, 6),
    getTodayWorkingMinutes(session.userId, now),
    getCurrentQueueRows(),
  ]);

  const waiting = queueRows.filter((r) => r.status === "WAITING").slice(0, 5);
  const firstName = session.name.split(" ")[0];
  const scheduleDateLabel = scheduleDate.toLocaleDateString("sq", { day: "numeric", month: "long", year: "numeric" });
  const isToday = toISODate(scheduleDate) === toISODate(now);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-ink">Mirësevjen, {firstName} 🌿</h1>
          <p className="text-sm text-ink-soft">Ja orari yt dhe përmbledhja e sotme.</p>
        </div>

        <div className="shrink-0 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi href="/staff/terminet" tone="accent" icon={<IcCalendar />} value={kpis.todayAppointments} label="Terminet e Sotme" sub="Shiko oraret e tua →" />
          <Kpi href="/staff/radha" tone="purple" icon={<IcUsers />} value={kpis.queueWaiting} label="Klientë në Radhë" sub={waiting[0] ? `Radhën: ${waiting[0].clientName}` : "Askush në pritje"} />
          <Kpi href="/staff/terminet" tone="gold" icon={<IcClock />} value={kpis.nextAppointment?.timeLabel ?? "—"} label="Termini Tjetër" sub={kpis.nextAppointment?.serviceName ?? "Asnjë sot"} />
          <Kpi href="/staff/statistikat" tone="ok" icon={<IcStar />} value={kpis.completedToday} label="Përfunduar Sot" sub={kpis.completedToday > 0 ? "Bravo! 🎉" : "Vazhdo punën"} />
        </div>

        <div className="grid min-h-0 flex-[3] gap-3 lg:grid-cols-[1fr_320px]">
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-line bg-surface p-3.5">
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">Orari Im</p>
              <Link href="/staff/terminet" className="text-xs font-semibold text-accent hover:underline">Shiko të Gjitha →</Link>
            </div>
            <div className="mb-2 flex shrink-0 items-center gap-1">
              <Link href={`/staff?date=${toISODate(shiftDay(scheduleDate, -1))}`} aria-label="Dita e mëparshme" className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
              </Link>
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-2.5 py-1 text-xs font-medium text-ink-soft">
                <IcCalendar />
                {isToday ? "Sot" : scheduleDateLabel}
              </span>
              <Link href={`/staff?date=${toISODate(shiftDay(scheduleDate, 1))}`} aria-label="Dita tjetër" className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
              </Link>
            </div>

            {schedule.length === 0 ? (
              <p className="flex flex-1 items-center justify-center text-sm text-ink-faint">Asnjë termin për këtë ditë.</p>
            ) : (
              <ul className="relative min-h-0 flex-1 overflow-y-auto flex flex-col gap-2 pl-3">
                <div className="absolute bottom-2 left-[3px] top-2 w-px bg-line" aria-hidden />
                {schedule.map((item, i) =>
                  item.kind === "break" ? (
                    <li key={`break-${i}`} className="relative flex items-center gap-3 py-1.5">
                      <span className="absolute -left-3 h-1.5 w-1.5 rounded-full bg-ink-faint" aria-hidden />
                      <span className="w-12 shrink-0 text-xs text-ink-faint">{item.timeLabel}</span>
                      <span className="text-xs italic text-ink-faint">Pushim</span>
                    </li>
                  ) : (
                    <li key={item.id} className={`relative flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:brightness-95 ${BOOKING_STATUS_PILL[item.status].bg}`}>
                      <span className={`absolute -left-3 h-1.5 w-1.5 rounded-full ${BOOKING_STATUS_PILL[item.status].dot}`} aria-hidden />
                      <span className="w-12 shrink-0 text-xs font-medium text-ink-soft">{item.timeLabel}</span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-[10px] font-semibold text-ink-soft ring-1 ring-line">
                        {initials(item.clientName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{item.clientName}</p>
                        <p className="truncate text-xs text-ink-faint">{item.serviceName}</p>
                      </div>
                      <span className={`shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold ${BOOKING_STATUS_PILL[item.status].text}`}>
                        {BOOKING_STATUS_LABEL[item.status]}
                      </span>
                      <span className="shrink-0 text-ink-faint"><IcChevron /></span>
                    </li>
                  )
                )}
              </ul>
            )}
          </div>

          <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
            <div className="shrink-0 rounded-xl border border-line bg-surface p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Radha Live</p>
                <Link href="/staff/radha" className="text-xs font-semibold text-accent hover:underline">Shiko Radhën →</Link>
              </div>
              {waiting.length === 0 ? (
                <p className="text-sm text-ink-faint">Radha është bosh për momentin.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {waiting.map((r, i) => (
                    <li key={r.id} className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-ink-soft">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{r.clientName}</p>
                        <p className="truncate text-xs text-ink-faint">{r.serviceName}</p>
                      </div>
                      <span className={`shrink-0 text-xs font-medium ${waitTone(r.estWaitMin)}`}>~{r.estWaitMin} min</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="relative mt-3 flex items-start gap-2.5 overflow-hidden rounded-lg bg-ok-soft p-3">
                <span className="mt-0.5 shrink-0 text-ok">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" /></svg>
                </span>
                <div className="min-w-0 flex-1 pr-8">
                  <p className="text-xs font-semibold text-ok">Këshillë</p>
                  <p className="mt-0.5 text-xs text-ink-soft">Mbaje radhën të përditësuar për një përvojë të mirë për klientët.</p>
                </div>
                <div className="absolute -bottom-3 -right-3">
                  <LeafDecoration />
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-xl border border-line bg-surface p-3.5">
              <div className="mb-2.5 flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">Përmbledhja e Sotme</p>
                <Link href="/staff/statistikat" className="text-xs font-semibold text-accent hover:underline">Statistikat →</Link>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-surface-muted p-2.5">
                  <span className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-ok-soft text-ok"><IcCalendar /></span>
                  <p className="text-lg font-bold leading-tight text-ink">{kpis.todayAppointments}</p>
                  <p className="text-[11px] text-ink-faint">Termine</p>
                </div>
                <div className="rounded-lg bg-surface-muted p-2.5">
                  <span className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-purple-soft text-purple"><IcUsersSmall /></span>
                  <p className="text-lg font-bold leading-tight text-ink">{kpis.queueWaiting}</p>
                  <p className="text-[11px] text-ink-faint">Në Radhë</p>
                </div>
                <div className="rounded-lg bg-surface-muted p-2.5">
                  <span className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-gold-soft text-gold"><IcCheck /></span>
                  <p className="text-lg font-bold leading-tight text-ink">{kpis.completedToday}</p>
                  <p className="text-[11px] text-ink-faint">Përfunduar</p>
                </div>
                <div className="rounded-lg bg-surface-muted p-2.5">
                  <span className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-teal-soft text-teal"><IcClock /></span>
                  <p className="text-lg font-bold leading-tight text-ink">{(workingMin / 60).toFixed(1)}h</p>
                  <p className="text-[11px] text-ink-faint">Orë Pune</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-[2] flex-col rounded-xl border border-line bg-surface p-3.5">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><IcBook /> Terminet e Ardhshme</p>
            <Link href="/staff/terminet" className="text-xs font-semibold text-accent hover:underline">Shiko të Gjitha →</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="flex flex-1 items-center justify-center text-sm text-ink-faint">Asnjë termin i ardhshëm.</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint [&>th]:sticky [&>th]:top-0 [&>th]:bg-surface">
                    <th className="px-2 py-2 font-medium">Data &amp; Ora</th>
                    <th className="px-2 py-2 font-medium">Klienti</th>
                    <th className="px-2 py-2 font-medium">Shërbimi</th>
                    <th className="px-2 py-2 font-medium">Kohëzgjatja</th>
                    <th className="px-2 py-2 font-medium">Statusi</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((a) => {
                    const pill = BOOKING_STATUS_PILL[a.status];
                    return (
                      <tr key={a.id} className="border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
                        <td className="px-2 py-2.5 text-ink">{a.dateLabel}, {a.timeLabel}</td>
                        <td className="px-2 py-2.5 font-medium text-ink">{a.clientName}</td>
                        <td className="px-2 py-2.5 text-ink-soft">{a.serviceName}</td>
                        <td className="px-2 py-2.5 text-ink-soft">{a.durationMin} min</td>
                        <td className="px-2 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${pill.bg} ${pill.text}`}>
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pill.dot}`} />
                            {BOOKING_STATUS_LABEL[a.status]}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
