"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

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

  const isRegister = mode === "register";

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-neutral-200">
        <h1 className="text-2xl font-bold text-neutral-900">
          {isRegister ? "Regjistrohu" : "Hyr në llogari"}
        </h1>
        <p className="mt-1 text-sm text-neutral-600">Glow By Diellza</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          {isRegister && (
            <Field label="Emri dhe mbiemri" name="name" type="text" autoComplete="name" required />
          )}
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          {isRegister && (
            <Field label="Telefoni (opsional)" name="phone" type="tel" autoComplete="tel" />
          )}
          <Field
            label="Fjalëkalimi"
            name="password"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {loading ? "Duke procesuar…" : isRegister ? "Krijo llogarinë" : "Hyr"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          {isRegister ? (
            <>
              Ke llogari?{" "}
              <Link href="/login" className="font-semibold text-neutral-900 hover:underline">
                Hyr
              </Link>
            </>
          ) : (
            <>
              S&apos;ke llogari?{" "}
              <Link href="/register" className="font-semibold text-neutral-900 hover:underline">
                Regjistrohu
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  required,
}: {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
      />
    </label>
  );
}
