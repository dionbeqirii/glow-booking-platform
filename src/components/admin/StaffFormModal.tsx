"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Field, Alert, buttonStyles, inputStyles } from "@/components/ui";
import type { StaffOverviewRow } from "@/lib/staff-catalog";

export default function StaffFormModal({
  existing,
  existingTitles,
  onClose,
}: {
  existing?: StaffOverviewRow;
  existingTitles: string[];
  onClose: () => void;
}) {
  const t = useTranslations("AdminStaff");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [addingNewTitle, setAddingNewTitle] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name,
        phone: phone || undefined,
        title: title || undefined,
      };
      if (!existing) {
        payload.email = email;
        payload.password = password;
      } else if (password) {
        payload.password = password;
      }
      const res = await fetch(existing ? `/api/staff/${existing.id}` : "/api/staff", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("errorSave"));
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    name.trim().length >= 2 &&
    (existing || (email.trim().length > 3 && password.length >= 8)) &&
    !busy;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-[0_24px_64px_-24px_rgba(31,42,34,0.35)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{existing ? t("editStaff") : t("newStaff")}</h2>
          <button
            onClick={onClose}
            aria-label={tCommon("close")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <Field label={t("fullNameLabel")}>
            <input className={inputStyles} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("fullNamePlaceholder")} />
          </Field>

          <Field label={t("emailLabel")} hint={existing ? t("emailImmutableHint") : undefined}>
            <input
              type="email"
              className={inputStyles}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!existing}
              placeholder={t("emailPlaceholder")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("phoneLabel")}>
              <input className={inputStyles} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phonePlaceholder")} />
            </Field>
            <Field label={t("roleLabel")}>
              {addingNewTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    className={inputStyles}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t("newRolePlaceholder")}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => { setAddingNewTitle(false); setTitle(existing?.title ?? ""); }}
                    title={t("cancelNewRoleTitle")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <select
                  className={inputStyles}
                  value={title}
                  onChange={(e) => {
                    if (e.target.value === "__new__") { setAddingNewTitle(true); setTitle(""); }
                    else setTitle(e.target.value);
                  }}
                >
                  <option value="">{t("noRoleOption")}</option>
                  {existingTitles.map((ti) => (
                    <option key={ti} value={ti}>{ti}</option>
                  ))}
                  <option value="__new__">{t("addNewRoleOption")}</option>
                </select>
              )}
            </Field>
          </div>

          <Field label={existing ? t("newPasswordLabel") : t("initialPasswordLabel")} hint={t("passwordHint")}>
            <input type="password" className={inputStyles} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={existing ? t("passwordKeepPlaceholder") : undefined} />
          </Field>

          {error && <Alert message={error} />}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button onClick={onClose} className={buttonStyles.secondary}>{tCommon("cancel")}</button>
          <button onClick={submit} disabled={!canSubmit} className={buttonStyles.primary}>
            {busy ? t("saving") : existing ? t("saveChanges") : t("createAccount")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
