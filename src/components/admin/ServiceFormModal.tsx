"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Field, Alert, buttonStyles, inputStyles } from "@/components/ui";
import type { ServiceListRow } from "@/lib/services-catalog";

// Shared create/edit modal — POST when `existing` is absent, PATCH when
// present. The image upload reuses the same local-disk /api/uploads route,
// pointed at the "sherbimet" folder.
export default function ServiceFormModal({
  existing,
  existingCategories,
  onClose,
}: {
  existing?: ServiceListRow;
  existingCategories: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [addingNewCategory, setAddingNewCategory] = useState(false);
  const [description, setDescription] = useState(existing?.description ?? "");
  const [durationMin, setDurationMin] = useState(String(existing?.durationMin ?? 45));
  const [price, setPrice] = useState(String(existing?.price ?? 0));
  const [active, setActive] = useState(existing?.active ?? true);
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "sherbimet");
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ngarkimi i fotos dështoi");
        return;
      }
      setImageUrl(data.url);
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name,
        category: category || undefined,
        description: description || undefined,
        durationMin: Number(durationMin),
        price: Number(price),
        active,
        imageUrl: imageUrl || undefined,
      };
      const res = await fetch(existing ? `/api/services/${existing.id}` : "/api/services", {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ruajtja dështoi");
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = name.trim().length >= 2 && Number(durationMin) >= 5 && Number(price) >= 0 && !busy;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface ring-1 ring-line shadow-[0_24px_64px_-24px_rgba(31,42,34,0.35)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">{existing ? "Ndrysho Shërbimin" : "Shërbim i Ri"}</h2>
          <button
            onClick={onClose}
            aria-label="Mbyll"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
          <Field label="Foto (opsionale)">
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
                {uploading ? "Duke ngarkuar…" : imageUrl ? "Ndrysho foton" : "Ngarko foto"}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={pickImage} disabled={uploading} />
              </label>
            </div>
          </Field>

          <Field label="Emri">
            <input className={inputStyles} value={name} onChange={(e) => setName(e.target.value)} placeholder="p.sh. HydraFacial" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kategoria (opsionale)">
              {addingNewCategory ? (
                <div className="flex items-center gap-1.5">
                  <input
                    className={inputStyles}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Emri i kategorisë së re"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAddingNewCategory(false);
                      setCategory(existing?.category ?? "");
                    }}
                    title="Anulo kategori të re"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              ) : (
                <select
                  className={inputStyles}
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === "__new__") {
                      setAddingNewCategory(true);
                      setCategory("");
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                >
                  <option value="">— Pa kategori —</option>
                  {existingCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="__new__">+ Kategori e Re</option>
                </select>
              )}
            </Field>
            <Field label="Statusi">
              <select className={inputStyles} value={active ? "active" : "inactive"} onChange={(e) => setActive(e.target.value === "active")}>
                <option value="active">Aktiv</option>
                <option value="inactive">Joaktiv</option>
              </select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kohëzgjatja (minuta)">
              <input type="number" min={5} max={600} step={5} className={inputStyles} value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
            </Field>
            <Field label="Çmimi (€)">
              <input type="number" min={0} step="0.5" className={inputStyles} value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
          </div>

          <Field label="Përshkrimi (opsional)">
            <input className={inputStyles} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="p.sh. Pastrim i thellë & shkëlqim" />
          </Field>

          {error && <Alert message={error} />}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
          <button onClick={onClose} className={buttonStyles.secondary}>Anulo</button>
          <button onClick={submit} disabled={!canSubmit} className={buttonStyles.primary}>
            {busy ? "Duke ruajtur…" : existing ? "Ruaj Ndryshimet" : "Shto Shërbimin"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
