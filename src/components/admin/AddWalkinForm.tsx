"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Field, Alert, buttonStyles, inputStyles } from "@/components/ui";

export type ServiceOption = { id: string; name: string };

export default function AddWalkinForm({ services }: { services: ServiceOption[] }) {
  const t = useTranslations("AdminQueue");
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          clientName: name,
          phone: phone || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("errorAddFailed"));
        return;
      }
      setSuccess(t("successAdded", { name: name || t("clientFallback"), number: data.entry.queueNumber }));
      setName("");
      setPhone("");
      setServiceId("");
      setNotes("");
      router.refresh();
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = name.trim().length >= 2 && serviceId && !busy;

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-surface p-3">
      <p className="text-sm font-semibold text-ink">{t("addClientTitle")}</p>
      <p className="mb-3 text-xs text-ink-faint">{t("addClientHint")}</p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[130px] flex-1 basis-40">
          <Field label={t("fullNameLabel")}>
            <input className={inputStyles} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
          </Field>
        </div>
        <div className="min-w-[110px] flex-1 basis-32">
          <Field label={t("phoneLabel")}>
            <input className={inputStyles} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("phonePlaceholder")} />
          </Field>
        </div>
        <div className="min-w-[130px] flex-1 basis-40">
          <Field label={t("requestedServiceLabel")}>
            <select className={inputStyles} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">{t("chooseServiceOption")}</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="min-w-[130px] flex-1 basis-40">
          <Field label={t("notesOptionalLabel")}>
            <input className={inputStyles} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
          </Field>
        </div>
        <button type="submit" disabled={!canSubmit} className={`${buttonStyles.primary} shrink-0`}>
          {busy ? t("adding") : t("addToQueueBtn")}
        </button>
      </div>

      {error && <div className="mt-2"><Alert message={error} /></div>}
      {success && <div className="mt-2"><Alert message={success} tone="success" /></div>}
    </form>
  );
}
