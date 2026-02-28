"use client";

import { usePathname } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import Sidebar from "@/components/layout/sidebar";

const PUBLIC_PATHS = ["/", "/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Public pages: no auth, no sidebar
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // All other pages: require auth + show sidebar
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}