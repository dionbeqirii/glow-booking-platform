"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Field, buttonStyles, inputStyles, Wordmark } from "./ui";

type Mode = "login" | "register";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ndodhi një gabim");
        return;
      }
      router.push(data.redirect ?? "/");
      router.refresh();
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Link href="/">
            <Wordmark />
          </Link>
        </div>

        <div className="rounded-2xl bg-surface p-8 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04),0_16px_40px_-20px_rgba(43,38,34,0.18)]">
          <h1 className="text-2xl font-semibold text-ink">
            {isRegister ? "Krijo llogari" : "Mirë se erdhe"}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {isRegister
              ? "Regjistrohu për të rezervuar terminin tënd."
              : "Hyr për të parë terminet dhe radhën."}
          </p>

          <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
            {isRegister && (
              <Field label="Emri dhe mbiemri">
                <input name="name" type="text" autoComplete="name" required className={inputStyles} />
              </Field>
            )}

            <Field label="Email">
              <input name="email" type="email" autoComplete="email" required className={inputStyles} />
            </Field>

            {isRegister && (
              <Field label="Telefoni" hint="Opsional, për njoftime rreth terminit.">
                <input name="phone" type="tel" autoComplete="tel" className={inputStyles} />
              </Field>
            )}

            <Field
              label="Fjalëkalimi"
              hint={isRegister ? "Të paktën 8 karaktere." : undefined}
            >
              <input
                name="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                className={inputStyles}
              />
            </Field>

            {error && <Alert message={error} />}

            <button type="submit" disabled={loading} className={`mt-1 ${buttonStyles.primary}`}>
              {loading ? "Duke procesuar…" : isRegister ? "Krijo llogarinë" : "Hyr"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-ink-soft">
          {isRegister ? (
            <>
              Ke llogari?{" "}
              <Link href="/login" className="font-medium text-accent hover:underline">
                Hyr
              </Link>
            </>
          ) : (
            <>
              S&apos;ke llogari?{" "}
              <Link href="/register" className="font-medium text-accent hover:underline">
                Regjistrohu
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
