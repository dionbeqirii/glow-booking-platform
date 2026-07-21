import { z } from "zod";

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
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ---------- Sprint 2: services, staff, schedules ----------

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

// FR-01 — service catalog
export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Emri i shërbimit është shumë i shkurtër").max(120),
  description: optionalText(500),
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

// FR-02 — staff accounts
export const staffCreateSchema = z.object({
  name: z.string().trim().min(2, "Emri duhet të ketë të paktën 2 shkronja").max(100),
  email: z.string().trim().toLowerCase().email("Email i pavlefshëm"),
  phone: optionalText(30),
  password: z.string().min(8, "Fjalëkalimi duhet të ketë të paktën 8 karaktere").max(200),
});

export const staffUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: optionalText(30),
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
