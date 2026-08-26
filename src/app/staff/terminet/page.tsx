import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle } from "@/components/ui";
import { BOOKING_STATUS_LABEL, BOOKING_STATUS_PILL } from "@/lib/booking-labels";

export default async function StaffAppointmentsPage() {
  const session = await requireRole("STAFF");

  const bookings = await prisma.booking.findMany({
    where: { staffId: session.userId },
    orderBy: { startTime: "desc" },
    take: 60,
    select: {
      id: true,
      startTime: true,
      status: true,
      service: { select: { name: true, durationMin: true } },
      client: { select: { name: true } },
    },
  });

  const now = new Date();
  const rows = bookings.map((b) => ({
    id: b.id,
    dateLabel: b.startTime.toLocaleDateString("sq", { day: "2-digit", month: "2-digit", year: "numeric" }),
    timeLabel: b.startTime.toLocaleTimeString("sq", { hour: "2-digit", minute: "2-digit", hour12: false }),
    clientName: b.client.name,
    serviceName: b.service.name,
    durationMin: b.service.durationMin,
    status: b.status,
    isPast: b.startTime < now,
  }));

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-4xl">
        <Link href="/staff" className="text-sm text-ink-soft hover:underline">
          ← Paneli
        </Link>
        <div className="mt-2">
          <PageTitle title="Terminet e Mia" hint="Të gjitha terminet e tua — të ardhshme dhe të kaluara." />
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm">
              <colgroup>
                <col style={{ width: "23%" }} />
                <col style={{ width: "22%" }} />
                <col style={{ width: "23%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "22%" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
                  <th className="overflow-hidden px-3 py-2 font-medium">Data &amp; Ora</th>
                  <th className="overflow-hidden px-3 py-2 font-medium">Klienti</th>
                  <th className="overflow-hidden px-3 py-2 font-medium">Shërbimi</th>
                  <th className="overflow-hidden px-3 py-2 font-medium">Kohëz.</th>
                  <th className="overflow-hidden px-3 py-2 font-medium">Statusi</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-faint">Ende pa termine.</td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const pill = BOOKING_STATUS_PILL[r.status];
                    return (
                      <tr key={r.id} className={`border-b border-line last:border-0 ${r.isPast ? "opacity-70" : ""}`}>
                        <td className="overflow-hidden px-3 py-2.5">
                          <span className="block truncate text-ink">{r.dateLabel}, {r.timeLabel}</span>
                        </td>
                        <td className="overflow-hidden px-3 py-2.5">
                          <span className="block truncate font-medium text-ink">{r.clientName}</span>
                        </td>
                        <td className="overflow-hidden px-3 py-2.5">
                          <span className="block truncate text-ink-soft">{r.serviceName}</span>
                        </td>
                        <td className="overflow-hidden px-3 py-2.5">
                          <span className="block truncate text-ink-soft">{r.durationMin} min</span>
                        </td>
                        <td className="overflow-hidden px-3 py-2.5">
                          <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${pill.bg} ${pill.text}`}>
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pill.dot}`} />
                            <span className="truncate">{BOOKING_STATUS_LABEL[r.status]}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
