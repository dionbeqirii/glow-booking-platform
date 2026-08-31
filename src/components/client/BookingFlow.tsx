"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, Alert, buttonStyles, inputStyles } from "../ui";
import type { BookableOffer } from "@/lib/offers-catalog";

type Service = { id: string; name: string; durationMin: number; price: number; category: string | null };
type Staff = { id: string; name: string; serviceIds: string[] };
type Slot = { time: string; staff: { id: string; name: string }[] };

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcScissors() {
  return <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.5 8.5 19 19M8.5 15.5 19 5" /></svg>;
}
function IcDroplet() {
  return <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden><path d="M12 2.5s7 7.5 7 12.5a7 7 0 1 1-14 0c0-5 7-12.5 7-12.5Z" /></svg>;
}
function IcNailPolish() {
  return <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden><path d="M9 2h6l1 4-2 2v11a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V8L8 6l1-4Z" /></svg>;
}
function IcBrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden><path d="M3 15c2-5 6-7 9-7s7 2 9 7" /></svg>;
}
function IcLeafSpa() {
  return <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden><path d="M12 3a8 8 0 0 0-5 14.3V19h10v-1.7A8 8 0 0 0 12 3Z" /><path d="M9 21h6" /></svg>;
}
function IcFace() {
  return <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01M9 15c1 1 5 1 6 0" /></svg>;
}
function IcSparkle() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden><path d="m12 2 2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2L12 2Z" /></svg>;
}
function IcGift() {
  return <svg width="26" height="26" viewBox="0 0 24 24" {...stroke} aria-hidden><rect x="3" y="8" width="18" height="13" rx="1" /><path d="M3 12h18M12 8v13" /><path d="M12 8C9 8 8 6.5 8 5a2.5 2.5 0 0 1 4-2c1 1 1.5 3 0 5ZM12 8c3 0 4-1.5 4-3a2.5 2.5 0 0 0-4-2c-1 1-1.5 3 0 5Z" /></svg>;
}
function IcCheck() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ok" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>;
}
function IcClock() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-faint" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
function IcLock() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-faint" aria-hidden><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}
function IcInfo() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-accent" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
}
function IcChevron() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-faint" aria-hidden><path d="m9 18 6-6-6-6" /></svg>;
}

const CATEGORY_ICON: Record<string, () => React.ReactElement> = {
  "Flokë": IcScissors,
  "Trajtime Lëkure": IcDroplet,
  "Thonj": IcNailPolish,
  "Vetulla": IcBrow,
  "Terapi": IcLeafSpa,
  "Fytyrë": IcFace,
};
function ServiceIcon({ category }: { category: string | null }) {
  const Icon = (category && CATEGORY_ICON[category]) || IcSparkle;
  return <Icon />;
}

