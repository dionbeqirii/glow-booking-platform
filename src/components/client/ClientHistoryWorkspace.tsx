"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_PILL, QUEUE_STATUS_LABEL, QUEUE_STATUS_PILL } from "@/lib/booking-labels";
import type { AppointmentRow } from "@/lib/client-appointments";
import type { QueueHistoryRow } from "@/lib/client-queue";
import { ReadOnlyStars, FeedbackForm, FeedbackDisplay } from "./BookingFeedback";

type Tab = "all" | "upcoming" | "finished" | "cancelled";

const UPCOMING_STATUSES: BookingStatus[] = ["CONFIRMED", "CHECKED_IN", "IN_SERVICE"];
const FINISHED_STATUSES: BookingStatus[] = ["COMPLETED", "NO_SHOW"];
const FEEDBACK_ELIGIBLE: BookingStatus[] = ["COMPLETED", "CANCELLED"];

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Të gjitha" },
  { key: "upcoming", label: "Të ardhshme" },
  { key: "finished", label: "Të përfunduara" },
  { key: "cancelled", label: "Të anuluara" },
];

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

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcCalendar() {
  return <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IcClock() {
  return <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
}
function IcUser() {
  return <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></svg>;
}
function IcChevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-90" : ""}`} aria-hidden>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function IcStarOutline() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden><path d="m12 2.5 3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 17.77l-6.18 3.25L7 14.15l-5-4.87 6.91-1L12 2.5Z" /></svg>;
}
function IcCheckCircle() {
  return <svg width="15" height="15" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></svg>;
}
function IcXCircle() {
  return <svg width="15" height="15" viewBox="0 0 24 24" {...stroke} aria-hidden><circle cx="12" cy="12" r="9" /><path d="m9.5 9.5 5 5m0-5-5 5" /></svg>;
}
function IcBag() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 8h12l1 13H5L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>;
}
function IcMessage() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}

