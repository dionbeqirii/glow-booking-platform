import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { Card } from "@/components/ui";

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

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-bold text-ink">Paneli administrativ</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Konfigurimi i biznesit: shërbimet, stafi dhe oraret e punës.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/admin/sherbimet" className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <p className="font-semibold text-ink">Shërbimet</p>
              <p className="mt-1 text-sm text-ink-soft">
                Katalogu me kohëzgjatje dhe çmim.
              </p>
              <p className="mt-3 text-2xl font-bold text-ink">{serviceCount}</p>
              <p className="text-xs text-ink-faint">{activeServices} aktive</p>
            </Card>
          </Link>

          <Link href="/admin/stafi" className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <p className="font-semibold text-ink">Stafi dhe oraret</p>
              <p className="mt-1 text-sm text-ink-soft">
                Punonjësit, aftësitë dhe orari javor.
              </p>
              <p className="mt-3 text-2xl font-bold text-ink">{staffCount}</p>
              <p className="text-xs text-ink-faint">
                {staffWithoutHours > 0
                  ? `${staffWithoutHours} pa orar të caktuar`
                  : "të gjithë me orar"}
              </p>
            </Card>
          </Link>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Link href="/admin/radha" className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <p className="font-semibold text-ink">Radha e sotme</p>
              <p className="mt-1 text-sm text-ink-soft">Klientët pa termin, në pritje ose në shërbim.</p>
              <p className="mt-3 text-2xl font-bold text-ink">{queueWaiting}</p>
              <p className="text-xs text-ink-faint">në pritje / thirrur</p>
            </Card>
          </Link>

          <Card className="h-full">
            <p className="font-semibold text-ink">Rezervimet e sotme</p>
            <p className="mt-1 text-sm text-ink-soft">Terminet aktive për sot.</p>
            <p className="mt-3 text-2xl font-bold text-ink">{bookingsToday}</p>
            <p className="text-xs text-ink-faint">konfirmuar ose në vazhdim</p>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Link href="/admin/statistika" className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <p className="font-semibold text-ink">Statistikat</p>
              <p className="mt-1 text-sm text-ink-soft">
                Rezervime, anulime, pritja mesatare, shfrytëzimi.
              </p>
            </Card>
          </Link>

          <Link href="/admin/historiku" className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <p className="font-semibold text-ink">Historiku</p>
              <p className="mt-1 text-sm text-ink-soft">
                Të gjitha rezervimet dhe radhët, me caktim stafi.
              </p>
            </Card>
          </Link>

          <Link href="/admin/audit" className="block">
            <Card className="h-full transition-shadow hover:shadow-md">
              <p className="font-semibold text-ink">Regjistri</p>
              <p className="mt-1 text-sm text-ink-soft">
                Gjurma e veprimeve kritike në sistem.
              </p>
            </Card>
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
