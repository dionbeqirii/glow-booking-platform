import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/rbac";
import { handle } from "@/lib/api";

// GET — the current user's notifications, newest first, plus the unread count
// so the header bell can render a badge without a second request (FR-13).
export async function GET() {
  return handle(async () => {
    const session = await requireSession();

    const [notifications, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: { id: true, type: true, message: true, read: true, createdAt: true },
      }),
      prisma.notification.count({ where: { userId: session.userId, read: false } }),
    ]);

    return { notifications, unread };
  });
}

// PATCH — mark all of the user's notifications as read. Scoped to the caller,
// so one user can never clear another's notifications.
export async function PATCH() {
  return handle(async () => {
    const session = await requireSession();
    await prisma.notification.updateMany({
      where: { userId: session.userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  });
}
