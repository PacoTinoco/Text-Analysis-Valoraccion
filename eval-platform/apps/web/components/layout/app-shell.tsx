"use client";

import { usePathname } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import Sidebar from "@/components/layout/sidebar";
import { AnalysisStoreProvider } from "@/contexts/analysis-store";

const PUBLIC_PATHS = ["/", "/login"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Public pages: no auth, no sidebar
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // All other pages: require auth + show sidebar.
  // AnalysisStoreProvider wraps the whole shell so analyses survive navigation.
  return (
    <AnalysisStoreProvider>
      <AuthGuard>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto relative">
            {/* Animated background — light version of landing page grid */}
            <div className="animated-bg-layer" aria-hidden="true">
              <div className="grid-pattern" />
              <div className="dot-pattern" />
              <div className="glow-blue" />
              <div className="glow-purple" />
              <div className="glow-teal" />
            </div>
            {/* Page content */}
            <div className="relative z-10 p-8">
              {children}
            </div>
          </main>
        </div>
      </AuthGuard>
    </AnalysisStoreProvider>
  );
}
