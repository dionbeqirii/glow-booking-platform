"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

const VIEWS = [
  { value: "day", label: "Ditë" },
  { value: "week", label: "Javë" },
  { value: "month", label: "Muaj" },
];

export default function CalendarViewSwitcher({ currentView }: { currentView: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(view: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      className="rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
      value={currentView}
      onChange={(e) => onChange(e.target.value)}
    >
      {VIEWS.map((v) => (
        <option key={v.value} value={v.value}>
          {v.label}
        </option>
      ))}
    </select>
  );
}
