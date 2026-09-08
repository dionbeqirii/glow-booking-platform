"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type Account = { name: string; email: string | null; phone: string | null; role: string; avatarUrl: string | null };
type Business = { name: string; address: string; phone: string; email: string; description: string };

function roleLabel(role: string, t: (key: string) => string): string {
  switch (role) {
    case "ADMIN":
      return t("roleAdmin");
    case "STAFF":
      return t("roleStaff");
    case "CLIENT":
      return t("roleClient");
    default:
      return role;
  }
}

const EMPTY_BUSINESS: Business = { name: "", address: "", phone: "", email: "", description: "" };

export default function SettingsMenu({
  name,
  role,
  avatarUrl,
}: {
  name: string;
  role: string;
  avatarUrl: string | null;
}) {
  const t = useTranslations("AccountSettings");
  const router = useRouter();
  const isAdmin = role === "ADMIN";
  const [open, setOpen] = useState(false);
  const [account, setAccount] = useState<Account>({ name, email: null, phone: null, role, avatarUrl });
  const [business, setBusiness] = useState<Business>(EMPTY_BUSINESS);
  const [section, setSection] = useState<null | "password" | "business">(null);
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/account/avatar", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? t("photoUploadFailed") });
        return;
      }
      setAccount((a) => ({ ...a, avatarUrl: data.url }));
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: t("connectionFailed") });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/avatar", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg({ tone: "err", text: data.error ?? t("photoRemoveFailed") });
        return;
      }
      setAccount((a) => ({ ...a, avatarUrl: null }));
      router.refresh();
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: account.name, phone: account.phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ tone: "err", text: data.error ?? t("saveFailed") });
        return;
      }
      setAccount((a) => ({ ...a, ...data.user }));
      setMsg({ tone: "ok", text: t("profileSaved") });
      router.refresh();
    } catch {
      setMsg({ tone: "err", text: t("connectionFailed") });
    } finally {
      setBusy(false);
    }
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
      if (!res.ok) setMsg({ tone: "err", text: data.error ?? t("passwordChangeFailed") });
      else {
        setMsg({ tone: "ok", text: t("passwordChanged") });
        (e.target as HTMLFormElement).reset();
        setSection(null);
      }
    } catch {
      setMsg({ tone: "err", text: t("connectionFailed") });
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
      if (!res.ok) setMsg({ tone: "err", text: data.error ?? t("saveFailed") });
      else setMsg({ tone: "ok", text: t("businessDataSaved") });
    } catch {
      setMsg({ tone: "err", text: t("connectionFailed") });
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/15";
  // Only real words count, so "Diellza (Administratore)" yields "DA", not "D(".
  const initials =
    account.name.split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, "")).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  // Strip a trailing role note like "(Administratore)" so the trigger shows
  // the name once, with the role rendered separately beneath it.
  const displayName = account.name.replace(/\s*\([^)]*\)\s*/g, " ").trim() || account.name;

  return (
    <div className="relative" ref={boxRef}>
      {/* Unified trigger: avatar + name/role + chevron. Clicking anywhere on
          the profile — not a separate gear icon — opens Settings. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("accountSettingsAria")}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1.5 transition-colors hover:bg-surface-muted sm:pr-2.5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-xs font-semibold text-accent">
          {account.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-sm font-medium text-ink">{displayName}</span>
          <span className="block text-xs font-medium text-accent">{roleLabel(account.role, t)}</span>
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="hidden text-ink-faint sm:block">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 max-h-[80vh] w-80 overflow-y-auto rounded-2xl bg-surface shadow-[0_1px_2px_rgba(31,42,34,0.04),0_16px_40px_-12px_rgba(31,42,34,0.18)] ring-1 ring-line">
          {/* Account + avatar upload */}
          <div className="flex items-center gap-3 border-b border-line px-4 py-3">
            <div className="relative shrink-0">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-lg font-semibold text-accent">
                {account.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </span>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                aria-label={t("changePhotoAria")}
                title={t("changePhotoTitle")}
                className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white ring-2 ring-surface transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={uploadAvatar}
                className="hidden"
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{account.name}</p>
              <p className="text-xs text-ink-faint">{roleLabel(account.role, t)}</p>
              {account.avatarUrl && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  disabled={uploadingAvatar}
                  className="mt-1 text-xs font-medium text-danger hover:underline disabled:opacity-50"
                >
                  {t("removePhoto")}
                </button>
              )}
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-2 px-4 py-3 text-sm">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-soft">{t("nameLabel")}</span>
              <input
                value={account.name}
                onChange={(e) => setAccount((a) => ({ ...a, name: e.target.value }))}
                required
                minLength={2}
                maxLength={100}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-soft">{t("phoneLabel")}</span>
              <input
                value={account.phone ?? ""}
                onChange={(e) => setAccount((a) => ({ ...a, phone: e.target.value }))}
                placeholder="+383…"
                maxLength={30}
                className={inputCls}
              />
            </label>
            <p className="flex justify-between gap-3 pt-0.5 text-xs text-ink-faint">
              <span>{t("emailLabel")}</span>
              <span className="truncate">{account.email ?? "—"}</span>
            </p>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? t("saving") : t("saveChanges")}
            </button>
          </form>

          {/* Change password */}
          <div className="border-t border-line px-4 py-3">
            <button type="button" onClick={() => pickSection("password")} className="flex w-full items-center justify-between text-sm font-medium text-ink hover:text-accent">
              {t("changePasswordToggle")}
              <span className="text-ink-faint">{section === "password" ? "⌄" : "›"}</span>
            </button>
            {section === "password" && (
              <form onSubmit={changePassword} className="mt-2 flex flex-col gap-2">
                <input name="currentPassword" type="password" required placeholder={t("currentPasswordPlaceholder")} autoComplete="current-password" className={inputCls} />
                <input name="newPassword" type="password" required minLength={8} placeholder={t("newPasswordPlaceholder")} autoComplete="new-password" className={inputCls} />
                <button type="submit" disabled={busy} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                  {busy ? t("saving") : t("savePassword")}
                </button>
              </form>
            )}
          </div>

          {/* Business data (admin only) */}
          {isAdmin && (
            <div className="border-t border-line px-4 py-3">
              <button type="button" onClick={() => pickSection("business")} className="flex w-full items-center justify-between text-sm font-medium text-ink hover:text-accent">
                {t("businessDetailsToggle")}
                <span className="text-ink-faint">{section === "business" ? "⌄" : "›"}</span>
              </button>
              {section === "business" && (
                <form onSubmit={saveBusiness} className="mt-2 flex flex-col gap-2">
                  <input value={business.name} onChange={(e) => setBusiness((b) => ({ ...b, name: e.target.value }))} required placeholder={t("businessNamePlaceholder")} className={inputCls} />
                  <input value={business.address} onChange={(e) => setBusiness((b) => ({ ...b, address: e.target.value }))} placeholder={t("addressPlaceholder")} className={inputCls} />
                  <input value={business.phone} onChange={(e) => setBusiness((b) => ({ ...b, phone: e.target.value }))} placeholder={t("businessPhonePlaceholder")} className={inputCls} />
                  <input value={business.email} onChange={(e) => setBusiness((b) => ({ ...b, email: e.target.value }))} placeholder={t("businessEmailPlaceholder")} className={inputCls} />
                  <textarea value={business.description} onChange={(e) => setBusiness((b) => ({ ...b, description: e.target.value }))} placeholder={t("descriptionPlaceholder")} rows={2} className={inputCls} />
                  <button type="submit" disabled={busy} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50">
                    {busy ? t("saving") : t("saveBusinessDetails")}
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
              {t("logoutMenuItem")}
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
            <h2 className="mt-4 text-lg font-semibold text-ink">{t("logoutModalTitle")}</h2>
            <p className="mt-1.5 text-sm text-ink-soft">
              {t("logoutModalBody")}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                disabled={loggingOut}
                className="flex-1 rounded-xl bg-surface px-4 py-2.5 text-sm font-medium text-ink ring-1 ring-line-strong transition-colors hover:bg-surface-muted disabled:opacity-50"
              >
                {t("cancelButton")}
              </button>
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="flex-1 rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loggingOut ? t("loggingOut") : t("confirmLogoutButton")}
              </button>
            </div>
          </div>
          </div>,
          document.body
        )}
    </div>
  );
}
