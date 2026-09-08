import type { ReactNode } from "react";
import AuthBackground from "@/components/AuthBackground";
import LanguageSwitcher from "@/components/LanguageSwitcher";

// Shared shell for every auth screen (login, register, forgot/update
// password). Next.js keeps a layout mounted across client-side navigation
// between sibling routes, so the video background here persists — clicking
// between "Hyr" and "Regjistrohu" no longer remounts <video> and restarts it.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AuthBackground />
      <div className="fixed right-4 top-4 z-10">
        <LanguageSwitcher light />
      </div>
      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </>
  );
}
