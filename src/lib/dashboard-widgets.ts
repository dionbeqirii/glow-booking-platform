// Registry of admin dashboard widgets (3.7): the canonical id/label list and
// the default layout. Shared between the server (rendering + persistence)
// and the client (customize-mode UI), so both agree on what a "widget" is.
export const DASHBOARD_WIDGET_IDS = [
  "kpi",
  "trend",
  "periodStats",
  "statusBreakdown",
  "queue",
  "staffUtilization",
  "topServices",
  "topClients",
  "pdfExport",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export const DASHBOARD_WIDGET_LABEL: Record<DashboardWidgetId, string> = {
  kpi: "Kartat kryesore (KPI)",
  trend: "Trendi i rezervimeve",
  periodStats: "Performanca e periudhës",
  statusBreakdown: "Rezervimet sipas statusit",
  queue: "Radha pa termin",
  staffUtilization: "Shfrytëzimi i stafit",
  topServices: "Shërbimet më të kërkuara",
  topClients: "Klientët më aktivë",
  pdfExport: "Eksporto raport",
};

export type WidgetLayoutItem = { id: DashboardWidgetId; hidden: boolean };

export const DEFAULT_DASHBOARD_LAYOUT: WidgetLayoutItem[] = DASHBOARD_WIDGET_IDS.map((id) => ({
  id,
  hidden: false,
}));

// Reconciles a saved layout against the current widget registry: keeps the
// saved order/visibility for known ids, drops stale/unknown ones, and
// appends any widget the registry knows about but the saved layout doesn't
// (e.g. one added after the admin last customized) as visible, at the end.
export function normalizeDashboardLayout(saved: unknown): WidgetLayoutItem[] {
  const savedArr = Array.isArray(saved) ? (saved as { id?: unknown; hidden?: unknown }[]) : [];
  const known = new Set<string>(DASHBOARD_WIDGET_IDS);
  const seen = new Set<string>();
  const result: WidgetLayoutItem[] = [];

  for (const item of savedArr) {
    const id = item?.id;
    if (typeof id === "string" && known.has(id) && !seen.has(id)) {
      result.push({ id: id as DashboardWidgetId, hidden: item?.hidden === true });
      seen.add(id);
    }
  }
  for (const id of DASHBOARD_WIDGET_IDS) {
    if (!seen.has(id)) result.push({ id, hidden: false });
  }
  return result;
}
