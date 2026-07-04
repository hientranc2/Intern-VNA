"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/libs/shared/core/components/Modal/Modal";

export interface BulkReportItem {
  id: number;
  ten: string;
  mst: string;
  ky?: string;
  nam?: string | number | null;
  tt?: string;
  status?: string;
  soLaoDong?: number;
  soNguoiBiNan?: number;
  soNguoiBiChet?: number;
  soVu?: number;
  submittedAt?: string | null;
  createdAt?: string | null;
}

export interface DecisionItem {
  action: "approve" | "reject";
  reason: string;
}

interface BulkReviewModalProps {
  open: boolean;
  onClose: () => void;
  items: BulkReportItem[];
  defaultAction?: "approve" | "reject";
  onConfirm: (decisions: Record<number, DecisionItem>) => Promise<void>;
  renderDetail?: (item: BulkReportItem) => React.ReactNode;
}

export function BulkReviewModal({
  open,
  onClose,
  items,
  defaultAction = "reject",
  onConfirm,
  renderDetail,
}: BulkReviewModalProps) {
  const [step, setStep] = useState<"review" | "summary">("review");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, DecisionItem>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (open && items.length > 0) {
      const initial: Record<number, DecisionItem> = {};
      items.forEach((item) => {
        initial[item.id] = {
          action: defaultAction,
          reason: "",
        };
      });
      setDecisions(initial);
      setCurrentIndex(0);
      setStep("review");
      setErrorMsg("");
    }
  }, [open, items, defaultAction]);

  if (!open || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];
  const currentDecision = decisions[currentItem.id] || {
    action: defaultAction,
    reason: "",
  };

  const setItemAction = (id: number, action: "approve" | "reject") => {
    setDecisions((prev) => ({
      ...prev,
      [id]: { ...prev[id], action },
    }));
  };

  const setItemReason = (id: number, reason: string) => {
    setDecisions((prev) => ({
      ...prev,
      [id]: { ...prev[id], reason },
    }));
  };

  const handleNext = () => {
    setErrorMsg("");
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setStep("summary");
    }
  };

  const handlePrev = () => {
    setErrorMsg("");
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleFinalConfirm = async () => {
    // Validate if any rejected item is missing a reason
    const invalidReject = items.find((item) => {
      const dec = decisions[item.id];
      return dec?.action === "reject" && !dec.reason.trim();
    });

    if (invalidReject) {
      setErrorMsg(
        `Vui lòng nhập lý do từ chối cho báo cáo của ${invalidReject.ten} (MST: ${invalidReject.mst}).`
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      await onConfirm(decisions);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra khi thực hiện thao tác");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      width={step === "review" ? "w-[940px] max-w-[95vw]" : "w-[760px] max-w-[95vw]"}
      title={
        step === "review"
          ? `Xem chi tiết & Duyệt tập trung (Báo cáo ${currentIndex + 1}/${items.length})`
          : `Bảng tổng kết rà soát Duyệt / Từ chối (${items.length} báo cáo)`
      }
      onClose={onClose}
      footer={
        step === "review" ? (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={onClose}
              className="h-9.5 rounded-md px-4 text-sm font-medium text-muted hover:bg-[#f9fafb] hover:text-[#374151]"
            >
              Hủy bỏ
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5 h-9.5 rounded-md border border-line bg-white px-4 text-sm font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Trước
              </button>
              {currentIndex < items.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 h-9.5 rounded-md bg-primary px-5 text-sm font-semibold text-white hover:bg-[#1e40af]"
                >
                  Tiếp theo
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep("summary")}
                  className="flex items-center gap-1.5 h-9.5 rounded-md bg-primary px-5 text-sm font-semibold text-white hover:bg-[#1e40af]"
                >
                  Xem bảng tổng kết
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={() => setStep("review")}
              className="flex items-center gap-1.5 h-9.5 rounded-md border border-line bg-white px-4 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Quay lại xem chi tiết
            </button>
            <button
              type="button"
              onClick={handleFinalConfirm}
              disabled={submitting}
              className="h-9.5 rounded-md bg-success px-6 text-sm font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50"
            >
              {submitting ? "Đang xử lý..." : "Xác nhận chính thức"}
            </button>
          </div>
        )
      }
    >
      {errorMsg && (
        <div className="mb-4 rounded-md border border-[#fecaca] bg-[#fef2f2] px-3.5 py-2.5 text-[13px] text-danger">
          {errorMsg}
        </div>
      )}

      {step === "review" ? (
        <div className="space-y-4">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between rounded-lg bg-[#f8fafc] p-3 border border-[#e2e8f0]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-xs font-bold text-white">
                {currentIndex + 1}
              </span>
              <span className="text-[13.5px] font-semibold text-[#1e293b]">
                {currentItem.ten}
              </span>
              <span className="text-[12.5px] text-muted">
                (MST: {currentItem.mst} - Kỳ: {currentItem.ky || "6 tháng"}/{currentItem.nam || new Date().getFullYear()})
              </span>
            </div>
            <div className="text-[12px] font-medium text-[#64748b]">
              Tiến độ: {currentIndex + 1} / {items.length} báo cáo
            </div>
          </div>

          {/* Full Report Details View Container */}
          <div className="max-h-[380px] overflow-y-auto rounded-lg border border-line bg-white p-4 shadow-inner">
            {renderDetail ? (
              renderDetail(currentItem)
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <span className="text-muted">Mã số thuế: </span>
                    <span className="font-semibold text-ink">{currentItem.mst}</span>
                  </div>
                  <div>
                    <span className="text-muted">Kỳ báo cáo / Năm: </span>
                    <span className="font-semibold text-ink">
                      {currentItem.ky || "6 tháng"} / {currentItem.nam || new Date().getFullYear()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Trạng thái hiện tại: </span>
                    <span className="inline-block px-2 py-0.5 rounded text-[12px] font-medium bg-[#eff6ff] text-primary">
                      {currentItem.tt || currentItem.status || "Đã nộp"}
                    </span>
                  </div>
                  {currentItem.soVu !== undefined && (
                    <div>
                      <span className="text-muted">Tổng số vụ: </span>
                      <span className="font-semibold text-ink">{currentItem.soVu}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Decision Selection */}
          <div className="rounded-lg border border-line bg-[#fafafa] p-4 space-y-3">
            <label className="block text-[13px] font-bold text-ink">
              Lựa chọn quyết định xử lý báo cáo này:
            </label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-[13.5px] font-medium text-[#16a34a]">
                <input
                  type="radio"
                  name={`decision-${currentItem.id}`}
                  checked={currentDecision.action === "approve"}
                  onChange={() => setItemAction(currentItem.id, "approve")}
                  className="h-4 w-4 accent-success"
                />
                Duyệt báo cáo
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-[13.5px] font-medium text-danger">
                <input
                  type="radio"
                  name={`decision-${currentItem.id}`}
                  checked={currentDecision.action === "reject"}
                  onChange={() => setItemAction(currentItem.id, "reject")}
                  className="h-4 w-4 accent-danger"
                />
                Từ chối báo cáo
              </label>
            </div>

            {currentDecision.action === "reject" && (
              <div className="pt-2 space-y-1.5">
                <label className="block text-[12.5px] font-medium text-[#374151]">
                  Lý do từ chối <span className="text-danger">*</span>
                </label>
                <textarea
                  className="min-h-[90px] w-full rounded-md border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-[#3b82f6] resize-none"
                  placeholder="Nhập cụ thể lý do từ chối báo cáo này..."
                  value={currentDecision.reason}
                  onChange={(e) => setItemReason(currentItem.id, e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Summary Table Step */
        <div className="space-y-4">
          <div className="text-[13px] text-muted">
            Danh sách tổng kết quyết định Duyệt / Từ chối trước khi bấm Xác nhận chính thức:
          </div>
          <div className="max-h-[360px] overflow-y-auto rounded-lg border border-line bg-white">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="bg-[#f9fafb] border-b border-line text-left text-[#374151] font-semibold">
                  <th className="px-3 py-2.5 w-10 text-center">STT</th>
                  <th className="px-3 py-2.5">Tên doanh nghiệp</th>
                  <th className="px-3 py-2.5 w-28">MST</th>
                  <th className="px-3 py-2.5 w-28">Kỳ / Năm</th>
                  <th className="px-3 py-2.5 w-28 text-center">Quyết định</th>
                  <th className="px-3 py-2.5">Lý do từ chối</th>
                  <th className="px-3 py-2.5 w-16 text-center">Sửa</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const dec = decisions[item.id] || { action: defaultAction, reason: "" };
                  const isApprove = dec.action === "approve";
                  return (
                    <tr key={item.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2 text-center text-muted font-medium">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-ink">{item.ten}</td>
                      <td className="px-3 py-2 text-muted">{item.mst}</td>
                      <td className="px-3 py-2 text-muted">
                        {item.ky || "6 tháng"} - {item.nam || new Date().getFullYear()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[11.5px] font-semibold ${
                            isApprove
                              ? "bg-[#dcfce7] text-[#15803d]"
                              : "bg-[#fee2e2] text-[#b91c1c]"
                          }`}
                        >
                          {isApprove ? "Duyệt" : "Từ chối"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-ink">
                        {isApprove ? "—" : dec.reason || <span className="text-danger italic">(Chưa nhập lý do)</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentIndex(idx);
                            setStep("review");
                          }}
                          className="text-primary hover:underline font-medium text-[12px]"
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
