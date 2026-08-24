"use client";

import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_LABEL,
  type DashboardWidgetId,
  type WidgetLayoutItem,
} from "@/lib/dashboard-widgets";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PencilIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}
function GripIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 10.5 7 10.5 7a13.2 13.2 0 0 1-2.16 3.19M6.6 6.6C3.5 8.6 1.5 12 1.5 12s3.5 7 10.5 7a10.6 10.6 0 0 0 5.1-1.25" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M2 2l20 20" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export default function DashboardWidgetGrid({
  widgets,
  initialLayout,
}: {
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>;
  initialLayout: WidgetLayoutItem[];
}) {
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(initialLayout);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // dragId (state) drives the dragged row's highlight styling. dragIdRef and
  // layoutRef mirror the same values for reads inside drag handlers: those
  // fire in a fast, synchronous burst (dragstart -> dragover -> drop) where
  // a handler can still be running against the *previous* render's closure
  // because React hasn't re-rendered yet — a plain useState read there would
  // silently see stale (often null) values. Refs update instantly, so the
  // handlers always see the true current drag target and order.
  const [dragId, setDragId] = useState<DashboardWidgetId | null>(null);
  const dragIdRef = useRef<DashboardWidgetId | null>(null);
  const layoutRef = useRef<WidgetLayoutItem[]>(initialLayout);

  async function persist(next: WidgetLayoutItem[]) {
    setSaving(true);
    try {
      await fetch("/api/admin/dashboard-layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  function applyLayout(next: WidgetLayoutItem[]) {
    layoutRef.current = next;
    setLayout(next);
  }

  function toggle(id: DashboardWidgetId) {
    const next = layoutRef.current.map((w) => (w.id === id ? { ...w, hidden: !w.hidden } : w));
    applyLayout(next);
    persist(next);
  }

  function dragStart(id: DashboardWidgetId) {
    dragIdRef.current = id;
    setDragId(id);
  }

  // Live-reorders as the dragged row passes over another row (Trello-style);
  // the actual save fires once on drop, not on every hover.
  function dragOver(overId: DashboardWidgetId) {
    const current = dragIdRef.current;
    if (!current || current === overId) return;
    const prev = layoutRef.current;
    const from = prev.findIndex((w) => w.id === current);
    const to = prev.findIndex((w) => w.id === overId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...prev];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    applyLayout(next);
  }

  function dropDone() {
    if (dragIdRef.current) persist(layoutRef.current);
    dragIdRef.current = null;
    setDragId(null);
  }

  async function reset() {
    setSaving(true);
    try {
      await fetch("/api/admin/dashboard-layout", { method: "DELETE" });
      applyLayout(DASHBOARD_WIDGET_IDS.map((id) => ({ id, hidden: false })));
    } finally {
      setSaving(false);
    }
  }

  const visible = layout.filter((w) => !w.hidden && widgets[w.id]);
  const rows = layout.filter((w) => widgets[w.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Rregullo panelin"
          title="Rregullo panelin"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <PencilIcon />
        </button>
      </div>

      {visible.map((w) => (
        <div key={w.id}>{widgets[w.id]}</div>
      ))}

      {modalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setModalOpen(false);
            }}
          >
            <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-surface shadow-[0_24px_60px_-20px_rgba(31,42,34,0.35)] ring-1 ring-line">
              <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-ink">Rregullo panelin</h2>
                  <p className="mt-0.5 text-xs text-ink-faint">Tërhiqi për të ndryshuar renditjen; fike ato që s&apos;t&apos;i duhen.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  aria-label="Mbyll"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                >
                  <CloseIcon />
                </button>
              </div>

              <ul className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
                {rows.map((w) => (
                  <li
                    key={w.id}
                    draggable
                    onDragStart={() => dragStart(w.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      dragOver(w.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      dropDone();
                    }}
                    onDragEnd={dropDone}
                    className={`flex cursor-grab items-center gap-2 rounded-xl px-2.5 py-2 ring-1 ring-transparent transition-colors active:cursor-grabbing ${
                      dragId === w.id ? "bg-accent-soft ring-line-strong" : "hover:bg-surface-muted"
                    }`}
                  >
                    <span className="text-ink-faint">
                      <GripIcon />
                    </span>
                    <span className={`flex-1 text-sm ${w.hidden ? "text-ink-faint" : "text-ink"}`}>
                      {DASHBOARD_WIDGET_LABEL[w.id]}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggle(w.id)}
                      disabled={saving}
                      aria-label={w.hidden ? `Shfaq: ${DASHBOARD_WIDGET_LABEL[w.id]}` : `Fshih: ${DASHBOARD_WIDGET_LABEL[w.id]}`}
                      title={w.hidden ? "Shfaq" : "Fshih"}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${
                        w.hidden ? "text-ink-faint hover:bg-surface-muted hover:text-ink" : "text-accent hover:bg-accent-soft"
                      }`}
                    >
                      {w.hidden ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
                <button
                  type="button"
                  onClick={reset}
                  disabled={saving}
                  className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                >
                  Rikthe rregullimin fillestar
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  U bë
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
