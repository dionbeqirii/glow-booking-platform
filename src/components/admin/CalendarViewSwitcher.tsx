"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

export default function CalendarViewSwitcher({ currentView }: { currentView: string }) {
  const t = useTranslations("AdminCalendar");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const VIEWS = [
    { value: "day", label: t("viewDay") },
    { value: "week", label: t("viewWeek") },
    { value: "month", label: t("viewMonth") },
  ];

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
