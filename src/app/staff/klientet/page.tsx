import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle } from "@/components/ui";
import StaffClients, { type StaffClientBooking } from "@/components/staff/StaffClients";

function fmt(d: Date): string {
  return d.toLocaleString("sq", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Clients this staff member has served or is scheduled to serve, with a
// status filter (Në pritje / Përfunduar / Anuluar).
export default async function StaffClientsPage() {
  const session = await requireRole("STAFF");

  const bookings = await prisma.booking.findMany({
    where: { staffId: session.userId },
    orderBy: { startTime: "desc" },
    take: 200,
    select: {
      id: true,
      startTime: true,
      status: true,
      service: { select: { name: true } },
      client: { select: { name: true } },
    },
  });

  const rows: StaffClientBooking[] = bookings.map((b) => ({
    id: b.id,
    when: fmt(b.startTime),
    status: b.status,
    serviceName: b.service.name,
    clientName: b.client.name,
  }));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-4xl">
        <Link href="/staff" className="text-sm text-ink-soft hover:underline">
          ← Radha e sotme
        </Link>
        <div className="mt-2">
          <PageTitle title="Klientët e mi" hint="Klientët që ke shërbyer ose ke të planifikuar, sipas statusit." />
        </div>
        <StaffClients bookings={rows} />
      </div>
    </DashboardShell>
  );
}
