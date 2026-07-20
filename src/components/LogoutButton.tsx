"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-700 ring-1 ring-neutral-300 hover:bg-neutral-50"
    >
      Dil
    </button>
  );
}
