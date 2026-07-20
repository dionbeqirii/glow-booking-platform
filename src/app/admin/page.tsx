import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";

export default async function AdminPage() {
  // Defense in depth: the proxy already guards /admin, but the page re-checks.
  const session = await requireRole("ADMIN");

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-bold text-neutral-900">Paneli administrativ</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Këtu do të menaxhohen shërbimet, stafi, oraret dhe statistikat (Sprint 2+).
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Placeholder title="Shërbimet" note="Sprint 2" />
          <Placeholder title="Stafi & oraret" note="Sprint 2" />
          <Placeholder title="Statistikat" note="Sprint 5" />
        </div>
      </div>
    </DashboardShell>
  );
}

function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-neutral-200">
      <p className="font-semibold text-neutral-900">{title}</p>
      <p className="mt-1 text-xs text-neutral-500">{note}</p>
    </div>
  );
}
