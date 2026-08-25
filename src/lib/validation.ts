import { z } from "zod";

// Optional trimmed text: treats "" as undefined. Declared first so every
// schema below can use it.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

// Server-side validation of all inputs (FR-17).
export const registerSchema = z.object({
  name: z.string().trim().min(2, "Emri duhet të ketë të paktën 2 shkronja").max(100),
  email: z.string().trim().toLowerCase().email("Email i pavlefshëm"),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  password: z.string().min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email i pavlefshëm"),
  password: z.string().min(1, "Fjalëkalimi është i detyrueshëm").max(200),
  // "Më mba mend": persist the session for 7 days, otherwise a session cookie.
  remember: z.boolean().optional(),
});

// Password reset (self-service).
export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email i pavlefshëm"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token i pavlefshëm"),
  password: z.string().min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere").max(200),
});

// Change password while logged in.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Fjalëkalimi aktual është i detyrueshëm").max(200),
  newPassword: z.string().min(8, "Fjalëkalimi i ri duhet të ketë të paktën 8 karaktere").max(200),
});

// Self-service profile edit (name + phone; email/role stay fixed here).
export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2, "Emri duhet të ketë të paktën 2 shkronja").max(100),
  phone: optionalText(30),
});

// Admin dashboard customization (3.7): ordered list of widget visibility.
// Ids are validated loosely here — unknown/stale ids are filtered out by
// normalizeDashboardLayout() against the actual widget registry.
export const dashboardLayoutSchema = z.object({
  layout: z
    .array(z.object({ id: z.string().min(1).max(60), hidden: z.boolean() }))
    .max(30),
});

// Business/company profile (admin-editable).
export const businessSettingsSchema = z.object({
  name: z.string().trim().min(1, "Emri i biznesit është i detyrueshëm").max(120),
  address: optionalText(200),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email i pavlefshëm")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  description: optionalText(500),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ---------- Sprint 2: services, staff, schedules ----------

// FR-01 — service catalog
export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Emri i shërbimit është shumë i shkurtër").max(120),
  description: optionalText(500),
  category: optionalText(60),
  imageUrl: optionalText(500),
  durationMin: z
    .number({ message: "Kohëzgjatja duhet të jetë numër" })
    .int("Kohëzgjatja duhet të jetë numër i plotë")
    .min(5, "Kohëzgjatja minimale është 5 minuta")
    .max(600, "Kohëzgjatja maksimale është 600 minuta"),
  price: z
    .number({ message: "Çmimi duhet të jetë numër" })
    .min(0, "Çmimi nuk mund të jetë negativ")
    .max(100000),
  active: z.boolean().optional(),
});

export const serviceUpdateSchema = serviceSchema.partial();

// Offers — a promoted deal built on top of an existing service.
export const offerSchema = z
  .object({
    title: z.string().trim().min(2, "Titulli është shumë i shkurtër").max(120),
    description: optionalText(500),
    serviceIds: z.array(z.string().min(1)).min(1, "Zgjidh të paktën një shërbim"),
    imageUrl: optionalText(500),
    price: z
      .number({ message: "Çmimi duhet të jetë numër" })
      .min(0, "Çmimi nuk mund të jetë negativ")
      .max(100000),
    durationMin: z
      .number({ message: "Kohëzgjatja duhet të jetë numër" })
      .int()
      .min(5, "Kohëzgjatja duhet të jetë të paktën 5 minuta")
      .max(600),
    validFrom: optionalText(40),
    validUntil: optionalText(40),
    active: z.boolean().optional(),
  })
  .refine((o) => !o.validFrom || !o.validUntil || new Date(o.validFrom) < new Date(o.validUntil), {
    message: "Fillimi i vlefshmërisë duhet të jetë para mbarimit",
    path: ["validUntil"],
  });

export const offerUpdateSchema = z.object({
  title: z.string().trim().min(2, "Titulli është shumë i shkurtër").max(120).optional(),
  description: optionalText(500),
  serviceIds: z.array(z.string().min(1)).min(1, "Zgjidh të paktën një shërbim").optional(),
  imageUrl: optionalText(500),
  price: z
    .number({ message: "Çmimi duhet të jetë numër" })
    .min(0, "Çmimi nuk mund të jetë negativ")
    .max(100000)
    .optional(),
  durationMin: z
    .number({ message: "Kohëzgjatja duhet të jetë numër" })
    .int()
    .min(5, "Kohëzgjatja duhet të jetë të paktën 5 minuta")
    .max(600)
    .optional(),
  validFrom: optionalText(40),
  validUntil: optionalText(40),
  active: z.boolean().optional(),
});

// FR-02 — staff accounts
export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, "Emri duhet të ketë të paktën 2 shkronja").max(100),
  email: z.string().trim().toLowerCase().email("Email i pavlefshëm"),
  phone: optionalText(30),
  title: optionalText(60),
  password: z.string().min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere").max(200),
});