export default function BookingFlow({
  services,
  staff,
  offers,
  initialServiceId,
  initialOfferId,
}: {
  services: Service[];
  staff: Staff[];
  offers: BookableOffer[];
  initialServiceId?: string;
  initialOfferId?: string;
}) {
  const router = useRouter();

  const initialOffer = offers.find((o) => o.id === initialOfferId);
  const [serviceId, setServiceId] = useState<string>(initialOffer?.bookingServiceId ?? initialServiceId ?? "");
  const [offerId, setOfferId] = useState<string>(initialOffer?.id ?? "");
  const [staffId, setStaffId] = useState<string>(""); // "" = no preference
  const [date, setDate] = useState<string>(todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [picked, setPicked] = useState<Slot | null>(null);

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);
  const [joinedWaitlist, setJoinedWaitlist] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const selectedOffer = offers.find((o) => o.id === offerId);
  const displayName = selectedOffer?.title ?? service?.name;
  const displayPrice = selectedOffer?.price ?? service?.price;
  const qualifiedStaff = staff.filter((m) => m.serviceIds.includes(serviceId));
  const chosenStaffName = staffId ? qualifiedStaff.find((m) => m.id === staffId)?.name : null;
  const offerSavingsPct = selectedOffer && selectedOffer.realValue > selectedOffer.price
    ? Math.round((1 - selectedOffer.price / selectedOffer.realValue) * 100)
    : null;

  useEffect(() => {
    if (!serviceId || !date) return;
    let cancelled = false;
    setLoadingSlots(true);

    const q = new URLSearchParams({ serviceId, date });
    if (staffId) q.set("staffId", staffId);

    fetch(`/api/availability?${q.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        else {
          setError(null);
          setSlots(data.slots ?? []);
        }
      })
      .catch(() => !cancelled && setError("Nuk u ngarkuan dot oraret"))
      .finally(() => !cancelled && setLoadingSlots(false));

    return () => {
      cancelled = true;
    };
  }, [serviceId, staffId, date]);

  async function joinWaitlist() {
    if (!serviceId) return;
    setJoiningWaitlist(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, staffId: staffId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bashkimi në listën e pritjes dështoi");
        return;
      }
      setJoinedWaitlist(true);
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setJoiningWaitlist(false);
    }
  }

  async function confirm() {
    if (!picked) return;
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
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        <div className="flex flex-col gap-5">
          {/* Step 1 — service / offer */}
          <div>
            <p className="mb-3 text-sm font-medium text-ink-soft">Hapi 1 — Zgjidh Shërbimin</p>

            {offers.length > 0 && (
              <div className="mb-3 flex flex-col gap-2.5">
                {offers.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setServiceId(o.bookingServiceId);
                      setOfferId(o.id);
                      setStaffId("");
                      setPicked(null);
                      setError(null);
                      setJoinedWaitlist(false);
                    }}
                    className={`relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
                      offerId === o.id ? "border-accent bg-accent-soft/40" : "border-accent/30 bg-accent-soft/10 hover:bg-accent-soft/25"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Ofertë
                      </span>
                      <p className="mt-1.5 font-semibold text-ink">{o.title}</p>
                      <p className="text-xs text-ink-faint">{o.serviceNames.join(" + ")}</p>
                      <p className="mt-1 text-lg font-bold text-accent">{o.price.toFixed(2)} €</p>
                    </div>
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface text-accent ring-1 ring-line">
                      <IcGift />
                    </span>
                    {o.realValue > o.price && (
                      <span className="absolute -bottom-2 right-4 rounded-full bg-ok px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_4px_10px_-2px_rgba(0,0,0,0.25)]">
                        Kurse {Math.round((1 - o.price / o.realValue) * 100)}%
                      </span>
                    )}
                  </button>
                ))}
                {selectedOffer && (
                  <div className="flex items-start gap-2 rounded-lg bg-accent-soft/50 px-3 py-2.5 text-xs text-ink-soft">
                    <IcInfo />
                    Kjo ofertë përfshin {selectedOffer.serviceNames.length} shërbim{selectedOffer.serviceNames.length === 1 ? "" : "e"}. Rezervimi do të bëhet për {service?.name}.
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setServiceId(s.id);
                    setOfferId("");
                    setStaffId("");
                    setPicked(null);
                    setError(null);
                    setJoinedWaitlist(false);
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    serviceId === s.id && !offerId ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-muted"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ok-soft text-ok">
                    <ServiceIcon category={s.category} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-ink">{s.name}</p>
                    <p className="text-xs text-ink-faint">{s.durationMin} min • {s.price.toFixed(2)} €</p>
                  </div>
                  <IcChevron />
                </button>
              ))}
            </div>

            {!service && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-surface-muted px-3 py-2.5 text-xs text-ink-soft">
                <IcInfo />
                Pas zgjedhjes së shërbimit, do të mund të zgjidhni datën dhe orarin.
              </div>
            )}
          </div>

          {/* Step 2 — staff */}
          {service && (
            <div>
              <p className="mb-3 text-sm font-medium text-ink-soft">
                Hapi 2 — Zgjidh punonjësen (opsionale)
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip active={staffId === ""} onClick={() => { setStaffId(""); setPicked(null); setError(null); setJoinedWaitlist(false); }}>
                  Pa preferencë
                </Chip>
                {qualifiedStaff.map((m) => (
                  <Chip key={m.id} active={staffId === m.id} onClick={() => { setStaffId(m.id); setPicked(null); setError(null); setJoinedWaitlist(false); }}>
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
                    onChange={(e) => { setDate(e.target.value); setPicked(null); setError(null); setJoinedWaitlist(false); }}
                    className={inputStyles}
                  />
                </Field>
              </div>

              <div className="mt-4">
                {loadingSlots ? (
                  <p className="text-sm text-ink-faint">Duke ngarkuar oraret…</p>
                ) : slots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-6 text-center">
                    <p className="text-sm text-ink-faint">Nuk ka orare të lira për këtë ditë. Provo një datë tjetër.</p>
                    {joinedWaitlist ? (
                      <p className="mt-3 text-sm font-medium text-ok">
                        ✔ U regjistrove në listën e pritjes — do të njoftohesh nëse lirohet një vend.
                      </p>
                    ) : (
                      <button
                        onClick={joinWaitlist}
                        disabled={joiningWaitlist}
                        className={`mt-3 ${buttonStyles.secondary}`}
                      >
                        {joiningWaitlist ? "Duke u regjistruar…" : "Bashkohu në listën e pritjes"}
                      </button>
                    )}
                  </div>
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
                {displayName}
                {selectedOffer && <span className="font-semibold text-accent"> · {displayPrice?.toFixed(2)} €</span>} ·{" "}
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

      <div className="lg:sticky lg:top-4">
        <Card>
          <p className="mb-3 text-sm font-semibold text-ink">Përmbledhja e Zgjedhjes</p>
          {!service ? (
            <p className="py-4 text-center text-xs text-ink-faint">Zgjidh një shërbim për të parë përmbledhjen.</p>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl bg-accent-soft/50 p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface text-accent ring-1 ring-line">
                  {selectedOffer ? <IcGift /> : <ServiceIcon category={service.category} />}
                </span>
                <div className="min-w-0 flex-1">
                  {selectedOffer && (
                    <span className="inline-block rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      Ofertë
                    </span>
                  )}
                  <p className="text-sm font-semibold leading-snug text-ink">{displayName}</p>
                  <p className="text-base font-bold text-accent">{displayPrice?.toFixed(2)} €</p>
                </div>
              </div>

              <ul className="mt-3 flex flex-col gap-2 text-xs text-ink-soft">
                {selectedOffer && (
                  <li className="flex items-start gap-1.5">
                    <IcCheck />
                    {selectedOffer.serviceNames.length} shërbim{selectedOffer.serviceNames.length === 1 ? "" : "e"} të përfshira
                  </li>
                )}
                {selectedOffer && offerSavingsPct !== null && (
                  <li className="flex items-start gap-1.5">
                    <IcCheck />
                    Kurse {offerSavingsPct}% nga çmimi origjinal
                  </li>
                )}
                {selectedOffer && (
                  <li className="flex items-start gap-1.5">
                    <IcCheck />
                    {selectedOffer.validUntilLabel ? `Oferta e vlefshme deri më ${selectedOffer.validUntilLabel}` : "Oferta pa afat kohor"}
                  </li>
                )}
                {chosenStaffName && (
                  <li className="flex items-start gap-1.5">
                    <IcCheck />
                    Punonjësja: {chosenStaffName}
                  </li>
                )}
                {picked && (
                  <li className="flex items-start gap-1.5">
                    <IcCheck />
                    {new Date(picked.time).toLocaleString("sq", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false })}
                  </li>
                )}
              </ul>

              <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
                <IcClock />
                <div>
                  <p className="text-[11px] text-ink-faint">Kohëzgjatja Totale</p>
                  <p className="text-sm font-semibold text-ink">{service.durationMin} min</p>
                </div>
              </div>
            </>
          )}
          <div className="mt-3 flex items-center gap-1.5 border-t border-line pt-3 text-[11px] text-ink-faint">
            <IcLock />
            Të dhënat tuaja janë të sigurta.
          </div>
        </Card>
      </div>
    </div>
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
