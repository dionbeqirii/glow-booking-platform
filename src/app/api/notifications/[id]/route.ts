import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { handle, ApiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// DELETE — soft-delete a single notification. Only the owning user may
// delete it (never trust the id alone — check userId against the session).
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await params;

    const existing = await prisma.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.userId) {
      throw new ApiError(404, "Njoftimi nuk u gjet");
    }

    await prisma.notification.update({ where: { id }, data: { deleted: true } });
    return { ok: true };
  });
}
