import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";

export default async function ClientPage() {
  const session = await requireRole("CLIENT");

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-bold text-neutral-900">Mirë se erdhe, {session.name}</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Këtu do të rezervosh terminet dhe do të futesh në radhë (Sprint 3–4).
        </p>
      </div>
    </DashboardShell>
  );
}
