"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ClientRow, ClientSegment } from "@/lib/clients-catalog";
import NewClientButton from "./NewClientButton";

const SEGMENT_PILL: Record<ClientSegment, { bg: string; text: string; dot: string }> = {
  active: { bg: "bg-ok-soft", text: "text-ok", dot: "bg-ok" },
  new: { bg: "bg-accent-soft", text: "text-accent", dot: "bg-accent" },
  inactive: { bg: "bg-surface-muted", text: "text-ink-faint", dot: "bg-ink-faint" },
};

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

export default function ClientsTable({ rows }: { rows: ClientRow[] }) {
  const t = useTranslations("AdminClients");
  const SEGMENT_LABEL: Record<ClientSegment, string> = {
    active: t("segmentActive"),
    new: t("segmentNew"),
    inactive: t("segmentInactive"),
  };
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<ClientSegment | "">("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((c) => {
      if (segment && c.segment !== segment) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q) && !(c.phone ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, segment]);

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
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-lg border border-line-strong bg-surface py-2 pl-7 pr-2 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </div>
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value as ClientSegment | "")}
          className="w-[130px] shrink-0 truncate rounded-lg border border-line-strong bg-surface px-2.5 py-2 text-sm text-ink-soft outline-none transition-colors hover:text-ink focus:border-accent"
        >
          <option value="">{t("allClientsOption")}</option>
          <option value="active">{t("segmentActive")}</option>
          <option value="new">{t("segmentNew")}</option>
          <option value="inactive">{t("segmentInactive")}</option>
        </select>
        <div className="ml-auto">
          <NewClientButton />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full table-fixed text-left text-xs">
          <colgroup>
            <col style={{ width: "23%" }} />
            <col style={{ width: "21%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "12%" }} />
            <col className="w-16" />
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase tracking-wide text-ink-faint [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:overflow-hidden [&>th]:bg-surface">
              <th className="px-3 py-2 font-medium">{t("colClient")}</th>
              <th className="px-3 py-2 font-medium">{t("colContact")}</th>
              <th className="px-3 py-2 font-medium">{t("colMemberSince")}</th>
              <th className="px-3 py-2 font-medium">{t("colBookings")}</th>
              <th className="px-3 py-2 font-medium">{t("colLastVisit")}</th>
              <th className="px-3 py-2 font-medium">{t("colStatus")}</th>
              <th className="px-3 py-2 font-medium">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-faint">
                  {rows.length === 0 ? t("noClientsYet") : t("noMatch")}
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const pill = SEGMENT_PILL[c.segment];
                return (
                  <tr key={c.id} className="border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
                    <td className="overflow-hidden px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                          {initials(c.name)}
                        </span>
                        <span className="min-w-0 truncate font-medium text-ink">{c.name}</span>
                      </div>
                    </td>
                    <td className="overflow-hidden px-3 py-2">
                      <div className="truncate text-ink">{c.email}</div>
                      <div className="truncate text-[11px] text-ink-faint">{c.phone ?? "—"}</div>
                    </td>
                    <td className="overflow-hidden px-3 py-2 text-ink-soft">
                      <span className="block truncate">{c.joinedLabel}</span>
                    </td>
                    <td className="overflow-hidden px-3 py-2 text-ink-soft">
                      <span className="block truncate">{c.bookingsCount}{c.queueCount > 0 ? ` (+${c.queueCount})` : ""}</span>
                    </td>
                    <td className="overflow-hidden px-3 py-2 text-ink-soft">
                      <span className="block truncate">{c.lastVisitLabel ?? <span className="text-ink-faint">{t("noneLabel")}</span>}</span>
                    </td>
                    <td className="overflow-hidden px-3 py-2">
                      <span className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${pill.bg} ${pill.text}`}>
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${pill.dot}`} />
                        <span className="truncate">{SEGMENT_LABEL[c.segment]}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/klientet/${c.id}`}
                        title={t("viewProfileTitle")}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 border-t border-line px-3 py-2 text-xs text-ink-faint">
        {t("showingCount", { shown: filtered.length, total: rows.length })}
      </div>
    </div>
  );
}
