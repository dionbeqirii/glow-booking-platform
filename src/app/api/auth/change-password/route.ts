import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { changePasswordSchema } from "@/lib/validation";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { handle, readJson, ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";

// POST — change the current user's password (requires the current one).
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const { currentPassword, newPassword } = changePasswordSchema.parse(await readJson(req));

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new ApiError(400, "Fjalëkalimi aktual është i gabuar");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await audit({ userId: user.id, action: "PASSWORD_CHANGE", entity: "User", entityId: user.id });

    return { ok: true };
  });
}
