"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrator",
  STAFF: "Staf",
  CLIENT: "Klient",
};

type Account = { name: string; email: string | null; phone: string | null; role: string };

export default function SettingsMenu({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Account>({ name, email: null, phone: null, role });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Load the fuller account (email/phone) when the menu opens.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (alive && d.user) setAccount((a) => ({ ...a, ...d.user }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: form.get("currentPassword"),
          newPassword: form.get("newPassword"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? "Ndryshimi dështoi" });
      } else {
        setMsg({ tone: "ok", text: "Fjalëkalimi u ndryshua." });
        (e.target as HTMLFormElement).reset();
        setShowPw(false);
      }
    } catch {
      setMsg({ tone: "err", text: "Nuk u lidh dot me serverin" });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  const inputCls =
    "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";

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
        <div className="absolute right-0 top-11 z-30 w-80 overflow-hidden rounded-2xl bg-surface shadow-[0_1px_2px_rgba(43,38,34,0.04),0_16px_40px_-12px_rgba(43,38,34,0.25)] ring-1 ring-line">
          {/* Account */}
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
              {account.name.split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, "")).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{account.name}</p>
              <p className="text-xs text-ink-faint">{ROLE_LABEL[account.role] ?? account.role}</p>
            </div>
          </div>

          {/* Details */}
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
            {!showPw ? (
              <button
                type="button"
                onClick={() => { setShowPw(true); setMsg(null); }}
                className="flex w-full items-center justify-between text-sm font-medium text-ink hover:text-accent"
              >
                Ndrysho fjalëkalimin
                <span className="text-ink-faint">›</span>
              </button>
            ) : (
              <form onSubmit={changePassword} className="flex flex-col gap-2">
                <p className="text-sm font-medium text-ink">Ndrysho fjalëkalimin</p>
                <input name="currentPassword" type="password" required placeholder="Fjalëkalimi aktual" autoComplete="current-password" className={inputCls} />
                <input name="newPassword" type="password" required minLength={8} placeholder="Fjalëkalimi i ri (min. 8)" autoComplete="new-password" className={inputCls} />
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                    {busy ? "Duke ruajtur…" : "Ruaj"}
                  </button>
                  <button type="button" onClick={() => { setShowPw(false); setMsg(null); }} className="rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-surface-muted">
                    Anulo
                  </button>
                </div>
              </form>
            )}
            {msg && (
              <p className={`mt-2 rounded-lg px-3 py-1.5 text-xs ${msg.tone === "ok" ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"}`}>
                {msg.text}
              </p>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
              Dil nga llogaria
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
