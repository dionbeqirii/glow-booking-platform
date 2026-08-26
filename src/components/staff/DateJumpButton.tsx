"use client";

import { useRouter } from "next/navigation";

// A real native date-picker trigger: the browser's own calendar UI, jumping
// straight to /staff/orari?date=... on pick — not a decorative icon.
export default function DateJumpButton({ value, basePath }: { value: string; basePath: string }) {
  const router = useRouter();
  return (
    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line-strong text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
      <input
        type="date"
        defaultValue={value}
        onChange={(e) => {
          if (e.target.value) router.push(`${basePath}?date=${e.target.value}`);
        }}
        aria-label="Zgjidh datën"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}
