"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DnSidebar } from "@/libs/tts/components/DnSidebar/DnSidebar";
import { AppTopbar } from "@/libs/tts/components/AppTopbar/AppTopbar";
import { getToken, clearToken } from "@/libs/tts/auth/authApi";

const PATH_ACTIVE: Record<string, string> = {
  "/enterprise-info": "Thông tin doanh nghiệp",
  "/enterprise-report": "TNLĐ theo HĐLĐ",
  "/enterprise-sign-report": "Ký báo cáo",
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
        className={`min-h-screen transition-[margin,padding] duration-300 ${sidebarOpen ? "ml-55" : "ml-0 pt-13"}`}
      >
        {children}
      </main>
    </div>
  );
}
