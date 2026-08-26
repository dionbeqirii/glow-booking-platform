"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { buttonStyles } from "@/components/ui";
import { QUEUE_STATUS_LABEL, QUEUE_STATUS_PILL, waitTone } from "@/lib/booking-labels";
import type { QueueTableRow } from "@/lib/queue-catalog";

export type StaffOption = { id: string; name: string; serviceIds: string[] };
export type ServiceOption = { id: string; name: string; price: number };

type Invoice = {
  clientName: string;
  staffName: string;
  startedAt: string | null;
  completedAt: string;
  services: { name: string; price: number }[];
  total: number;
};

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

// Same real actions as the admin QueueTable, minus the "assign to staff"
// control — a staff member calling a waiting client always books it onto
// their own calendar (the server enforces this too), so there is nothing
// meaningful to pick there.
export default function StaffQueueTable({
  rows,
  staffOptions,
  services,
}: {
  rows: QueueTableRow[];
  staffOptions: StaffOption[];
  services: ServiceOption[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<{ id: string; kind: "menu" | "details" } | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openPanel) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpenPanel(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openPanel]);

  async function act(id: string, action: "call" | "start" | "complete" | "no_show") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Veprimi dështoi");
      } else {
        if (action === "complete" && data.invoice) setInvoice(data.invoice);
        setOpenPanel(null);
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function toggleService(row: QueueTableRow, serviceId: string) {
    const next = row.visitServiceIds.includes(serviceId)
      ? row.visitServiceIds.filter((s) => s !== serviceId)
      : [...row.visitServiceIds, serviceId];
    setBusyId(row.id);
    setError(null);
    try {
      const res = await fetch(`/api/queue/${row.id}/services`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds: next }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Veprimi dështoi");
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface">
      {error && (
        <div className="shrink-0 border-b border-line bg-danger-soft px-4 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col className="w-8" />
            <col style={{ width: "26%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-surface">
              <th className="px-2 py-1.5 font-medium">#</th>
              <th className="px-2 py-1.5 font-medium">Klienti</th>
              <th className="px-2 py-1.5 font-medium">Shërbimi</th>
              <th className="px-2 py-1.5 font-medium">Shtuar Në</th>
              <th className="px-2 py-1.5 font-medium">Pritje (Vlerësuar)</th>
              <th className="px-2 py-1.5 font-medium">Statusi</th>
              <th className="px-2 py-1.5 font-medium">Veprime</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-faint">Radha është bosh për momentin.</td>
              </tr>
            ) : (
              rows.map((r) => {
                const pill = QUEUE_STATUS_PILL[r.status];
                const candidateServices = (staffOptions.find((s) => s.id === r.staffId)?.serviceIds ?? [r.serviceId])
                  .map((sid) => services.find((s) => s.id === sid))
                  .filter((s): s is ServiceOption => Boolean(s));
                const checkedCount = r.visitServiceIds.length;
                const busy = busyId === r.id;

                return (
                  <tr key={r.id} className={`border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60 ${busy ? "opacity-60" : ""}`}>
                    <td className="px-2 py-1.5 text-ink-faint">{r.queueNumber}</td>
                    <td className="overflow-hidden px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                          {initials(r.clientName)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-ink">{r.clientName}</div>
                          <div className="truncate text-[11px] text-ink-faint">{r.clientPhone ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="overflow-hidden px-2 py-1.5">
                      <span className="truncate text-ink">{r.serviceName}</span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-ink-soft">{r.addedAtLabel}</td>
                    <td className={`whitespace-nowrap px-2 py-1.5 font-medium ${r.status === "WAITING" ? waitTone(r.estWaitMin) : "text-ink-faint"}`}>
                      {r.status === "IN_SERVICE" ? "—" : `~ ${r.estWaitMin} min`}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${pill.bg} ${pill.text}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pill.dot}`} />
                        <span className="truncate">{QUEUE_STATUS_LABEL[r.status]}</span>
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-0.5">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenPanel(openPanel?.id === r.id && openPanel.kind === "details" ? null : { id: r.id, kind: "details" })}
                            title="Detajet"
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
                            </svg>
                          </button>
                          {openPanel?.id === r.id && openPanel.kind === "details" && (
                            <div ref={panelRef} className="absolute right-0 top-7 z-20 w-64 rounded-xl border border-line-strong bg-surface p-3 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]">
                              <p className="mb-2 text-sm font-semibold text-ink">{r.clientName}</p>
                              <div className="flex flex-col gap-1 text-xs text-ink-soft">
                                <div className="flex justify-between gap-2"><span className="text-ink-faint">Telefoni</span><span className="truncate text-ink">{r.clientPhone ?? "—"}</span></div>
                                <div className="flex justify-between gap-2"><span className="text-ink-faint">Shërbimi</span><span className="truncate text-ink">{r.serviceName} ({r.durationMin} min)</span></div>
                                <div className="flex justify-between gap-2"><span className="text-ink-faint">Shtuar në</span><span className="text-ink">{r.addedAtLabel}</span></div>
                                <div className="flex justify-between gap-2"><span className="text-ink-faint">Punonjësi</span><span className="truncate text-ink">{r.staffName ?? "—"}</span></div>
                              </div>
                              <div className="mt-2 border-t border-line pt-2">
                                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Shënime</p>
                                <p className="mt-0.5 text-xs text-ink-soft">{r.notes || "Nuk ka shënime."}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenPanel(openPanel?.id === r.id && openPanel.kind === "menu" ? null : { id: r.id, kind: "menu" })}
                            aria-label="Më shumë veprime"
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <circle cx="12" cy="5" r="1.6" />
                              <circle cx="12" cy="12" r="1.6" />
                              <circle cx="12" cy="19" r="1.6" />
                            </svg>
                          </button>
                          {openPanel?.id === r.id && openPanel.kind === "menu" && (
                            <div ref={panelRef} className="absolute right-0 top-7 z-20 w-56 overflow-hidden rounded-xl border border-line-strong bg-surface py-1 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]">
                              {r.status === "WAITING" && (
                                <>
                                  <button onClick={() => act(r.id, "call")} disabled={busy} className="w-full px-3.5 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted disabled:opacity-50">
                                    📞 Thirre
                                  </button>
                                  <button onClick={() => act(r.id, "no_show")} disabled={busy} className="w-full px-3.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft disabled:opacity-50">
                                    ✕ No-show
                                  </button>
                                </>
                              )}
                              {r.status === "CALLED" && (
                                <>
                                  <button onClick={() => act(r.id, "start")} disabled={busy} className="w-full px-3.5 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted disabled:opacity-50">
                                    ▶ Fillo Vizitën
                                  </button>
                                  <button onClick={() => act(r.id, "no_show")} disabled={busy} className="w-full px-3.5 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-soft disabled:opacity-50">
                                    ✕ No-show
                                  </button>
                                </>
                              )}
                              {r.status === "IN_SERVICE" && (
                                <>
                                  <p className="px-3.5 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">Shërbimet e Kryera</p>
                                  <div className="flex flex-col gap-1 px-3.5 py-1.5">
                                    {candidateServices.length === 0 ? (
                                      <p className="text-xs text-ink-faint">Asnjë shërbim i disponueshëm.</p>
                                    ) : (
                                      candidateServices.map((svc) => {
                                        const checked = r.visitServiceIds.includes(svc.id);
                                        return (
                                          <label key={svc.id} className="flex cursor-pointer items-center gap-2 text-xs text-ink">
                                            <input type="checkbox" checked={checked} onChange={() => toggleService(r, svc.id)} disabled={busy} className="h-3.5 w-3.5 rounded border-line-strong accent-accent" />
                                            <span className="flex-1 truncate">{svc.name}</span>
                                            <span className="text-ink-faint">{svc.price.toFixed(2)} €</span>
                                          </label>
                                        );
                                      })
                                    )}
                                  </div>
                                  <div className="px-3.5 pb-1 pt-1">
                                    <button
                                      onClick={() => act(r.id, "complete")}
                                      disabled={busy || checkedCount === 0}
                                      title={checkedCount === 0 ? "Shëno të paktën një shërbim të kryer" : undefined}
                                      className={`w-full rounded-lg ${buttonStyles.primary} py-1.5 text-xs`}
                                    >
                                      ✔ Përfundo Vizitën
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {invoice &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(ev) => { if (ev.target === ev.currentTarget) setInvoice(null); }}
          >
            <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-[0_24px_60px_-20px_rgba(43,38,34,0.55)] ring-1 ring-line">
              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <h2 className="mt-4 text-lg font-semibold text-ink">Vizita u përfundua</h2>
                <p className="mt-1 text-sm text-ink-soft">{invoice.clientName} · {invoice.staffName}</p>
              </div>
              <div className="mt-5 divide-y divide-line rounded-xl bg-surface-muted">
                {invoice.services.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
                    <span className="text-ink">{s.name}</span>
                    <span className="font-medium text-ink">{s.price.toFixed(2)} €</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between px-1">
                <span className="text-sm font-semibold text-ink">Totali</span>
                <span className="text-lg font-bold text-ink">{invoice.total.toFixed(2)} €</span>
              </div>
              {invoice.startedAt && (
                <p className="mt-3 text-center text-xs text-ink-faint">
                  Kohëzgjatja e vizitës: {Math.max(0, Math.round((new Date(invoice.completedAt).getTime() - new Date(invoice.startedAt).getTime()) / 60000))} min
                </p>
              )}
              <button type="button" onClick={() => setInvoice(null)} className={`mt-5 w-full ${buttonStyles.primary}`}>
                Mbylle
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
