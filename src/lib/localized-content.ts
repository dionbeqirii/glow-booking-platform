/**
 * Resolves a piece of admin-authored business content (a service name, an
 * offer title, a staff title...) to the caller's locale, falling back to the
 * Albanian original whenever no translation has been entered for it yet.
 * This is distinct from next-intl (which only covers UI chrome) — these
 * strings live in the database, entered by the studio admin.
 */
export function localize(base: string, en: string | null | undefined, de: string | null | undefined, locale: string): string {
  if (locale === "en" && en) return en;
  if (locale === "de" && de) return de;
  return base;
}

/** Same as `localize`, but for optional/nullable source fields (e.g. a description). */
export function localizeNullable(
  base: string | null | undefined,
  en: string | null | undefined,
  de: string | null | undefined,
  locale: string
): string | null {
  if (locale === "en" && en) return en;
  if (locale === "de" && de) return de;
  return base ?? null;
}
