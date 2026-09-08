import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getAdminBookingHistory, getAdminQueueHistory, getReassignStaffOptions } from "@/lib/admin-history";
import AdminHistory from "@/components/admin/AdminHistory";

export default async function AdminHistoryPage() {
  const session = await requireRole("ADMIN");
  const t = await getTranslations("AdminHistoriku");
  const locale = await getLocale();

  const [bookings, queue, staff] = await Promise.all([
    getAdminBookingHistory(locale),
    getAdminQueueHistory(locale),
    getReassignStaffOptions(),
  ]);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-ink">{t("pageTitle")}</h1>
          <p className="text-sm text-ink-soft">{t("pageSubtitle")}</p>
        </div>

        <AdminHistory bookings={bookings} queue={queue} staff={staff} />
      </div>
    </DashboardShell>
  );
}
