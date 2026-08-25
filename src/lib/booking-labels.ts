import type { BookingStatus, PaymentStatus, QueueStatus } from "@prisma/client";

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  CONFIRMED: "E konfirmuar",
  CHECKED_IN: "Check-in",
  IN_SERVICE: "Në shërbim",
  COMPLETED: "Përfunduar",
  CANCELLED: "Anuluar",
  NO_SHOW: "Nuk u paraqit",
};

export const BOOKING_STATUS_TONE: Record<BookingStatus, "neutral" | "ok" | "warn"> = {
  CONFIRMED: "ok",
  CHECKED_IN: "ok",
  IN_SERVICE: "ok",
  COMPLETED: "neutral",
  CANCELLED: "warn",
  NO_SHOW: "warn",
};

// A richer, 6-way distinct tone for contexts that list every status side by
// side (e.g. the Terminet table/legend) where the 3-tone BOOKING_STATUS_TONE
// above would make CONFIRMED/CHECKED_IN/IN_SERVICE indistinguishable.
export const BOOKING_STATUS_PILL: Record<BookingStatus, { bg: string; text: string; dot: string }> = {
  CONFIRMED: { bg: "bg-ok-soft", text: "text-ok", dot: "bg-ok" },
  CHECKED_IN: { bg: "bg-teal-soft", text: "text-teal", dot: "bg-teal" },
  IN_SERVICE: { bg: "bg-gold-soft", text: "text-gold", dot: "bg-gold" },
  COMPLETED: { bg: "bg-purple-soft", text: "text-purple", dot: "bg-purple" },
  CANCELLED: { bg: "bg-danger-soft", text: "text-danger", dot: "bg-danger" },
  NO_SHOW: { bg: "bg-warn-soft", text: "text-warn", dot: "bg-warn" },
};

export const QUEUE_STATUS_LABEL: Record<QueueStatus, string> = {
  WAITING: "Në pritje",
  CALLED: "Thirrur",
  IN_SERVICE: "Në shërbim",
  COMPLETED: "Përfunduar",
  NO_SHOW: "Nuk u paraqit",
};

export const QUEUE_STATUS_TONE: Record<QueueStatus, "neutral" | "ok" | "warn"> = {
  WAITING: "neutral",
  CALLED: "ok",
  IN_SERVICE: "ok",
  COMPLETED: "neutral",
  NO_SHOW: "warn",
};

// Richer, per-status pill styling — mirrors BOOKING_STATUS_PILL's color
// language (teal/gold/purple/warn) so the two queues read consistently.
export const QUEUE_STATUS_PILL: Record<QueueStatus, { bg: string; text: string; dot: string }> = {
  WAITING: { bg: "bg-surface-muted", text: "text-ink-soft", dot: "bg-ink-faint" },
  CALLED: { bg: "bg-teal-soft", text: "text-teal", dot: "bg-teal" },
  IN_SERVICE: { bg: "bg-gold-soft", text: "text-gold", dot: "bg-gold" },
  COMPLETED: { bg: "bg-purple-soft", text: "text-purple", dot: "bg-purple" },
  NO_SHOW: { bg: "bg-warn-soft", text: "text-warn", dot: "bg-warn" },
};

// Shared wait-time severity coloring — used by both the main queue table
// and the compact "Live Queue" sidebar so a given wait reads the same tone
// everywhere it appears. Lives here (not queue-catalog.ts) because that
// module imports prisma and this function is also used from a "use client"
// component — pulling it in from a server-only module breaks the browser
// bundle (pg/dns has no client build).
export function waitTone(min: number): "text-ok" | "text-gold" | "text-danger" {
  if (min <= 15) return "text-ok";
  if (min <= 30) return "text-gold";
  return "text-danger";
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Papaguar",
  PAID: "Paguar",
  REFUNDED: "Rimbursuar",
};

export const PAYMENT_STATUS_PILL: Record<PaymentStatus, { bg: string; text: string; dot: string }> = {
  UNPAID: { bg: "bg-warn-soft", text: "text-warn", dot: "bg-warn" },
  PAID: { bg: "bg-ok-soft", text: "text-ok", dot: "bg-ok" },
  REFUNDED: { bg: "bg-purple-soft", text: "text-purple", dot: "bg-purple" },
};
