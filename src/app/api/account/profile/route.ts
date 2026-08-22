import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { profileUpdateSchema } from "@/lib/validation";
import { handle, readJson } from "@/lib/api";
import { audit } from "@/lib/audit";

// PUT — update the current user's own name/phone. Self-scoped only.
export async function PUT(req: Request) {
  return handle(async () => {
    const session = await requireSession();
    const data = profileUpdateSchema.parse(await readJson(req));

    const user = await prisma.user.update({
      where: { id: session.userId },
      data: { name: data.name, phone: data.phone },
      select: { id: true, name: true, email: true, phone: true, role: true, avatarUrl: true },
    });
    await audit({ userId: user.id, action: "PROFILE_UPDATE", entity: "User", entityId: user.id });

    return { user };
  });
}
