"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

type Option = { id: string; name: string };

// Date range, staff, service, status — the first four controls of the
// single-row Terminet toolbar (search and the action buttons are siblings
// appended by the caller, see terminet/page.tsx). Returns a fragment, not
// its own wrapping row, so all of it shares one flex-wrap line with those.
export default function AppointmentsFilters({
  staff,
  services,
  statuses,
  currentFrom,
  currentTo,
  currentStaffId,
  currentServiceId,
  currentStatus,
}: {
  staff: Option[];
  services: Option[];
  statuses: { value: string; label: string }[];
  currentFrom: string;
  currentTo: string;
  currentStaffId: string;
  currentServiceId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectCls =
    "rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent";
  const label = "text-xs font-medium text-ink-faint";

  return (
    <>
      <div className="flex shrink-0 flex-col gap-1">
        <span className={label}>Intervali i Datave</span>
        <div className="flex items-center gap-1 rounded-lg border border-line-strong bg-surface py-1 pl-2 pr-1">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-faint" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <input
            type="date"
            defaultValue={currentFrom}
            onChange={(e) => setParam("from", e.target.value)}
            className="w-[76px] border-0 bg-transparent p-1 text-sm text-ink-soft outline-none"
          />
          <span className="text-ink-faint">–</span>
          <input
            type="date"
            defaultValue={currentTo}
            onChange={(e) => setParam("to", e.target.value)}
            className="w-[76px] border-0 bg-transparent p-1 text-sm text-ink-soft outline-none"
          />
        </div>
      </div>

      <div className="flex w-[92px] shrink-0 flex-col gap-1">
        <span className={label}>Stafi</span>
        <select className={`${selectCls} w-full truncate`} value={currentStaffId} onChange={(e) => setParam("staff", e.target.value)}>
          <option value="">Të gjithë</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex w-[100px] shrink-0 flex-col gap-1">
        <span className={label}>Shërbimi</span>
        <select className={`${selectCls} w-full truncate`} value={currentServiceId} onChange={(e) => setParam("service", e.target.value)}>
          <option value="">Të gjitha</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="flex w-[92px] shrink-0 flex-col gap-1">
        <span className={label}>Statusi</span>
        <select className={`${selectCls} w-full truncate`} value={currentStatus} onChange={(e) => setParam("status", e.target.value)}>
          <option value="">Të gjitha</option>
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
    </>
  );
}
