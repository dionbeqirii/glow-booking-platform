"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

type Notification = {
  id: string;
  type: "CONFIRMATION" | "REMINDER" | "STATUS_CHANGE" | "QUEUE_CALL";
  message: string;
  read: boolean;
  createdAt: string;
};

// Per-type icon (stroke SVG, matches the rest of the app) and tone chip.
type Tone = "ok" | "gold" | "accent" | "warn";
const TYPE_TONE: Record<Notification["type"], Tone> = {
  CONFIRMATION: "ok",
  REMINDER: "gold",
  STATUS_CHANGE: "accent",
  QUEUE_CALL: "warn",
};
const TONE_CHIP: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  gold: "bg-gold-soft text-gold",
  accent: "bg-accent-soft text-accent",
  warn: "bg-warn-soft text-warn",
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function TypeIcon({ type }: { type: Notification["type"] }) {
  const size = 16;
  switch (type) {
    case "CONFIRMATION":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "REMINDER":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "STATUS_CHANGE":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 4v5h-5" />
        </svg>
      );
    case "QUEUE_CALL":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
  }
}

function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
    </svg>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "tani";
  if (min < 60) return `${min} min më parë`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} orë më parë`;
  const d = Math.round(h / 24);
  return `${d} ditë më parë`;
}

export default function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      // Silent: the bell must never break the page.
    }
  }, []);

  // Poll so a queue call or status change surfaces without a manual refresh.
  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  // Close when clicking outside the panel.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    // Opening the panel marks everything read.
    if (next && unread > 0) {
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      try {
        await fetch("/api/notifications", { method: "PATCH" });
      } catch {
        // ignore
      }
    }
  }

  async function deleteOne(n: Notification) {
    setDeletingId(n.id);
    // Optimistic: the row disappears immediately; resync on failure.
    setItems((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.read) setUnread((u) => Math.max(0, u - 1));
    try {
      const res = await fetch(`/api/notifications/${n.id}`, { method: "DELETE" });
      if (!res.ok) await load();
    } catch {
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  async function clearAll() {
    setClearing(true);
    setClearError(null);
    try {
      const res = await fetch("/api/notifications", { method: "DELETE" });
      if (!res.ok) {
        setClearError("Fshirja dështoi. Provo sërish.");
        return;
      }
      setItems([]);
      setUnread(0);
      setConfirmClearAll(false);
    } catch {
      setClearError("Nuk u lidh dot me serverin");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Njoftimet"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
      >
        {/* Transparent, stroked bell — matches the rest of the header icons. */}
        <svg width="19" height="19" viewBox="0 0 24 24" {...stroke} aria-hidden>
          <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 20a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-80 overflow-hidden rounded-2xl bg-surface shadow-[0_1px_2px_rgba(43,38,34,0.04),0_18px_45px_-14px_rgba(43,38,34,0.28)] ring-1 ring-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Njoftimet</p>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                {items.length}
              </span>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setClearError(null);
                    setConfirmClearAll(true);
                  }}
                  className="text-xs font-medium text-danger hover:underline"
                >
                  Fshi të gjitha
                </button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted text-ink-faint">
                  <svg width="18" height="18" viewBox="0 0 24 24" {...stroke} aria-hidden>
                    <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
                    <path d="M10 20a2 2 0 0 0 4 0" />
                  </svg>
                </span>
                <p className="text-sm text-ink-faint">Nuk ke njoftime ende.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => (
                  <li key={n.id} className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/60">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${TONE_CHIP[TYPE_TONE[n.type]]}`}>
                      <TypeIcon type={n.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-ink">{n.message}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">{timeAgo(n.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteOne(n)}
                      disabled={deletingId === n.id}
                      aria-label="Fshi njoftimin"
                      className="shrink-0 self-start rounded-md p-1 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                    >
                      <TrashIcon />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* "Fshi të gjitha" confirmation — portalled to <body> so the header's
          backdrop-blur containing block doesn't trap the fixed overlay. */}
      {confirmClearAll &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !clearing) setConfirmClearAll(false);
            }}
          >
            <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-[0_24px_60px_-20px_rgba(43,38,34,0.55)] ring-1 ring-line">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
                <TrashIcon size={22} />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-ink">Fshi të gjitha njoftimet?</h2>
              <p className="mt-1.5 text-sm text-ink-soft">
                Të gjitha njoftimet e tua do të fshihen. Ky veprim nuk mund të kthehet mbrapsht.
              </p>
              {clearError && <p className="mt-3 text-sm text-danger">{clearError}</p>}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  disabled={clearing}
                  className="flex-1 rounded-xl bg-surface px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-line-strong transition-colors hover:bg-surface-muted disabled:opacity-50"
                >
                  Anulo
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={clearing}
                  className="flex-1 rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {clearing ? "Duke fshirë…" : "Po, fshi"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
