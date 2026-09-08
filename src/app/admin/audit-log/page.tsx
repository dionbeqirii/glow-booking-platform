import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getAuditLogRows } from "@/lib/audit-log";
import AuditLogWorkspace from "@/components/admin/AuditLogWorkspace";

export default async function AuditLogPage() {
  const session = await requireRole("ADMIN");
  const t = await getTranslations("AdminAuditLog");
  const tNav = await getTranslations("Nav");
  const locale = await getLocale();
  const rows = await getAuditLogRows(locale);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-ink">{tNav("auditLog")}</h1>
          <p className="text-sm text-ink-soft">{t("subtitle")}</p>
        </div>

        <AuditLogWorkspace rows={rows} />
      </div>
    </DashboardShell>
  );
}
