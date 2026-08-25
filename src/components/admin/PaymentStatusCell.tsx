"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_PILL } from "@/lib/booking-labels";
import type { PaymentStatus } from "@prisma/client";

const OPTIONS: PaymentStatus[] = ["UNPAID", "PAID", "REFUNDED"];

// A real, admin-editable payment flag per booking — not a payment gateway,
// just a status the studio toggles by hand against cash/in-person payment.
// Optimistic: flips immediately, reverts if the PATCH fails.
export default function PaymentStatusCell({ bookingId, status }: { bookingId: string; status: PaymentStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, setPending] = useState(false);

  async function onChange(next: PaymentStatus) {
    const prev = value;
    setValue(next);
    setPending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payment", paymentStatus: next }),
      });
      if (!res.ok) {
        setValue(prev);
      } else {
        router.refresh();
      }
    } catch {
      setValue(prev);
    } finally {
      setPending(false);
    }
  }

  const pill = PAYMENT_STATUS_PILL[value];
  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => onChange(e.target.value as PaymentStatus)}
      className={`w-full max-w-full truncate rounded-full border-0 px-2 py-1 text-xs font-semibold outline-none transition-opacity disabled:opacity-60 ${pill.bg} ${pill.text}`}
    >
      {OPTIONS.map((o) => (
        <option key={o} value={o}>{PAYMENT_STATUS_LABEL[o]}</option>
      ))}
    </select>
  );
}
