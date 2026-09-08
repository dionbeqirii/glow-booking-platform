"use client";

import { useRef, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LOCALES, type AppLocale } from "@/i18n/locales";

// Small, standalone header control — works identically for a signed-in user
// (header, all roles) and a guest on the login/register screens (no session
// required; /api/locale only persists to the account when one exists).
export default function LanguageSwitcher({ light = false }: { light?: boolean }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("Language");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function choose(next: AppLocale) {
    setOpen(false);
    if (next === locale) return;
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    startTransition(() => router.refresh());
  }

  const buttonCls = light
    ? "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-ink ring-1 ring-white/50 bg-white/25 backdrop-blur-sm transition-colors hover:bg-white/35"
    : "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-ink-soft ring-1 ring-line-strong transition-colors hover:bg-surface-muted hover:text-ink";

  return (
    <div className="relative" ref={boxRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={t("label")} disabled={pending} className={buttonCls}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" />
        </svg>
        {locale.toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-xl border border-line-strong bg-surface py-1 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => choose(l)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted ${l === locale ? "font-semibold text-accent" : "text-ink"}`}
            >
              {t(l)}
              {l === locale && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
