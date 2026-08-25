import { randomUUID, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { quickClientCreateSchema } from "@/lib/validation";
import { handle, readJson, ApiError } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Admin "Termin i Ri" modal — register a client on the spot when they don't
// already have an account. No self-chosen password (a random one is hashed
// and stored, same as any other account, but never surfaced — this is a
// passive booking record, not a login the admin hands out); email is
// optional, so a missing one gets a synthetic, guaranteed-unique placeholder
// so it can still satisfy the unique constraint every User row needs.
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const data = quickClientCreateSchema.parse(await readJson(req));

    const name = `${data.firstName} ${data.lastName}`.trim();
    const email = data.email ?? `klient-${randomUUID()}@pa-email.internal`;

    const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (taken) throw new ApiError(409, "Ky email është i regjistruar");

    const client = await prisma.user.create({
      data: {
        name,
        email,
        phone: data.phone,
        passwordHash: await hashPassword(randomBytes(24).toString("hex")),
        role: "CLIENT",
      },
      select: { id: true, name: true, phone: true },
    });

    await audit({
      userId: session.userId,
      action: "CLIENT_QUICK_CREATE",
      entity: "User",
      entityId: client.id,
      details: client.name,
    });

    return { client };
  });
}
