"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QUEUE_STATUS_LABEL, QUEUE_STATUS_PILL } from "@/lib/booking-labels";
import { buttonStyles } from "@/components/ui";
import type { ClientQueueView } from "@/lib/client-queue";

type Service = { id: string; name: string; durationMin: number };

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcUsers() {
  return <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function IcClock() {
  return <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
function IcWalk() {
  return <svg width="20" height="20" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="13" cy="4" r="2" /><path d="m8 21 2-6 2 1 2 5M6 12l2-4 3 1 2-1 3 3M9 8l-2 1" /></svg>;
}
function IcBell() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ok" aria-hidden><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
}
function IcPhone() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" /></svg>;
}
function IcCalendar() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function LeafDecoration() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ok/40" aria-hidden>
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
      <path d="M9 21h6M12 17v4" />
      <path d="M9 8c1.5-1 3-1 4.5 0" />
    </svg>
  );
}

function QueueProgressRing({ fraction, position }: { fraction: number; position: number }) {
  const size = 96;
  const strokeW = 12;
  const r = (size - strokeW) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));
  const dash = clamped * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-surface-muted" strokeWidth={strokeW} />
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-purple"
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
        />
      </g>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-ink" style={{ fontSize: 20, fontWeight: 700 }}>
        #{position}
      </text>
    </svg>
  );
}

