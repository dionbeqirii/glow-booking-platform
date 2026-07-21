import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-surface p-6 ring-1 ring-line shadow-[0_1px_2px_rgba(43,38,34,0.04),0_8px_24px_-12px_rgba(43,38,34,0.10)] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-1 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

export function PageTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-semibold text-ink">{title}</h1>
      {hint && <p className="mt-1.5 text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}

const base =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

export const buttonStyles = {
  primary: `${base} bg-accent text-white hover:bg-accent-hover`,
  secondary: `${base} bg-surface text-ink ring-1 ring-line-strong hover:bg-surface-muted`,
  danger: `${base} bg-surface text-danger ring-1 ring-danger/30 hover:bg-danger-soft`,
  quiet: `${base} text-ink-soft hover:text-ink hover:bg-surface-muted`,
};

export const inputStyles =
  "w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/15";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-faint">{hint}</span>}
    </label>
  );
}

export function Alert({ message, tone = "error" }: { message: string; tone?: "error" | "success" }) {
  const styles =
    tone === "error"
      ? "bg-danger-soft text-danger ring-danger/20"
      : "bg-ok-soft text-ok ring-ok/20";
  return (
    <p className={`rounded-xl px-4 py-2.5 text-sm ring-1 ${styles}`} role="alert">
      {message}
    </p>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-4 py-10 text-center text-sm text-ink-faint">
      {text}
    </p>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn";
}) {
  const styles = {
    neutral: "bg-surface-muted text-ink-soft",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
  }[tone];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}

/** Small wordmark used in the header and on the public pages. */
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  const cls = size === "lg" ? "text-4xl" : "text-lg";
  return (
    <span className={`font-display font-semibold tracking-tight text-ink ${cls}`}>
      Glow <span className="text-accent">By Diellza</span>
    </span>
  );
}
