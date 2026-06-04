"use client";

import { useState } from "react";
import Link from "next/link";

type NavLink = {
  label: string;
  href?: string;
};

type NavGroup = {
  label: string;
  children: NavLink[];
};

const SINGLE_ITEMS: NavLink[] = [
  { label: "Hướng dẫn sử dụng" },
  { label: "Trang chủ" },
];

const GROUPS: NavGroup[] = [
  {
    label: "Hệ thống",
    children: [
      { label: "Phân quyền", href: "/permission" },
      { label: "Vai trò", href: "/role" },
      { label: "Tài khoản", href: "/user" },
      { label: "Loại hình doanh nghiệp", href: "/enterprise-type" },
      { label: "Ngành nghề kinh doanh", href: "/business-sector" },
      { label: "Quản lý doanh nghiệp", href: "/enterprise" },
      { label: "Ký báo cáo", href: "/sign-report" },
    ],
  },
  { label: "Quản trị phần mềm", children: [] },
  { label: "Chuẩn nghề nghiệp giáo viên", children: [] },
  { label: "Chuẩn nghề nghiệp HT - HP", children: [] },
  {
    label: "Tai nạn lao động",
    children: [{ label: "Danh mục chung" }, { label: "TNLĐ theo HĐLĐ" }],
  },
];

function groupOfActive(active?: string): string | null {
  if (!active) return null;
  const group = GROUPS.find((g) => g.children.some((c) => c.label === active));
  return group?.label ?? null;
}

type AppSidebarProps = {
  userName?: string;
  initials?: string;
  active?: string;
  onChangePassword?: () => void;
  onLogout: () => void;
};

const ITEM_CLASS =
  "flex cursor-pointer items-center gap-2.5 px-4 py-[11px] text-[13px] text-white/80 transition-colors hover:bg-white/10 hover:text-white";

export function AppSidebar({
  userName = "Phan Thanh Tùng",
  initials = "PT",
  active,
  onChangePassword,
  onLogout,
}: AppSidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const activeGroup = groupOfActive(active);
    return { "Hệ thống": true, ...(activeGroup ? { [activeGroup]: true } : {}) };
  });

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <aside className="fixed bottom-0 left-0 top-[52px] z-50 flex w-[220px] flex-col overflow-y-auto bg-dark">
      <nav>
        {SINGLE_ITEMS.map((item) => (
          <div key={item.label} className={ITEM_CLASS}>
            {item.label}
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
                  {group.children.map((child) => {
                    const isActive = child.label === active;
                    const className = `relative py-[10px] pl-9 pr-4 text-[12.5px] transition-colors hover:bg-white/10 hover:text-white ${
                      isActive
                        ? "font-semibold text-white before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-r-sm before:bg-[#60a5fa] before:content-['']"
                        : "text-white/80"
                    }`;
                    if (child.href) {
                      return (
                        <Link key={child.label} href={child.href} className={`block ${className}`}>
                          {child.label}
                        </Link>
                      );
                    }
                    return (
                      <div key={child.label} className={`cursor-pointer ${className}`}>
                        {child.label}
                      </div>
                    );
                  })}
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
        {onChangePassword ? (
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
        ) : null}
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