export default function ClientQueueWorkspace({ services, view }: { services: Service[]; view: ClientQueueView }) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { myEntry, liveQueue } = view;

  // Live refresh while an active entry exists — mirrors the polling the
  // previous queue view already relied on, just re-fetching through the
  // server component instead of a bespoke client-side reshape.
  useEffect(() => {
    if (!myEntry) return;
    const id = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(id);
  }, [myEntry, router]);

  async function checkin() {
    if (!serviceId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Check-in dështoi");
        return;
      }
      router.refresh();
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!myEntry) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/queue/${myEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "leave" }),
      });
      if (res.ok) router.refresh();
      else {
        const data = await res.json();
        setError(data.error ?? "Largimi dështoi");
      }
    } finally {
      setBusy(false);
    }
  }

  const totalWaiting = liveQueue.filter((r) => r.status === "WAITING").length;
  const progressFraction = myEntry ? 1 - myEntry.peopleAhead / Math.max(1, totalWaiting) : 0;

  const LiveQueueTable = (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">Radha Live</p>
          <p className="text-xs text-ink-faint">Klientë duke pritur për shërbim pa termin.</p>
        </div>
        {myEntry && myEntry.status === "WAITING" && (
          <button type="button" onClick={leave} disabled={busy} className={`${buttonStyles.secondary} px-3 py-1.5 text-xs`}>
            Largohu nga Radha
          </button>
        )}
      </div>
      {liveQueue.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-sm text-ink-faint">
          Radha është bosh për momentin.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="py-1.5 pr-2 font-medium">#</th>
                <th className="py-1.5 pr-2 font-medium">Klienti</th>
                <th className="py-1.5 pr-2 font-medium">Shërbimi</th>
                <th className="py-1.5 pr-2 font-medium">Pritja</th>
                <th className="py-1.5 pr-2 font-medium">Statusi</th>
              </tr>
            </thead>
            <tbody>
              {liveQueue.map((r) => {
                const pill = QUEUE_STATUS_PILL[r.status];
                return (
                  <tr key={r.id} className={`border-b border-line last:border-0 ${r.isMe ? "bg-purple-soft/40" : ""}`}>
                    <td className="py-2 pr-2 text-ink-faint">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${r.isMe ? "bg-purple text-white" : "bg-surface-muted text-ink-soft"}`}>
                        {r.position}
                      </span>
                    </td>
                    <td className={`py-2 pr-2 font-medium ${r.isMe ? "text-purple" : "text-ink"}`}>{r.label}</td>
                    <td className="py-2 pr-2 text-ink-soft">{r.serviceName ?? "—"}</td>
                    <td className="py-2 pr-2 text-ink-soft">{r.status === "IN_SERVICE" ? "—" : `~ ${r.waitMin} min`}</td>
                    <td className="py-2 pr-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill.bg} ${pill.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                        {QUEUE_STATUS_LABEL[r.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const QueueTips = (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <p className="mb-2.5 text-sm font-semibold text-ink">Këshilla për Radhën</p>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><IcClock /></span>
          <div>
            <p className="text-xs font-semibold text-ink">Arrij në Kohë</p>
            <p className="text-xs text-ink-faint">Qëndro pranë studios që të mos e humbasësh radhën tënde.</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ok-soft text-ok"><IcPhone /></span>
          <div>
            <p className="text-xs font-semibold text-ink">Mbaje Telefonin Pranë</p>
            <p className="text-xs text-ink-faint">Do të njoftohesh kur të vijë radha jote.</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-soft text-purple"><IcUsers /></span>
          <div>
            <p className="text-xs font-semibold text-ink">E Drejtë, Sipas Radhës</p>
            <p className="text-xs text-ink-faint">Klientët shërbehen sipas rendit të mbërritjes.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const BookBanner = (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-soft to-accent-soft p-3.5">
      <p className="text-sm font-bold text-ink">Do të Anashkalosh Pritjen?</p>
      <p className="mt-1 max-w-[75%] text-xs text-ink-soft">Rezervo termin online dhe zgjidh orarin që të përshtatet.</p>
      <Link href="/client/rezervo" className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-purple px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:brightness-95">
        <IcCalendar />
        Rezervo Termin
      </Link>
      <div className="absolute -bottom-2 -right-2 opacity-70">
        <LeafDecoration />
      </div>
    </div>
  );

  // ---------- Called / in service: real status takes over ----------
  if (myEntry && myEntry.status !== "WAITING") {
    return (
      <div className="flex flex-col gap-3">
        {error && <div className="rounded-lg bg-danger-soft px-3.5 py-2 text-sm text-danger">{error}</div>}
        {myEntry.status === "CALLED" ? (
          <div className="rounded-xl bg-ok-soft p-4 text-center">
            <p className="text-sm font-semibold text-ok">
              Radha jote erdhi{myEntry.staffName ? ` te ${myEntry.staffName}` : ""}! Paraqitu te studioja.
            </p>
            <p className="mt-1 text-xs text-ink-soft">{myEntry.serviceName} · {myEntry.serviceDurationMin} min</p>
          </div>
        ) : (
          <div className="rounded-xl bg-accent-soft p-4 text-center">
            <p className="text-sm font-semibold text-accent">Je duke u shërbyer. Faleminderit për durimin!</p>
            <p className="mt-1 text-xs text-ink-soft">{myEntry.serviceName} · {myEntry.serviceDurationMin} min</p>
          </div>
        )}
        <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
          {LiveQueueTable}
          <div className="flex flex-col gap-3">
            {QueueTips}
            {BookBanner}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="rounded-lg bg-danger-soft px-3.5 py-2 text-sm text-danger">{error}</div>}

      {myEntry ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-soft text-purple"><IcUsers /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Numri Yt në Radhë</p>
              <p className="text-xl font-bold leading-tight text-ink">#{myEntry.position}</p>
              <p className="text-xs text-ink-faint">Je në radhë</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><IcClock /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Koha e Pritjes</p>
              <p className="text-xl font-bold leading-tight text-ink">~ {myEntry.estimatedWaitMin} min</p>
              <p className="text-xs text-ink-faint">E përafërt</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold"><IcClock /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">U Bashkove Në</p>
              <p className="text-xl font-bold leading-tight text-ink">{myEntry.joinedAtLabel}</p>
              <p className="text-xs text-ink-faint">Sot</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ok-soft text-ok"><IcWalk /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Njerëz Përpara Teje</p>
              <p className="text-xl font-bold leading-tight text-ink">{myEntry.peopleAhead}</p>
              <p className="text-xs text-ink-faint">Në pritje</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface p-3.5">
          <p className="text-sm font-semibold text-ink">Bëj Check-in</p>
          <p className="mb-3 text-xs text-ink-faint">Erdhe pa termin? Zgjidh shërbimin dhe futu në radhë.</p>
          {services.length === 0 ? (
            <p className="text-xs text-ink-faint">Studioja nuk ka ende shërbime të disponueshme.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceId(s.id)}
                    className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                      serviceId === s.id ? "border-accent bg-accent-soft" : "border-line hover:bg-surface-muted"
                    }`}
                  >
                    <span className="block font-medium text-ink">{s.name}</span>
                    <span className="text-xs text-ink-faint">{s.durationMin} min</span>
                  </button>
                ))}
              </div>
              <div>
                <button type="button" onClick={checkin} disabled={!serviceId || busy} className={buttonStyles.primary}>
                  {busy ? "Duke u regjistruar…" : "Fut Check-in"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-3">
          {LiveQueueTable}
          {myEntry && myEntry.status === "WAITING" && (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ok-soft"><IcBell /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Do të Njoftohesh</p>
                <p className="text-xs text-ink-faint">Do të marrësh një njoftim kur të vijë radha jote.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {myEntry && myEntry.status === "WAITING" && (
            <div className="rounded-xl border border-line bg-surface p-3.5">
              <p className="mb-2.5 text-sm font-semibold text-ink">Statusi i Radhës</p>
              <div className="flex items-center gap-3">
                <QueueProgressRing fraction={progressFraction} position={myEntry.position} />
                <div className="min-w-0">
                  <p className="text-xs text-ink-faint">{myEntry.peopleAhead} klientë përpara teje</p>
                  <p className="text-xs text-ink-faint">Pritje e përllogaritur ~{myEntry.estimatedWaitMin} min</p>
                </div>
              </div>
            </div>
          )}
          {QueueTips}
          {BookBanner}
        </div>
      </div>
    </div>
  );
}
