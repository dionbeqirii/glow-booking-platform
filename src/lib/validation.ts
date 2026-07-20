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
