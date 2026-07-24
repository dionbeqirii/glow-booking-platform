import { randomBytes, createHash } from "crypto";

// The raw token goes into the reset link; only its hash is stored, so the
// stored value is never enough to reset a password on its own.
export function generateResetToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashResetToken(raw) };
}

export function hashResetToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
