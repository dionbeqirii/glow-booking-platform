// Pure constants/types — no server-only imports here, so both Client and
// Server Components (and API routes) can import this freely. request.ts
// (the next-intl config, which needs next/headers) imports from here, not
// the other way around.
export const LOCALES = ["sq", "en", "de"] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = "sq";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isAppLocale(value: string | undefined): value is AppLocale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
