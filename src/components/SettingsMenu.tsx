"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  STAFF: "Staf",
  CLIENT: "Klient",
};

type Account = { name: string; email: string | null; phone: string | null; role: string };
type Business = { name: string; address: string; phone: string; email: string; description: string };

const EMPTY_BUSINESS: Business = { name: "", address: "", phone: "", email: "", description: "" };

export default function SettingsMenu({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const isAdmin = role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Account>({ name, email: null, phone: null, role });
  const [business, setBusiness] = useState<Business>(EMPTY_BUSINESS);
  const [section, setSection] = useState<null | "password" | "business">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => alive && d.user && setAccount((a) => ({ ...a, ...d.user })))
      .catch(() => {});
    if (isAdmin) {
      fetch("/api/settings/business")
        .then((r) => r.json())
        .then((d) => {
          if (alive && d.settings) {
            const s = d.settings;
            setBusiness({
              name: s.name ?? "",
              address: s.address ?? "",
              phone: s.phone ?? "",
              email: s.email ?? "",
              description: s.description ?? "",
            });
          }
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [open, isAdmin]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function pickSection(s: "password" | "business") {
    setSection((cur) => (cur === s ? null : s));
    setMsg(null);
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ tone: "err", text: data.error ?? "Ndryshimi dështoi" });
      else {
        setMsg({ tone: "ok", text: "Fjalëkalimi u ndryshua." });
        (e.target as HTMLFormElement).reset();
        setSection(null);
      }
    } catch {
      setMsg({ tone: "err", text: "Nuk u lidh dot me serverin" });
    } finally {
      setBusy(false);
    }
  }

  async function saveBusiness(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(business),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setMsg({ tone: "err", text: data.error ?? "Ruajtja dështoi" });
      else setMsg({ tone: "ok", text: "Të dhënat e biznesit u ruajtën." });
    } catch {
      setMsg({ tone: "err", text: "Nuk u lidh dot me serverin" });
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";
  const initials =
    account.name.split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, "")).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Cilësimet"
        className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 max-h-[80vh] w-80 overflow-y-auto rounded-2xl bg-surface shadow-[0_1px_2px_rgba(43,38,34,0.04),0_16px_40px_-12px_rgba(43,38,34,0.25)] ring-1 ring-line">
          {/* Account */}
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{account.name}</p>
              <p className="text-xs text-ink-faint">{ROLE_LABEL[account.role] ?? account.role}</p>
            </div>
          </div>

          <dl className="space-y-1.5 px-4 py-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Email</dt>
              <dd className="truncate text-ink">{account.email ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-soft">Telefoni</dt>
              <dd className="text-ink">{account.phone ?? "—"}</dd>
            </div>
          </dl>

          {/* Change password */}
          <div className="border-t border-line px-4 py-3">
            <button type="button" onClick={() => pickSection("password")} className="flex w-full items-center justify-between text-sm font-medium text-ink hover:text-accent">
              Ndrysho fjalëkalimin
              <span className="text-ink-faint">{section === "password" ? "⌄" : "›"}</span>
            </button>
            {section === "password" && (
              <form onSubmit={changePassword} className="mt-2 flex flex-col gap-2">
                <input name="currentPassword" type="password" required placeholder="Fjalëkalimi aktual" autoComplete="current-password" className={inputCls} />
                <input name="newPassword" type="password" required minLength={8} placeholder="Fjalëkalimi i ri (min. 8)" autoComplete="new-password" className={inputCls} />
                <button type="submit" disabled={busy} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                  {busy ? "Duke ruajtur…" : "Ruaj fjalëkalimin"}
                </button>
              </form>
            )}
          </div>

          {/* Business data (admin only) */}
          {isAdmin && (
            <div className="border-t border-line px-4 py-3">
              <button type="button" onClick={() => pickSection("business")} className="flex w-full items-center justify-between text-sm font-medium text-ink hover:text-accent">
                Të dhënat e biznesit
                <span className="text-ink-faint">{section === "business" ? "⌄" : "›"}</span>
              </button>
              {section === "business" && (
                <form onSubmit={saveBusiness} className="mt-2 flex flex-col gap-2">
                  <input value={business.name} onChange={(e) => setBusiness((b) => ({ ...b, name: e.target.value }))} required placeholder="Emri i biznesit" className={inputCls} />
                  <input value={business.address} onChange={(e) => setBusiness((b) => ({ ...b, address: e.target.value }))} placeholder="Adresa" className={inputCls} />
                  <input value={business.phone} onChange={(e) => setBusiness((b) => ({ ...b, phone: e.target.value }))} placeholder="Telefoni" className={inputCls} />
                  <input value={business.email} onChange={(e) => setBusiness((b) => ({ ...b, email: e.target.value }))} placeholder="Email" className={inputCls} />
                  <textarea value={business.description} onChange={(e) => setBusiness((b) => ({ ...b, description: e.target.value }))} placeholder="Përshkrimi" rows={2} className={inputCls} />
                  <button type="submit" disabled={busy} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                    {busy ? "Duke ruajtur…" : "Ruaj të dhënat"}
                  </button>
                </form>
              )}
            </div>
          )}

          {msg && (
            <div className="px-4 pb-3">
              <p className={`rounded-lg px-3 py-1.5 text-xs ${msg.tone === "ok" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>{msg.text}</p>
            </div>
          )}

          {/* Logout — opens a confirmation modal before signing out. */}
          <div className="border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmLogout(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
              Dil nga llogaria
            </button>
          </div>
        </div>
      )}

      {/* Logout confirmation modal — portalled to <body> so the header's
          backdrop-blur containing block doesn't trap the fixed overlay. */}
      {confirmLogout &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !loggingOut) setConfirmLogout(false);
            }}
          >
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-[0_24px_60px_-20px_rgba(43,38,34,0.55)] ring-1 ring-line">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5M21 12H9" />
              </svg>
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">Dil nga llogaria?</h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              A je i sigurt që dëshiron të dalësh? Do të të duhet të kyçesh sërish për të vazhduar.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                disabled={loggingOut}
                className="flex-1 rounded-xl bg-surface px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-line-strong transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                Anulo
              </button>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="flex-1 rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loggingOut ? "Duke dalë…" : "Po, dil"}
              </button>
            </div>
          </div>
          </div>,
          document.body
        )}
    </div>
  );
}
