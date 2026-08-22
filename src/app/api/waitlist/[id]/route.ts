import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { handle, ApiError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

// DELETE — leave the waitlist. Only the entry's own client may remove it.
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    const session = await requireRole("CLIENT");
    const { id } = await params;

    const entry = await prisma.waitlist.findUnique({ where: { id } });
    if (!entry || entry.clientId !== session.userId) {
      throw new ApiError(404, "Hyrja në listën e pritjes nuk u gjet");
    }

    await prisma.waitlist.delete({ where: { id } });
    return { ok: true };
  });
}
