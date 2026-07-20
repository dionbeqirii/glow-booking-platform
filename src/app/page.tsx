import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeForRole } from "@/lib/rbac";

export default async function Home() {
  const session = await getSession();
  if (session) redirect(homeForRole(session.role));

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <h1 className="text-2xl font-bold text-neutral-900">Glow By Diellza</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Platformë për rezervime dhe menaxhimin e radhëve.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-neutral-800"
          >
            Hyr
          </Link>
          <Link
            href="/register"
            className="rounded-lg px-4 py-2.5 text-center text-sm font-semibold text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50"
          >
            Regjistrohu si klient
          </Link>
        </div>
      </div>
    </main>
  );
}
