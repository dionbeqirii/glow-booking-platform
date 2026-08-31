"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buttonStyles } from "@/components/ui";
import type { OfferListRow, OfferDisplayStatus } from "@/lib/offers-catalog";

const PAGE_SIZE = 6;

const STATUS_LABEL: Record<OfferDisplayStatus, string> = { active: "Aktive", inactive: "Joaktive", expired: "Skaduar" };
const STATUS_PILL: Record<OfferDisplayStatus, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-ok-soft", text: "text-ok", dot: "bg-ok" },
  inactive: { bg: "bg-surface-muted", text: "text-ink-faint", dot: "bg-ink-faint" },
  expired: { bg: "bg-danger-soft", text: "text-danger", dot: "bg-danger" },
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

function fmtDate(iso: string | null): string | null {
  return iso ? new Date(iso).toLocaleDateString("sq", { day: "2-digit", month: "short", year: "numeric" }) : null;
}
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcClock() {
  return <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
function IcTag() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M12.6 2.6 21 11a2 2 0 0 1 0 2.8l-6.2 6.2a2 2 0 0 1-2.8 0L3.6 11.6A2 2 0 0 1 3 10.2V4a1 1 0 0 1 1-1h6.2c.5 0 1 .2 1.4.6Z" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IcCalendar() {
  return <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IcSparkle() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden><path d="m12 2 2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2Z" /></svg>;
}
function IcLock() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}
function IcWalk() {
  return <svg width="14" height="14" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="13" cy="4" r="2" /><path d="m8 21 2-6 2 1 2 5M6 12l2-4 3 1 2-1 3 3M9 8l-2 1" /></svg>;
}
function IcInfo() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
}
function IcImagePlaceholder() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}

