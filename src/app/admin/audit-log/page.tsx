import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getAuditLogRows } from "@/lib/audit-log";
import AuditLogWorkspace from "@/components/admin/AuditLogWorkspace";

export default async function AuditLogPage() {
  const session = await requireRole("ADMIN");
  const rows = await getAuditLogRows();

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-ink">Audit Log</h1>
          <p className="text-sm text-ink-soft">Ndiq të gjitha veprimet dhe ndryshimet e rëndësishme në sistem.</p>
        </div>

        <AuditLogWorkspace rows={rows} />
      </div>
    </DashboardShell>
  );
}
