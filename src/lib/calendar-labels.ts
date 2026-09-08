// Shared weekday/month label helpers — takes a translation function (from
// either `getTranslations` on the server or `useTranslations` on the client;
// both share the same `t(key, values?)` call signature) so every calendar
// widget renders the same locale-correct labels instead of each hardcoding
// its own Albanian array.
type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const MONTH_KEYS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

// Monday-first 3-letter labels, e.g. ["Hën", "Mar", ...] — pass a
// `getTranslations("Weekday")` / `useTranslations("Weekday")` result.
export function weekdayShortLabels(t: Translator): string[] {
  return WEEKDAY_KEYS.map((k) => t(`${k}Short`));
}

// Monday-first 1-2 letter labels for compact grids (e.g. MiniCalendar).
export function weekdayLetterLabels(t: Translator): string[] {
  return WEEKDAY_KEYS.map((k) => t(`${k}Letter`));
}

// Sunday-first full day names (index 0 = Sunday), matching JS `Date.getDay()`
// / Prisma's `weekday` field convention — e.g. StaffDetail's working-hours editor.
export function weekdayFullLabelsSundayFirst(t: Translator): string[] {
  const sundayFirst = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  return sundayFirst.map((k) => t(`${k}Full`));
}

// Monday-first full day names (index 0 = Monday) — e.g. the staff stats
// weekly performance chart's x-axis.
export function weekdayFullLabelsMondayFirst(t: Translator): string[] {
  return WEEKDAY_KEYS.map((k) => t(`${k}Full`));
}

// Jan-first full month names — pass a `getTranslations("Month")` /
// `useTranslations("Month")` result.
export function monthLongLabels(t: Translator): string[] {
  return MONTH_KEYS.map((k) => t(k));
}

// Jan-first 3-letter month abbreviations.
export function monthShortLabels(t: Translator): string[] {
  return MONTH_KEYS.map((k) => t(`${k}Short`));
}
