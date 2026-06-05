"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DnSidebar } from "@/libs/tts/components/DnSidebar/DnSidebar";
import { AppTopbar } from "@/libs/tts/components/AppTopbar/AppTopbar";
import { getToken, clearToken } from "@/libs/tts/auth/authApi";

const PATH_ACTIVE: Record<string, string> = {
  "/enterprise-info": "Thông tin doanh nghiệp",
  "/enterprise-report": "TNLĐ theo HĐLĐ",
};

export default function DnLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!getToken()) router.replace("/enterprise-login");
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.replace("/enterprise-login");
  };

  const toggle = () => setSidebarOpen((v) => !v);

  return (
    <div className="min-h-screen bg-body text-ink">
      <AppTopbar sidebarCollapsed={!sidebarOpen} onToggleSidebar={toggle} />
      <DnSidebar
        active={PATH_ACTIVE[pathname]}
        onLogout={handleLogout}
        collapsed={!sidebarOpen}
        onToggle={toggle}
      />
      <main
        className={`min-h-screen pt-[52px] transition-[margin] duration-300 ${sidebarOpen ? "ml-[220px]" : "ml-0"}`}
      >
        {children}
      </main>
    </div>
  );
}
