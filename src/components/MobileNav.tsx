"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { TABS } from "./Sidebar";

// Hamburger menu for mobile and tablet (< lg), where the persistent sidebar
// is hidden. Shares the same TABS config as Sidebar so the two never drift.
export default function MobileNav({ role }: { role: string }) {
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const tCommon = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const tabs = TABS[role] ?? [];
  const home = tabs[0]?.href;

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close when the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // A single-tab role (staff) needs no menu.
  if (tabs.length <= 1) return null;

  return (
    <div className="relative lg:hidden" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={tCommon("menu")}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-2xl bg-surface p-1.5 shadow-[0_18px_45px_-18px_rgba(31,42,34,0.35)] ring-1 ring-line">
          {tabs.map((tab) => {
            const active = pathname === tab.href || (tab.href !== home && pathname.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent text-white" : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {t(tab.key)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
