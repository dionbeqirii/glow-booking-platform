import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle } from "@/components/ui";
import { getOffersList, getOfferServiceOptions } from "@/lib/offers-catalog";
import OffersWorkspace from "@/components/admin/OffersWorkspace";

export default async function AdminOffersPage() {
  const session = await requireRole("ADMIN");

  const [offers, serviceOptions] = await Promise.all([getOffersList({}), getOfferServiceOptions()]);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col">
        <PageTitle title="Ofertat" hint="Krijo dhe menaxho paketa promocionale me disa shërbime." />
        <OffersWorkspace initial={offers} serviceOptions={serviceOptions} />
      </div>
    </DashboardShell>
  );
}
