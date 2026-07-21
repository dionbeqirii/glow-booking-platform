import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { Card } from "@/components/ui";

export default async function AdminPage() {
  // Defense in depth: the proxy already guards /admin, but the page re-checks.
  const session = await requireRole("ADMIN");

  const [serviceCount, activeServices, staffCount, staffWithoutHours] = await Promise.all([
    prisma.service.count(),
    prisma.service.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "STAFF" } }),
    prisma.user.count({ where: { role: "STAFF", workingHours: { none: {} } } }),
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
          <Card className="opacity-60">
            <p className="font-semibold text-ink">Rezervimet</p>
            <p className="mt-1 text-xs text-ink-faint">Sprint 3</p>
          </Card>
          <Card className="opacity-60">
            <p className="font-semibold text-ink">Statistikat</p>
            <p className="mt-1 text-xs text-ink-faint">Sprint 5</p>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
