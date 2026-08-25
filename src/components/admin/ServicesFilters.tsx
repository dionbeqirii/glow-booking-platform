"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export default function ServicesFilters({
  categories,
  currentCategory,
  currentStatus,
  currentQuery,
}: {
  categories: string[];
  currentCategory: string;
  currentStatus: string;
  currentQuery: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(currentQuery);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const t = setTimeout(() => setParam("q", query), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const selectCls = "rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent";

  return (
    <>
      <div className="relative min-w-[110px] flex-1 basis-40">
        <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kërko shërbime…"
          className="w-full rounded-lg border border-line-strong bg-surface py-2 pl-7 pr-2 text-sm text-ink outline-none transition-colors focus:border-accent"
        />
      </div>
      <select className={`${selectCls} w-[130px] shrink-0 truncate`} value={currentCategory} onChange={(e) => setParam("category", e.target.value)}>
        <option value="">Të gjitha Kategoritë</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select className={`${selectCls} w-[110px] shrink-0 truncate`} value={currentStatus} onChange={(e) => setParam("status", e.target.value)}>
        <option value="">Të gjitha Statuset</option>
        <option value="active">Aktive</option>
        <option value="inactive">Joaktive</option>
      </select>
    </>
  );
}
