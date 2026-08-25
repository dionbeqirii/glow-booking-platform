"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Alert, buttonStyles, inputStyles } from "@/components/ui";

export type ServiceOption = { id: string; name: string };

export default function AddWalkinForm({ services }: { services: ServiceOption[] }) {
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
        setError(data.error ?? "Shtimi në radhë dështoi");
        return;
      }
      setSuccess(`${name || "Klienti"} u shtua në radhë me numrin ${data.entry.queueNumber}.`);
      setName("");
      setPhone("");
      setServiceId("");
      setNotes("");
      router.refresh();
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = name.trim().length >= 2 && serviceId && !busy;

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-surface p-3">
      <p className="text-sm font-semibold text-ink">Shto Klient në Radhë</p>
      <p className="mb-3 text-xs text-ink-faint">Shto shpejt një klient në listën e pritjes.</p>

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[130px] flex-1 basis-40">
          <Field label="Emri i Plotë">
            <input className={inputStyles} value={name} onChange={(e) => setName(e.target.value)} placeholder="Emri i klientit" />
          </Field>
        </div>
        <div className="min-w-[110px] flex-1 basis-32">
          <Field label="Numri i Telefonit">
            <input className={inputStyles} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+383 4X XXX XXX" />
          </Field>
        </div>
        <div className="min-w-[130px] flex-1 basis-40">
          <Field label="Shërbimi i Kërkuar">
            <select className={inputStyles} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Zgjidh shërbimin</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="min-w-[130px] flex-1 basis-40">
          <Field label="Shënime (Opsionale)">
            <input className={inputStyles} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shto një shënim…" />
          </Field>
        </div>
        <button type="submit" disabled={!canSubmit} className={`${buttonStyles.primary} shrink-0`}>
          {busy ? "Duke shtuar…" : "+ Shto në Radhë"}
        </button>
      </div>

      {error && <div className="mt-2"><Alert message={error} /></div>}
      {success && <div className="mt-2"><Alert message={success} tone="success" /></div>}
    </form>
  );
}
