// Human-facing labels for the real action codes `audit()` (src/lib/audit.ts)
// records across the app. Each entry maps one exact `action` string to a
// short past-tense verb (for the colored pill), the module it belongs to
// (a friendlier grouping than the raw, coarser `entity` field — e.g. every
// staff-account action stores entity "User", same as login/password
// actions, so the module here is derived from the action code instead),
// and a tone. Unmapped actions (a new one added later without updating this
// file) fall back to a readable label derived from the code itself, module
// "Tjetër", tone neutral — the audit log never hides an event just because
// this file hasn't caught up with it yet.

export type AuditTone = "ok" | "info" | "danger" | "neutral";

export const AUDIT_TONE_STYLE: Record<AuditTone, { bg: string; text: string }> = {
  ok: { bg: "bg-ok-soft", text: "text-ok" },
  info: { bg: "bg-teal-soft", text: "text-teal" },
  danger: { bg: "bg-danger-soft", text: "text-danger" },
  neutral: { bg: "bg-surface-muted", text: "text-ink-soft" },
};

export type AuditActionMeta = { label: string; module: string; tone: AuditTone };

export const AUDIT_ACTION_META: Record<string, AuditActionMeta> = {
  // Terminet (bookings)
  BOOKING_CREATE: { label: "Krijuar", module: "Terminet", tone: "ok" },
  BOOKING_CANCEL: { label: "Anuluar", module: "Terminet", tone: "danger" },
  BOOKING_CANCELLED: { label: "Anuluar", module: "Terminet", tone: "danger" },
  BOOKING_RESCHEDULE: { label: "Riplanifikuar", module: "Terminet", tone: "info" },
  BOOKING_ASSIGN: { label: "Caktuar punonjësja", module: "Terminet", tone: "info" },
  BOOKING_PAYMENT_STATUS_CHANGE: { label: "Ndryshuar pagesa", module: "Terminet", tone: "info" },
  BOOKING_CONFIRMED: { label: "Rikthyer konfirmuar", module: "Terminet", tone: "info" },
  BOOKING_CHECKED_IN: { label: "Check-in", module: "Terminet", tone: "ok" },
  BOOKING_IN_SERVICE: { label: "Filluar shërbimi", module: "Terminet", tone: "info" },
  BOOKING_COMPLETED: { label: "Përfunduar", module: "Terminet", tone: "ok" },
  BOOKING_NO_SHOW: { label: "Nuk u paraqit", module: "Terminet", tone: "danger" },

  // Radha (walk-in queue)
  QUEUE_CHECKIN: { label: "Check-in", module: "Radha", tone: "ok" },
  QUEUE_ASSIGN: { label: "Caktuar punonjësja", module: "Radha", tone: "info" },
  QUEUE_LEAVE: { label: "Anuluar", module: "Radha", tone: "danger" },
  QUEUE_CALLED: { label: "Thirrur", module: "Radha", tone: "info" },
  QUEUE_IN_SERVICE: { label: "Filluar shërbimi", module: "Radha", tone: "info" },
  QUEUE_COMPLETED: { label: "Përfunduar", module: "Radha", tone: "ok" },
  QUEUE_NO_SHOW: { label: "Nuk u paraqit", module: "Radha", tone: "danger" },

  // Stafi (staff accounts, hours, skills, time off)
  STAFF_CREATE: { label: "Krijuar", module: "Stafi", tone: "ok" },
  STAFF_UPDATE: { label: "Përditësuar", module: "Stafi", tone: "info" },
  STAFF_DELETE: { label: "Fshirë", module: "Stafi", tone: "danger" },
  STAFF_HOURS_SET: { label: "Përditësuar orari", module: "Stafi", tone: "info" },
  STAFF_SERVICES_SET: { label: "Përditësuar shërbimet", module: "Stafi", tone: "info" },
  TIMEOFF_CREATE: { label: "Krijuar leje", module: "Stafi", tone: "ok" },
  TIMEOFF_DELETE: { label: "Fshirë leje", module: "Stafi", tone: "danger" },

  // Klientët
  CLIENT_QUICK_CREATE: { label: "Krijuar", module: "Klientët", tone: "ok" },

  // Shërbimet
  SERVICE_CREATE: { label: "Krijuar", module: "Shërbimet", tone: "ok" },
  SERVICE_UPDATE: { label: "Përditësuar", module: "Shërbimet", tone: "info" },
  SERVICE_DEACTIVATE: { label: "Çaktivizuar", module: "Shërbimet", tone: "danger" },
  SERVICE_DELETE: { label: "Fshirë", module: "Shërbimet", tone: "danger" },

  // Ofertat
  OFFER_CREATE: { label: "Krijuar", module: "Ofertat", tone: "ok" },
  OFFER_UPDATE: { label: "Përditësuar", module: "Ofertat", tone: "info" },
  OFFER_TOGGLE: { label: "Ndryshuar statusi", module: "Ofertat", tone: "info" },
  OFFER_DELETE: { label: "Fshirë", module: "Ofertat", tone: "danger" },

  // Cilësimet
  BUSINESS_SETTINGS_UPDATE: { label: "Përditësuar", module: "Cilësimet", tone: "info" },

  // Raportet
  REPORT_PDF_EXPORT: { label: "Eksportuar", module: "Raportet", tone: "neutral" },
  APPOINTMENTS_PDF_EXPORT: { label: "Eksportuar", module: "Raportet", tone: "neutral" },

  // Llogaria (auth / own account)
  REGISTER: { label: "Regjistruar", module: "Llogaria", tone: "ok" },
  LOGIN: { label: "Hyrje", module: "Llogaria", tone: "ok" },
  LOGOUT: { label: "Dalje", module: "Llogaria", tone: "neutral" },
  PASSWORD_RESET_REQUEST: { label: "Kërkuar rivendosje", module: "Llogaria", tone: "neutral" },
  PASSWORD_RESET: { label: "Rivendosur fjalëkalimi", module: "Llogaria", tone: "info" },
  PASSWORD_CHANGE: { label: "Ndryshuar fjalëkalimi", module: "Llogaria", tone: "info" },
  PROFILE_UPDATE: { label: "Përditësuar profili", module: "Llogaria", tone: "info" },
};

function titleCaseFromCode(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function auditActionMeta(action: string): AuditActionMeta {
  return AUDIT_ACTION_META[action] ?? { label: titleCaseFromCode(action), module: "Tjetër", tone: "neutral" };
}
