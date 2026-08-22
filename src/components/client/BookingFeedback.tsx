"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Badge, buttonStyles } from "../ui";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE } from "@/lib/booking-labels";
import type { BookingStatus } from "@prisma/client";

export type FeedbackBookingRow = {
  id: string;
  when: string; // preformatted server-side
  status: BookingStatus;
  serviceName: string;
  staffName: string;
  feedback: { rating: number; comment: string | null } | null;
};

const ELIGIBLE: BookingStatus[] = ["COMPLETED", "CANCELLED"];

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 2.5 3.09 6.26 6.91 1-5 4.87 1.18 6.87L12 17.77l-6.18 3.25L7 14.15l-5-4.87 6.91-1L12 2.5Z" />
    </svg>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1 text-gold">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} yje`}
          className="transition-transform hover:scale-110"
        >
          <Star filled={n <= value} />
        </button>
      ))}
    </div>
  );
}

function ReadOnlyStars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5 text-gold" aria-label={`${value} nga 5 yje`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= value} />
      ))}
    </div>
  );
}

function FeedbackForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Zgjidh një vlerësim");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Dërgimi dështoi");
        return;
      }
      router.refresh();
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2.5 rounded-xl bg-surface-muted p-3">
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Si ishte përvoja jote? (opsionale — përdore edhe për ankesa)"
        rows={2}
        maxLength={1000}
        className="w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/15"
      />
      {error && <Alert message={error} />}
      <button type="submit" disabled={busy} className={`self-start ${buttonStyles.primary}`}>
        {busy ? "Duke dërguar…" : "Dërgo feedback"}
      </button>
    </form>
  );
}

function FeedbackDisplay({ rating, comment, bookingId }: { rating: number; comment: string | null; bookingId: string }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <FeedbackForm bookingId={bookingId} />;
  return (
    <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-surface-muted p-3">
      <div>
        <ReadOnlyStars value={rating} />
        {comment && <p className="mt-1.5 text-sm text-ink-soft">{comment}</p>}
      </div>
      <button type="button" onClick={() => setEditing(true)} className="shrink-0 text-xs font-medium text-accent hover:underline">
        Ndrysho
      </button>
    </div>
  );
}

export default function BookingFeedbackList({ bookings }: { bookings: FeedbackBookingRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <ul className="divide-y divide-line">
      {bookings.map((b) => {
        const eligible = ELIGIBLE.includes(b.status);
        return (
          <li key={b.id} className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">{b.serviceName}</p>
                <p className="text-xs text-ink-faint">
                  {b.when} · {b.staffName}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                {eligible && !b.feedback && openId !== b.id && (
                  <button
                    type="button"
                    onClick={() => setOpenId(b.id)}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Lër feedback
                  </button>
                )}
              </div>
            </div>

            {eligible && b.feedback && (
              <FeedbackDisplay rating={b.feedback.rating} comment={b.feedback.comment} bookingId={b.id} />
            )}
            {eligible && !b.feedback && openId === b.id && <FeedbackForm bookingId={b.id} />}
          </li>
        );
      })}
    </ul>
  );
}
