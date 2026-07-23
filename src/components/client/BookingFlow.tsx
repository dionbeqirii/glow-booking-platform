"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Alert, buttonStyles, inputStyles } from "../ui";

type Service = { id: string; name: string; durationMin: number; price: number };
type Staff = { id: string; name: string; serviceIds: string[] };
type Slot = { time: string; staff: { id: string; name: string }[] };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function BookingFlow({
  services,
  staff,
}: {
  services: Service[];
  staff: Staff[];
}) {
  const router = useRouter();

  const [serviceId, setServiceId] = useState<string>("");
  const [staffId, setStaffId] = useState<string>(""); // "" = no preference
  const [date, setDate] = useState<string>(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picked, setPicked] = useState<Slot | null>(null);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const qualifiedStaff = staff.filter((m) => m.serviceIds.includes(serviceId));

  // Reload slots whenever the choice changes.
  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }
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

  async function confirm() {
    if (!picked) return;
    // Honour the client's staff choice; otherwise take the first free one.
    const chosenStaff = staffId
      ? picked.staff.find((s) => s.id === staffId) ?? picked.staff[0]
      : picked.staff[0];

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, staffId: chosenStaff.id, startTime: picked.time }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Rezervimi dështoi");
        // The slot may have been taken; refresh the list.
        setPicked(null);
        return;
      }
      router.push("/client");
      router.refresh();
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-6">
        {/* Step 1 — service */}
        <div>
          <p className="mb-3 text-sm font-medium text-ink-soft">Hapi 1 — Zgjidh shërbimin</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setServiceId(s.id);
                  setStaffId("");
                }}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  serviceId === s.id
                    ? "border-accent bg-accent-soft"
                    : "border-line hover:bg-surface-muted"
                }`}
              >
                <span className="block font-medium text-ink">{s.name}</span>
                <span className="text-sm text-ink-soft">
                  {s.durationMin} min · {s.price.toFixed(2)} €
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — staff */}
        {service && (
          <div>
            <p className="mb-3 text-sm font-medium text-ink-soft">
              Hapi 2 — Zgjidh punonjësen (opsionale)
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip active={staffId === ""} onClick={() => setStaffId("")}>
                Pa preferencë
              </Chip>
              {qualifiedStaff.map((m) => (
                <Chip key={m.id} active={staffId === m.id} onClick={() => setStaffId(m.id)}>
                  {m.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Step 3 — date & time */}
        {service && (
          <div>
            <p className="mb-3 text-sm font-medium text-ink-soft">Hapi 3 — Zgjidh datën dhe orarin</p>
            <div className="max-w-xs">
              <Field label="Data">
                <input
                  type="date"
                  min={todayISO()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputStyles}
                />
              </Field>
            </div>

            <div className="mt-4">
              {loadingSlots ? (
                <p className="text-sm text-ink-faint">Duke ngarkuar oraret…</p>
              ) : slots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-6 text-center text-sm text-ink-faint">
                  Nuk ka orare të lira për këtë ditë. Provo një datë tjetër.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => {
                    const label = new Date(slot.time).toLocaleTimeString("sq", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    });
                    return (
                      <Chip
                        key={slot.time}
                        active={picked?.time === slot.time}
                        onClick={() => setPicked(slot)}
                      >
                        {label}
                      </Chip>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {error && <Alert message={error} />}

        {/* Confirm */}
        {picked && service && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-accent-soft px-4 py-3">
            <p className="text-sm text-ink">
              {service.name} ·{" "}
              {new Date(picked.time).toLocaleString("sq", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
              })}
            </p>
            <button onClick={confirm} disabled={busy} className={buttonStyles.primary}>
              {busy ? "Duke konfirmuar…" : "Konfirmo rezervimin"}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-white"
          : "bg-surface text-ink ring-1 ring-line-strong hover:bg-surface-muted"
      }`}
    >
      {children}
    </button>
  );
}
