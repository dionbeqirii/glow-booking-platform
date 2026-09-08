"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import type { StaffClientRow, ClientListStatus } from "@/lib/clients-catalog";
import NewClientButton from "@/components/admin/NewClientButton";

const STATUS_PILL: Record<ClientListStatus, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-ok-soft", text: "text-ok", dot: "bg-ok" },
  inactive: { bg: "bg-surface-muted", text: "text-ink-faint", dot: "bg-ink-faint" },
};

type LastVisitFilter = "" | "week" | "month" | "stale" | "never";
const PAGE_SIZE_OPTIONS = [8, 15, 30];

type T = (key: string, values?: Record<string, string | number>) => string;
function daysAgoLabel(days: number | null, t: T): string {
  if (days === null) return "";
  if (days <= 0) return t("todayLabel");
  if (days === 1) return t("daysAgoOne");
  return t("daysAgoOther", { count: days });
}

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

export default function StaffClientsTable({ rows }: { rows: StaffClientRow[] }) {
  const t = useTranslations("StaffClients");
  const locale = useLocale();
  const STATUS_LABEL: Record<ClientListStatus, string> = { active: t("statusActive"), inactive: t("statusInactive") };
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ClientListStatus | "">("");
  const [favoriteService, setFavoriteService] = useState("");
  const [lastVisit, setLastVisit] = useState<LastVisitFilter>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenuId]);

  const favoriteServiceOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.favoriteService && set.add(r.favoriteService));
    return [...set].sort((a, b) => a.localeCompare(b, locale));
  }, [rows, locale]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((c) => {
      if (status && c.status !== status) return false;
      if (favoriteService && c.favoriteService !== favoriteService) return false;
      if (lastVisit) {
        const days = c.daysSinceVisit;
        if (lastVisit === "never" && days !== null) return false;
        if (lastVisit === "week" && (days === null || days > 7)) return false;
        if (lastVisit === "month" && (days === null || days > 30)) return false;
        if (lastVisit === "stale" && (days === null || days <= 30)) return false;
      }
      if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q) && !(c.phone ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, status, favoriteService, lastVisit]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, filtered.length);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function withReset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-line p-3">
        <div className="relative min-w-[130px] flex-1 basis-52">
          <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={(e) => withReset(setQuery)(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-line-strong bg-surface py-2 pl-7 pr-2 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </div>
        <select
          value={status}
          onChange={(e) => withReset(setStatus)(e.target.value as ClientListStatus | "")}
          className="w-[172px] shrink-0 truncate rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
        >
          <option value="">{t("allStatusesOption")}</option>
          <option value="active">{t("statusActive")}</option>
          <option value="inactive">{t("statusInactive")}</option>
        </select>
        <select
          value={favoriteService}
          onChange={(e) => withReset(setFavoriteService)(e.target.value)}
          className="w-[178px] shrink-0 truncate rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
        >
          <option value="">{t("allServicesOption")}</option>
          {favoriteServiceOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={lastVisit}
          onChange={(e) => withReset(setLastVisit)(e.target.value as LastVisitFilter)}
          className="w-[136px] shrink-0 truncate rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
        >
          <option value="">{t("lastVisitFilterLabel")}</option>
          <option value="week">{t("thisWeekOption")}</option>
          <option value="month">{t("thisMonthOption")}</option>
          <option value="stale">{t("over30DaysOption")}</option>
          <option value="never">{t("neverOption")}</option>
        </select>
        <div className="ml-auto">
          <NewClientButton />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col style={{ width: "20%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "11%" }} />
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:overflow-hidden [&>th]:bg-surface">
              <th className="px-3 py-2 font-medium">{t("colClient")}</th>
              <th className="px-3 py-2 font-medium">{t("colContact")}</th>
              <th className="px-3 py-2 font-medium">{t("lastVisitFilterLabel")}</th>
              <th className="px-3 py-2 font-medium">{t("colVisits")}</th>
              <th className="px-3 py-2 font-medium">{t("colFavoriteService")}</th>
              <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
              <th className="px-3 py-2 font-medium">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-faint">
                  {rows.length === 0 ? t("noClientsYet") : t("noMatch")}
                </td>
              </tr>
            ) : (
              pageRows.map((c) => {
                const pill = STATUS_PILL[c.status];
                return (
                  <tr key={c.id} className="border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
                    <td className="overflow-hidden px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                          {initials(c.name)}
                        </span>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="min-w-0 truncate font-medium text-ink">{c.name}</span>
                          {c.isLoyal && (
                            <span className="shrink-0 rounded-full bg-gold-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gold">
                              {t("loyalBadge")}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="overflow-hidden px-3 py-2">
                      <div className="truncate text-ink">{c.email}</div>
                      <div className="truncate text-[11px] text-ink-faint">{c.phone ?? "—"}</div>
                    </td>
                    <td className="overflow-hidden px-3 py-2 text-ink-soft">
                      {c.lastVisitLabel ? (
                        <>
                          <div className="truncate">{c.lastVisitLabel}</div>
                          <div className="truncate text-[11px] text-ink-faint">{daysAgoLabel(c.daysSinceVisit, t)}</div>
                        </>
                      ) : (
                        <span className="text-ink-faint">{t("neverOption")}</span>
                      )}
                    </td>
                    <td className="overflow-hidden px-3 py-2 text-ink-soft">
                      <span className="block truncate">{c.visitsCount}</span>
                    </td>
                    <td className="overflow-hidden px-3 py-2 text-ink-soft">
                      <span className="block truncate">{c.favoriteService ?? "—"}</span>
                    </td>
                    <td className="overflow-hidden px-3 py-2">
                      <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${pill.bg} ${pill.text}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pill.dot}`} />
                        <span className="truncate">{STATUS_LABEL[c.status]}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5">
                        <a
                          href={`mailto:${c.email}`}
                          title={t("sendEmailTitle")}
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </a>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setOpenMenuId(openMenuId === c.id ? null : c.id)}
                            aria-label={t("moreActionsAria")}
                            className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <circle cx="12" cy="5" r="1.6" />
                              <circle cx="12" cy="12" r="1.6" />
                              <circle cx="12" cy="19" r="1.6" />
                            </svg>
                          </button>
                          {openMenuId === c.id && (
                            <div ref={menuRef} className="absolute right-0 top-7 z-20 w-44 overflow-hidden rounded-xl border border-line-strong bg-surface py-1 shadow-[0_12px_32px_-12px_rgba(31,42,34,0.25)]">
                              <Link href={`/staff/klientet/${c.id}`} className="block px-3.5 py-2 text-left text-sm text-ink transition-colors hover:bg-surface-muted">
                                {t("viewProfileLink")}
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-xs text-ink-faint">
        <span>
          {filtered.length !== rows.length
            ? t("showingRangeWithTotal", { from, to, total: filtered.length, allTotal: rows.length })
            : t("showingRange", { from, to, total: filtered.length })}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-xs text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{t("perPage", { count: n })}</option>
            ))}
          </select>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label={t("prevPage")}
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
              aria-label={t("nextPage")}
              className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink disabled:pointer-events-none disabled:opacity-30"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
