import { cookies } from "next/headers";
import { LOCALE_COOKIE, type AppLocale } from "@/i18n/locales";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year — same spirit as the session "remember me" cookie

export async function setLocaleCookie(locale: AppLocale): Promise<void> {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: "/", maxAge: MAX_AGE_SECONDS, sameSite: "lax" });
}
