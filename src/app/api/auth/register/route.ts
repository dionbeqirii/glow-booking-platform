import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { homeForRole } from "@/lib/rbac";

// Public self-registration always creates a CLIENT account.
// Staff and admin accounts are created by an administrator (Sprint 2+).
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Të dhëna të pavlefshme" },
      { status: 400 }
    );
  }

  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ky email është i regjistruar" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash: await hashPassword(password),
      role: "CLIENT",
    },
  });

  await audit({ userId: user.id, action: "REGISTER", entity: "User", entityId: user.id });

  const token = await createSessionToken({ userId: user.id, role: user.role, name: user.name });
  await setSessionCookie(token);

  return NextResponse.json({ redirect: homeForRole(user.role) }, { status: 201 });
}