export default function ClientOffersWorkspace({ offers }: { offers: OfferListRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OfferDisplayStatus | "">("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(offers.find((o) => o.status === "active")?.id ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return offers.filter((o) => {
      if (status && o.status !== status) return false;
      if (q && !o.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [offers, query, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = Math.min(safePage * PAGE_SIZE, filtered.length);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selected = offers.find((o) => o.id === selectedId) ?? null;
  const hasSavings = selected ? selected.realValue > selected.price : false;
  const savingsPct = selected && hasSavings ? Math.round((1 - selected.price / selected.realValue) * 100) : 0;

  function withReset<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1); };
  }
  function resetFilters() {
    setQuery("");
    setStatus("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-3 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_460px]">
      <div className="flex h-[560px] min-h-0 flex-col gap-3 lg:h-full">
        <div className="shrink-0 rounded-xl border border-line bg-surface p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative min-w-[130px] flex-1 basis-48">
              <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={query}
                onChange={(e) => withReset(setQuery)(e.target.value)}
                placeholder="Kërko oferta…"
                className="w-full rounded-lg border border-line-strong bg-surface py-2 pl-7 pr-2 text-sm text-ink outline-none transition-colors focus:border-accent"
              />
            </div>
            <select
              value={status}
              onChange={(e) => withReset(setStatus)(e.target.value as OfferDisplayStatus | "")}
              className="w-[150px] shrink-0 truncate rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
            >
              <option value="">Të gjitha statuset</option>
              <option value="active">Aktive</option>
              <option value="inactive">Joaktive</option>
              <option value="expired">Skaduar</option>
            </select>
            <button
              type="button"
              onClick={resetFilters}
              title="Pastro filtrat"
              aria-label="Pastro filtrat"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line-strong text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 4h18l-7 8v6l-4 2v-8L3 4Z" />
              </svg>
            </button>
          </div>
        </div>

        <p className="shrink-0 text-xs text-ink-faint">{filtered.length} {filtered.length === 1 ? "ofertë e disponueshme" : "oferta të disponueshme"}</p>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {pageItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-10 text-center text-sm text-ink-faint">
              {offers.length === 0 ? "Nuk ka ende oferta." : "Asnjë ofertë nuk përputhet me filtrat."}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pageItems.map((o) => {
                const pill = STATUS_PILL[o.status];
                const validFromLabel = fmtDate(o.validFrom);
                const validUntilLabel = fmtDate(o.validUntil);
                const isActive = o.status === "active";
                return (
                  <button
                    key={o.id}
                    onClick={() => isActive && setSelectedId(o.id)}
                    disabled={!isActive}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      !isActive
                        ? "cursor-not-allowed border-line bg-surface opacity-60"
                        : selectedId === o.id
                          ? "border-accent bg-accent-soft/30"
                          : "border-line bg-surface hover:bg-surface-muted/60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {o.imageUrl ? (
                        <img src={o.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-line" />
                      ) : (
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-sm font-semibold text-accent">
                          {initials(o.title)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-ink">{o.title}</p>
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill.bg} ${pill.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                            {STATUS_LABEL[o.status]}
                          </span>
                        </div>
                        <p className="truncate text-xs text-ink-faint">{o.services.map((s) => s.name).join(" + ") || "Pa shërbime"}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-ink-soft">
                          <span className="flex items-center gap-1"><IcClock />{o.durationMin} min</span>
                          <span className="flex items-center gap-1"><IcTag />{o.price.toFixed(2)} €</span>
                          {(validFromLabel || validUntilLabel) && (
                            <span className="flex items-center gap-1">
                              <IcCalendar />
                              {validFromLabel && validUntilLabel ? `${validFromLabel} – ${validUntilLabel}` : validFromLabel ?? validUntilLabel}
                            </span>
                          )}
                        </div>
                        {o.description && <p className="mt-1 truncate text-xs text-ink-faint">{o.description}</p>}
                      </div>
                      {isActive ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0 text-ink-faint" aria-hidden>
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      ) : (
                        <span className="mt-1 shrink-0 text-ink-faint"><IcLock /></span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-xs text-ink-faint">
          <span>Duke shfaqur {from}–{to} nga {filtered.length} oferta</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Faqja e mëparshme"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            {pageNumbers(safePage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1 text-ink-faint">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1 text-xs font-medium transition-colors ${
                    p === safePage ? "bg-accent text-white" : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Faqja tjetër"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 lg:h-full">
        {selected ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
              <span className="border-b-2 border-accent pb-3 -mb-3 text-sm font-semibold text-accent">Detajet e Ofertës</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_PILL[selected.status].bg} ${STATUS_PILL[selected.status].text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_PILL[selected.status].dot}`} />
                {STATUS_LABEL[selected.status]}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="relative h-48 w-full shrink-0 overflow-hidden">
                {selected.imageUrl ? (
                  <img src={selected.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-surface-muted text-ink-faint">
                    <IcImagePlaceholder />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                {hasSavings && (
                  <div className="absolute right-3 top-3 rounded-xl bg-white/95 px-3 py-2 text-center shadow-[0_4px_16px_rgba(0,0,0,0.15)]">
                    <p className="text-[9px] font-bold uppercase tracking-wide text-ink-faint">Ofertë Speciale</p>
                    <p className="text-lg font-bold leading-tight text-accent">{selected.price.toFixed(2)} €</p>
                    <p className="text-[10px] text-ink-faint">vlera reale {selected.realValue.toFixed(2)} €</p>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 p-3 text-white">
                  <div className="flex items-center gap-x-2.5 gap-y-1 text-[10px] font-semibold uppercase tracking-wide opacity-90">
                    <span>{selected.durationMin} Minuta</span>
                    <span>·</span>
                    <span>{selected.services.length} Shërbime</span>
                    <span>·</span>
                    <span>{hasSavings ? `Kurse ${savingsPct}%` : fmtDate(selected.validUntil) ? `Deri ${fmtDate(selected.validUntil)}` : "Pa Afat"}</span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h2 className="text-xl font-semibold text-ink">{selected.title}</h2>
                <p className="text-sm text-ink-soft">{selected.services.map((s) => s.name).join(" + ") || "Pa shërbime"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
                  <span className="flex items-center gap-1"><IcClock />{selected.durationMin} min</span>
                  <span className="flex items-center gap-1"><IcTag />{selected.price.toFixed(2)} €</span>
                  <span className="flex items-center gap-1">
                    <IcCalendar />
                    {fmtDate(selected.validFrom) && fmtDate(selected.validUntil)
                      ? `${fmtDate(selected.validFrom)} – ${fmtDate(selected.validUntil)}`
                      : fmtDate(selected.validFrom) ?? fmtDate(selected.validUntil) ?? "Pa afat kohor"}
                  </span>
                </div>
                {selected.description && <p className="mt-2 text-sm text-ink-soft">{selected.description}</p>}

                <div className="mt-4">
                  <p className="mb-2 text-sm font-semibold text-ink">Shërbimet e Përfshira</p>
                  {selected.services.length === 0 ? (
                    <p className="text-xs text-ink-faint">Kjo ofertë s&apos;ka ende shërbime të lidhura.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selected.services.map((s) => (
                        <div key={s.id} className="flex items-start gap-2.5 rounded-xl bg-surface-muted p-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                            <IcSparkle />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-wide text-ink">{s.name}</p>
                            <p className="text-xs text-ink-faint">{s.description ?? "—"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Periudha e Vlefshmërisë</p>
                    {selected.validFrom || selected.validUntil ? (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                        <span className="min-w-0 truncate rounded-lg border border-line-strong bg-surface-muted px-2.5 py-1.5">
                          {fmtDate(selected.validFrom) ?? "—"}
                        </span>
                        <span className="shrink-0 text-ink-faint">–</span>
                        <span className="min-w-0 truncate rounded-lg border border-line-strong bg-surface-muted px-2.5 py-1.5">
                          {fmtDate(selected.validUntil) ?? "—"}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-ink-soft">Pa afat kohor — e vlefshme derisa të çaktivizohet.</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Kushtet</p>
                    <p className="text-xs text-ink-soft">Oferta nuk mund të kombinohet me oferta të tjera.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-line p-3">
              <div className="rounded-xl bg-accent-soft/40 p-3">
                <p className="text-sm font-semibold text-ink">Gati për të rezervuar?</p>
                <p className="mb-2.5 text-xs text-ink-soft">Zgjidhni mënyrën që ju përshtatet më shumë.</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/client/rezervo?offer=${selected.id}`} className={`inline-flex items-center gap-1.5 ${buttonStyles.primary}`}>
                    <IcCalendar />
                    Rezervo Tani
                  </Link>
                  <Link href="/client/radha" className={`inline-flex items-center gap-1.5 ${buttonStyles.secondary}`}>
                    <IcWalk />
                    Walk-in (pa termin)
                  </Link>
                </div>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-ink-faint">
                <IcInfo />
                Pas rezervimit do të marrësh një njoftim në aplikacion me detajet e terminit.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-canvas p-6 text-center">
            <p className="text-sm font-medium text-ink-soft">Nuk ka ofertë të zgjedhur</p>
            <p className="text-xs text-ink-faint">Zgjidh një ofertë aktive nga lista për të parë detajet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
