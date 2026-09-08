"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Card, SectionTitle, Field, Alert, EmptyState, buttonStyles, inputStyles } from "../ui";
import { weekdayFullLabelsSundayFirst } from "@/lib/calendar-labels";

export type HourRow = { weekday: number; startTime: string; endTime: string };
export type TimeOffRow = { id: string; from: string; until: string; reason: string | null };

export default function StaffDetail({
  staffId,
  staffName,
  services,
  initialSkills,
  initialHours,
  timeOff,
}: {
  staffId: string;
  staffName: string;
  services: { id: string; name: string; durationMin: number }[];
  initialSkills: string[];
  initialHours: HourRow[];
  timeOff: TimeOffRow[];
}) {
  const t = useTranslations("AdminStaff");
  const tWeekday = useTranslations("Weekday");
  const locale = useLocale();
  const WEEKDAYS = weekdayFullLabelsSundayFirst(tWeekday);
  const router = useRouter();
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [hours, setHours] = useState<HourRow[]>(initialHours);
  const [off, setOff] = useState({ from: "", until: "", reason: "" });
  const [newPassword, setNewPassword] = useState("");

  const [msg, setMsg] = useState<{ text: string; tone: "error" | "success" } | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(url: string, method: string, body?: unknown, okText?: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg({ text: data.error ?? t("actionFailed"), tone: "error" });
        return false;
      }
      if (okText) setMsg({ text: okText, tone: "success" });
      router.refresh();
      return true;
    } catch {
      setMsg({ text: t("errorNetwork"), tone: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  }

  function toggleSkill(id: string) {
    setSkills((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function addInterval(weekday: number) {
    setHours((prev) => [...prev, { weekday, startTime: "09:00", endTime: "17:00" }]);
  }

  function updateInterval(index: number, patch: Partial<HourRow>) {
    setHours((prev) => prev.map((h, i) => (i === index ? { ...h, ...patch } : h)));
  }

  function removeInterval(index: number) {
    setHours((prev) => prev.filter((_, i) => i !== index));
  }

  async function addTimeOff(e: React.FormEvent) {
    e.preventDefault();
    const ok = await send(`/api/staff/${staffId}/timeoff`, "POST", off, t("timeOffAdded"));
    if (ok) setOff({ from: "", until: "", reason: "" });
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const ok = await send(
      `/api/staff/${staffId}`,
      "PATCH",
      { password: newPassword },
      t("passwordChanged")
    );
    if (ok) setNewPassword("");
  }

  return (
    <div className="flex flex-col gap-4">
      {msg && <Alert message={msg.text} tone={msg.tone} />}

      {/* ---- Skills (FR-02) ---- */}
      <Card>
        <SectionTitle
          title={t("skillsTitle")}
          hint={t("skillsHint", { name: staffName })}
        />
        {services.length === 0 ? (
          <EmptyState text={t("noServicesRegistered")} />
        ) : (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <label
                  key={s.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    checked={skills.includes(s.id)}
                    onChange={() => toggleSkill(s.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-ink">{s.name}</span>
                  <span className="ml-auto text-xs text-ink-faint">{s.durationMin} min</span>
                </label>
              ))}
            </div>
            <button
              onClick={() =>
                send(
                  `/api/staff/${staffId}/services`,
                  "PUT",
                  { serviceIds: skills },
                  t("skillsSaved")
                )
              }
              disabled={busy}
              className={`mt-4 ${buttonStyles.primary}`}
            >
              {t("saveSkills")}
            </button>
          </>
        )}
      </Card>

      {/* ---- Working hours (FR-03) ---- */}
      <Card>
        <SectionTitle
          title={t("workingHoursTitle")}
          hint={t("workingHoursHint")}
        />
        <div className="flex flex-col gap-3">
          {WEEKDAYS.map((label, weekday) => {
            const dayRows = hours
              .map((h, index) => ({ h, index }))
              .filter(({ h }) => h.weekday === weekday);

            return (
              <div key={weekday} className="flex flex-wrap items-center gap-2 border-b border-line pb-3 last:border-0">
                <span className="w-24 text-sm font-medium text-ink">{label}</span>

                {dayRows.length === 0 && (
                  <span className="text-sm text-ink-faint">{t("dayOff")}</span>
                )}

                {dayRows.map(({ h, index }) => (
                  <span key={index} className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={h.startTime}
                      onChange={(e) => updateInterval(index, { startTime: e.target.value })}
                      className="rounded-lg border border-line-strong px-2 py-1 text-sm"
                    />
                    <span className="text-ink-faint">–</span>
                    <input
                      type="time"
                      value={h.endTime}
                      onChange={(e) => updateInterval(index, { endTime: e.target.value })}
                      className="rounded-lg border border-line-strong px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => removeInterval(index)}
                      className="px-1 text-sm text-danger hover:underline"
                      title={t("removeIntervalTitle")}
                    >
                      ×
                    </button>
                  </span>
                ))}

                <button
                  onClick={() => addInterval(weekday)}
                  className="ml-auto text-sm font-medium text-ink hover:underline"
                >
                  {t("addInterval")}
                </button>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => send(`/api/staff/${staffId}/hours`, "PUT", { hours }, t("hoursSaved"))}
          disabled={busy}
          className={`mt-4 ${buttonStyles.primary}`}
        >
          {t("saveHours")}
        </button>
      </Card>

      {/* ---- Time off (FR-03) ---- */}
      <Card>
        <SectionTitle title={t("timeOffTitle")} hint={t("timeOffHint")} />

        {timeOff.length === 0 ? (
          <EmptyState text={t("noTimeOff")} />
        ) : (
          <ul className="mb-4 flex flex-col gap-2">
            {timeOff.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium text-ink">
                    {new Date(row.from).toLocaleDateString(locale)} – {new Date(row.until).toLocaleDateString(locale)}
                  </span>
                  {row.reason && <span className="ml-2 text-ink-faint">{row.reason}</span>}
                </span>
                <button
                  onClick={() => send(`/api/timeoff/${row.id}`, "DELETE", undefined, t("timeOffRemoved"))}
                  disabled={busy}
                  className="text-sm font-medium text-danger hover:underline"
                >
                  {t("remove")}
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={addTimeOff} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Field label={t("fromLabel")}>
            <input
              type="date"
              className={inputStyles}
              value={off.from}
              onChange={(e) => setOff({ ...off, from: e.target.value })}
              required
            />
          </Field>
          <Field label={t("untilLabel")}>
            <input
              type="date"
              className={inputStyles}
              value={off.until}
              onChange={(e) => setOff({ ...off, until: e.target.value })}
              required
            />
          </Field>
          <Field label={t("reasonLabel")}>
            <input
              className={inputStyles}
              value={off.reason}
              onChange={(e) => setOff({ ...off, reason: e.target.value })}
            />
          </Field>
          <button type="submit" disabled={busy} className={buttonStyles.secondary}>
            {t("add")}
          </button>
        </form>
      </Card>

      {/* ---- Password reset (2.4) ---- */}
      <Card>
        <SectionTitle
          title={t("passwordTitle")}
          hint={t("passwordChangeHint", { name: staffName })}
        />
        <form onSubmit={changePassword} className="flex flex-col gap-3 sm:max-w-sm">
          <Field label={t("newPasswordFieldLabel")} hint={t("passwordHint")}>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className={inputStyles}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <button type="submit" disabled={busy} className={`${buttonStyles.primary} self-start`}>
            {t("changePassword")}
          </button>
        </form>
      </Card>
    </div>
  );
}
