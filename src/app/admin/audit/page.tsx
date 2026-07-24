import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, EmptyState } from "@/components/ui";

function fmt(d: Date): string {
  return d.toLocaleString("sq", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// FR-18 — read-only audit log of every critical action, for accountability.
export default async function AuditPage() {
  const session = await requireRole("ADMIN");

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      action: true,
      entity: true,
      entityId: true,
      details: true,
      createdAt: true,
      user: { select: { name: true, role: true } },
    },
  });

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm text-ink-soft hover:underline">
          ← Paneli
        </Link>
        <div className="mt-2">
          <PageTitle
            title="Regjistri i veprimeve"
            hint="Gjurma e veprimeve kritike në sistem (200 të fundit)."
          />
        </div>

        {logs.length === 0 ? (
          <EmptyState text="Regjistri është bosh." />
        ) : (
          <div className="overflow-hidden rounded-2xl ring-1 ring-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-left text-xs text-ink-soft">
                <tr>
                  <th className="px-4 py-3 font-medium">Koha</th>
                  <th className="px-4 py-3 font-medium">Përdoruesi</th>
                  <th className="px-4 py-3 font-medium">Veprimi</th>
                  <th className="px-4 py-3 font-medium">Entiteti</th>
                  <th className="px-4 py-3 font-medium">Detajet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {logs.map((l) => (
                  <tr key={l.id} className="bg-surface">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{fmt(l.createdAt)}</td>
                    <td className="px-4 py-3 text-ink">{l.user?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-surface-muted px-1.5 py-0.5 text-xs text-ink">
                        {l.action}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{l.entity}</td>
                    <td className="px-4 py-3 text-ink-soft">{l.details ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
