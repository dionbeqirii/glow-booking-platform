import type { BookingStatus, QueueStatus } from "@prisma/client";

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
