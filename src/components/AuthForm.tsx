"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Alert, Field, buttonStyles, Wordmark } from "./ui";
import { authInput } from "./AuthBackground";

type Mode = "login" | "register";

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

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const t = useTranslations("Auth");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = { ...Object.fromEntries(form.entries()), remember };
    const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("genericError"));
        return;
      }
      router.push(data.redirect ?? "/");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="on-video mb-5 text-center">
        <Link href="/">
          <Wordmark size="lg" />
        </Link>
      </div>

      <div className="rounded-2xl bg-white/25 p-7 ring-1 ring-white/40 shadow-[0_8px_40px_-8px_rgba(43,38,34,0.35),inset_0_1px_0_rgba(255,255,255,0.55)] backdrop-blur-lg">
        <h1 className="text-2xl font-semibold text-ink">
          {isRegister ? t("registerTitle") : t("loginTitle")}
        </h1>
        <p className="mt-1 text-sm text-ink">
          {isRegister ? t("registerSubtitle") : t("loginSubtitle")}
        </p>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-3">
          {isRegister && (
            <Field label={t("fullName")}>
              <input name="name" type="text" autoComplete="name" required className={authInput} />
            </Field>
          )}

          <Field label={t("email")}>
            <input name="email" type="email" autoComplete="email" required className={authInput} />
          </Field>

          {isRegister && (
            <Field label={t("phone")} hint={t("phoneOptional")}>
              <input name="phone" type="tel" autoComplete="tel" className={authInput} />
            </Field>
          )}

          <Field
            label={t("password")}
            hint={isRegister ? t("passwordHint") : undefined}
          >
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                className={`${authInput} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-ink-faint transition-colors hover:text-ink-soft"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </Field>

          {!isRegister && (
            <div className="-mt-1 flex items-center justify-between gap-3">
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-line-strong accent-[var(--gbd-accent)]"
                />
                {t("rememberMe")}
              </label>
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-accent hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
          )}

          {error && <Alert message={error} />}

          <button type="submit" disabled={loading} className={`mt-1 ${buttonStyles.primary}`}>
            {loading ? t("submitting") : isRegister ? t("submitRegister") : t("submitLogin")}
          </button>
        </form>

        <p className="mt-5 border-t border-white/40 pt-4 text-center text-sm font-medium text-ink">
          {isRegister ? (
            <>
              {t("haveAccount")}{" "}
              <Link href="/login" className="font-medium text-accent hover:underline">
                {t("loginLink")}
              </Link>
            </>
          ) : (
            <>
              {t("noAccount")}{" "}
              <Link href="/register" className="font-medium text-accent hover:underline">
                {t("registerLink")}
              </Link>
            </>
          )}
        </p>
      </div>
    </>
  );
}
