import { prisma } from "./prisma";
import { DISPLAY_QUEUE_STATUSES, CLIENT_WAIT_BUFFER_MIN } from "./queue";
import type { QueueStatus } from "@prisma/client";

export type ClientQueueLiveRow = {
  id: string;
  position: number;
  label: string;
  isMe: boolean;
  serviceName: string | null;
  waitMin: number;
  status: QueueStatus;
};

export type MyQueueEntry = {
  id: string;
  status: QueueStatus;
  serviceName: string;
  serviceDurationMin: number;
  staffName: string | null;
  position: number;
  peopleAhead: number;
  estimatedWaitMin: number;
  joinedAtLabel: string;
};

export type ClientQueueView = {
  myEntry: MyQueueEntry | null;
  liveQueue: ClientQueueLiveRow[];
};

// The client's own row shows their real name and service; every other row is
// anonymized to "Klient #N" with no service shown — the shared queue view is
// visible to everyone waiting, but only staff/admin get the full roster
// (GET /api/queue already enforces this same boundary for the API).
export async function getClientQueueView(clientId: string, clientName: string): Promise<ClientQueueView> {
  const entries = await prisma.queueEntry.findMany({
    where: { status: { in: DISPLAY_QUEUE_STATUSES } },
    orderBy: { checkinAt: "asc" },
    select: {
      id: true,
      clientId: true,
      checkinAt: true,
      estimatedWaitMin: true,
      status: true,
      service: { select: { name: true, durationMin: true } },
      staff: { select: { name: true } },
    },
  });

  let waitingSeen = 0;
  const liveQueue: ClientQueueLiveRow[] = [];
  let myEntry: MyQueueEntry | null = null;

  entries.forEach((e) => {
    const isMe = e.clientId === clientId;
    const position = waitingSeen + 1;
    if (e.status === "WAITING") waitingSeen++;

    liveQueue.push({
      id: e.id,
      position,
      label: isMe ? `Ti (${clientName})` : `Klient #${position}`,
      isMe,
      serviceName: isMe ? e.service.name : null,
      waitMin: e.estimatedWaitMin,
      status: e.status,
    });

    if (isMe) {
      myEntry = {
        id: e.id,
        status: e.status,
        serviceName: e.service.name,
        serviceDurationMin: e.service.durationMin,
        staffName: e.staff?.name ?? null,
        position,
        peopleAhead: position - 1,
        estimatedWaitMin: e.estimatedWaitMin + CLIENT_WAIT_BUFFER_MIN,
        joinedAtLabel: e.checkinAt.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false }),
      };
    }
  });

  return { myEntry, liveQueue };
}
