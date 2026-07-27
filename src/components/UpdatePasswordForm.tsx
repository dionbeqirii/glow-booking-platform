"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Alert, Field, buttonStyles, inputStyles, Wordmark } from "./ui";

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.4M6.6 6.6C3.6 8.4 2 11 2 11s3.5 7 10 7a9.3 9.3 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

export default function UpdatePasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const password = new FormData(e.currentTarget).get("password");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ndodhi një gabim");
        return;
      }
      setDone(true);
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="relative mb-7 flex items-center justify-center">
          <Link
            href="/login"
            aria-label="Kthehu tek hyrja"
            className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft ring-1 ring-line-strong transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </Link>
          <Link href="/">
            <Wordmark size="lg" />
          </Link>
        </div>

        <div className="rounded-2xl bg-surface p-8 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04),0_16px_40px_-20px_rgba(43,38,34,0.18)]">
          <h1 className="text-2xl font-semibold text-ink">Vendos një fjalëkalim të ri</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Zgjidh një fjalëkalim të ri për llogarinë tënde.
          </p>

          {!token ? (
            <div className="mt-6">
              <Alert message="Link i pavlefshëm. Kërko një link të ri të rivendosjes." tone="error" />
            </div>
          ) : done ? (
            <div className="mt-6 flex flex-col gap-4">
              <Alert message="Fjalëkalimi u ndryshua! Tani mund të hysh." tone="success" />
              <Link href="/login" className={buttonStyles.primary}>
                Shko te hyrja
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
              <Field label="Fjalëkalimi i ri" hint="Të paktën 8 karaktere.">
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    className={`${inputStyles} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Fshih fjalëkalimin" : "Shfaq fjalëkalimin"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink-faint transition-colors hover:text-ink-soft"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </Field>

              <button type="submit" disabled={loading} className={`mt-1 ${buttonStyles.primary}`}>
                {loading ? "Duke ruajtur…" : "Ruaj fjalëkalimin"}
              </button>

              {error && <Alert message={error} tone="error" />}
            </form>
          )}
        </div>

      </div>
    </main>
  );
}
