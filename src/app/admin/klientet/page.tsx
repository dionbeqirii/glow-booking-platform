import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle } from "@/components/ui";
import ClientsTable, { type ClientRow } from "@/components/admin/ClientsTable";

function fmtDate(d: Date): string {
  return d.toLocaleDateString("sq", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// All registered clients (role CLIENT), with a lightweight activity summary.
export default async function ClientsPage() {
  const session = await requireRole("ADMIN");

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      createdAt: true,
      _count: { select: { bookingsAsClient: true, queueAsClient: true } },
      bookingsAsClient: { orderBy: { startTime: "desc" }, take: 1, select: { startTime: true } },
    },
  });

  const rows: ClientRow[] = clients.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    joined: fmtDate(c.createdAt),
    bookings: c._count.bookingsAsClient,
    queue: c._count.queueAsClient,
    lastVisit: c.bookingsAsClient[0] ? fmtDate(c.bookingsAsClient[0].startTime) : null,
  }));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-5xl">
        <PageTitle title="Klientët" hint="Të gjithë klientët që kanë llogari në platformë." />
        <ClientsTable clients={rows} />
      </div>
    </DashboardShell>
  );
}
