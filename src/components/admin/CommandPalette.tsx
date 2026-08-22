"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type Command = {
  id: string;
  label: string;
  hint?: string;
  group: "Navigim" | "Veprime";
  run: () => void;
};

const NAV_ITEMS = [
  { label: "Paneli", href: "/admin" },
  { label: "Shërbimet", href: "/admin/sherbimet" },
  { label: "Ofertat", href: "/admin/ofertat" },
  { label: "Stafi", href: "/admin/stafi" },
  { label: "Klientët", href: "/admin/klientet" },
  { label: "Radha", href: "/admin/radha" },
  { label: "Historiku", href: "/admin/historiku" },
];

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// 3.5 — Ctrl/Cmd+K command palette: fast navigation between admin pages plus
// a couple of one-shot actions (PDF export), available from anywhere in the
// admin section without hunting through the nav bar.
export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the search + selection whenever the palette opens or the query
  // changes — done during render (React's documented pattern for "adjust
  // state when a prop/derived value changes") rather than in an effect, so
  // it never causes an extra committed render.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }
  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setActiveIndex(0);
  }

  const commands: Command[] = useMemo(() => {
    const nav: Command[] = NAV_ITEMS.map((item) => ({
      id: `nav-${item.href}`,
      label: item.label,
      hint: item.href,
      group: "Navigim",
      run: () => router.push(item.href),
    }));
    const actions: Command[] = [1, 3, 6].map((m) => ({
      id: `pdf-${m}`,
      label: `Eksporto raport PDF — ${m} muaj`,
      group: "Veprime",
      run: () => window.open(`/api/reports/pdf?months=${m}`, "_blank"),
    }));
    return [...nav, ...actions];
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [query, commands]);

  // Global shortcut: works from any admin screen, not just while the
  // trigger button is visible/focused.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focusing an input is a real DOM side effect — this one does belong here.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  function execute(cmd: Command) {
    cmd.run();
    setOpen(false);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIndex];
      if (cmd) execute(cmd);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Hap paletën e komandave"
        title="Kërko (Ctrl+K)"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <SearchIcon />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pt-[12vh] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-[0_24px_60px_-20px_rgba(43,38,34,0.55)] ring-1 ring-line">
              <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                <span className="text-ink-faint">
                  <SearchIcon />
                </span>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Kërko faqe ose veprim…"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
                <kbd className="rounded border border-line-strong px-1.5 py-0.5 text-[10px] text-ink-faint">Esc</kbd>
              </div>

              <div className="max-h-80 overflow-y-auto p-1.5">
                {filtered.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-ink-faint">Asnjë rezultat.</p>
                ) : (
                  filtered.map((cmd, i) => {
                    const showGroupHeader = i === 0 || filtered[i - 1].group !== cmd.group;
                    const active = i === activeIndex;
                    return (
                      <div key={cmd.id}>
                        {showGroupHeader && (
                          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                            {cmd.group}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => execute(cmd)}
                          onMouseEnter={() => setActiveIndex(i)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                            active ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface-muted"
                          }`}
                        >
                          <span>{cmd.label}</span>
                          {cmd.hint && <span className="text-xs text-ink-faint">{cmd.hint}</span>}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[11px] text-ink-faint">
                <span>↑↓ lëviz</span>
                <span>⏎ zgjidh</span>
                <span>Esc mbyll</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
