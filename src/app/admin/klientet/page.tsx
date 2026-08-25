import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, Kpi } from "@/components/ui";
import { getClientKpis, getClientRows, getTopClients } from "@/lib/clients-catalog";
import ClientsTable from "@/components/admin/ClientsTable";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IcUserPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6M22 11h-6" />
    </svg>
  );
}
function IcPulse() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h2l1.5 4L14 8l1.5 4H16" />
    </svg>
  );
}
function IcRepeat() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M17 2.1 21 6l-4 3.9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 21.9 3 18l4-3.9" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export default async function ClientsPage() {
  const session = await requireRole("ADMIN");
  const now = new Date();

  const [kpis, rows, topClients] = await Promise.all([
    getClientKpis(now),
    getClientRows(now),
    getTopClients(),
  ]);

  const segmentCounts = {
    active: rows.filter((r) => r.segment === "active").length,
    new: rows.filter((r) => r.segment === "new").length,
    inactive: rows.filter((r) => r.segment === "inactive").length,
  };

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col">
        <PageTitle title="Klientët" hint="Të gjithë klientët që kanë llogari në platformë." />

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_260px]">
          <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
            <div className="shrink-0 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi href="/admin/klientet" tone="accent" icon={<IcUsers />} value={kpis.total} label="Klientë Gjithsej" sub="Të regjistruar" />
              <Kpi href="/admin/klientet" tone="gold" icon={<IcUserPlus />} value={kpis.newThisMonth} label="Klientë të Rinj" sub="Këtë muaj" />
              <Kpi href="/admin/klientet" tone="ok" icon={<IcPulse />} value={kpis.activeLast30d} label="Klientë Aktivë" sub="30 ditët e fundit" />
              <Kpi href="/admin/klientet" tone="purple" icon={<IcRepeat />} value={kpis.repeatClients} label="Klientë të Përsëritur" sub="2+ vizita të përfunduara" />
            </div>

            <div className="min-h-0 flex-1">
              <ClientsTable rows={rows} />
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
            <div className="rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Segmentet e Klientëve</p>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-ok" />Aktivë</span>
                  <span className="font-semibold text-ink">{segmentCounts.active}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Të Rinj</span>
                  <span className="font-semibold text-ink">{segmentCounts.new}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />Joaktivë</span>
                  <span className="font-semibold text-ink">{segmentCounts.inactive}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Klientët Më Aktivë</p>
              {topClients.length === 0 ? (
                <p className="text-xs text-ink-faint">Ende pa rezervime.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {topClients.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[9px] font-bold text-ink-soft">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{c.name}</span>
                      <span className="shrink-0 text-ink-faint">{c.bookingsCount} rez.</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-accent-soft p-2.5">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-accent">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" /><path d="M9 21h6" /></svg>
                Këshillë e Shpejtë
              </p>
              <p className="text-xs text-ink-soft">Klientët joaktivë prej 30+ ditësh mund të kontaktohen me një ofertë për t&apos;u rikthyer.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
