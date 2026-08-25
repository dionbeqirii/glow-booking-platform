"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, SectionTitle, Field, Alert, EmptyState, buttonStyles, inputStyles } from "../ui";

export type OfferRow = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  active: boolean;
  serviceId: string;
  serviceName: string;
};

export type ServiceOption = { id: string; name: string };

const emptyForm = { title: "", description: "", price: "0", serviceId: "", imageUrl: "" };

export default function OffersManager({ initial, services }: { initial: OfferRow[]; services: ServiceOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function send(url: string, method: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Veprimi dështoi");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Nuk u lidh dot me serverin");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ngarkimi i fotos dështoi");
        return;
      }
      setForm((f) => ({ ...f, imageUrl: data.url }));
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description,
      price: Number(form.price),
      serviceId: form.serviceId,
      imageUrl: form.imageUrl,
    };
    const ok = editingId
      ? await send(`/api/offers/${editingId}`, "PATCH", payload)
      : await send("/api/offers", "POST", payload);
    if (ok) reset();
  }

  function startEdit(o: OfferRow) {
    setEditingId(o.id);
    setError(null);
    setForm({
      title: o.title,
      description: o.description ?? "",
      price: String(o.price),
      serviceId: o.serviceId,
      imageUrl: o.imageUrl ?? "",
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function remove(o: OfferRow) {
    if (!confirm(`Të fshihet oferta "${o.title}"?`)) return;
    await send(`/api/offers/${o.id}`, "DELETE");
    if (editingId === o.id) reset();
  }

  async function toggleActive(o: OfferRow) {
    await send(`/api/offers/${o.id}`, "PATCH", { active: !o.active });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card>
        <SectionTitle title="Ofertat" hint={`${initial.length} oferta të krijuara`} />
        {initial.length === 0 ? (
          <EmptyState text="Nuk ka ende oferta. Shtoje të parën nga forma anash." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {initial.map((o) => (
              <div key={o.id} className="overflow-hidden rounded-2xl ring-1 ring-line">
                <div className="aspect-[16/10] w-full bg-surface-muted">
                  {o.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.imageUrl} alt={o.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-ink-faint">
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="9" cy="9" r="2" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{o.title}</p>
                      <p className="truncate text-xs text-ink-faint">{o.serviceName}</p>
                    </div>
                    <p className="shrink-0 font-semibold text-ink">{o.price.toFixed(2)} €</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={() => toggleActive(o)}
                      disabled={busy}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        o.active ? "bg-ok-soft text-ok" : "bg-surface-muted text-ink-faint"
                      }`}
                    >
                      {o.active ? "aktive" : "joaktive"}
                    </button>
                    <div className="flex gap-3">
                      <button onClick={() => startEdit(o)} className="text-sm font-medium text-ink hover:underline">
                        Ndrysho
                      </button>
                      <button onClick={() => remove(o)} disabled={busy} className="text-sm font-medium text-danger hover:underline">
                        Fshi
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="h-fit">
        <SectionTitle title={editingId ? "Ndrysho ofertën" : "Ofertë e re"} />
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Titulli" hint='P.sh. "Summer Glow"'>
            <input
              className={inputStyles}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <Field label="Përshkrimi (opsional)">
            <input
              className={inputStyles}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Shërbimi" hint="Rezervimi i ofertës përdor oraret e këtij shërbimi.">
            <select
              className={inputStyles}
              value={form.serviceId}
              onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
              required
            >
              <option value="" disabled>
                Zgjidh shërbimin
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Çmimi i ofertës (€)">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputStyles}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </Field>
          <Field label="Foto (opsionale)" hint="JPG, PNG ose WEBP, deri në 5 MB.">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickImage} className="text-sm text-ink-soft" />
          </Field>
          {form.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.imageUrl} alt="Parapamje" className="h-32 w-full rounded-xl object-cover ring-1 ring-line" />
          )}
          {uploading && <p className="text-xs text-ink-faint">Duke ngarkuar foton…</p>}

          {error && <Alert message={error} />}

          <div className="mt-1 flex gap-2">
            <button type="submit" disabled={busy || uploading} className={buttonStyles.primary}>
              {busy ? "Duke ruajtur…" : editingId ? "Ruaj ndryshimet" : "Shto ofertën"}
            </button>
            {editingId && (
              <button type="button" onClick={reset} className={buttonStyles.secondary}>
                Anulo
              </button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
