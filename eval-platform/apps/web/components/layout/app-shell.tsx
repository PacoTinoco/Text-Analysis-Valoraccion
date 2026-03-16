"use client";

import { usePathname } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";
import Sidebar from "@/components/layout/sidebar";
import { AnalysisStoreProvider } from "@/contexts/analysis-store";

const PUBLIC_PATHS = ["/", "/login"];

/**
 * AnimatedBackground — renders the grid, dots, and glow blobs
 * using inline styles to guarantee they render on Vercel / any build pipeline.
 */
function AnimatedBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        background:
          "linear-gradient(165deg, #e8eeff 0%, #eef2ff 30%, #f4f6ff 60%, #edf0ff 100%)",
      }}
    >
      {/* Grid lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(59,130,246,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.13) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 50% 40%, black 40%, transparent 100%)",
          maskImage:
            "radial-gradient(ellipse 90% 80% at 50% 40%, black 40%, transparent 100%)",
          animation: "gridShift 40s linear infinite",
        }}
      />

      {/* Dot pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(59,130,246,0.18) 1.2px, transparent 1.2px)",
          backgroundSize: "30px 30px",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 25%, transparent 100%)",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 50%, black 25%, transparent 100%)",
          animation: "gridShift 50s linear infinite reverse",
        }}
      />

      {/* Blue glow blob — top right */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)",
          top: -200,
          right: -100,
          filter: "blur(60px)",
          animation: "driftBlue 18s ease-in-out infinite alternate",
        }}
      />

      {/* Purple glow blob — bottom left */}
      <div
        style={{
          position: "absolute",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
          bottom: -150,
          left: -80,
          filter: "blur(60px)",
          animation: "driftPurple 22s ease-in-out infinite alternate",
        }}
      />

      {/* Teal glow blob — center */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(20,184,166,0.09) 0%, transparent 70%)",
          top: "40%",
          left: "30%",
          filter: "blur(60px)",
          animation: "driftTeal 25s ease-in-out infinite alternate",
        }}
      />

      {/* Keyframe animations injected inline so they always exist */}
      <style>{`
        @keyframes gridShift {
          0%   { background-position: 0 0; }
          100% { background-position: 60px 60px; }
        }
        @keyframes driftBlue {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(-50px,40px) scale(1.05); }
        }
        @keyframes driftPurple {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(40px,-30px) scale(1.08); }
        }
        @keyframes driftTeal {
          0%   { transform: translate(0,0) scale(1); }
          100% { transform: translate(-30px,-20px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}

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
            <AnimatedBackground />
            <div className="relative z-10 p-8">
              {children}
            </div>
          </main>
        </div>
      </AuthGuard>
    </AnalysisStoreProvider>
  );
}
