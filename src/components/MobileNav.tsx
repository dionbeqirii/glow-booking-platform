"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "./HeaderNav";

// Hamburger menu for mobile and tablet (< lg). Mirrors the centered desktop
// nav in HeaderNav, sharing the same TABS config so the two never drift.
export default function MobileNav({ role }: { role: string }) {
  const pathname = usePathname();
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
        aria-label="Menyja"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft transition-colors hover:bg-white/50 hover:text-ink"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-40 w-56 overflow-hidden rounded-2xl bg-surface/80 p-1.5 shadow-[0_18px_45px_-18px_rgba(43,38,34,0.5)] ring-1 ring-white/60 backdrop-blur-2xl">
          {tabs.map((t) => {
            const active = pathname === t.href || (t.href !== home && pathname.startsWith(t.href));
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-accent text-white" : "text-ink-soft hover:bg-white/60 hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
