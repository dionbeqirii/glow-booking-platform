"use client";

import { useMemo, useState } from "react";
import type { AuditLogRow } from "@/lib/audit-log";
import { auditActionMeta, AUDIT_TONE_STYLE } from "@/lib/audit-labels";

const PAGE_SIZES = [10, 25, 50];

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || "?"
  );
}

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const keep = new Set<number>([1, 2, total - 1, total, current - 1, current, current + 1]);
  const sorted = [...keep].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) result.push("…");
    result.push(p);
    prev = p;
  }
  return result;
}

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function IcSearch() {
  return <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" width="14" height="14" viewBox="0 0 24 24" {...stroke}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
}
function IcCalendar() {
  return <svg width="13" height="13" viewBox="0 0 24 24" {...stroke} className="shrink-0 text-ink-faint" aria-hidden><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function IcSort({ dir }: { dir: "asc" | "desc" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform ${dir === "asc" ? "rotate-180" : ""}`} aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function IcRefresh() {
  return <svg width="15" height="15" viewBox="0 0 24 24" {...stroke} aria-hidden><path d="M3 12a9 9 0 0 1 15.4-6.4L21 8M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.4 6.4L3 16M3 21v-5h5" /></svg>;
}

export default function AuditLogWorkspace({ rows }: { rows: AuditLogRow[] }) {
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const modules = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(auditActionMeta(r.action).module));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const actionOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.action, auditActionMeta(r.action).label));
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const userOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => { if (r.userId) map.set(r.userId, r.userName); });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  function withReset<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(1); };
  }

  function resetFilters() {
    setQuery(""); setModuleFilter(""); setActionFilter(""); setUserFilter(""); setFrom(""); setTo(""); setPage(1);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      const meta = auditActionMeta(r.action);
      if (moduleFilter && meta.module !== moduleFilter) return false;
      if (actionFilter && r.action !== actionFilter) return false;
      if (userFilter && r.userId !== userFilter) return false;
      if (from && r.createdAt.slice(0, 10) < from) return false;
      if (to && r.createdAt.slice(0, 10) > to) return false;
      if (q) {
        const haystack = `${r.userName} ${r.userEmail ?? ""} ${meta.label} ${meta.module} ${r.details ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => (sortDir === "desc" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
  }, [rows, query, moduleFilter, actionFilter, userFilter, from, to, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const rangeFrom = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeTo = Math.min(safePage * pageSize, filtered.length);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-line p-3">
        <div className="relative min-w-[130px] flex-1 basis-40">
          <IcSearch />
          <input
            value={query}
            onChange={(e) => withReset(setQuery)(e.target.value)}
            placeholder="Kërko…"
            className="w-full rounded-lg border border-line-strong bg-surface py-2 pl-7 pr-2 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => withReset(setModuleFilter)(e.target.value)}
          className="w-[92px] shrink-0 truncate rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
        >
          <option value="">Moduli</option>
          {modules.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => withReset(setActionFilter)(e.target.value)}
          className="w-[100px] shrink-0 truncate rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
        >
          <option value="">Veprimi</option>
          {actionOptions.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <select
          value={userFilter}
          onChange={(e) => withReset(setUserFilter)(e.target.value)}
          className="w-[100px] shrink-0 truncate rounded-lg border border-line-strong bg-surface px-2 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
        >
          <option value="">Përdoruesi</option>
          {userOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
        </select>
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-line-strong bg-surface py-1 pl-2 pr-1">
          <IcCalendar />
          <input type="date" value={from} onChange={(e) => withReset(setFrom)(e.target.value)} className="w-[82px] border-0 bg-transparent p-1 text-xs text-ink-soft outline-none" />
          <span className="text-ink-faint">–</span>
          <input type="date" value={to} onChange={(e) => withReset(setTo)(e.target.value)} className="w-[82px] border-0 bg-transparent p-1 text-xs text-ink-soft outline-none" />
        </div>
        <button
          type="button"
          onClick={resetFilters}
          title="Pastro filtrat"
          aria-label="Pastro filtrat"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line-strong text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <IcRefresh />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col style={{ width: "13%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "34%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:overflow-hidden [&>th]:bg-surface">
              <th className="px-3 py-2 font-medium">
                <button type="button" onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))} className="flex items-center gap-1 transition-colors hover:text-ink">
                  Data &amp; Ora
                  <IcSort dir={sortDir} />
                </button>
              </th>
              <th className="px-3 py-2 font-medium">Përdoruesi</th>
              <th className="px-3 py-2 font-medium">Veprimi</th>
              <th className="px-3 py-2 font-medium">Moduli</th>
              <th className="px-3 py-2 font-medium">Detajet</th>
              <th className="px-3 py-2 font-medium">Adresa IP</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-faint">
                  {rows.length === 0 ? "Ende s'ka regjistrime në audit log." : "Asnjë regjistrim nuk përputhet me filtrat."}
                </td>
              </tr>
            ) : (
              pageItems.map((r) => {
                const meta = auditActionMeta(r.action);
                const tone = AUDIT_TONE_STYLE[meta.tone];
                return (
                  <tr key={r.id} className="border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
                    <td className="overflow-hidden px-3 py-2 text-ink-soft">
                      <span className="block truncate">{r.whenLabel}</span>
                    </td>
                    <td className="overflow-hidden px-3 py-2">
                      <div className="flex items-center gap-2">
                        {r.userAvatarUrl ? (
                          <img src={r.userAvatarUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                            {initials(r.userName)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{r.userName}</p>
                          {r.userEmail && <p className="truncate text-[11px] text-ink-faint">{r.userEmail}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="overflow-hidden px-3 py-2">
                      <span className={`inline-flex max-w-full items-center rounded-full px-2 py-1 text-[11px] font-semibold ${tone.bg} ${tone.text}`}>
                        <span className="truncate">{meta.label}</span>
                      </span>
                    </td>
                    <td className="overflow-hidden px-3 py-2 text-ink-soft">
                      <span className="block truncate">{meta.module}</span>
                    </td>
                    <td className="overflow-hidden px-3 py-2 text-ink-soft">
                      <span className="block truncate" title={r.details ?? meta.label}>{r.details ?? meta.label}</span>
                    </td>
                    <td className="overflow-hidden px-3 py-2 text-ink-faint">
                      <span className="block truncate">{r.ipAddress ?? "—"}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-xs text-ink-faint">
        <span>Duke shfaqur {rangeFrom} deri {rangeTo} nga {filtered.length} regjistrime</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Faqja e mëparshme"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            {pageNumbers(safePage, totalPages).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1 text-ink-faint">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`flex h-6 min-w-6 items-center justify-center rounded-lg px-1 text-xs font-medium transition-colors ${
                    p === safePage ? "bg-accent text-white" : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Faqja tjetër"
              className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-xs text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
          >
            {PAGE_SIZES.map((s) => <option key={s} value={s}>{s} / faqe</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
