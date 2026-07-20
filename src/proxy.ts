import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_NAME } from "@/lib/auth";

// Next.js 16 renamed Middleware to Proxy. Edge-compatible route protection
// (FR-16): bcrypt/Prisma never run here — the proxy only verifies the signed
// JWT and checks the role prefix (an optimistic check, per the docs).
const ROLE_PREFIX: Record<string, string> = {
  "/admin": "ADMIN",
  "/staff": "STAFF",
  "/client": "CLIENT",
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? "");
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const guardedPrefix = Object.keys(ROLE_PREFIX).find((p) => pathname.startsWith(p));
  if (!guardedPrefix) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const role = payload.role as string;
    if (role !== ROLE_PREFIX[guardedPrefix]) {
      // Logged in but wrong area → send to their own home.
      const home = role === "ADMIN" ? "/admin" : role === "STAFF" ? "/staff" : "/client";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/client/:path*"],
};
