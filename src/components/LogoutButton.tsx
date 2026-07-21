"use client";

import { useRouter } from "next/navigation";
import { buttonStyles } from "./ui";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} className={`${buttonStyles.secondary} px-3 py-1.5`}>
      Dil
    </button>
  );
}
