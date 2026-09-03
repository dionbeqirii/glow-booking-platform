import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { getClientAppointments } from "@/lib/client-appointments";
import { getClientQueueHistory } from "@/lib/client-queue";
import ClientHistoryWorkspace from "@/components/client/ClientHistoryWorkspace";

export default async function ClientHistoryPage() {
  const session = await requireRole("CLIENT");
  const [bookings, queueHistory] = await Promise.all([
    getClientAppointments(session.userId),
    getClientQueueHistory(session.userId),
  ]);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto max-w-none">
        <h1 className="text-xl font-bold text-ink">Historiku im</h1>
        <p className="mb-4 text-sm text-ink-soft">Shiko dhe menaxho të gjitha shërbimet që ke marrë.</p>

        <ClientHistoryWorkspace bookings={bookings} queueHistory={queueHistory} />
      </div>
    </DashboardShell>
  );
}
