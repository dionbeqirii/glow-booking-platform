import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, buttonStyles } from "@/components/ui";
import MyBookings, { type BookingRow } from "@/components/client/MyBookings";
import { ACTIVE_BOOKING_STATUSES } from "@/lib/availability";

export default async function ClientPage() {
  const session = await requireRole("CLIENT");

  const bookings = await prisma.booking.findMany({
    where: { clientId: session.userId },
    orderBy: { startTime: "desc" },
    take: 30,
    select: {
      id: true,
      startTime: true,
      status: true,
      serviceId: true,
      service: { select: { name: true, durationMin: true } },
      staff: { select: { id: true, name: true } },
    },
  });

  const now = Date.now();
  const rows: BookingRow[] = bookings.map((b) => ({
    id: b.id,
    startTime: b.startTime.toISOString(),
    status: b.status,
    serviceName: b.service.name,
    serviceDuration: b.service.durationMin,
    staffName: b.staff.name,
    staffId: b.staff.id,
    canManage:
      b.startTime.getTime() > now &&
      (ACTIVE_BOOKING_STATUSES as string[]).includes(b.status),
  }));

  const serviceIdByBooking = Object.fromEntries(bookings.map((b) => [b.id, b.serviceId]));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end justify-between">
          <PageTitle title={`Mirë se erdhe, ${session.name.split(" ")[0]}`} hint="Terminet e tua te studioja." />
          <Link href="/client/rezervo" className={`mb-6 ${buttonStyles.primary}`}>
            Rezervo një termin
          </Link>
        </div>

        <MyBookings serviceIdByBooking={serviceIdByBooking} bookings={rows} />
      </div>
    </DashboardShell>
  );
}
