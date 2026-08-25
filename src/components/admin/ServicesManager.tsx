"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, SectionTitle, Field, Alert, EmptyState, buttonStyles, inputStyles } from "../ui";

export type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
  active: boolean;
};

const emptyForm = { name: "", description: "", durationMin: "45", price: "0" };

export default function ServicesManager({ initial }: { initial: ServiceRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name,
      description: form.description,
      durationMin: Number(form.durationMin),
      price: Number(form.price),
    };
    const ok = editingId
      ? await send(`/api/services/${editingId}`, "PATCH", payload)
      : await send("/api/services", "POST", payload);
    if (ok) reset();
  }

  function startEdit(s: ServiceRow) {
    setEditingId(s.id);
    setError(null);
    setForm({
      name: s.name,
      description: s.description ?? "",
      durationMin: String(s.durationMin),
      price: String(s.price),
    });
  }

  async function remove(s: ServiceRow) {
    if (!confirm(`Të fshihet shërbimi "${s.name}"?`)) return;
    await send(`/api/services/${s.id}`, "DELETE");
    if (editingId === s.id) reset();
  }

  async function toggleActive(s: ServiceRow) {
    await send(`/api/services/${s.id}`, "PATCH", { active: !s.active });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card>
        <SectionTitle title="Katalogu i shërbimeve" hint={`${initial.length} shërbime të regjistruara`} />
        {initial.length === 0 ? (
          <EmptyState text="Nuk ka ende shërbime. Shtoje të parin nga forma anash." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-3 font-medium">Shërbimi</th>
                  <th className="py-2 pr-3 font-medium">Kohëzgjatja</th>
                  <th className="py-2 pr-3 font-medium">Çmimi</th>
                  <th className="py-2 pr-3 font-medium">Statusi</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {initial.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0">
                    <td className="py-2.5 pr-3">
                      <span className="font-medium text-ink">{s.name}</span>
                      {s.description && (
                        <span className="block text-xs text-ink-faint">{s.description}</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{s.durationMin} min</td>
                    <td className="py-2.5 pr-3 whitespace-nowrap">{s.price.toFixed(2)} €</td>
                    <td className="py-2.5 pr-3">
                      <button
                        onClick={() => toggleActive(s)}
                        disabled={busy}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          s.active
                            ? "bg-ok-soft text-ok"
                            : "bg-surface-muted text-ink-faint"
                        }`}
                      >
                        {s.active ? "aktiv" : "joaktiv"}
                      </button>
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(s)}
                        className="mr-2 text-sm font-medium text-ink hover:underline"
                      >
                        Ndrysho
                      </button>
                      <button
                        onClick={() => remove(s)}
                        disabled={busy}
                        className="text-sm font-medium text-danger hover:underline"
                      >
                        Fshi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="h-fit">
        <SectionTitle title={editingId ? "Ndrysho shërbimin" : "Shto shërbim"} />
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Emri">
            <input
              className={inputStyles}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
          <Field label="Kohëzgjatja (minuta)" hint="Përcakton bllokun që zë në kalendar.">
            <input
              type="number"
              min={5}
              max={600}
              step={5}
              className={inputStyles}
              value={form.durationMin}
              onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
              required
            />
          </Field>
          <Field label="Çmimi (€)">
            <input
              type="number"
              min={0}
              step="0.5"
              className={inputStyles}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
          </Field>

          {error && <Alert message={error} />}

          <div className="mt-1 flex gap-2">
            <button type="submit" disabled={busy} className={buttonStyles.primary}>
              {busy ? "Duke ruajtur…" : editingId ? "Ruaj ndryshimet" : "Shto shërbimin"}
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
