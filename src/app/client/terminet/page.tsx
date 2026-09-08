import { getTranslations, getLocale } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getClientAppointments } from "@/lib/client-appointments";
import AppointmentsWorkspace from "@/components/client/AppointmentsWorkspace";

export default async function ClientAppointmentsPage() {
  const session = await requireRole("CLIENT");
  const [t, locale] = await Promise.all([getTranslations("ClientAppointments"), getLocale()]);
  const bookings = await getClientAppointments(session.userId, new Date(), locale);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-none">
        <h1 className="text-xl font-bold text-ink">{t("pageTitle")}</h1>
        <p className="mb-4 text-sm text-ink-soft">{t("pageHint")}</p>

        <AppointmentsWorkspace bookings={bookings} />
      </div>
    </DashboardShell>
  );
}
