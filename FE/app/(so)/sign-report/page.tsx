"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TriCheckbox } from "@/libs/shared/core/components/TriCheckbox/TriCheckbox";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { PhuLucIIView } from "@/libs/tts/accident-report/PhuLucIIView";
import {
  EMPTY_DECLARATION,
  STATUS_META,
  STATUS_OPTIONS,
  type AtvsldReport,
  type DeclarationValues,
  type ReportStatus,
} from "@/libs/tts/accident-report/atvsldReportData";
import {
  getAtvsldReportList,
  getAtvsldReportById,
  approveAtvsldReports,
  rejectAtvsldReports,
} from "@/libs/tts/accident-report/atvsldReportApi";
import { useCan } from "@/libs/tts/auth/abilityContext";

import useDebounce from "@/libs/shared/core/hooks/useDebounce";

type ViewMode = "list" | "detail";

const FILTER_INPUT =
  "h-[30px] w-full rounded-[5px] border border-line px-2 text-[12.5px] font-normal text-ink outline-none focus:border-[#3b82f6]";
const FILTER_SELECT = `${FILTER_INPUT} cursor-pointer appearance-none bg-white bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_8px_center] bg-no-repeat pr-6`;
const YEAR_SELECT =
  "h-[34px] min-w-[100px] cursor-pointer appearance-none rounded-md border border-line bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-[13px] outline-none";

