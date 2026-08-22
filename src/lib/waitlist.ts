import { prisma } from "./prisma";
import { notify } from "./notify";

/**
 * Smart waitlist (3.3): when an active booking is cancelled, the freed slot
 * is offered — with exclusive priority — to whoever has waited longest for
 * that service (and staff, if they asked for a specific one). If they don't
 * book within the window, the hold simply lapses (checked at read time, no
 * cleanup job needed) and the slot is open to everyone, same as always.
 */
export const PRIORITY_HOLD_MINUTES = 10;

/**
 * Called right after a booking transitions to CANCELLED. Finds the
 * earliest-joined matching waitlist entry and grants it a time-boxed
 * exclusive hold on the exact slot that just opened up.
 */
export async function offerFreedSlotToWaitlist(freed: {
  serviceId: string;
  staffId: string;
  startTime: Date;
  endTime: Date;
}): Promise<void> {
  // A slot that already started has nothing left to offer.
  if (freed.startTime <= new Date()) return;

  const candidate = await prisma.waitlist.findFirst({
    where: {
      serviceId: freed.serviceId,
      OR: [{ staffId: null }, { staffId: freed.staffId }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return;

  const expiresAt = new Date(Date.now() + PRIORITY_HOLD_MINUTES * 60000);
  await prisma.priorityHold.create({
    data: {
      staffId: freed.staffId,
      startTime: freed.startTime,
      endTime: freed.endTime,
      clientId: candidate.clientId,
      expiresAt,
    },
  });

  const [service, staff] = await Promise.all([
    prisma.service.findUnique({ where: { id: freed.serviceId }, select: { name: true } }),
    prisma.user.findUnique({ where: { id: freed.staffId }, select: { name: true } }),
  ]);

  await notify({
    userId: candidate.clientId,
    type: "STATUS_CHANGE",
    message: `U lirua një vend për ${service?.name ?? "shërbimin"} te ${staff?.name ?? "punonjësi"}, ${freed.startTime.toLocaleString(
      "sq"
    )}. Ke përparësi ${PRIORITY_HOLD_MINUTES} minuta për ta rezervuar — pas kësaj hapet për këdo.`,
  });
}

/**
 * True when [staffId, start, end) is currently held with priority for
 * someone other than `requestingClientId`. An expired hold (past
 * `expiresAt`) never blocks — the slot is already open to everyone again.
 */
export async function isHeldForSomeoneElse(params: {
  staffId: string;
  start: Date;
  end: Date;
  requestingClientId?: string;
}): Promise<boolean> {
  const hold = await prisma.priorityHold.findFirst({
    where: {
      staffId: params.staffId,
      expiresAt: { gt: new Date() },
      startTime: { lt: params.end },
      endTime: { gt: params.start },
      ...(params.requestingClientId ? { clientId: { not: params.requestingClientId } } : {}),
    },
  });
  return hold !== null;
}
