import { prisma } from "./prisma";
import type { NotificationType } from "@prisma/client";

/**
 * Creates an in-app notification (FR-13). Failure to notify never breaks the
 * action that triggered it.
 */
export async function notify(params: {
  userId: string;
  type: NotificationType;
  message: string;
}): Promise<void> {
  try {
    await prisma.notification.create({ data: params });
  } catch (err) {
    console.error("notification failed", err);
  }
}
