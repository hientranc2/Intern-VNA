"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/libs/tts/components/AppSidebar/AppSidebar";
import { AppTopbar } from "@/libs/tts/components/AppTopbar/AppTopbar";
import { getToken, clearToken } from "@/libs/tts/auth/authApi";
import { SidebarOverrideContext, type SidebarOverride } from "@/libs/tts/auth/sidebarContext";

const PATH_ACTIVE: Record<string, string> = {
  "/permission": "Phân quyền",
  "/role": "Vai trò",
  "/user": "Tài khoản",
  "/enterprise-type": "Loại hình doanh nghiệp",
  "/business-sector": "Ngành nghề kinh doanh",
  "/enterprise": "Quản lý doanh nghiệp",
  "/sign-report": "Ký báo cáo",
  "/report-config": "Ký báo cáo",
  "/category": "Danh mục chung",
  "/accident-report": "TNLĐ theo HĐLĐ",
};

export default function SoLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarOverride, setSidebarOverride] = useState<SidebarOverride>({});

  useEffect(() => {
    if (!getToken()) router.replace("/login");
  }, [router]);

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  const toggle = () => setSidebarOpen((v) => !v);

  return (
    <SidebarOverrideContext.Provider value={{ override: sidebarOverride, setOverride: setSidebarOverride }}>
      <div className="min-h-screen bg-body text-ink">
        <AppSidebar
          active={PATH_ACTIVE[pathname]}
          collapsed={!sidebarOpen}
          onToggle={toggle}
          onLogout={handleLogout}
          {...sidebarOverride}
        />
        <AppTopbar sidebarCollapsed={!sidebarOpen} onToggleSidebar={toggle} />
        <main className={`min-h-screen transition-[margin] duration-300 ${sidebarOpen ? "ml-[220px]" : "ml-0"}`}>
          {children}
        </main>
      </div>
    </SidebarOverrideContext.Provider>
  );
}
