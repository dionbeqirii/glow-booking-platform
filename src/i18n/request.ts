import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isAppLocale, DEFAULT_LOCALE, LOCALE_COOKIE, type AppLocale } from "./locales";

// No locale-prefixed routing (the app already has fixed role-based routes
// like /admin, /staff, /client) — the language is a stored preference
// instead: a cookie for guests, synced to the User.locale DB field once
// someone is signed in (see src/app/api/locale/route.ts and the login route).
export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieValue = store.get(LOCALE_COOKIE)?.value;
  const locale: AppLocale = isAppLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
