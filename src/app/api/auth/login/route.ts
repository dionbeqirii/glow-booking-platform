import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { homeForRole } from "@/lib/rbac";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Të dhëna të pavlefshme" },
      { status: 400 }
    );
  }

  const { email, password, remember } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic message whether the email is unknown or the password is wrong.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Email ose fjalëkalim i gabuar" }, { status: 401 });
  }

  await audit({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id });

  const token = await createSessionToken({ userId: user.id, role: user.role, name: user.name });
  await setSessionCookie(token, remember ?? true);

  return NextResponse.json({ redirect: homeForRole(user.role) });
}
