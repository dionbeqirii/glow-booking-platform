import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "./rbac";

/**
 * Wraps a route handler so authorization and validation failures always
 * produce a consistent JSON error instead of a 500.
 */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Të dhëna të pavlefshme" },
        { status: 400 }
      );
    }
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Gabim i brendshëm i serverit" }, { status: 500 });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function readJson(req: Request): Promise<unknown> {
  const body = await req.json().catch(() => null);
  if (body === null) throw new ApiError(400, "Trupi i kërkesës nuk është JSON i vlefshëm");
  return body;
}

/**
 * True when a caught error is a Postgres error with the given SQLSTATE code
 * (e.g. "23P01" for the booking_no_overlap exclusion constraint). Prisma 7's
 * driver adapter wraps the original Postgres error in `DriverAdapterError`
 * and nests the real code under `.cause.code` instead of `.code` directly —
 * checking only the top-level property silently misses every real conflict
 * and leaks a generic 500 instead of the intended friendly error.
 */
export function isPgError(err: unknown, code: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  if (e.code === code || e.cause?.code === code) return true;
  // Last-resort fallback in case a future driver version changes shape again.
  return typeof e.message === "string" && e.message.includes(code);
}
