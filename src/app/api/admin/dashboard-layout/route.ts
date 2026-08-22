import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { dashboardLayoutSchema } from "@/lib/validation";
import { normalizeDashboardLayout } from "@/lib/dashboard-widgets";
import { handle, readJson } from "@/lib/api";

// PUT — save the current admin's dashboard widget order/visibility.
export async function PUT(req: Request) {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    const { layout } = dashboardLayoutSchema.parse(await readJson(req));
    const normalized = normalizeDashboardLayout(layout);

    await prisma.dashboardLayout.upsert({
      where: { userId: session.userId },
      create: { userId: session.userId, layout: normalized },
      update: { layout: normalized },
    });

    return { layout: normalized };
  });
}

// DELETE — reset the current admin's dashboard back to the default layout.
export async function DELETE() {
  return handle(async () => {
    const session = await requireRole("ADMIN");
    await prisma.dashboardLayout.deleteMany({ where: { userId: session.userId } });
    return { ok: true };
  });
}
