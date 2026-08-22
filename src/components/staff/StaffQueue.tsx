"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, Badge, Alert, EmptyState, buttonStyles } from "../ui";
import { QUEUE_STATUS_LABEL, QUEUE_STATUS_TONE } from "@/lib/booking-labels";

type Entry = {
  id: string;
  queueNumber: number;
  status: "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED" | "NO_SHOW";
  estimatedWaitMin: number;
  checkinAt: string;
  startedAt: string | null;
  serviceId: string;
  service: { name: string; durationMin: number };
  staff: { id: string; name: string } | null;
  client: { name: string } | null;
  clientName: string | null;
  visitServiceIds: string[];
};

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

export default function StaffQueue({
  meId,
  isAdmin,
  initial,
  staffOptions = [],
  services = [],
}: {
  meId: string;
  isAdmin: boolean;
  initial: Entry[];
  staffOptions?: StaffOption[];
  services?: ServiceOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  async function act(id: string, action: string) {
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
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  // 3.1 — toggle one service checkbox for an in-progress visit; persists
  // the full set immediately so a page refresh never loses a click.
  async function toggleService(e: Entry, serviceId: string) {
    const next = e.visitServiceIds.includes(serviceId)
      ? e.visitServiceIds.filter((s) => s !== serviceId)
      : [...e.visitServiceIds, serviceId];
    setBusyId(e.id);
    setError(null);
    try {
      const res = await fetch(`/api/queue/${e.id}/services`, {
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

  // 3.1 — admin pins a specific staff member to a waiting entry.
  async function assign(id: string, staffId: string) {
    if (!staffId) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/queue/${id}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Caktimi dështoi");
      else router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  const waiting = initial.filter((e) => e.status === "WAITING");
  const called = initial.filter((e) => e.status === "CALLED");
  const inService = initial.filter((e) => e.status === "IN_SERVICE");

  if (initial.length === 0) {
    return (
      <Card>
        <EmptyState text="Radha është bosh për momentin." />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert message={error} />}

      {inService.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Në shërbim</p>
          <div className="flex flex-col gap-2">
            {inService.map((e) => {
              const canManage = isAdmin || e.staff?.id === meId;
              const candidateIds = staffOptions.find((s) => s.id === e.staff?.id)?.serviceIds ?? [e.serviceId];
              const candidates = candidateIds
                .map((sid) => services.find((s) => s.id === sid))
                .filter((s): s is ServiceOption => Boolean(s));
              const checkedCount = e.visitServiceIds.length;

              return (
                <Row
                  key={e.id}
                  e={e}
                  busy={busyId === e.id}
                  below={
                    canManage &&
                    candidates.length > 0 && (
                      <div className="mt-3 rounded-xl bg-surface-muted p-3">
                        <p className="mb-2 text-xs font-medium text-ink-soft">Shërbimet e kryera</p>
                        <div className="flex flex-wrap gap-2">
                          {candidates.map((svc) => {
                            const checked = e.visitServiceIds.includes(svc.id);
                            return (
                              <label
                                key={svc.id}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                                  checked ? "border-accent bg-accent-soft" : "border-line-strong bg-surface hover:bg-surface-muted"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleService(e, svc.id)}
                                  disabled={busyId === e.id}
                                  className="h-4 w-4"
                                />
                                <span className="text-ink">{svc.name}</span>
                                <span className="text-xs text-ink-faint">{svc.price.toFixed(2)} €</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )
                  }
                >
                  {canManage && (
                    <button
                      onClick={() => act(e.id, "complete")}
                      disabled={busyId === e.id || checkedCount === 0}
                      title={checkedCount === 0 ? "Shëno të paktën një shërbim të kryer" : undefined}
                      className={`${buttonStyles.primary} px-3 py-1.5`}
                    >
                      ✔ Përfundo
                    </button>
                  )}
                </Row>
              );
            })}
          </div>
        </div>
      )}

      {called.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium text-ink-soft">Thirrur — duke pritur paraqitjen</p>
          <div className="flex flex-col gap-2">
            {called.map((e) => (
              <Row key={e.id} e={e} busy={busyId === e.id}>
                {(isAdmin || e.staff?.id === meId) && (
                  <>
                    <button
                      onClick={() => act(e.id, "start")}
                      disabled={busyId === e.id}
                      className={`${buttonStyles.primary} px-3 py-1.5`}
                    >
                      Fillo vizitën
                    </button>
                    <button
                      onClick={() => act(e.id, "no_show")}
                      disabled={busyId === e.id}
                      className={`${buttonStyles.danger} px-3 py-1.5`}
                    >
                      No-show
                    </button>
                  </>
                )}
              </Row>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-ink-soft">
          Në pritje ({waiting.length})
        </p>
        {waiting.length === 0 ? (
          <p className="text-sm text-ink-faint">Askush në pritje.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {waiting.map((e, i) => (
              <Row key={e.id} e={e} busy={busyId === e.id} position={i + 1}>
                {isAdmin && staffOptions.length > 0 && (
                  <select
                    value={e.staff?.id ?? ""}
                    disabled={busyId === e.id}
                    onChange={(ev) => assign(e.id, ev.target.value)}
                    aria-label="Cakto punonjësin"
                    className="rounded-lg border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink disabled:opacity-50"
                  >
                    <option value="">Auto</option>
                    {staffOptions
                      .filter((s) => s.serviceIds.includes(e.serviceId))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                )}
                <button
                  onClick={() => act(e.id, "call")}
                  disabled={busyId === e.id}
                  className={`${buttonStyles.primary} px-3 py-1.5`}
                >
                  Thirre
                </button>
              </Row>
            ))}
          </div>
        )}
      </div>

      {/* 3.1 — invoice shown right after completing a visit. */}
      {invoice &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(ev) => {
              if (ev.target === ev.currentTarget) setInvoice(null);
            }}
          >
            <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-[0_24px_60px_-20px_rgba(43,38,34,0.55)] ring-1 ring-line">
              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ok-soft text-ok">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <h2 className="mt-4 text-lg font-semibold text-ink">Vizita u përfundua</h2>
                <p className="mt-1 text-sm text-ink-soft">
                  {invoice.clientName} · {invoice.staffName}
                </p>
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

function Row({
  e,
  busy,
  position,
  children,
  below,
}: {
  e: Entry;
  busy: boolean;
  position?: number;
  children?: React.ReactNode;
  below?: React.ReactNode;
}) {
  const name = e.client?.name ?? e.clientName ?? "Klient pa emër";
  const startedLabel =
    e.status === "IN_SERVICE" && e.startedAt
      ? ` · filluar ${new Date(e.startedAt).toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit" })}`
      : "";
  return (
    <Card className={busy ? "opacity-60" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-ink">
              Nr. {e.queueNumber} · {name}
            </span>
            <Badge tone={QUEUE_STATUS_TONE[e.status]}>{QUEUE_STATUS_LABEL[e.status]}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-ink-soft">
            {e.service.name} ({e.service.durationMin} min)
            {position ? ` · pozicioni ${position}` : ""}
            {e.staff ? ` · sugjeruar: ${e.staff.name}` : ""}
            {e.status === "WAITING" ? ` · ~${e.estimatedWaitMin} min pritje` : ""}
            {startedLabel}
          </p>
        </div>
        <div className="flex gap-2">{children}</div>
      </div>
      {below}
    </Card>
  );
}
