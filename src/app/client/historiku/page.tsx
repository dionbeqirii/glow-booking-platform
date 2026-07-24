import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, Badge, Card, EmptyState } from "@/components/ui";
import {
  BOOKING_STATUS_LABEL,
  BOOKING_STATUS_TONE,
  QUEUE_STATUS_LABEL,
  QUEUE_STATUS_TONE,
} from "@/lib/booking-labels";

const FINISHED_BOOKING = ["COMPLETED", "CANCELLED", "NO_SHOW"] as const;
const FINISHED_QUEUE = ["COMPLETED", "NO_SHOW"] as const;

function fmt(d: Date): string {
  return d.toLocaleString("sq", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// FR-14 — the client's own history: finished bookings and past queue entries.
export default async function ClientHistoryPage() {
  const session = await requireRole("CLIENT");

  const [bookings, queue] = await Promise.all([
    prisma.booking.findMany({
      where: { clientId: session.userId, status: { in: [...FINISHED_BOOKING] } },
      orderBy: { startTime: "desc" },
      take: 50,
      select: {
        id: true,
        startTime: true,
        status: true,
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),
    prisma.queueEntry.findMany({
      where: { clientId: session.userId, status: { in: [...FINISHED_QUEUE] } },
      orderBy: { checkinAt: "desc" },
      take: 50,
      select: {
        id: true,
        checkinAt: true,
        status: true,
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    }),
  ]);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-3xl">
        <Link href="/client" className="text-sm text-ink-soft hover:underline">
          ← Paneli
        </Link>
        <div className="mt-2">
          <PageTitle title="Historiku im" hint="Rezervimet dhe radhët e mëparshme te studioja." />
        </div>

        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-semibold text-ink">Rezervimet</h2>
          {bookings.length === 0 ? (
            <EmptyState text="Nuk ke rezervime të përfunduara ende." />
          ) : (
            <ul className="divide-y divide-line">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{b.service.name}</p>
                    <p className="text-xs text-ink-faint">
                      {fmt(b.startTime)} · {b.staff.name}
                    </p>
                  </div>
                  <Badge tone={BOOKING_STATUS_TONE[b.status]}>{BOOKING_STATUS_LABEL[b.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-ink">Radha pa termin</h2>
          {queue.length === 0 ? (
            <EmptyState text="Nuk ke hyrje të mëparshme në radhë." />
          ) : (
            <ul className="divide-y divide-line">
              {queue.map((q) => (
                <li key={q.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{q.service.name}</p>
                    <p className="text-xs text-ink-faint">
                      {fmt(q.checkinAt)}
                      {q.staff ? ` · ${q.staff.name}` : ""}
                    </p>
                  </div>
                  <Badge tone={QUEUE_STATUS_TONE[q.status]}>{QUEUE_STATUS_LABEL[q.status]}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
