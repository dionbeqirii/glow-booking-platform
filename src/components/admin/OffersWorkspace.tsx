"use client";

import { useMemo, useState } from "react";
import type { OfferListRow, OfferServiceOption, OfferDisplayStatus } from "@/lib/offers-catalog";
import OfferDetailPanel from "./OfferDetailPanel";

const PAGE_SIZE = 5;

const STATUS_LABEL: Record<OfferDisplayStatus, string> = { active: "Aktive", inactive: "Joaktive", expired: "Skaduar" };
const STATUS_TONE: Record<OfferDisplayStatus, string> = {
  active: "bg-ok-soft text-ok",
  inactive: "bg-surface-muted text-ink-faint",
  expired: "bg-danger-soft text-danger",
};

function initials(title: string): string {
  return (
    title
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

export default function OffersWorkspace({
  initial,
  serviceOptions,
}: {
  initial: OfferListRow[];
  serviceOptions: OfferServiceOption[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OfferDisplayStatus | "">("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null);
  const [creatingNew, setCreatingNew] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initial.filter((o) => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (q && !o.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [initial, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const selected = !creatingNew ? initial.find((o) => o.id === selectedId) ?? null : null;

  function select(id: string) {
    setCreatingNew(false);
    setSelectedId(id);
  }
  function startNew() {
    setCreatingNew(true);
    setSelectedId(null);
  }
  function onSaved(offerId: string) {
    setCreatingNew(false);
    setSelectedId(offerId);
  }
  function onCancel() {
    setCreatingNew(false);
  }

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_420px]">
      <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
        <div className="shrink-0 rounded-xl border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-[110px] flex-1 basis-40">
              <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Kërko oferta…"
                className="w-full rounded-lg border border-line-strong bg-surface py-2 pl-7 pr-2 text-sm text-ink outline-none transition-colors focus:border-accent"
              />
            </div>
            <select
              className="w-[130px] shrink-0 truncate rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as OfferDisplayStatus | ""); setPage(1); }}
            >
              <option value="">Të gjitha Statuset</option>
              <option value="active">Aktive</option>
              <option value="inactive">Joaktive</option>
              <option value="expired">Skaduar</option>
            </select>
            <button
              onClick={startNew}
              className="ml-auto inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
              Ofertë e Re
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-line bg-surface p-2">
          {pageItems.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-ink-faint">Asnjë ofertë nuk përputhet me filtrat.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {pageItems.map((o) => (
                <button
                  key={o.id}
                  onClick={() => select(o.id)}
                  className={`w-full rounded-xl border p-2.5 text-left transition-colors ${
                    !creatingNew && selectedId === o.id ? "border-accent bg-accent-soft/40" : "border-line bg-surface hover:bg-surface-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {o.imageUrl ? (
                      <img src={o.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-line" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-[11px] font-semibold text-accent">
                        {initials(o.title)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-ink">{o.title}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                      </div>
                      <p className="truncate text-xs text-ink-faint">{o.services.map((s) => s.name).join(" + ") || "Pa shërbime"}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-ink">{o.price.toFixed(2)} €</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between px-1">
          <span className="text-xs text-ink-faint">{filtered.length} {filtered.length === 1 ? "ofertë" : "oferta"} gjithsej</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageSafe === 1}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-muted disabled:opacity-40"
              >
                ← Mbrapa
              </button>
              <span className="text-xs text-ink-faint">Faqja {pageSafe} nga {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageSafe === totalPages}
                className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-muted disabled:opacity-40"
              >
                Para →
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-full min-h-0">
        {selected || creatingNew ? (
          <OfferDetailPanel
            key={creatingNew ? "new" : selected!.id}
            existing={creatingNew ? null : selected}
            serviceOptions={serviceOptions}
            onCancel={onCancel}
            onSaved={onSaved}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-canvas p-6 text-center">
            <p className="text-sm font-medium text-ink-soft">Nuk ka ofertë të zgjedhur</p>
            <p className="text-xs text-ink-faint">Zgjidh një ofertë nga lista, ose krijo një të re.</p>
          </div>
        )}
      </div>
    </div>
  );
}
