// Human-facing labels for the real action codes `audit()` (src/lib/audit.ts)
// records across the app. Each entry maps one exact `action` string to a
// `labelKey`/`moduleKey` — translation keys under the AuditAction /
// AuditModule message namespaces, not literal text, so the audit log reads
// correctly in every supported language. Many different actions share the
// same generic verb (Created/Updated/Deleted/…), which is why this maps to
// a small reusable key set instead of one literal string per action.
// Unmapped actions (a new one added later without updating this file) fall
// back to a readable label derived from the code itself, module "other",
// tone neutral — the audit log never hides an event just because this file
// hasn't caught up with it yet.

export type AuditTone = "ok" | "info" | "danger" | "neutral";

export const AUDIT_TONE_STYLE: Record<AuditTone, { bg: string; text: string }> = {
  ok: { bg: "bg-ok-soft", text: "text-ok" },
  info: { bg: "bg-teal-soft", text: "text-teal" },
  danger: { bg: "bg-danger-soft", text: "text-danger" },
  neutral: { bg: "bg-surface-muted", text: "text-ink-soft" },
};

// Keys resolve against the AuditAction message namespace.
export type AuditActionMeta = { labelKey: string; moduleKey: string; tone: AuditTone; fallbackLabel?: string };

export const AUDIT_ACTION_META: Record<string, AuditActionMeta> = {
  // Terminet (bookings)
  BOOKING_CREATE: { labelKey: "created", moduleKey: "appointments", tone: "ok" },
  BOOKING_CANCEL: { labelKey: "cancelled", moduleKey: "appointments", tone: "danger" },
  BOOKING_CANCELLED: { labelKey: "cancelled", moduleKey: "appointments", tone: "danger" },
  BOOKING_RESCHEDULE: { labelKey: "rescheduled", moduleKey: "appointments", tone: "info" },
  BOOKING_ASSIGN: { labelKey: "staffAssigned", moduleKey: "appointments", tone: "info" },
  BOOKING_PAYMENT_STATUS_CHANGE: { labelKey: "paymentChanged", moduleKey: "appointments", tone: "info" },
  BOOKING_CONFIRMED: { labelKey: "reconfirmed", moduleKey: "appointments", tone: "info" },
  BOOKING_CHECKED_IN: { labelKey: "checkedIn", moduleKey: "appointments", tone: "ok" },
  BOOKING_IN_SERVICE: { labelKey: "serviceStarted", moduleKey: "appointments", tone: "info" },
  BOOKING_COMPLETED: { labelKey: "completed", moduleKey: "appointments", tone: "ok" },
  BOOKING_NO_SHOW: { labelKey: "noShow", moduleKey: "appointments", tone: "danger" },
  BOOKING_DELETE: { labelKey: "deleted", moduleKey: "appointments", tone: "danger" },

  // Radha (walk-in queue)
  QUEUE_CHECKIN: { labelKey: "checkedIn", moduleKey: "queue", tone: "ok" },
  QUEUE_ASSIGN: { labelKey: "staffAssigned", moduleKey: "queue", tone: "info" },
  QUEUE_LEAVE: { labelKey: "cancelled", moduleKey: "queue", tone: "danger" },
  QUEUE_CALLED: { labelKey: "called", moduleKey: "queue", tone: "info" },
  QUEUE_IN_SERVICE: { labelKey: "serviceStarted", moduleKey: "queue", tone: "info" },
  QUEUE_COMPLETED: { labelKey: "completed", moduleKey: "queue", tone: "ok" },
  QUEUE_NO_SHOW: { labelKey: "noShow", moduleKey: "queue", tone: "danger" },

  // Stafi (staff accounts, hours, skills, time off)
  STAFF_CREATE: { labelKey: "created", moduleKey: "staff", tone: "ok" },
  STAFF_UPDATE: { labelKey: "updated", moduleKey: "staff", tone: "info" },
  STAFF_DELETE: { labelKey: "deleted", moduleKey: "staff", tone: "danger" },
  STAFF_HOURS_SET: { labelKey: "hoursUpdated", moduleKey: "staff", tone: "info" },
  STAFF_SERVICES_SET: { labelKey: "servicesUpdated", moduleKey: "staff", tone: "info" },
  TIMEOFF_CREATE: { labelKey: "timeoffCreated", moduleKey: "staff", tone: "ok" },
  TIMEOFF_DELETE: { labelKey: "timeoffDeleted", moduleKey: "staff", tone: "danger" },

  // Klientët
  CLIENT_QUICK_CREATE: { labelKey: "created", moduleKey: "clients", tone: "ok" },

  // Shërbimet
  SERVICE_CREATE: { labelKey: "created", moduleKey: "services", tone: "ok" },
  SERVICE_UPDATE: { labelKey: "updated", moduleKey: "services", tone: "info" },
  SERVICE_DEACTIVATE: { labelKey: "deactivated", moduleKey: "services", tone: "danger" },
  SERVICE_DELETE: { labelKey: "deleted", moduleKey: "services", tone: "danger" },

  // Ofertat
  OFFER_CREATE: { labelKey: "created", moduleKey: "offers", tone: "ok" },
  OFFER_UPDATE: { labelKey: "updated", moduleKey: "offers", tone: "info" },
  OFFER_TOGGLE: { labelKey: "statusToggled", moduleKey: "offers", tone: "info" },
  OFFER_DELETE: { labelKey: "deleted", moduleKey: "offers", tone: "danger" },

  // Cilësimet
  BUSINESS_SETTINGS_UPDATE: { labelKey: "updated", moduleKey: "settings", tone: "info" },

  // Raportet
  REPORT_PDF_EXPORT: { labelKey: "exported", moduleKey: "reports", tone: "neutral" },
  APPOINTMENTS_PDF_EXPORT: { labelKey: "exported", moduleKey: "reports", tone: "neutral" },

  // Llogaria (auth / own account)
  REGISTER: { labelKey: "registered", moduleKey: "account", tone: "ok" },
  LOGIN: { labelKey: "login", moduleKey: "account", tone: "ok" },
  LOGOUT: { labelKey: "logout", moduleKey: "account", tone: "neutral" },
  PASSWORD_RESET_REQUEST: { labelKey: "passwordResetRequested", moduleKey: "account", tone: "neutral" },
  PASSWORD_RESET: { labelKey: "passwordReset", moduleKey: "account", tone: "info" },
  PASSWORD_CHANGE: { labelKey: "passwordChanged", moduleKey: "account", tone: "info" },
  PROFILE_UPDATE: { labelKey: "profileUpdated", moduleKey: "account", tone: "info" },
};

function titleCaseFromCode(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// `fallbackLabel` is only set for an action this file doesn't know about —
// there's no translation key for it, so the caller should render it as-is
// (derived straight from the code) rather than calling t(labelKey).
export function auditActionMeta(action: string): AuditActionMeta {
  return AUDIT_ACTION_META[action] ?? { labelKey: "", moduleKey: "other", tone: "neutral", fallbackLabel: titleCaseFromCode(action) };
}
