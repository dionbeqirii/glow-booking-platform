import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, EmptyState, buttonStyles } from "@/components/ui";
import { OfferCard, type OfferCardData } from "@/components/OfferCard";

export default async function ClientOffersPage() {
  const session = await requireRole("CLIENT");

  const offers = await prisma.offer.findMany({
    orderBy: { createdAt: "desc" },
    include: { service: { select: { id: true, name: true, active: true } } },
  });

  const toCard = (o: (typeof offers)[number]): OfferCardData => ({
    id: o.id,
    title: o.title,
    description: o.description,
    imageUrl: o.imageUrl,
    price: Number(o.price),
    serviceName: o.service.name,
  });

  // "E kaluar" = the admin disabled the offer, or its underlying service is
  // no longer active — either way it can't be booked anymore.
  const active = offers.filter((o) => o.active && o.service.active);
  const past = offers.filter((o) => !o.active || !o.service.active);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-5xl">
        <Link href="/client" className="text-sm text-ink-soft hover:underline">
          ← Terminet e mia
        </Link>
        <div className="mt-2">
          <PageTitle title="Ofertat" hint="Zbritje dhe paketa të veçanta — rezervo direkt nga këtu." />
        </div>

        {offers.length === 0 ? (
          <EmptyState text="Nuk ka ende oferta." />
        ) : (
          <>
            <h2 className="mb-3 text-sm font-semibold text-ink">Ofertat aktive</h2>
            {active.length === 0 ? (
              <p className="mb-8 rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-6 text-center text-sm text-ink-faint">
                Nuk ka oferta aktive për momentin.
              </p>
            ) : (
              <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((o) => (
                  <OfferCard
                    key={o.id}
                    offer={toCard(o)}
                    footer={
                      <Link href={`/client/rezervo?service=${o.serviceId}`} className={`${buttonStyles.primary} w-full`}>
                        Rezervo
                      </Link>
                    }
                  />
                ))}
              </div>
            )}

            {past.length > 0 && (
              <>
                <h2 className="mb-3 text-sm font-semibold text-ink">Ofertat e kaluara</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {past.map((o) => (
                    <OfferCard
                      key={o.id}
                      offer={toCard(o)}
                      dim
                      footer={<p className="text-center text-xs text-ink-faint">Nuk pranohet më rezervim</p>}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
