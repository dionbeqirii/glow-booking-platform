"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Field, Alert, buttonStyles, inputStyles } from "@/components/ui";

type ClientOption = { id: string; name: string; phone: string | null };
type ServiceOption = { id: string; name: string; durationMin: number; price: number };
type StaffOption = { id: string; name: string; serviceIds: string[] };
type Slot = { time: string; staff: { id: string; name: string }[] };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Admin-only "create appointment" modal — books an existing client (not a
// walk-in; that flow stays on /admin/radha) directly onto the schedule.
// Reuses the same POST /api/bookings + GET /api/availability the client-side
// BookingFlow uses, so conflict checking and the exclusion constraint apply
// identically — this never bypasses real slot validation.
export default function NewAppointmentButton({
  clients,
  services,
  staff,
  defaultDate,
}: {
  clients: ClientOption[];
  services: ServiceOption[];
  staff: StaffOption[];
  defaultDate?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        Termin i Ri
      </button>
      {open && (
        <NewAppointmentModal
          clients={clients}
          services={services}
          staff={staff}
          defaultDate={defaultDate}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function NewAppointmentModal({
  clients,
  services,
  staff,
  defaultDate,
  onClose,
}: {
  clients: ClientOption[];
  services: ServiceOption[];
  staff: StaffOption[];
  defaultDate?: string;
  onClose: () => void;
}) {
  const router = useRouter();

  const [clientMode, setClientMode] = useState<"existing" | "new">("existing");
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(null);
  const [clientListOpen, setClientListOpen] = useState(false);

  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState(""); // "" = no preference
  const [date, setDate] = useState(defaultDate && defaultDate >= todayISO() ? defaultDate : todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picked, setPicked] = useState<Slot | null>(null);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const qualifiedStaff = staff.filter((m) => m.serviceIds.includes(serviceId));

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    const pool = !q
      ? clients
      : clients.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").toLowerCase().includes(q));
    return pool.slice(0, 8);
  }, [clientQuery, clients]);

  useEffect(() => {
    // Slots are only ever rendered while `serviceId` is set (see JSX below),
    // so there is nothing to clear here when it isn't — just skip the fetch.
    if (!serviceId || !date) return;
    let cancelled = false;
    setLoadingSlots(true);
    setPicked(null);
    setError(null);

    const q = new URLSearchParams({ serviceId, date });
    if (staffId) q.set("staffId", staffId);

    fetch(`/api/availability?${q.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setSlots(data.slots ?? []);
      })
      .catch(() => !cancelled && setError("Nuk u ngarkuan dot oraret"))
      .finally(() => !cancelled && setLoadingSlots(false));

    return () => {
      cancelled = true;
    };
  }, [serviceId, staffId, date]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!picked || !service) return;
    if (clientMode === "existing" && !selectedClient) return;
    if (clientMode === "new" && !(newFirstName.trim() && newLastName.trim() && newPhone.trim())) return;

    const chosenStaff = staffId
      ? picked.staff.find((s) => s.id === staffId) ?? picked.staff[0]
      : picked.staff[0];

    setBusy(true);
    setError(null);
    try {
      let clientId = selectedClient?.id;

      if (clientMode === "new") {
        const res = await fetch("/api/admin/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: newFirstName,
            lastName: newLastName,
            phone: newPhone,
            email: newEmail || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Regjistrimi i klientit dështoi");
          return;
        }
        clientId = data.client.id;
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          serviceId,
          staffId: chosenStaff.id,
          startTime: picked.time,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Krijimi i terminit dështoi");
        setPicked(null);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setBusy(false);
    }
  }

  const clientReady = clientMode === "existing" ? !!selectedClient : !!(newFirstName.trim() && newLastName.trim() && newPhone.trim());
  const canSubmit = !!(clientReady && picked && service && !busy);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-[0_24px_64px_-24px_rgba(31,42,34,0.35)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Termin i Ri</h2>
          <button
            onClick={onClose}
            aria-label="Mbyll"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Klienti</span>
              <div className="inline-flex rounded-lg bg-surface-muted p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setClientMode("existing")}
                  className={`rounded-md px-2.5 py-1 transition-colors ${clientMode === "existing" ? "bg-surface text-ink shadow-sm" : "text-ink-faint hover:text-ink"}`}
                >
                  Klient ekzistues
                </button>
                <button
                  type="button"
                  onClick={() => setClientMode("new")}
                  className={`rounded-md px-2.5 py-1 transition-colors ${clientMode === "new" ? "bg-surface text-ink shadow-sm" : "text-ink-faint hover:text-ink"}`}
                >
                  Klient i ri
                </button>
              </div>
            </div>

            {clientMode === "existing" ? (
              <div className="relative">
                <input
                  value={selectedClient ? selectedClient.name : clientQuery}
                  onChange={(e) => {
                    setSelectedClient(null);
                    setClientQuery(e.target.value);
                    setClientListOpen(true);
                  }}
                  onFocus={() => setClientListOpen(true)}
                  onBlur={() => setTimeout(() => setClientListOpen(false), 150)}
                  placeholder="Kërko sipas emrit ose telefonit…"
                  className={inputStyles}
                />
                {clientListOpen && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-52 overflow-y-auto rounded-xl border border-line-strong bg-surface py-1 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]">
                    {filteredClients.length === 0 ? (
                      <p className="px-3.5 py-2.5 text-sm text-ink-faint">Asnjë klient nuk u gjet.</p>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setSelectedClient(c);
                            setClientQuery("");
                            setClientListOpen(false);
                          }}
                          className="flex w-full flex-col px-3.5 py-2 text-left transition-colors hover:bg-surface-muted"
                        >
                          <span className="text-sm font-medium text-ink">{c.name}</span>
                          <span className="text-xs text-ink-faint">{c.phone ?? "—"}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-line-strong p-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Emri">
                    <input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} placeholder="Elira" className={inputStyles} />
                  </Field>
                  <Field label="Mbiemri">
                    <input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} placeholder="Krasniqi" className={inputStyles} />
                  </Field>
                </div>
                <Field label="Telefoni">
                  <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+383 44 123 456" className={inputStyles} />
                </Field>
                <Field label="Email (opsionale)">
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="elira@shembull.com" className={inputStyles} />
                </Field>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shërbimi">
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setStaffId("");
                }}
                className={inputStyles}
              >
                <option value="">Zgjidh shërbimin</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {s.durationMin} min</option>
                ))}
              </select>
            </Field>

            <Field label="Stafi">
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                disabled={!serviceId}
                className={inputStyles}
              >
                <option value="">Pa preferencë</option>
                {qualifiedStaff.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Data">
            <input
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={!serviceId}
              className={inputStyles}
            />
          </Field>

          {serviceId && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Ora</p>
              {loadingSlots ? (
                <p className="text-sm text-ink-faint">Duke ngarkuar oraret…</p>
              ) : slots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-5 text-center text-sm text-ink-faint">
                  Nuk ka orare të lira për këtë ditë. Provo një datë tjetër.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => {
                    const label = new Date(slot.time).toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false });
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => setPicked(slot)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                          picked?.time === slot.time ? "bg-accent text-white" : "bg-surface text-ink ring-1 ring-line-strong hover:bg-surface-muted"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {error && <Alert message={error} />}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button onClick={onClose} className={buttonStyles.secondary}>Anulo</button>
          <button onClick={submit} disabled={!canSubmit} className={buttonStyles.primary}>
            {busy ? "Duke krijuar…" : "Krijo Terminin"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
