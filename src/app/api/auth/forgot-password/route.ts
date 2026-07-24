import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";
import { generateResetToken } from "@/lib/reset-token";
import { audit } from "@/lib/audit";

const EXPIRY_MIN = 60;

// POST — request a password reset link. Responds identically whether or not the
// email is registered, so the form never reveals which addresses have accounts.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Të dhëna të pavlefshme" },
      { status: 400 }
    );
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  let devLink: string | undefined;

  if (user) {
    // One active token at a time: retire any earlier unused ones.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const { raw, hash } = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + EXPIRY_MIN * 60000),
      },
    });

    const link = `${new URL(req.url).origin}/update-password?token=${raw}`;

    // No email provider is configured. In development we surface the link so
    // the flow is testable end-to-end; in production this is where an email
    // service would be handed the link, and it is never returned to the client.
    console.log(`[reset] ${email} → ${link}`);
    if (process.env.NODE_ENV !== "production") devLink = link;

    await audit({
      userId: user.id,
      action: "PASSWORD_RESET_REQUEST",
      entity: "User",
      entityId: user.id,
    });
  }

  return NextResponse.json({ ok: true, ...(devLink ? { devLink } : {}) });
}
