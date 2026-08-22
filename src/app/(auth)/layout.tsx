import type { ReactNode } from "react";
import AuthBackground from "@/components/AuthBackground";

// Shared shell for every auth screen (login, register, forgot/update
// password). Next.js keeps a layout mounted across client-side navigation
// between sibling routes, so the video background here persists — clicking
// between "Hyr" and "Regjistrohu" no longer remounts <video> and restarts it.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthBackground />
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </>
  );
}
