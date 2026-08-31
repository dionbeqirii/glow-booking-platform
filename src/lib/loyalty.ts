import { prisma } from "./prisma";

const POINTS_PER_EURO = 1;

// Earned once, at the moment a real paid visit is marked COMPLETED — either
// a scheduled booking or a walk-in queue visit. `clientId` is null for
// walk-ins with no account (staff quick-added a name only), which simply
// earn nothing since there's no one to credit.
export async function awardLoyaltyPoints(clientId: string | null, amountEur: number): Promise<void> {
  if (!clientId || amountEur <= 0) return;
  const points = Math.round(amountEur * POINTS_PER_EURO);
  if (points <= 0) return;
  await prisma.user.update({ where: { id: clientId }, data: { loyaltyPoints: { increment: points } } });
}
