import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle } from "@/components/ui";
import AdminHistory, {
  type BookingHistoryRow,
  type QueueHistoryRow,
  type StaffOption,
} from "@/components/admin/AdminHistory";

function fmt(d: Date): string {
  return d.toLocaleString("sq", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// FR-14 — full studio history: every booking and every queue entry, with
// staff reassignment (FR-12) available on the still-active bookings.
export default async function AdminHistoryPage() {
  const session = await requireRole("ADMIN");

  const [bookings, queue, staff] = await Promise.all([
    prisma.booking.findMany({
      orderBy: { startTime: "desc" },
      take: 100,
      select: {
        id: true,
        startTime: true,
        status: true,
        serviceId: true,
        service: { select: { name: true } },
        staff: { select: { id: true, name: true } },
        client: { select: { name: true } },
      },
    }),
    prisma.queueEntry.findMany({
      orderBy: { checkinAt: "desc" },
      take: 100,
      select: {
        id: true,
        queueNumber: true,
        status: true,
        checkinAt: true,
        service: { select: { name: true } },
        staff: { select: { name: true } },
        client: { select: { name: true } },
        clientName: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "STAFF" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, staffServices: { select: { serviceId: true } } },
    }),
  ]);

  const bookingRows: BookingHistoryRow[] = bookings.map((b) => ({
    id: b.id,
    when: fmt(b.startTime),
    status: b.status,
    serviceId: b.serviceId,
    serviceName: b.service.name,
    staffId: b.staff.id,
    staffName: b.staff.name,
    clientName: b.client.name,
  }));

  const queueRows: QueueHistoryRow[] = queue.map((q) => ({
    id: q.id,
    queueNumber: q.queueNumber,
    status: q.status,
    when: fmt(q.checkinAt),
    serviceName: q.service.name,
    staffName: q.staff?.name ?? null,
    clientName: q.client?.name ?? q.clientName ?? "Walk-in",
  }));

  const staffOptions: StaffOption[] = staff.map((s) => ({
    id: s.id,
    name: s.name,
    serviceIds: s.staffServices.map((x) => x.serviceId),
  }));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm text-ink-soft hover:underline">
          ← Paneli
        </Link>
        <div className="mt-2">
          <PageTitle
            title="Historiku i studios"
            hint="Të gjitha rezervimet dhe hyrjet në radhë. Cakto punonjësin te rezervimet aktive."
          />
        </div>
        <AdminHistory bookings={bookingRows} queue={queueRows} staff={staffOptions} />
      </div>
    </DashboardShell>
  );
}
