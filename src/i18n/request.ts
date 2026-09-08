import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { isAppLocale, DEFAULT_LOCALE, LOCALE_COOKIE, type AppLocale } from "./locales";

// No locale-prefixed routing (the app already has fixed role-based routes
// like /admin, /staff, /client) — the language is a stored preference
// instead: a cookie for guests, synced to the User.locale DB field once
// someone is signed in (see src/app/api/locale/route.ts and the login route).
export default getRequestConfig(async ({ locale: overrideLocale }) => {
  // `locale` here carries an explicit override from an awaitable call like
  // getTranslations({ locale: "en" }) — used to render content in someone
  // else's stored locale regardless of the current request's own cookie
  // (e.g. a booking email sent in the client's preferred language, not the
  // staff/admin actor's). Only fall back to the cookie when no override was given.
  let locale: AppLocale;
  if (isAppLocale(overrideLocale)) {
    locale = overrideLocale;
  } else {
    const store = await cookies();
    const cookieValue = store.get(LOCALE_COOKIE)?.value;
    locale = isAppLocale(cookieValue) ? cookieValue : DEFAULT_LOCALE;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
