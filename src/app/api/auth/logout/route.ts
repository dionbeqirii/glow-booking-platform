import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export async function POST() {
  const session = await getSession();
  if (session) {
    await audit({ userId: session.userId, action: "LOGOUT", entity: "User", entityId: session.userId });
  }
  await clearSessionCookie();
  return NextResponse.json({ redirect: "/login" });
}
