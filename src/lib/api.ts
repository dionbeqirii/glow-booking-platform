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
