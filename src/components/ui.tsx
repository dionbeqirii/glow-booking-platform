import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-neutral-600">{hint}</p>}
    </div>
  );
}

const base =
  "rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

export const buttonStyles = {
  primary: `${base} bg-neutral-900 text-white hover:bg-neutral-800`,
  secondary: `${base} text-neutral-900 ring-1 ring-neutral-300 hover:bg-neutral-50`,
  danger: `${base} text-red-700 ring-1 ring-red-300 hover:bg-red-50`,
};

export const inputStyles =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900";

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
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
    </label>
  );
}

export function Alert({ message, tone = "error" }: { message: string; tone?: "error" | "success" }) {
  const styles =
    tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700";
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${styles}`} role="alert">
      {message}
    </p>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
      {text}
    </p>
  );
}