// Admin "Termin i Ri" modal — register a brand-new client inline (no
// self-chosen password; email is optional, unlike self-registration).
export const quickClientCreateSchema = z.object({
  firstName: z.string().trim().min(1, "Emri është i detyrueshëm").max(60),
  lastName: z.string().trim().min(1, "Mbiemri është i detyrueshëm").max(60),
  phone: z.string().trim().min(1, "Numri i telefonit është i detyrueshëm").max(30),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email i pavlefshëm")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: optionalText(30),
  title: optionalText(60),
  password: z
    .string()
    .min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere")
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// Skills: which services a staff member performs
export const staffServicesSchema = z.object({
  serviceIds: z.array(z.string().min(1)),
});

// FR-03 — working hours. "HH:MM" in 24h form.
const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Ora duhet të jetë në formatin HH:MM");

export const workingHoursSchema = z.object({
  hours: z
    .array(
      z
        .object({
          weekday: z.number().int().min(0).max(6),
          startTime: timeString,
          endTime: timeString,
        })
        .refine((h) => h.startTime < h.endTime, {
          message: "Ora e fillimit duhet të jetë para orës së mbarimit",
        })
    )
    .max(21, "Shumë intervale orari"),
});

export const timeOffSchema = z
  .object({
    from: z.string().min(1, "Data e fillimit është e detyrueshme"),
    until: z.string().min(1, "Data e mbarimit është e detyrueshme"),
    reason: optionalText(200),
  })
  .refine((t) => new Date(t.from) < new Date(t.until), {
    message: "Fillimi i mungesës duhet të jetë para mbarimit",
  });

export type ServiceInput = z.infer<typeof serviceSchema>;
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

// ---------- Sprint 3: bookings ----------

const isoDateTime = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), "Data/ora nuk është e vlefshme");

// FR-04/05 — a client creates a booking for a concrete service, staff and time.
// `clientId` is optional and only ever honoured for an ADMIN caller (booking
// on behalf of an existing client from the admin "Termin i Ri" modal); a
// client or staff caller always books for themselves regardless of this field.
export const bookingCreateSchema = z.object({
  serviceId: z.string().min(1, "Zgjidh një shërbim"),
  staffId: z.string().min(1, "Zgjidh një punonjës"),
  startTime: isoDateTime,
  clientId: z.string().min(1).optional(),
});

// FR-06/07/12 — cancel, reschedule, reassign staff, or change status.
export const bookingUpdateSchema = z
  .object({
    action: z.enum(["cancel", "reschedule", "assign", "status", "payment"]),
    // for reschedule and assign
    staffId: z.string().min(1).optional(),
    startTime: isoDateTime.optional(),
    // for status change — the full enum so an admin can also set CONFIRMED
    // or CANCELLED directly as a correction, not just move forward.
    status: z.enum(["CONFIRMED", "CHECKED_IN", "IN_SERVICE", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
    // for payment — an admin-tracked flag, not a payment gateway integration.
    paymentStatus: z.enum(["UNPAID", "PAID", "REFUNDED"]).optional(),
  })
  .refine((v) => v.action !== "reschedule" || (v.staffId && v.startTime), {
    message: "Riplanifikimi kërkon punonjësin dhe orarin e ri",
  })
  .refine((v) => v.action !== "assign" || v.staffId, {
    message: "Caktimi kërkon punonjësin e ri",
  })
  .refine((v) => v.action !== "status" || v.status, {
    message: "Ndryshimi i statusit kërkon statusin e ri",
  })
  .refine((v) => v.action !== "payment" || v.paymentStatus, {
    message: "Ndryshimi i pagesës kërkon statusin e ri",
  });

export type BookingCreateInput = z.infer<typeof bookingCreateSchema>;

// ---------- Sprint 4: walk-in queue ----------

// FR-08 — check-in. A client checks in for themselves; staff/admin may
// register a walk-in without an account, giving a name instead.
export const queueCheckinSchema = z.object({
  serviceId: z.string().min(1, "Zgjidh një shërbim"),
  clientName: optionalText(100),
  phone: optionalText(30),
  notes: optionalText(300),
});

// FR-11 — move a queue entry through its lifecycle, or leave the queue.
export const queueUpdateSchema = z.object({
  action: z.enum(["call", "start", "complete", "no_show", "leave"]),
});

// FR-12 — the administrator manually assigns a staff member to a waiting entry.
export const queueAssignSchema = z.object({
  staffId: z.string().min(1, "Zgjidh një punonjës"),
});

// 3.1 — the full set of services performed during an in-progress visit
// (replaces the previous set; empty means "nothing confirmed yet").
export const queueServicesSchema = z.object({
  serviceIds: z.array(z.string().min(1)).max(20),
});

export type QueueCheckinInput = z.infer<typeof queueCheckinSchema>;

// 3.3 — join the smart waitlist for a service, optionally narrowed to one
// staff member.
export const waitlistJoinSchema = z.object({
  serviceId: z.string().min(1, "Zgjidh një shërbim"),
  staffId: optionalText(50),
});

// ---------- Sprint 6: feedback (2.6) ----------

// A client rates and comments on a finished booking. The comment is where a
// complaint would go — there is no separate ticket system.
export const feedbackSchema = z.object({
  rating: z.number().int().min(1, "Zgjidh një vlerësim").max(5),
  comment: optionalText(1000),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
