import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, Card } from "@/components/ui";
import { computeStudioStats } from "@/lib/stats";
import { BOOKING_STATUS_LABEL } from "@/lib/booking-labels";
import type { BookingStatus } from "@prisma/client";

type Search = { searchParams: Promise<{ days?: string }> };

const PERIODS = [7, 30, 90];

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </Card>
  );
}

// FR-15 — studio analytics dashboard.
export default async function StatsPage({ searchParams }: Search) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;
  const days = PERIODS.includes(Number(sp.days)) ? Number(sp.days) : 30;

  const stats = await computeStudioStats(days);
  const { bookings, queue, utilization } = stats;

  const statusOrder: BookingStatus[] = [
    "COMPLETED",
    "CONFIRMED",
    "CHECKED_IN",
    "IN_SERVICE",
    "CANCELLED",
    "NO_SHOW",
  ];

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm text-ink-soft hover:underline">
          ← Paneli
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <PageTitle title="Statistikat" hint={`Përmbledhje për ${days} ditët e fundit.`} />
          <div className="mb-6 flex gap-2">
            {PERIODS.map((d) => (
              <Link
                key={d}
                href={`/admin/statistika?days=${d}`}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  d === days ? "bg-accent text-white" : "text-ink-soft ring-1 ring-line-strong hover:bg-surface-muted"
                }`}
              >
                {d} ditë
              </Link>
            ))}
          </div>
        </div>

        {/* Headline booking figures */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Rezervime gjithsej" value={String(bookings.total)} hint="në periudhë" />
          <StatTile
            label="Të përfunduara"
            value={String(bookings.byStatus.COMPLETED)}
            hint={bookings.total > 0 ? pct(bookings.byStatus.COMPLETED / bookings.total) : "—"}
          />
          <StatTile label="Norma e anulimeve" value={pct(bookings.cancellationRate)} hint={`${bookings.byStatus.CANCELLED} anulime`} />
          <StatTile label="Norma e no-show" value={pct(bookings.noShowRate)} hint={`${bookings.byStatus.NO_SHOW} raste`} />
        </div>

        {/* Queue figures */}
        <h2 className="mt-8 mb-3 text-sm font-semibold text-ink">Radha pa termin</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Check-in gjithsej" value={String(queue.checkins)} />
          <StatTile label="Të shërbyer" value={String(queue.completed)} />
          <StatTile label="No-show në radhë" value={String(queue.noShow)} />
          <StatTile
            label="Pritja mesatare"
            value={queue.avgWaitMin === null ? "—" : `${queue.avgWaitMin} min`}
            hint="koha reale deri te thirrja"
          />
        </div>

        {/* Booking status breakdown */}
        <h2 className="mt-8 mb-3 text-sm font-semibold text-ink">Rezervimet sipas statusit</h2>
        <Card>
          {bookings.total === 0 ? (
            <p className="text-sm text-ink-faint">Nuk ka rezervime në këtë periudhë.</p>
          ) : (
            <ul className="space-y-3">
              {statusOrder.map((s) => {
                const count = bookings.byStatus[s];
                const share = bookings.total > 0 ? count / bookings.total : 0;
                return (
                  <li key={s}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink">{BOOKING_STATUS_LABEL[s]}</span>
                      <span className="text-ink-soft">
                        {count} · {pct(share)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${share * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Staff utilization */}
        <h2 className="mt-8 mb-3 text-sm font-semibold text-ink">Shfrytëzimi i stafit</h2>
        <Card>
          {utilization.length === 0 ? (
            <p className="text-sm text-ink-faint">Nuk ka staf të regjistruar.</p>
          ) : (
            <ul className="space-y-4">
              {utilization.map((u) => (
                <li key={u.staffId}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink">{u.name}</span>
                    <span className="text-ink-soft">
                      {pct(u.utilization)}
                      <span className="text-ink-faint">
                        {" "}
                        ({Math.round(u.bookedMin / 60)}h nga {Math.round(u.availableMin / 60)}h)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${u.utilization * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
