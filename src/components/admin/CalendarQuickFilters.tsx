"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

type StaffOption = { id: string; name: string };
type ServiceOption = { id: string; name: string };

// Compact top-bar filters. Deliberately share state with the sidebar's
// per-staff checkboxes (both read/write the same `hide` param) rather than
// introducing a second, conflicting notion of "which staff are shown" —
// picking one staff here just sets `hide` to "everyone else"; "Të gjithë
// Stafi" clears it. `currentStaffId` is only non-empty when the hide-set
// happens to reduce to exactly one visible staff member, so this control
// can't represent an arbitrary partial selection made from the sidebar —
// that's expected: it's a quick single-pick shortcut, not a second source
// of truth.
export default function CalendarQuickFilters({
  staff,
  services,
  currentStaffId,
  currentService,
}: {
  staff: StaffOption[];
  services: ServiceOption[];
  currentStaffId: string;
  currentService: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function push(params: URLSearchParams) {
    router.push(`${pathname}?${params.toString()}`);
  }

  function onStaffChange(staffId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!staffId) {
      params.delete("hide");
    } else {
      params.set("hide", staff.filter((s) => s.id !== staffId).map((s) => s.id).join(","));
    }
    push(params);
  }

  function onServiceChange(serviceName: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (serviceName) params.set("service", serviceName);
    else params.delete("service");
    push(params);
  }

  const selectCls =
    "rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent";

  return (
    <div className="flex items-center gap-2">
      <select className={selectCls} value={currentStaffId} onChange={(e) => onStaffChange(e.target.value)}>
        <option value="">Të gjithë Stafi</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select className={selectCls} value={currentService} onChange={(e) => onServiceChange(e.target.value)}>
        <option value="">Të gjitha Shërbimet</option>
        {services.map((s) => (
          <option key={s.id} value={s.name}>{s.name}</option>
        ))}
      </select>
    </div>
  );
}
