import type { ReactNode } from "react";

export type OfferCardData = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  serviceName: string;
};

// Shared presentation for an offer, used on both the staff (view-only) and
// client (bookable) pages. `footer` carries the role-specific action area
// (nothing for staff, a "Rezervo" link for the client).
export function OfferCard({ offer, footer, dim = false }: { offer: OfferCardData; footer?: ReactNode; dim?: boolean }) {
  return (
    <div className={`overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04)] ${dim ? "opacity-60" : ""}`}>
      <div className="aspect-[16/10] w-full bg-surface-muted">
        {offer.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={offer.imageUrl} alt={offer.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-faint">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-ink">{offer.title}</p>
          <p className="shrink-0 font-semibold text-accent">{offer.price.toFixed(2)} €</p>
        </div>
        <p className="mt-0.5 text-xs text-ink-faint">{offer.serviceName}</p>
        {offer.description && <p className="mt-2 text-sm text-ink-soft">{offer.description}</p>}
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}
