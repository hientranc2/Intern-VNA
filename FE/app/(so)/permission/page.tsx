"use client";

import { useEffect, useMemo, useState } from "react";
import { type Permission } from "@/libs/tts/permission/permissionData";
import { getPermissionList } from "@/libs/tts/permission/permissionApi";

type VisibleRow = Permission & { isGroup: boolean };

const FILTER_INPUT_CLASS =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] text-ink outline-none focus:border-[#3b82f6]";

function matches(p: Permission, loai: string, ma: string, ten: string): boolean {
  return (
    (!loai || p.type.toLowerCase().includes(loai)) &&
    (!ma || p.code.toLowerCase().includes(ma)) &&
    (!ten || p.name.toLowerCase().includes(ten))
  );
}

export default function PermissionPage() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getPermissionList()
      .then((list) => {
        setPermissions(list);
        // Mở rộng sẵn mọi nhóm quyền (không cứng id g1)
        setExpanded(
          Object.fromEntries(list.filter((p) => p.parentId === null).map((g) => [g.id, true])),
        );
      })
      .catch(() => {});
  }, []);
  const [filterLoai, setFilterLoai] = useState("");
  const [filterMa, setFilterMa] = useState("");
  const [filterTen, setFilterTen] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const toggleGroup = (groupId: string) =>
    setExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

  const visibleRows = useMemo<VisibleRow[]>(() => {
    const loai = filterLoai.toLowerCase();
    const ma = filterMa.toLowerCase();
    const ten = filterTen.toLowerCase();
    const hasFilter = Boolean(loai || ma || ten);

    const groups = permissions.filter((p) => p.parentId === null);
    const childrenOf = (groupId: string) =>
      permissions.filter((p) => p.parentId === groupId);

    const rows: VisibleRow[] = [];
    groups.forEach((group) => {
      const children = childrenOf(group.id);
      const groupMatch = matches(group, loai, ma, ten);
      const anyChildMatch = children.some((c) => matches(c, loai, ma, ten));
      if (hasFilter && !groupMatch && !anyChildMatch) return;

      rows.push({ ...group, isGroup: true });
      if (!expanded[group.id] && !hasFilter) return;
      children.forEach((child) => {
        if (!hasFilter || matches(child, loai, ma, ten)) {
          rows.push({ ...child, isGroup: false });
        }
      });
    });
    return rows;
  }, [permissions, expanded, filterLoai, filterMa, filterTen]);

  const total = visibleRows.length;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(currentPage, lastPage);
  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const paged = visibleRows.slice(start, end);

  const resetToFirstPage = () => setCurrentPage(1);

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
          <h1 className="text-base font-semibold text-ink">Danh sách quyền</h1>
        </div>

        <div className="px-6 py-5">
          <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr>
                  <th className="w-[60px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    STT
                  </th>
                  <th className="w-[130px] border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    Loại
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    Mã quyền
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]">
                    Tên quyền
                  </th>
                </tr>
                <tr>
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                    <input
                      className={FILTER_INPUT_CLASS}
                      value={filterLoai}
                      onChange={(e) => {
                        setFilterLoai(e.target.value);
                        resetToFirstPage();
                      }}
                    />
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                    <input
                      className={FILTER_INPUT_CLASS}
                      value={filterMa}
                      onChange={(e) => {
                        setFilterMa(e.target.value);
                        resetToFirstPage();
                      }}
                    />
                  </th>
                  <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                    <input
                      className={FILTER_INPUT_CLASS}
                      value={filterTen}
                      onChange={(e) => {
                        setFilterTen(e.target.value);
                        resetToFirstPage();
                      }}
                    />
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3.5 py-8 text-center text-[13.5px] text-muted">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  paged.map((row) =>
                    row.isGroup ? (
                      <tr key={row.id} className="border-b border-[#f3f4f6] bg-[#fafafa]">
                        <td className="px-3.5 py-2.5 text-[#6b7280]">{row.stt}</td>
                        <td className="px-3.5 py-2.5 font-semibold text-[#374151]">
                          <button
                            type="button"
                            onClick={() => toggleGroup(row.id)}
                            className={`mr-1.5 inline-flex items-center text-[#6b7280] transition-transform ${
                              expanded[row.id] ? "rotate-90" : ""
                            }`}
                            aria-label={expanded[row.id] ? "Thu gọn" : "Mở rộng"}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path d="M9 18l6-6-6-6" />
                            </svg>
                          </button>
                          {row.type}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-[#374151]">{row.code}</td>
                        <td className="px-3.5 py-2.5 font-semibold text-[#374151]">{row.name}</td>
                      </tr>
                    ) : (
                      <tr key={row.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                        <td className="px-3.5 py-2.5 pl-7 text-[#6b7280]">{row.stt}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{row.type}</td>
                        <td className="py-2.5 pl-8 pr-3.5 text-[#374151]">{row.code}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{row.name}</td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>

            <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#374151]">
              <select
                className="h-[30px] cursor-pointer rounded-[5px] border border-line px-1.5 text-[13px] outline-none"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  resetToFirstPage();
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-[#6b7280]">
                {total === 0 ? "0 - 0 of 0" : `${start + 1} - ${end} of ${total}`}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                  disabled={end >= total}
                  className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
