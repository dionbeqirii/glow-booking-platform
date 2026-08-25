"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

const SIZES = [10, 25, 50];

export default function AppointmentsPageSize({ current }: { current: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(size: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", size);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select
      className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
      value={current}
      onChange={(e) => onChange(e.target.value)}
    >
      {SIZES.map((s) => (
        <option key={s} value={s}>{s} / faqe</option>
      ))}
    </select>
  );
}