function StatusCell({ status }: { status: ReportStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${meta.text}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${meta.dot}`} />
      {status}
    </span>
  );
}

export default function SignReportPage() {
  const canApprove = useCan("update", "SIGN_REPORT");
  const lastFetchRef = useRef<string>("");
  const [view, setView] = useState<ViewMode>("list");
  const [reports, setReports] = useState<AtvsldReport[]>([]);
  const [viewingReport, setViewingReport] = useState<AtvsldReport | null>(null);
  const [viewValues, setViewValues] =
    useState<DeclarationValues>(EMPTY_DECLARATION);
  const [year, setYear] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [fTen, setFTen] = useState("");
  const [fMST, setFMST] = useState("");
  const [fPhuong, setFPhuong] = useState("");
  const [fStatus, setFStatus] = useState("");

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [searchTen, setSearchTen] = useState("");
  const [searchMST, setSearchMST] = useState("");
  const [searchPhuong, setSearchPhuong] = useState("");

  const hasActiveFilters = Boolean(
    year ||
      fTen ||
      searchTen ||
      fMST ||
      searchMST ||
      fPhuong ||
      searchPhuong ||
      fStatus
  );

  const handleClearFilters = () => {
    setYear("");
    setFTen("");
    setSearchTen("");
    setFMST("");
    setSearchMST("");
    setFPhuong("");
    setSearchPhuong("");
    setFStatus("");
    setCurrentPage(1);
  };

  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);

  const loadReports = useCallback(
    (force = false) => {
      const fetchKey = JSON.stringify({
        year,
        searchTen,
        searchMST,
        searchPhuong,
        fStatus,
        currentPage,
        pageSize,
      });

      if (!force && lastFetchRef.current === fetchKey) {
        return;
      }
      lastFetchRef.current = fetchKey;

      getAtvsldReportList({
        nam: year ? Number(year) : undefined,
        ten: searchTen || undefined,
        mst: searchMST || undefined,
        ward: searchPhuong || undefined,
        status: fStatus || undefined,
        page: currentPage,
        pageSize: pageSize,
      })
        .then((res) => {
          setReports(res.data);
          setTotal(res.total);
        })
        .catch(() => setToast("Không tải được danh sách báo cáo"));
    },
    [year, searchTen, searchMST, searchPhuong, fStatus, currentPage, pageSize],
  );

  useEffect(() => {
    const filtersKey = JSON.stringify({ year, searchTen, searchMST, searchPhuong, fStatus });
    const lastFilters = lastFetchRef.current
      ? JSON.parse(lastFetchRef.current)
      : null;
    const filtersChanged =
      lastFilters &&
      JSON.stringify({
        year: lastFilters.year,
        searchTen: lastFilters.searchTen,
        searchMST: lastFilters.searchMST,
        searchPhuong: lastFilters.searchPhuong,
        fStatus: lastFilters.fStatus,
      }) !== filtersKey;

    if (filtersChanged) {
      setSelectedIds(new Set());
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }

    loadReports();
  }, [year, searchTen, searchMST, searchPhuong, fStatus, currentPage, pageSize, loadReports]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected =
    reports.length > 0 && reports.every((r) => selectedIds.has(r.id));
  const someSelected = reports.some((r) => selectedIds.has(r.id));

  const selectedReports = useMemo(() => {
    return reports.filter((r) => selectedIds.has(r.id));
  }, [reports, selectedIds]);

  const disableRejectButton = useMemo(() => {
    if (!canApprove) return true;
    return selectedReports.some((r) => r.status === "Từ chối");
  }, [selectedReports, canApprove]);

  const disableApproveButton = useMemo(() => {
    if (!canApprove) return true;
    return selectedReports.some((r) => r.status === "Hoàn thành");
  }, [selectedReports, canApprove]);

  const rejectTitle = useMemo(() => {
    if (!canApprove) return "Bạn không có quyền duyệt/từ chối";
    if (selectedReports.some((r) => r.status === "Từ chối")) {
      return "Không thể từ chối báo cáo đã bị từ chối trước đó";
    }
    return undefined;
  }, [selectedReports, canApprove]);

  const approveTitle = useMemo(() => {
    if (!canApprove) return "Bạn không có quyền duyệt/từ chối";
    if (selectedReports.some((r) => r.status === "Hoàn thành")) {
      return "Không thể duyệt báo cáo đã hoàn thành trước đó";
    }
    return undefined;
  }, [selectedReports, canApprove]);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) reports.forEach((r) => next.delete(r.id));
      else reports.forEach((r) => next.add(r.id));
      return next;
    });
  };

  const approveSelected = async () => {
    const ids = [...selectedIds];
    try {
      await approveAtvsldReports(ids);
      setToast(`Đã duyệt ${ids.length} báo cáo`);
      setSelectedIds(new Set());
      loadReports(true);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Duyệt báo cáo thất bại");
    }
  };

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyReport, setHistoryReport] = useState<AtvsldReport | null>(null);

  const parseDate = (dStr: string) => {
    if (!dStr) return new Date();
    const parts = dStr.split("/");
    if (parts.length === 3) {
      return new Date(
        Number(parts[2]),
        Number(parts[1]) - 1,
        Number(parts[0]),
        8,
        0,
      );
    }
    return new Date();
  };

  const displayHistory = useMemo(() => {
    if (!historyReport) return [];

    const list = historyReport.history ? [...historyReport.history] : [];

    // 1. Tự động thêm sự kiện tạo bản nháp nếu thiếu
    const hasCreate = list.some((h) => h.action === "đã tạo bản nháp báo cáo");
    if (!hasCreate) {
      const createdDate = parseDate(historyReport.ngayCapNhat);
      list.unshift({
        timestamp: createdDate.toISOString(),
        actor: historyReport.ten,
        action: "đã tạo bản nháp báo cáo",
      });
    }

    // 2. Tự động thêm sự kiện nộp báo cáo nếu thiếu và đã nộp
    const hasSubmit = list.some((h) => h.action === "đã gửi báo cáo");
    if (
      !hasSubmit &&
      historyReport.ngayNop &&
      historyReport.ngayNop !== "–" &&
      historyReport.ngayNop !== ""
    ) {
      const nopDate = parseDate(historyReport.ngayNop);
      list.splice(1, 0, {
        timestamp: nopDate.toISOString(),
        actor: historyReport.ten,
        action: "đã gửi báo cáo",
      });
    }

    return list;
  }, [historyReport]);

  const openHistory = (report: AtvsldReport) => {
    setHistoryReport(report);
    setHistoryOpen(true);
    getAtvsldReportById(report.id)
      .then((detail) => {
        setHistoryReport(detail);
        setReports((prev) =>
          prev.map((r) => (r.id === report.id ? detail : r)),
        );
      })
      .catch(() => {});
  };

  const openDetail = (report: AtvsldReport) => {
    setViewingReport(report);
    setViewValues(EMPTY_DECLARATION);
    setView("detail");
    getAtvsldReportById(report.id)
      .then((detail) => {
        setViewingReport(detail);
        setViewValues({ ...EMPTY_DECLARATION, ...detail.declaration });
      })
      .catch(() => setToast("Không tải được nội dung báo cáo"));
  };

  const confirmReject = async () => {
    const ids = [...selectedIds];
    try {
      await rejectAtvsldReports(ids, rejectReason.trim() || "—");
      setToast(`Đã từ chối ${ids.length} báo cáo`);
      setSelectedIds(new Set());
      setRejectReason("");
      setRejectOpen(false);
      loadReports(true);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Từ chối báo cáo thất bại");
    }
  };

  return (
    <>
      <Toast message={toast} onDone={() => setToast(null)} />

      {view === "list" ? (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">
              Báo cáo định kỳ ATVSLĐ
            </h1>
            <div className="flex items-center gap-2.5">
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="flex h-9 items-center gap-1.5 rounded-md border border-[#e5e7eb] bg-white px-4 text-[13px] text-[#6b7280] hover:border-[#f87171] hover:text-[#ef4444] transition-colors"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Xóa bộ lọc
                </button>
              )}
              <select
                className={YEAR_SELECT}
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ color: year === "" ? "transparent" : "inherit" }}
              >
                <option value="" className="text-ink bg-white">Bỏ chọn</option>
                <option value="2022" className="text-ink bg-white">2022</option>
                <option value="2023" className="text-ink bg-white">2023</option>
                <option value="2024" className="text-ink bg-white">2024</option>
                <option value="2025" className="text-ink bg-white">2025</option>
                <option value="2026" className="text-ink bg-white">2026</option>
              </select>
            </div>
          </div>

          <div className="px-6 py-5">
            <div className="overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr>
                      <th className="w-11 border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5">
                        <TriCheckbox
                          checked={allSelected}
                          indeterminate={!allSelected && someSelected}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      {[
                        "",
                        "Tên doanh nghiệp",
                        "Mã số thuế",
                        "Ngày nộp báo cáo",
                        "Phường/xã",
                        "Lý do từ chối",
                        "Trạng thái",
                      ].map((h, i) => (
                        <th
                          key={h || i}
                          className="whitespace-nowrap border-b border-[#e5e7eb] bg-[#f9fafb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#374151]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input
                          className={FILTER_INPUT}
                          value={fTen}
                          onChange={(e) => {
                            setFTen(e.target.value);
                            if (e.target.value === "") {
                              setSearchTen("");
                              setCurrentPage(1);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setSearchTen(fTen);
                              setCurrentPage(1);
                            }
                          }}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input
                          className={FILTER_INPUT}
                          value={fMST}
                          onChange={(e) => {
                            setFMST(e.target.value);
                            if (e.target.value === "") {
                              setSearchMST("");
                              setCurrentPage(1);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setSearchMST(fMST);
                              setCurrentPage(1);
                            }
                          }}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <input
                          className={FILTER_INPUT}
                          value={fPhuong}
                          onChange={(e) => {
                            setFPhuong(e.target.value);
                            if (e.target.value === "") {
                              setSearchPhuong("");
                              setCurrentPage(1);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setSearchPhuong(fPhuong);
                              setCurrentPage(1);
                            }
                          }}
                        />
                      </th>
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5" />
                      <th className="border-b border-[#e5e7eb] bg-white px-2.5 py-1.5">
                        <select
                          className={FILTER_SELECT}
                          value={fStatus}
                          onChange={(e) => {
                            setFStatus(e.target.value);
                            setCurrentPage(1);
                          }}
                          style={{ color: fStatus === "" ? "transparent" : "inherit" }}
                        >
                          <option value="" className="text-ink bg-white">Bỏ chọn</option>
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} className="text-ink bg-white">{s}</option>
                          ))}
                        </select>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-3.5 py-8 text-center text-[13.5px] text-muted"
                        >
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      reports.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]"
                        >
                          <td className="px-3.5 py-2.5">
                            <TriCheckbox
                              checked={selectedIds.has(r.id)}
                              onChange={() => toggleSelect(r.id)}
                            />
                          </td>
                          <td className="px-3.5 py-2.5">
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => openDetail(r)}
                                title="Xem"
                                className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                  <circle cx="12" cy="12" r="3" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => openHistory(r)}
                                title="Lịch sử xử lý"
                                className="rounded p-1 text-muted transition-colors hover:bg-[#eff6ff] hover:text-primary"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-[#374151]">
                            {r.ten}
                          </td>
                          <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">
                            {r.mst}
                          </td>
                          <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">
                            {r.ngayNop || "–"}
                          </td>
                          <td className="whitespace-nowrap px-3.5 py-2.5 text-[#374151]">
                            {r.ward}
                          </td>
                          <td className="px-3.5 py-2.5 text-[#374151]">
                            {r.lyDoTuChoi || "–"}
                          </td>
                          <td className="whitespace-nowrap px-3.5 py-2.5">
                            <StatusCell status={r.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-end gap-3 border-t border-[#f3f4f6] px-4 py-3 text-[13px] text-[#374151]">
                <div className="ml-auto flex items-center gap-3">
                  <select
                    className="h-[30px] cursor-pointer rounded-[5px] border border-line px-1.5 text-[13px] outline-none bg-white"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-[#6b7280]">
                    {total === 0
                      ? "0 of 0"
                      : `${start + 1} - ${end} of ${total}`}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(lastPage, p + 1))
                      }
                      disabled={currentPage >= lastPage}
                      className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-line bg-white text-[#374151] hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedIds.size > 0 ? (
            <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
              <span className="flex h-6 min-w-6 items-center justify-center rounded bg-primary px-1.5 text-[12px] font-semibold text-white">
                {selectedIds.size}
              </span>
              <span className="text-[13px] text-[#374151]">
                dữ liệu được chọn
              </span>
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                disabled={disableRejectButton}
                title={rejectTitle}
                className="flex h-8 items-center gap-1.5 rounded-md bg-danger px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-danger"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M1 4v6h6" />
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
                Từ chối
              </button>
              <button
                type="button"
                onClick={approveSelected}
                disabled={disableApproveButton}
                title={approveTitle}
                className="flex h-8 items-center gap-1.5 rounded-md bg-success px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-success"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Duyệt báo cáo
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded p-1 text-muted hover:bg-body hover:text-ink"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <h1 className="text-base font-semibold text-ink">Báo cáo ATVSLĐ</h1>
            <button
              type="button"
              onClick={() => setView("list")}
              className="text-[13.5px] font-medium text-[#374151] hover:text-ink"
            >
              Huỷ bỏ
            </button>
          </div>
          <div className="px-6 py-5">
            <div className="rounded-lg bg-white p-8 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              <PhuLucIIView
                values={viewValues}
                report={viewingReport ?? undefined}
              />
            </div>
          </div>
        </>
      )}

      <Modal
        open={rejectOpen}
        title="Từ chối báo cáo"
        onClose={() => setRejectOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setRejectOpen(false)}
              className="h-9.5 rounded-md px-5 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={confirmReject}
              className="h-9.5 rounded-md bg-danger px-6 text-sm font-semibold text-white hover:bg-[#dc2626]"
            >
              Xác nhận từ chối
            </button>
          </div>
        }
      >
        <label className="mb-1.5 block text-[12.5px] text-[#374151]">
          Lý do từ chối <span className="text-danger">*</span>
        </label>
        <textarea
          className="min-h-22.5 w-full rounded-md border border-line px-3 py-2 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>

      <Modal
        open={historyOpen}
        title="Tiến độ xử lý"
        onClose={() => setHistoryOpen(false)}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="h-9.5 rounded-md border border-line bg-white px-5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              Đóng
            </button>
          </div>
        }
      >
        <div className="relative bg-white min-h-[100px] py-2">
          {displayHistory.length > 0 ? (
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-[6px] top-[10px] bottom-[10px] w-[1.5px] bg-[#e2e8f0]" />

              <div className="space-y-6">
                {[...displayHistory].reverse().map((h, i) => {
                  const dateObj = new Date(h.timestamp);
                  const day = String(dateObj.getDate()).padStart(2, "0");
                  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
                  const year = dateObj.getFullYear();
                  const hours = String(dateObj.getHours()).padStart(2, "0");
                  const minutes = String(dateObj.getMinutes()).padStart(2, "0");
                  const formattedTime = `${day}/${month}/${year} ${hours}:${minutes}`;

                  return (
                    <div key={i} className="relative pl-7 text-[13.5px]">
                      {/* Timeline circle node */}
                      <div className="absolute left-0 top-[4px] h-3.5 w-3.5 rounded-full border-2 border-[#cbd5e1] bg-white z-10" />

                      <div className="text-[#6b7280] text-[12.5px] mb-1">
                        {formattedTime}
                      </div>
                      <div className="text-ink">
                        <span className="font-bold text-[#1f2937]">
                          {h.actor}
                        </span>{" "}
                        <span className="text-[#4b5563]">{h.action}</span>
                      </div>
                      {h.lyDo && (
                        <div className="mt-1 text-[13.5px]">
                          <span className="font-bold text-danger">Lý do: </span>
                          <span className="text-[#1f2937]">{h.lyDo}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-[#6b7280] py-4">
              Chưa có lịch sử xử lý
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
