import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, Card, EmptyState } from "@/components/ui";
import { computeStudioStats } from "@/lib/stats";

const PERIODS = [7, 30, 90] as const;

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
function eur(n: number): string {
  return `${n.toFixed(2)} €`;
}

type Search = { searchParams: Promise<{ days?: string }> };

// 3.6 — the staff member's own panel: which services the admin has
// authorized them for, and personal stats scoped strictly to their own
// completed work (never another staff member's numbers).
export default async function StaffStatsPage({ searchParams }: Search) {
  const session = await requireRole("STAFF");
  const sp = await searchParams;
  const days = (PERIODS as readonly number[]).includes(Number(sp.days)) ? Number(sp.days) : 30;

  const now = new Date();
  const from = new Date(now.getTime() - days * 86400000);

  const [mySkills, stats, completed] = await Promise.all([
    prisma.staffService.findMany({
      where: { staffId: session.userId },
      select: { service: { select: { id: true, name: true, durationMin: true, price: true, active: true } } },
    }),
    computeStudioStats(days),
    prisma.booking.findMany({
      where: { staffId: session.userId, status: "COMPLETED", startTime: { gte: from } },
      select: { service: { select: { name: true, price: true } } },
    }),
  ]);

  const myUtilization = stats.utilization.find((u) => u.staffId === session.userId) ?? null;

  const revenueTotal = completed.reduce((sum, b) => sum + Number(b.service.price), 0);

  const bySvc = new Map<string, { count: number; revenue: number }>();
  for (const b of completed) {
    const key = b.service.name;
    const cur = bySvc.get(key) ?? { count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += Number(b.service.price);
    bySvc.set(key, cur);
  }
  const breakdown = [...bySvc.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count);
  const breakdownMax = Math.max(1, ...breakdown.map((s) => s.count));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-3xl">
        <Link href="/staff" className="text-sm text-ink-soft hover:underline">
          ← Radha e sotme
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <PageTitle title="Statistikat e mia" hint="Vetëm puna jote — historiku dhe të ardhurat e gjeneruara prej teje." />
          <div className="mb-6 flex gap-2">
            {PERIODS.map((d) => (
              <Link
                key={d}
                href={`/staff/statistikat?days=${d}`}
                className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  d === days ? "bg-accent text-white" : "text-ink-soft ring-1 ring-line-strong hover:bg-surface-muted"
                }`}
              >
                {d} ditë
              </Link>
            ))}
          </div>
        </div>

        {/* KPI tiles */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Shërbime të kryera</p>
            <p className="mt-2 text-2xl font-bold text-ink">{completed.length}</p>
            <p className="text-xs text-ink-faint">{days} ditët e fundit</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Të ardhura të gjeneruara</p>
            <p className="mt-2 text-2xl font-bold text-ink">{eur(revenueTotal)}</p>
            <p className="text-xs text-ink-faint">nga shërbimet e përfunduara</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Orë të rezervuara</p>
            <p className="mt-2 text-2xl font-bold text-ink">{myUtilization ? (myUtilization.bookedMin / 60).toFixed(1) : "0.0"}</p>
            <p className="text-xs text-ink-faint">nga {myUtilization ? (myUtilization.availableMin / 60).toFixed(1) : "0.0"} orë të disponueshme</p>
          </Card>
          <Card>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Shfrytëzimi</p>
            <p className="mt-2 text-2xl font-bold text-ink">{myUtilization ? pct(myUtilization.utilization) : "—"}</p>
            <p className="text-xs text-ink-faint">orari i punuar ndaj orarit</p>
          </Card>
        </div>

        {/* My services */}
        <Card className="mb-6">
          <h2 className="mb-1 text-sm font-semibold text-ink">Shërbimet e mia</h2>
          <p className="mb-4 text-xs text-ink-faint">Shërbimet që administratori të ka autorizuar t&apos;i kryesh.</p>
          {mySkills.length === 0 ? (
            <EmptyState text="Ende s'ke shërbime të autorizuara. Kontakto administratorin." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {mySkills.map(({ service }) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between rounded-xl border border-line px-3.5 py-2.5 text-sm"
                >
                  <span className="text-ink">
                    {service.name}
                    {!service.active && <span className="ml-2 text-xs text-ink-faint">(joaktiv)</span>}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {service.durationMin} min · {eur(Number(service.price))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* My breakdown by service */}
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-ink">Shërbimet e kryera prej meje</h2>
          <p className="mb-4 text-xs text-ink-faint">{days} ditët e fundit, sipas shërbimit.</p>
          {breakdown.length === 0 ? (
            <p className="text-sm text-ink-faint">Ende pa shërbime të përfunduara në këtë periudhë.</p>
          ) : (
            <ul className="space-y-3">
              {breakdown.map((s) => (
                <li key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-ink">{s.name}</span>
                    <span className="text-ink-soft">
                      {s.count} · {eur(s.revenue)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, Math.round((s.count / breakdownMax) * 100))}%` }} />
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
