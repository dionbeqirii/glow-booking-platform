"use client";

import { useState } from "react";
import ServiceFormModal from "./ServiceFormModal";

export default function NewServiceButton({ existingCategories }: { existingCategories: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        Shërbim i Ri
      </button>
      {open && <ServiceFormModal existingCategories={existingCategories} onClose={() => setOpen(false)} />}
    </>
  );
}
