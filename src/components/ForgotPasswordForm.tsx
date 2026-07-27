"use client";

import { useState } from "react";
import Link from "next/link";
import { Alert, Field, buttonStyles, inputStyles, Wordmark } from "./ui";

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const email = new FormData(e.currentTarget).get("email");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ndodhi një gabim");
        return;
      }
      setSent(true);
      // Present only in development (no email provider configured).
      setDevLink(data.devLink ?? null);
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-12">
      <Link
        href="/login"
        aria-label="Kthehu tek hyrja"
        className="absolute left-5 top-5 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft ring-1 ring-line-strong transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      </Link>
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Link href="/">
            <Wordmark size="lg" />
          </Link>
        </div>

        <div className="rounded-2xl bg-surface p-8 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04),0_16px_40px_-20px_rgba(43,38,34,0.18)]">
          <h1 className="text-2xl font-semibold text-ink">Rikthe Fjalëkalimin</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Shëno emailin tënd dhe ne do të dërgojmë një link për të krijuar një fjalëkalim të ri.
          </p>

          <form onSubmit={onSubmit} className="mt-7 flex flex-col gap-4">
            <Field label="Email">
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={sent}
                className={inputStyles}
              />
            </Field>

            <button
              type="submit"
              disabled={loading || sent}
              className={`mt-1 ${buttonStyles.primary}`}
            >
              {loading ? "Duke dërguar…" : "Dërgo linkun"}
            </button>

            {error && <Alert message={error} tone="error" />}
            {sent && (
              <Alert message="Linku u dërgua! Kontrollo emailin tënd." tone="success" />
            )}

            {devLink && (
              <p className="rounded-xl bg-surface-muted px-4 py-2.5 text-xs text-ink-soft">
                Demo (pa email service):{" "}
                <Link href={devLink} className="font-medium text-accent hover:underline">
                  hap linkun e rivendosjes
                </Link>
              </p>
            )}
          </form>
        </div>

      </div>
    </main>
  );
}
