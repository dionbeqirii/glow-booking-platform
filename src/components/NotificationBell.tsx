"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Notification = {
  id: string;
  type: "CONFIRMATION" | "REMINDER" | "STATUS_CHANGE" | "QUEUE_CALL";
  message: string;
  read: boolean;
  createdAt: string;
};

const TYPE_ICON: Record<Notification["type"], string> = {
  CONFIRMATION: "✅",
  REMINDER: "⏰",
  STATUS_CHANGE: "🔄",
  QUEUE_CALL: "🔔",
};

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

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Njoftimet"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <span className="text-lg leading-none">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-80 overflow-hidden rounded-2xl bg-surface shadow-[0_1px_2px_rgba(43,38,34,0.04),0_16px_40px_-12px_rgba(43,38,34,0.25)] ring-1 ring-line">
          <div className="border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-ink">Njoftimet</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-faint">
                Nuk ke njoftime ende.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((n) => (
                  <li key={n.id} className="flex gap-3 px-4 py-3">
                    <span className="mt-0.5 text-base leading-none">{TYPE_ICON[n.type]}</span>
                    <div className="min-w-0">
                      <p className="text-sm text-ink">{n.message}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">{timeAgo(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
