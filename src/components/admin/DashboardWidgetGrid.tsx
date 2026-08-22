"use client";

import { useState, type ReactNode } from "react";
import {
  DASHBOARD_WIDGET_IDS,
  DASHBOARD_WIDGET_LABEL,
  type DashboardWidgetId,
  type WidgetLayoutItem,
} from "@/lib/dashboard-widgets";

export default function DashboardWidgetGrid({
  widgets,
  initialLayout,
}: {
  widgets: Partial<Record<DashboardWidgetId, ReactNode>>;
  initialLayout: WidgetLayoutItem[];
}) {
  const [layout, setLayout] = useState<WidgetLayoutItem[]>(initialLayout);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  async function persist(next: WidgetLayoutItem[]) {
    setLayout(next);
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

  function hide(id: DashboardWidgetId) {
    persist(layout.map((w) => (w.id === id ? { ...w, hidden: true } : w)));
  }
  function show(id: DashboardWidgetId) {
    persist(layout.map((w) => (w.id === id ? { ...w, hidden: false } : w)));
  }
  // Swaps with the nearest visible neighbor in that direction, skipping over
  // hidden entries — otherwise moving "up" past a hidden widget would just
  // reorder it invisibly and appear to do nothing.
  function move(id: DashboardWidgetId, dir: -1 | 1) {
    const idx = layout.findIndex((w) => w.id === id);
    if (idx < 0) return;
    let target = idx + dir;
    while (target >= 0 && target < layout.length && layout[target].hidden) target += dir;
    if (target < 0 || target >= layout.length) return;
    const next = [...layout];
    [next[idx], next[target]] = [next[target], next[idx]];
    persist(next);
  }
  async function reset() {
    setSaving(true);
    try {
      await fetch("/api/admin/dashboard-layout", { method: "DELETE" });
      setLayout(DASHBOARD_WIDGET_IDS.map((id) => ({ id, hidden: false })));
    } finally {
      setSaving(false);
    }
  }

  const visible = layout.filter((w) => !w.hidden && widgets[w.id]);
  const hidden = layout.filter((w) => w.hidden && widgets[w.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium ring-1 transition-colors ${
            editMode ? "bg-accent text-white ring-accent" : "bg-surface text-ink-soft ring-line-strong hover:text-ink"
          }`}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
          {editMode ? "Mbyll rregullimin" : "Rregullo panelin"}
        </button>
      </div>

      {editMode && (
        <div className="rounded-2xl bg-surface-muted p-4 ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-faint">
              Fshih widget-et që nuk i duhen, ndrysho renditjen me shigjetat, ose shtoji sërish më poshtë.
            </p>
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="shrink-0 text-xs font-medium text-danger hover:underline disabled:opacity-50"
            >
              Rikthe rregullimin fillestar
            </button>
          </div>
          {hidden.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {hidden.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => show(w.id)}
                  disabled={saving}
                  className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink ring-1 ring-line-strong transition-colors hover:ring-accent disabled:opacity-50"
                >
                  <span className="text-ok">+</span> {DASHBOARD_WIDGET_LABEL[w.id]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {visible.map((w, i) => (
        <div key={w.id} className="relative">
          {editMode && (
            <div className="absolute -top-3 right-3 z-10 flex items-center gap-1 rounded-full bg-surface px-1.5 py-1 shadow-[0_4px_12px_-4px_rgba(43,38,34,0.3)] ring-1 ring-line-strong">
              <button
                type="button"
                onClick={() => move(w.id, -1)}
                disabled={i === 0 || saving}
                aria-label="Lëviz lart"
                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-30"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => move(w.id, 1)}
                disabled={i === visible.length - 1 || saving}
                aria-label="Lëviz poshtë"
                className="flex h-6 w-6 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-30"
              >
                ▼
              </button>
              <button
                type="button"
                onClick={() => hide(w.id)}
                disabled={saving}
                aria-label={`Fshih: ${DASHBOARD_WIDGET_LABEL[w.id]}`}
                title="Fshih këtë widget"
                className="flex h-6 w-6 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger-soft disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          )}
          {widgets[w.id]}
        </div>
      ))}
    </div>
  );
}
