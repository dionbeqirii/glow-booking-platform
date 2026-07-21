"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, SectionTitle, Field, Alert, EmptyState, buttonStyles, inputStyles } from "../ui";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  skillCount: number;
  hoursCount: number;
};

const emptyForm = { name: "", email: "", phone: "", password: "" };

export default function StaffManager({ initial }: { initial: StaffRow[] }) {
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Krijimi dështoi");
        return;
      }
      setForm(emptyForm);
      router.refresh();
    } catch {
      setError("Nuk u lidh dot me serverin");
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: StaffRow) {
    if (!confirm(`Të fshihet punonjësja/i "${member.name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/${member.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Fshirja dështoi");
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        <SectionTitle title="Stafi" hint={`${initial.length} punonjës të regjistruar`} />
        {initial.length === 0 ? (
          <EmptyState text="Nuk ka ende staf. Shto punonjësin e parë nga forma anash." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="py-2 pr-3 font-medium">Emri</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Aftësi</th>
                  <th className="py-2 pr-3 font-medium">Orar</th>
                  <th className="py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {initial.map((m) => (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="py-2.5 pr-3 font-medium text-ink">{m.name}</td>
                    <td className="py-2.5 pr-3 text-ink-soft">{m.email}</td>
                    <td className="py-2.5 pr-3">{m.skillCount} shërbime</td>
                    <td className="py-2.5 pr-3">
                      {m.hoursCount > 0 ? (
                        `${m.hoursCount} intervale`
                      ) : (
                        <span className="text-warn">pa orar</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/stafi/${m.id}`}
                        className="mr-2 text-sm font-medium text-ink hover:underline"
                      >
                        Konfiguro
                      </Link>
                      <button
                        onClick={() => remove(m)}
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
        {error && (
          <div className="mt-3">
            <Alert message={error} />
          </div>
        )}
      </Card>

      <Card className="h-fit">
        <SectionTitle title="Shto punonjës" />
        <form onSubmit={create} className="flex flex-col gap-3">
          <Field label="Emri dhe mbiemri">
            <input
              className={inputStyles}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputStyles}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="Telefoni (opsional)">
            <input
              className={inputStyles}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Fjalëkalimi fillestar" hint="Të paktën 8 karaktere.">
            <input
              type="password"
              className={inputStyles}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </Field>

          <button type="submit" disabled={busy} className={`mt-1 ${buttonStyles.primary}`}>
            {busy ? "Duke krijuar…" : "Krijo llogarinë"}
          </button>
        </form>
      </Card>
    </div>
  );
}
