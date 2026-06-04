"use client";

import { useState } from "react";

type NavGroup = {
  label: string;
  children: string[];
};

const SINGLE_ITEMS = ["Hướng dẫn sử dụng", "Trang chủ"];

const GROUPS: NavGroup[] = [
  { label: "Hệ thống", children: ["Quản lý người dùng", "Vai trò người dùng", "Tiếp nhận"] },
  { label: "Quản trị phần mềm", children: [] },
  { label: "Chuẩn nghề nghiệp giáo viên", children: [] },
  { label: "Chuẩn nghề nghiệp HT - HP", children: [] },
];

type AppSidebarProps = {
  userName?: string;
  initials?: string;
  onChangePassword: () => void;
  onLogout: () => void;
};

export function AppSidebar({
  userName = "Phan Thanh Tùng",
  initials = "PT",
  onChangePassword,
  onLogout,
}: AppSidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    "Hệ thống": true,
  });

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <aside className="fixed bottom-0 left-0 top-[52px] z-50 flex w-[220px] flex-col overflow-y-auto bg-dark">
      <nav>
        {SINGLE_ITEMS.map((label) => (
          <div
            key={label}
            className="flex cursor-pointer items-center gap-2.5 px-4 py-[11px] text-[13px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {label}
          </div>
        ))}

        {GROUPS.map((group) => {
          const open = Boolean(openGroups[group.label]);
          return (
            <div key={group.label}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="flex w-full items-center gap-2.5 px-4 py-[11px] text-left text-[13px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <span className="flex-1">{group.label}</span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {open && group.children.length > 0 ? (
                <div className="bg-black/15">
                  {group.children.map((child) => (
                    <div
                      key={child}
                      className="cursor-pointer py-[10px] pl-9 pr-4 text-[12.5px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      {child}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="mx-3 mb-2 overflow-hidden rounded-lg bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-semibold text-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Thông tin tài khoản
        </div>
        <button
          type="button"
          onClick={onChangePassword}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[#374151] transition-colors hover:bg-[#f9fafb]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          Đổi mật khẩu
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-danger transition-colors hover:bg-[#f9fafb]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Đăng xuất
        </button>
      </div>

      <div className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#93c5fd] text-sm font-bold text-dark">
          {initials}
        </div>
        <span className="flex-1 text-[13px] font-medium text-white">{userName}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.6">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </aside>
  );
}
