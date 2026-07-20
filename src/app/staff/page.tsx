import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";

export default async function StaffPage() {
  const session = await requireRole("STAFF");

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-bold text-neutral-900">Paneli i stafit</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Këtu do të shfaqet kalendari yt ditor dhe radha walk-in (Sprint 3–4).
        </p>
      </div>
    </DashboardShell>
  );
}
