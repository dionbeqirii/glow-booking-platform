import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeForRole } from "@/lib/rbac";
import { buttonStyles, Wordmark } from "@/components/ui";

export default async function Home() {
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <span className="mb-6 inline-block h-px w-16 bg-gold" />

        <div className="mb-3">
          <Wordmark size="lg" />
        </div>

        <p className="mx-auto max-w-sm text-sm leading-relaxed text-ink-soft">
          Rezervo terminin tënd ose futu në radhë pa pritur në telefon. Studioja e sheh
          kalendarin në kohë reale.
        </p>

        <div className="mt-9 flex flex-col gap-3">
          <Link href="/login" className={buttonStyles.primary}>
            Hyr në llogari
          </Link>
          <Link href="/register" className={buttonStyles.secondary}>
            Regjistrohu si klient
          </Link>
        </div>

        <p className="mt-10 text-xs text-ink-faint">
          Platformë për rezervime dhe menaxhimin e radhëve
        </p>
      </div>
    </main>
  );
}
