import { getTranslations, getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getClientQueueView } from "@/lib/client-queue";
import ClientQueueWorkspace from "@/components/client/ClientQueueWorkspace";

export default async function ClientQueuePage() {
  const session = await requireRole("CLIENT");
  const [t, locale] = await Promise.all([getTranslations("ClientQueue"), getLocale()]);

  const [services, view] = await Promise.all([
    prisma.service.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, durationMin: true },
    }),
    getClientQueueView(session.userId, session.name, locale),
  ]);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-none">
        <h1 className="text-xl font-bold text-ink">{t("pageTitle")}</h1>
        <p className="mb-4 text-sm text-ink-soft">{t("pageHint")}</p>

        <ClientQueueWorkspace services={services} view={view} />
      </div>
    </DashboardShell>
  );
}
