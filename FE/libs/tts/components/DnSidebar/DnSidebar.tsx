"use client";

import { useState } from "react";
import Link from "next/link";

type DnSidebarProps = {
  active?: string;
  userName?: string;
  initials?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  onLogout?: () => void;
};

export function DnSidebar({ active, userName = "Doanh nghiệp", initials = "DN", collapsed = false, onLogout }: DnSidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ "Hệ thống": true, "Tai nạn lao động": false });

  const toggle = (label: string) => setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const childClass = (label: string) =>
    `relative block py-[10px] pl-9 pr-4 text-[12.5px] transition-colors hover:bg-white/10 hover:text-white ${
      active === label
        ? "font-semibold text-white before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-r-sm before:bg-[#60a5fa] before:content-['']"
        : "text-white/80"
    }`;

  return (
    <aside className={`fixed bottom-0 left-0 top-[52px] z-50 flex w-[220px] flex-col overflow-y-auto bg-dark transition-transform duration-300 ${collapsed ? "-translate-x-full" : "translate-x-0"}`}>
      <nav>
        <button type="button" onClick={() => toggle("Hệ thống")} className="flex w-full items-center gap-2.5 px-4 py-[11px] text-left text-[13px] text-white/80 hover:bg-white/10 hover:text-white">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>
          <span className="flex-1">Hệ thống</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${openGroups["Hệ thống"] ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {openGroups["Hệ thống"] ? (
          <div className="bg-black/15">
            <Link href="/enterprise-info" className={childClass("Thông tin doanh nghiệp")}>Thông tin doanh nghiệp</Link>
          </div>
        ) : null}

        <button type="button" onClick={() => toggle("Tai nạn lao động")} className="flex w-full items-center gap-2.5 px-4 py-[11px] text-left text-[13px] text-white/80 hover:bg-white/10 hover:text-white">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span className="flex-1">Tai nạn lao động</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${openGroups["Tai nạn lao động"] ? "rotate-180" : ""}`}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {openGroups["Tai nạn lao động"] ? (
          <div className="bg-black/15">
            <Link href="/enterprise-report" className={childClass("TNLĐ theo HĐLĐ")}>TNLĐ theo HĐLĐ</Link>
            <Link href="/enterprise-sign-report" className={childClass("Ký báo cáo")}>Ký báo cáo</Link>
          </div>
        ) : null}
      </nav>

      <div className="flex-1" />

      {onLogout ? (
        <div className="mx-3 mb-2 overflow-hidden rounded-lg bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
          <button type="button" onClick={onLogout} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-danger hover:bg-[#f9fafb]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Đăng xuất
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#93c5fd] text-sm font-bold text-dark">{initials}</div>
        <span className="flex-1 text-[13px] font-medium text-white">{userName}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.6">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </aside>
  );
}
