import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getOffersList } from "@/lib/offers-catalog";
import ClientOffersWorkspace from "@/components/client/ClientOffersWorkspace";

export default async function ClientOffersPage() {
  const session = await requireRole("CLIENT");
  const offers = await getOffersList({});

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col gap-3">
        <div className="shrink-0">
          <h1 className="text-xl font-bold text-ink">Ofertat</h1>
          <p className="text-sm text-ink-soft">Zbritje dhe paketa të veçanta — rezervo direkt nga këtu.</p>
        </div>

        <ClientOffersWorkspace offers={offers} />
      </div>
    </DashboardShell>
  );
}
