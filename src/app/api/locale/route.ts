import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { setLocaleCookie } from "@/lib/locale-cookie";
import { isAppLocale } from "@/i18n/locales";
import { handle, readJson, ApiError } from "@/lib/api";

// Switches the UI language — works for a signed-in user or a guest browsing
// the login/register screens. Always sets the cookie (immediate effect,
// this browser); when signed in, also persists to User.locale so the
// preference follows the account to another device on next login.
export async function POST(req: Request) {
  return handle(async () => {
    const body = await readJson(req);
    const locale = (body as { locale?: string }).locale;
    if (!isAppLocale(locale)) throw new ApiError(400, "Gjuhë e panjohur");

    await setLocaleCookie(locale);

    const session = await getSession();
    if (session) {
      await prisma.user.update({ where: { id: session.userId }, data: { locale } });
    }

    return { ok: true };
  });
}
