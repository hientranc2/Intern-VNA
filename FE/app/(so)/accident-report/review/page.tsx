"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAccidentReportById, rejectAccidentReports } from "@/libs/tts/accident-report/accidentReportApi";
import { type AccidentReport, DETAIL_REPORT_ROWS } from "@/libs/tts/accident-report/accidentReportData";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { getInjuryFactorList, getOccupationList } from "@/libs/tts/category/categoryApi";

const cleanName = (name: string): string => {
  return (name || "").replace(/^[–\-—\s\.\u2013\u2014]+/, "").trim();
};

const CT_TH = "border border-line bg-[#f3f4f6] px-2 py-2 text-[11px] font-semibold text-[#374151]";
const CT_TD = "border border-line px-2 py-2 text-[11px] text-[#374151]";

function ReviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<AccidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rejectReasons, setRejectReasons] = useState<Record<number, string>>({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dbFactors, setDbFactors] = useState<{ ten: string; ma: string }[]>([]);
  const [dbOccupations, setDbOccupations] = useState<{ ten: string; ma: string }[]>([]);

  const ids = useMemo(() => {
    const raw = searchParams.get("ids") || "";
    return raw
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      if (ids.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const loaded = await Promise.all(ids.map((id) => getAccidentReportById(id)));
        // Map status field to tt
        const mappedReports = loaded.map((report: any) => ({
          ...report,
          tt: report.status || report.tt,
        }));
        setReports(mappedReports);
        
        // Load factors and occupations
        const [factors, occupations] = await Promise.all([
          getInjuryFactorList(),
          getOccupationList(),
        ]);
        setDbFactors(factors);
        setDbOccupations(occupations);
      } catch {
        setToast({ message: "Không thể tải danh sách báo cáo", variant: "error" });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [ids]);

  const current = reports[activeIndex] ?? null;

  const soDetailRows = useMemo(() => {
    const r = current;
    if (!r) return DETAIL_REPORT_ROWS;
    const phanLoai = r.phanLoaiRows ?? {};
    const details = r.chiTietRows ?? [];

    const get11 = (ma: string): number[] => {
      const raw = phanLoai[ma];
      if (!Array.isArray(raw)) return Array(11).fill(0);
      return [
        Number(raw[0] ?? 0),
        Number(raw[1] ?? 0),
        Number(raw[2] ?? 0),
        Number(raw[3] ?? 0),
        0,
        Number(raw[4] ?? 0),
        0,
        Number(raw[5] ?? 0),
        0,
        Number(raw[6] ?? 0),
        0,
      ];
    };

    const section1Vals = [
      r.soVu,
      r.soVuCoNguoiChet,
      r.soVuCo2NguoiBiNan,
      r.soNguoiBiNan,
      0,
      r.soLDNu,
      0,
      r.soNguoiBiChet,
      0,
      r.soNguoiBiThuongNang,
      0,
    ];

    const section2Vals = get11("10");
    const section3Vals = section1Vals.map((v, i) => v + section2Vals[i]);

    const activeFactors = new Set<string>();
    const activeOccupations = new Set<string>();

    details.forEach((d: any) => {
      if (d.yeuTo) activeFactors.add(cleanName(d.yeuTo));
      if (d.ngheNghiep) activeOccupations.add(cleanName(d.ngheNghiep));
    });

    Object.keys(phanLoai).forEach((key) => {
      if (key.startsWith("factor_")) {
        activeFactors.add(cleanName(key.replace("factor_", "")));
      }
      if (key.startsWith("occupation_")) {
        activeOccupations.add(cleanName(key.replace("occupation_", "")));
      }
    });

    if (activeFactors.size === 0 && activeOccupations.size === 0) {
      activeFactors.add("Thiết bị nâng");
      activeOccupations.add("Nhà lãnh đạo cơ quan Đảng Cộng sản Việt nam cấp Trung ương");
      activeOccupations.add("Công nhân");
    }

    const dynamicRows: {
      kind: "normal" | "sub" | "section";
      label: string;
      ma: string;
      bold?: boolean;
    }[] = [];

    dynamicRows.push(
      { kind: "section", label: "1. Tai nạn lao động", ma: "" },
      { kind: "normal", label: "Tai nạn lao động", ma: "1" },
      {
        kind: "sub",
        label: "1.1 Phân theo nguyên nhân xảy ra TNLĐ",
        ma: "",
        bold: true,
      },
      { kind: "sub", label: "a. Do người sử dụng lao động", ma: "" },
      {
        kind: "normal",
        label: "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn",
        ma: "1",
      },
      {
        kind: "normal",
        label:
          "Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt",
        ma: "2",
      },
      { kind: "normal", label: "Tổ chức lao động không hợp lý", ma: "3" },
      {
        kind: "normal",
        label:
          "Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ",
        ma: "4",
      },
      {
        kind: "normal",
        label: "Không có quy trình an toàn hoặc biện pháp làm việc an toàn",
        ma: "5",
      },
      { kind: "normal", label: "Điều kiện làm việc không tốt", ma: "6" },
      { kind: "sub", label: "b. Do người lao động", ma: "" },
      {
        kind: "normal",
        label:
          "Quy phạm nội quy, quy trình, quy chuẩn, biện pháp làm việc an toàn",
        ma: "7",
      },
      {
        kind: "normal",
        label: "Không sử dụng phương tiện bảo vệ cá nhân",
        ma: "8",
      },
      {
        kind: "normal",
        label: "Khách quan khó tránh/ Nguyên nhân chưa kể đến",
        ma: "9",
      },
    );

    dynamicRows.push({
      kind: "sub",
      label: "1.2. Phân theo yếu tố gây chấn thương",
      ma: "",
      bold: true,
    });
    Array.from(activeFactors).forEach((factor) => {
      dynamicRows.push({
        kind: "normal",
        label: factor,
        ma: `factor_${factor}`,
      });
    });

    dynamicRows.push({
      kind: "sub",
      label: "1.3 Phân theo nghề nghiệp",
      ma: "",
      bold: true,
    });
    Array.from(activeOccupations).forEach((occ) => {
      dynamicRows.push({ kind: "normal", label: occ, ma: `occupation_${occ}` });
    });

    dynamicRows.push(
      {
        kind: "section",
        label:
          "2. Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ",
        ma: "",
      },
      {
        kind: "normal",
        label:
          "Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ",
        ma: "10",
      },
      { kind: "section", label: "3. Tổng số", ma: "" },
      { kind: "normal", label: "Tổng số (3=1+2)", ma: "total" },
    );

    return dynamicRows.map((row) => {
      if (row.kind !== "normal" && row.kind !== "section") {
        return row;
      }

      let vals = Array(11).fill(0);
      const ma = row.ma;

      if (row.label === "Tai nạn lao động" && ma === "1") {
        vals = section1Vals;
      } else if (row.label === "Tổng số (3=1+2)" && ma === "total") {
        vals = section3Vals;
      } else if (ma === "10") {
        vals = section2Vals;
      } else if (ma) {
        vals = get11(ma);
      }

      let displayMa = row.ma;
      if (row.ma === "total") {
        displayMa = "";
      } else if (row.ma.startsWith("factor_")) {
        const factorName = row.ma.replace("factor_", "");
        const found = dbFactors.find((f) => f.ten === factorName);
        displayMa = found ? found.ma : "";
      } else if (row.ma.startsWith("occupation_")) {
        const occName = row.ma.replace("occupation_", "");
        const found = dbOccupations.find((o) => o.ten === occName);
        displayMa = found ? found.ma : "";
      }

      return {
        ...row,
        ma: displayMa,
        vals,
      };
    });
  }, [current, dbFactors, dbOccupations]);

  const handleReject = async () => {
    if (!current) return;
    setProcessing(true);
    try {
      const reason = rejectReasons[current.id] || "";
      await rejectAccidentReports([current.id], reason.trim() || "—");
      setReports((prev) =>
        prev.map((report) =>
          report.id === current.id
            ? {
                ...report,
                tt: "Từ chối",
                rejectedAt: new Date().toISOString(),
                rejectedBy: report.rejectedBy ?? "Cơ quan quản lý",
                rejectionReason: reason.trim() || "—",
              }
            : report,
        ),
      );
      setToast({ message: "Đã từ chối báo cáo thành công", variant: "success" });
      setRejectOpen(false);
    } catch (error) {
      setToast({ message: "Từ chối thất bại", variant: "error" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg border border-[#e5e7eb] bg-white px-5 py-4 shadow-sm">
          <div>
            <h1 className="text-lg font-semibold text-ink">Từ chối báo cáo TNLĐ theo nhiều doanh nghiệp</h1>
            <p className="text-sm text-muted">Đã chọn {reports.length} báo cáo. Bạn có thể chuyển qua từng công ty để xem nội dung và nhập lý do từ chối.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/accident-report")}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
          >
            Quay lại
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="rounded-lg border border-[#e5e7eb] bg-white p-4 shadow-sm">
            <div className="mb-3 text-sm font-semibold text-ink">Danh sách doanh nghiệp</div>
            <div className="flex flex-col gap-2">
              {reports.map((report, index) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-md border px-3 py-2 text-left text-sm ${activeIndex === index ? "border-primary bg-[#eff6ff] text-primary" : "border-[#e5e7eb] bg-white text-[#374151]"}`}
                >
                  <div className="font-medium">{report.ten}</div>
                  <div className="text-xs text-muted">MST: {report.mst} • {report.ky} / {report.nam}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#e5e7eb] bg-white p-5 shadow-sm">
            {loading ? (
              <div className="text-sm text-muted">Đang tải...</div>
            ) : !current ? (
              <div className="text-sm text-muted">Không có báo cáo nào được chọn.</div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">{current.ten}</h2>
                    <p className="text-sm text-muted">MST: {current.mst} • Trạng thái: {current.tt}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
                      disabled={activeIndex === 0}
                      className="rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Trước
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveIndex((prev) => Math.min(reports.length - 1, prev + 1))}
                      disabled={activeIndex === reports.length - 1}
                      className="rounded-md border border-line px-3 py-2 text-sm disabled:opacity-50"
                    >
                      Tiếp
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border border-[#e5e7eb] p-3 text-sm">
                    <div className="mb-2 font-semibold text-ink">Thông tin công ty</div>
                    <div className="space-y-1 text-[#374151]">
                      <div>Tên doanh nghiệp: {current.ten}</div>
                      <div>Mã số thuế: {current.mst}</div>
                      <div>Kỳ báo cáo: {current.ky}</div>
                      <div>Năm: {current.nam}</div>
                      <div>Địa chỉ: {current.address || "—"}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                  <div className="mb-3 text-sm font-bold text-ink">
                    Báo cáo tổng hợp tình hình tai nạn lao động - Kỳ báo cáo:{" "}
                    {current?.ky || "6 tháng"} năm{" "}
                    {current?.nam || "2023"}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th
                            className={`${CT_TH} min-w-[220px] text-left`}
                            style={{ width: "30%" }}
                            rowSpan={4}
                          >
                            Tên chỉ tiêu thống kê
                          </th>
                          <th className={`${CT_TH} w-[60px]`} style={{ width: "5%" }} rowSpan={4}>
                            Mã số
                          </th>
                          <th className={CT_TH} colSpan={11}>
                            Phân loại TNLĐ theo mức độ thương tật
                          </th>
                        </tr>
                        <tr>
                          <th className={CT_TH} colSpan={3}>
                            Số vụ (Vụ)
                          </th>
                          <th className={CT_TH} colSpan={8}>
                            Số người bị nạn (Người)
                          </th>
                        </tr>
                        <tr>
                          <th className={CT_TH} rowSpan={2} style={{ width: "6%", minWidth: 45 }}>
                            Tổng số
                          </th>
                          <th className={CT_TH} rowSpan={2} style={{ width: "6%", minWidth: 45 }}>
                            Số vụ có người chết
                          </th>
                          <th className={CT_TH} rowSpan={2} style={{ width: "6%", minWidth: 45 }}>
                            Số vụ ≥ 2 người bị nạn
                          </th>
                          <th className={CT_TH} colSpan={2}>
                            Tổng số
                          </th>
                          <th className={CT_TH} colSpan={2}>
                            Số LĐ nữ
                          </th>
                          <th className={CT_TH} colSpan={2}>
                            Số người bị chết
                          </th>
                          <th className={CT_TH} colSpan={2}>
                            Số người bị thương nặng
                          </th>
                        </tr>
                        <tr>
                          <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>Tổng số</th>
                          <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>NN không thuộc quyền quản lý</th>
                          <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>Tổng số</th>
                          <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>NN không thuộc quyền quản lý</th>
                          <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>Tổng số</th>
                          <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>NN không thuộc quyền quản lý</th>
                          <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>Tổng số</th>
                          <th className={CT_TH} style={{ width: "6%", minWidth: 45 }}>NN không thuộc quyền quản lý</th>
                        </tr>
                      </thead>
                      <tbody>
                        {soDetailRows.map((row: any, idx) => {
                          if (row.kind === "sub") {
                            return (
                              <tr key={idx}>
                                <td
                                  className={`${CT_TD} text-left ${row.bold ? "font-semibold" : "italic"}`}
                                  colSpan={13}
                                >
                                  {row.label}
                                </td>
                              </tr>
                            );
                          }
                          const vals = (row.vals ?? []) as number[];
                          if (row.kind === "section") {
                            return (
                              <tr key={idx} className="bg-[#f9fafb]">
                                <td
                                  className={`${CT_TD} text-left font-bold`}
                                  colSpan={13}
                                >
                                  {row.label}
                                </td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={idx}>
                              <td className={`${CT_TD} text-left`}>{row.label}</td>
                              <td className={`${CT_TD} text-center`}>{row.ma}</td>
                              {vals.map((v, i) => (
                                <td key={i} className={`${CT_TD} text-center`}>
                                  {v}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-[#e5e7eb] bg-[#f9fafb] p-3">
                  <label className="mb-2 block text-sm font-semibold text-ink">Lý do từ chối</label>
                  <textarea
                    value={rejectReasons[current.id] || ""}
                    onChange={(e) => setRejectReasons({ ...rejectReasons, [current.id]: e.target.value })}
                    className="min-h-24 w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-[#3b82f6]"
                    placeholder="Nhập lý do từ chối cho báo cáo này..."
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectOpen(true)}
                    disabled={processing || (rejectReasons[current.id] || "").trim() === "" || (current.tt !== "Đã nộp" && current.tt !== "Đã tiếp nhận")}
                    className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Từ chối báo cáo này
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/accident-report?reportId=${current.id}`)}
                    className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-[#eff6ff]"
                  >
                    Chuyển sang công ty này
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={rejectOpen}
        title="Xác nhận từ chối"
        onClose={() => setRejectOpen(false)}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setRejectOpen(false)} className="rounded-md px-4 py-2 text-sm font-medium text-muted hover:bg-[#f9fafb]">
              Huỷ bỏ
            </button>
            <button type="button" onClick={handleReject} disabled={processing} className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-[#dc2626] disabled:opacity-50">
              {processing ? "Đang xử lý..." : "Xác nhận từ chối"}
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-[#374151]">
          <p>Bạn chắc chắn muốn từ chối báo cáo của doanh nghiệp <span className="font-semibold">{current?.ten}</span>?</p>
          <div className="rounded-md bg-[#f9fafb] p-3 border border-[#e5e7eb]">
            <div className="mb-1 font-semibold text-ink text-xs">Lý do từ chối:</div>
            <div className="text-[13px] text-[#374151] whitespace-pre-wrap">{rejectReasons[current?.id || 0]}</div>
          </div>
        </div>
      </Modal>

      {toast ? <Toast message={toast.message} variant={toast.variant} onDone={() => setToast(null)} /> : null}
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted">Đang tải...</div>}>
      <ReviewPageContent />
    </Suspense>
  );
}
