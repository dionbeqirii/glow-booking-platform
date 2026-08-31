import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getOffersList } from "@/lib/offers-catalog";
import StaffOffersWorkspace from "@/components/staff/StaffOffersWorkspace";

export default async function StaffOffersPage() {
  const session = await requireRole("STAFF");
  const offers = await getOffersList({});

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-ink">Ofertat</h1>
          <p className="text-sm text-ink-soft">Shiko ofertat e disponueshme të salonit.</p>
        </div>

        <StaffOffersWorkspace offers={offers} />
      </div>
    </DashboardShell>
  );
}
