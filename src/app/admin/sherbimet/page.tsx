import { requireRole } from "@/lib/rbac";
import DashboardShell from "@/components/DashboardShell";
import { PageTitle, Kpi } from "@/components/ui";
import {
  getServicesKpis,
  getServiceCategoryCounts,
  getTopServicesThisMonth,
  getServicesList,
} from "@/lib/services-catalog";
import ServicesFilters from "@/components/admin/ServicesFilters";
import ServicesTable from "@/components/admin/ServicesTable";
import NewServiceButton from "@/components/admin/NewServiceButton";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcCatalog() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IcTag() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M20.6 12.3 12.7 20a2 2 0 0 1-2.8 0l-8-8V4h8l8 8a2 2 0 0 1 0 2.8Z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </svg>
  );
}
function IcStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.9-6.2-3.3-6.2 3.3 1.2-6.9-5-4.9 6.9-1z" />
    </svg>
  );
}
function IcCoin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string }>;
}) {
  const session = await requireRole("ADMIN");
  const sp = await searchParams;
  const status = sp.status === "active" || sp.status === "inactive" ? sp.status : undefined;
  const now = new Date();

  const [kpis, categoryCounts, topServices, rows] = await Promise.all([
    getServicesKpis(),
    getServiceCategoryCounts(),
    getTopServicesThisMonth(now),
    getServicesList({ q: sp.q, category: sp.category, status }),
  ]);

  const realCategories = categoryCounts.filter((c) => c.category !== "Pa kategori").map((c) => c.category);

  return (
    <DashboardShell name={session.name} role={session.role}>
      <div className="mx-auto flex h-full max-w-none flex-col">
        <PageTitle title="Shërbimet" hint="Menaxho të gjitha shërbimet e ofruara në studio." />

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_260px]">
          <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
            <div className="shrink-0 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi href="/admin/sherbimet" tone="accent" icon={<IcCatalog />} value={kpis.total} label="Shërbime Gjithsej" sub="Të gjitha shërbimet" />
              <Kpi href="/admin/sherbimet?status=active" tone="purple" icon={<IcTag />} value={kpis.active} label="Shërbime Aktive" sub="Aktualisht të disponueshme" />
              <Kpi
                href="/admin/sherbimet"
                tone="gold"
                icon={<IcStar />}
                value={kpis.mostBooked?.name ?? "—"}
                label="Më i Kërkuari"
                sub={kpis.mostBooked ? `${kpis.mostBooked.count} rezervime` : "Ende pa rezervime"}
              />
              <Kpi href="/admin/sherbimet" tone="warn" icon={<IcCoin />} value={`${kpis.averagePrice.toFixed(0)} €`} label="Çmimi Mesatar" sub="Mbi të gjitha shërbimet" />
            </div>

            <div className="shrink-0 rounded-xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <ServicesFilters
                  categories={realCategories}
                  currentCategory={sp.category ?? ""}
                  currentStatus={sp.status ?? ""}
                  currentQuery={sp.q ?? ""}
                />
                <NewServiceButton existingCategories={realCategories} />
              </div>
            </div>

            <div className="min-h-0 flex-1">
              <ServicesTable rows={rows} allCategories={realCategories} existingCategories={realCategories} />
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
            <div className="rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Kategoritë e Shërbimeve</p>
              {categoryCounts.length === 0 ? (
                <p className="text-xs text-ink-faint">Ende pa shërbime.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {categoryCounts.map((c) => (
                    <div key={c.category} className="flex items-center justify-between text-xs">
                      <span className="truncate text-ink-soft">{c.category}</span>
                      <span className="shrink-0 font-semibold text-ink">{c.count} {c.count === 1 ? "shërbim" : "shërbime"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-line bg-surface p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Më të Kërkuarat (Këtë Muaj)</p>
              {topServices.length === 0 ? (
                <p className="text-xs text-ink-faint">Ende pa rezervime këtë muaj.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {topServices.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[9px] font-bold text-ink-soft">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-ink">{s.name}</span>
                      <span className="shrink-0 text-ink-faint">{s.count} rez.</span>
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
              <p className="text-xs text-ink-soft">Mbaji shërbimet të përditësuara — çmime, kohëzgjatje dhe përshkrime të sakta tërheqin më shumë klientë.</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
