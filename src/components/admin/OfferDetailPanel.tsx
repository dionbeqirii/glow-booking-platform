"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Field, Alert, buttonStyles, inputStyles } from "@/components/ui";
import { OfferCard } from "@/components/OfferCard";
import type { OfferListRow, OfferServiceOption } from "@/lib/offers-catalog";

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

const tabBtn = (active: boolean) =>
  `rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
    active ? "bg-accent text-white" : "text-ink-soft hover:bg-surface-muted"
  }`;

export default function OfferDetailPanel({
  existing,
  serviceOptions,
  onCancel,
  onSaved,
}: {
  existing: OfferListRow | null;
  serviceOptions: OfferServiceOption[];
  onCancel: () => void;
  onSaved: (offerId: string) => void;
}) {
  const t = useTranslations("AdminOffers");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [tab, setTab] = useState<"details" | "preview">("details");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [serviceIds, setServiceIds] = useState<string[]>(existing?.services.map((s) => s.id) ?? []);
  const [price, setPrice] = useState(String(existing?.price ?? 0));
  const [durationMin, setDurationMin] = useState(String(existing?.durationMin ?? 60));
  const [validFrom, setValidFrom] = useState(toDateInputValue(existing?.validFrom ?? null));
  const [validUntil, setValidUntil] = useState(toDateInputValue(existing?.validUntil ?? null));
  const [active, setActive] = useState(existing?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedServices = useMemo(
    () => serviceIds.map((id) => serviceOptions.find((s) => s.id === id)).filter((s): s is OfferServiceOption => !!s),
    [serviceIds, serviceOptions]
  );
  const realValue = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const availableToAdd = serviceOptions.filter((s) => !serviceIds.includes(s.id));

  function addService(id: string) {
    if (!id || serviceIds.includes(id)) return;
    setServiceIds((prev) => [...prev, id]);
  }
  function removeService(id: string) {
    setServiceIds((prev) => prev.filter((s) => s !== id));
  }

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "ofertat");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("errorUpload"));
        return;
      }
      setImageUrl(data.url);
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title,
        description: description || undefined,
        imageUrl: imageUrl || undefined,
        serviceIds,
        price: Number(price),
        durationMin: Number(durationMin),
        validFrom: validFrom || undefined,
        validUntil: validUntil || undefined,
        active,
      };
      const res = await fetch(existing ? `/api/offers/${existing.id}` : "/api/offers", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("errorSave"));
        return;
      }
      router.refresh();
      onSaved(data.offer.id);
    } catch {
      setError(t("errorNetwork"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    if (!confirm(t("confirmDelete", { title: existing.title }))) return;
    setBusy(true);
    try {
      await fetch(`/api/offers/${existing.id}`, { method: "DELETE" });
      router.refresh();
      onCancel();
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = title.trim().length >= 2 && serviceIds.length > 0 && Number(price) >= 0 && Number(durationMin) >= 5 && !busy;

  const previewData = {
    id: existing?.id ?? "preview",
    title: title || t("previewTitlePlaceholder"),
    description: description || null,
    imageUrl: imageUrl || null,
    price: Number(price) || 0,
    serviceNames: selectedServices.length > 0 ? selectedServices.map((s) => s.name) : [t("previewChooseServices")],
    realValue,
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line p-2">
        <div className="flex gap-1">
          <button type="button" className={tabBtn(tab === "details")} onClick={() => setTab("details")}>{t("tabDetails")}</button>
          <button type="button" className={tabBtn(tab === "preview")} onClick={() => setTab("preview")}>{t("tabPreview")}</button>
        </div>
        <h2 className="truncate pr-2 text-sm font-semibold text-ink">{existing ? existing.title : t("newOffer")}</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "preview" ? (
          <div className="flex h-full items-start justify-center pt-2">
            <div className="w-full max-w-sm">
              <OfferCard offer={previewData} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label={t("photoLabel")}>
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <img src={imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-line" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-ink-faint">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="9" cy="9" r="2" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                )}
                <label className={`${buttonStyles.secondary} cursor-pointer`}>
                  {uploading ? t("uploading") : imageUrl ? t("changePhoto") : t("uploadPhoto")}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pickImage} disabled={uploading} />
                </label>
              </div>
            </Field>

            <Field label={t("titleLabel")}>
              <input className={inputStyles} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("titlePlaceholder")} />
            </Field>

            <Field label={t("descriptionLabel")}>
              <input className={inputStyles} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} />
            </Field>

            <Field label={t("includedServicesLabel")} hint={t("includedServicesHint")}>
              <div className="flex flex-col gap-2">
                {selectedServices.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedServices.map((s) => (
                      <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                        {s.name}
                        <button type="button" onClick={() => removeService(s.id)} aria-label={t("removeServiceAria", { name: s.name })} className="text-accent/70 hover:text-accent">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <select className={inputStyles} value="" onChange={(e) => addService(e.target.value)} disabled={availableToAdd.length === 0}>
                  <option value="" disabled>
                    {availableToAdd.length === 0 ? t("allServicesAdded") : t("addServicePlaceholder")}
                  </option>
                  {availableToAdd.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.price.toFixed(2)} €</option>
                  ))}
                </select>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("offerPriceLabel")}>
                <input type="number" min={0} step="0.5" className={inputStyles} value={price} onChange={(e) => setPrice(e.target.value)} />
              </Field>
              <Field label={t("durationLabel")}>
                <input type="number" min={5} max={600} step={5} className={inputStyles} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
              </Field>
            </div>

            {realValue > 0 && (
              <p className="-mt-2 text-xs text-ink-faint">
                {t("realValueLabel")} <span className="font-medium text-ink-soft">{realValue.toFixed(2)} €</span>
                {Number(price) > 0 && Number(price) < realValue && (
                  <span className="text-ok"> {t("savingsNote", { amount: (realValue - Number(price)).toFixed(2) })}</span>
                )}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("validFromLabel")}>
                <input type="date" className={inputStyles} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </Field>
              <Field label={t("validUntilLabel")}>
                <input type="date" className={inputStyles} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
              </Field>
            </div>

            <Field label={t("statusLabel")}>
              <select className={inputStyles} value={active ? "active" : "inactive"} onChange={(e) => setActive(e.target.value === "active")}>
                <option value="active">{t("statusActive")}</option>
                <option value="inactive">{t("statusInactive")}</option>
              </select>
            </Field>

            {error && <Alert message={error} />}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-line p-3">
        <div>
          {existing && (
            <button onClick={remove} disabled={busy} className={buttonStyles.danger}>{tCommon("delete")}</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className={buttonStyles.secondary}>{tCommon("cancel")}</button>
          <button onClick={submit} disabled={!canSubmit} className={buttonStyles.primary}>
            {busy ? t("saving") : existing ? t("saveChanges") : t("createOffer")}
          </button>
        </div>
      </div>
    </div>
  );
}