function EmptyRow({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-8 text-center text-sm text-ink-faint">{text}</p>;
}

// Self-contained: owns its own expand/feedback state so it never resets when
// a sibling card or the tab/list above it re-renders.
function HistoryCard({ b }: { b: AppointmentRow }) {
  const [open, setOpen] = useState(false);
  const pill = BOOKING_STATUS_PILL[b.status];
  const feedbackEligible = FEEDBACK_ELIGIBLE.includes(b.status);

  return (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <div className="flex flex-wrap items-start gap-3">
        {b.serviceImageUrl ? (
          <img src={b.serviceImageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-line" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-semibold text-accent">
            {initials(b.serviceName)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{b.serviceName}</p>
          {b.serviceDescription && <p className="truncate text-xs text-ink-faint">{b.serviceDescription}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            <span className="flex items-center gap-1"><IcCalendar />{b.dateLabel}</span>
            <span className="flex items-center gap-1"><IcClock />{b.timeLabel} ({b.serviceDuration} min)</span>
            <span className="flex items-center gap-1"><IcUser />{b.staffName}{b.staffTitle ? ` · ${b.staffTitle}` : ""}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${pill.bg} ${pill.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
            {BOOKING_STATUS_LABEL[b.status]}
          </span>
          <div className="flex items-center gap-2.5">
            {feedbackEligible && b.feedback && <ReadOnlyStars value={b.feedback.rating} />}
            {feedbackEligible && !b.feedback && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
              >
                <IcStarOutline />
                Vlerëso
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-soft ring-1 ring-line-strong transition-colors hover:bg-surface-muted"
            >
              Shiko Detajet
              <IcChevron open={open} />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-3 border-t border-line pt-3">
          {feedbackEligible ? (
            b.feedback ? (
              <FeedbackDisplay rating={b.feedback.rating} comment={b.feedback.comment} bookingId={b.id} />
            ) : (
              <FeedbackForm bookingId={b.id} />
            )
          ) : (
            <p className="text-xs text-ink-faint">
              Ky termin është i konfirmuar. Për ta riplanifikuar ose anuluar, shko te{" "}
              <Link href="/client/terminet" className="font-medium text-accent hover:underline">
                Terminet e Mia
              </Link>
              .
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientHistoryWorkspace({ bookings, queueHistory }: { bookings: AppointmentRow[]; queueHistory: QueueHistoryRow[] }) {
  const [tab, setTab] = useState<Tab>("all");

  const upcoming = useMemo(
    () => bookings.filter((b) => UPCOMING_STATUSES.includes(b.status)).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [bookings]
  );
  const finished = useMemo(
    () => bookings.filter((b) => FINISHED_STATUSES.includes(b.status)).sort((a, b) => b.startTime.localeCompare(a.startTime)),
    [bookings]
  );
  const cancelled = useMemo(
    () => bookings.filter((b) => b.status === "CANCELLED").sort((a, b) => b.startTime.localeCompare(a.startTime)),
    [bookings]
  );

  const stats = [
    { label: "Total shërbime", value: bookings.length, icon: <IcBag />, tone: "text-accent bg-accent-soft" },
    { label: "Të përfunduara", value: finished.length, icon: <IcCheckCircle />, tone: "text-ok bg-ok-soft" },
    { label: "Të ardhshme", value: upcoming.length, icon: <IcCalendar />, tone: "text-purple bg-purple-soft" },
    { label: "Të anuluara", value: cancelled.length, icon: <IcXCircle />, tone: "text-danger bg-danger-soft" },
  ];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-4">
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                tab === key ? "border-accent text-accent" : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {(tab === "all" || tab === "upcoming") && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">{tab === "all" ? "Kalendari i afërt" : "Të ardhshme"}</p>
            {upcoming.length === 0 ? (
              <EmptyRow text="Ende s'ke termine të ardhshme." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {(tab === "all" ? upcoming.slice(0, 3) : upcoming).map((b) => <HistoryCard key={b.id} b={b} />)}
              </div>
            )}
            {tab === "all" && upcoming.length > 3 && (
              <button type="button" onClick={() => setTab("upcoming")} className="mt-2 text-xs font-semibold text-accent hover:underline">
                Shiko të gjitha ({upcoming.length}) →
              </button>
            )}
          </div>
        )}

        {(tab === "all" || tab === "finished") && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Të përfunduara</p>
            {finished.length === 0 ? (
              <EmptyRow text="Ende pa shërbime të përfunduara." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {finished.map((b) => <HistoryCard key={b.id} b={b} />)}
              </div>
            )}
          </div>
        )}

        {(tab === "all" || tab === "cancelled") && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Të anuluara</p>
            {cancelled.length === 0 ? (
              <EmptyRow text="Ende pa termine të anuluara." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {cancelled.map((b) => <HistoryCard key={b.id} b={b} />)}
              </div>
            )}
          </div>
        )}

        {tab === "all" && queueHistory.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Radha pa Termin (e Kaluar)</p>
            <div className="divide-y divide-line rounded-xl border border-line bg-surface px-3.5">
              {queueHistory.map((q) => {
                const pill = QUEUE_STATUS_PILL[q.status];
                return (
                  <div key={q.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{q.serviceName}</p>
                      <p className="truncate text-xs text-ink-faint">
                        {q.whenLabel}
                        {q.staffName ? ` · ${q.staffName}` : ""}
                      </p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${pill.bg} ${pill.text}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${pill.dot}`} />
                      {QUEUE_STATUS_LABEL[q.status]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:sticky lg:top-4">
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="mb-3 text-sm font-semibold text-ink">Përmbledhje e historikut</p>
          <div className="flex flex-col gap-3">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${s.tone}`}>{s.icon}</span>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-tight text-ink">{s.value}</p>
                  <p className="truncate text-xs text-ink-faint">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-surface-muted p-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
            <IcMessage />
            Ke pyetje?
          </div>
          <p className="mt-1 mb-2.5 text-xs text-ink-faint">Na kontakto në çdo moment.</p>
          <div className="rounded-lg bg-accent px-3 py-1.5 text-center text-xs font-semibold text-white">Na Kontaktoni</div>
        </div>
      </div>
    </div>
  );
}
