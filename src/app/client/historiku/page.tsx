import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getClientAppointments } from "@/lib/client-appointments";
import { getClientQueueHistory } from "@/lib/client-queue";
import ClientHistoryWorkspace from "@/components/client/ClientHistoryWorkspace";

export default async function ClientHistoryPage() {
  const session = await requireRole("CLIENT");
  const [t, locale] = await Promise.all([getTranslations("ClientHistory"), getLocale()]);
  const [bookings, queueHistory] = await Promise.all([
    getClientAppointments(session.userId, new Date(), locale),
    getClientQueueHistory(session.userId, locale),
  ]);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-none">
        <h1 className="text-xl font-bold text-ink">{t("pageTitle")}</h1>
        <p className="mb-4 text-sm text-ink-soft">{t("pageHint")}</p>

        <ClientHistoryWorkspace bookings={bookings} queueHistory={queueHistory} />
      </div>
    </DashboardShell>
  );
}
