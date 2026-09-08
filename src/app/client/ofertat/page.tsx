import { getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getOffersList } from "@/lib/offers-catalog";
import ClientOffersWorkspace from "@/components/client/ClientOffersWorkspace";

export default async function ClientOffersPage() {
  const session = await requireRole("CLIENT");
  const [t, offers] = await Promise.all([getTranslations("ClientOffers"), getOffersList({})]);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-ink">{t("pageTitle")}</h1>
          <p className="text-sm text-ink-soft">{t("pageHint")}</p>
        </div>

        <ClientOffersWorkspace offers={offers} />
      </div>
    </DashboardShell>
  );
}
