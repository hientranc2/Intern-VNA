"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { PhuLucIIView } from "@/libs/tts/accident-report/PhuLucIIView";
import {
  EMPTY_DECLARATION,
  type AtvsldReport,
} from "@/libs/tts/accident-report/atvsldReportData";
import {
  getAtvsldReportById,
  approveAtvsldReports,
  rejectAtvsldReports,
  type AtvsldReportDetail,
} from "@/libs/tts/accident-report/atvsldReportApi";

type DecisionItem = {
  action: "approve" | "reject";
  reason: string;
};

export default function BulkReviewSignReportPage() {
  const router = useRouter();

  const [items, setItems] = useState<AtvsldReportDetail[]>([]);
  const [defaultAction, setDefaultAction] = useState<"approve" | "reject">("reject");
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<"review" | "summary">("review");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<Record<number, DecisionItem>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("bulk_review_atvsld_reports");
    if (!raw) {
      router.replace("/sign-report");
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      const ids: number[] = parsed.ids || [];
      const action: "approve" | "reject" = parsed.defaultAction || "reject";
      setDefaultAction(action);

      if (ids.length === 0) {
        router.replace("/sign-report");
        return;
      }

      setLoading(true);
      Promise.all(ids.map((id) => getAtvsldReportById(id).catch(() => null)))
        .then((fetched) => {
          const valid = fetched.filter((item): item is AtvsldReportDetail => item !== null);
          if (valid.length === 0) {
            router.replace("/sign-report");
            return;
          }
          setItems(valid);

          const initial: Record<number, DecisionItem> = {};
          valid.forEach((item) => {
            initial[item.id] = { action, reason: "" };
          });
          setDecisions(initial);
          setCurrentIndex(0);
        })
        .catch(() => {
          router.replace("/sign-report");
        })
        .finally(() => {
          setLoading(false);
        });
    } catch (e) {
      router.replace("/sign-report");
    }
  }, [router]);

  const currentItem = items[currentIndex];
  const currentDecision = currentItem
    ? decisions[currentItem.id] || { action: defaultAction, reason: "" }
    : { action: defaultAction, reason: "" };

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
    if (currentDecision.action === "reject" && !currentDecision.reason.trim()) {
      setErrorMsg("Vui lòng nhập lý do từ chối trước khi tiếp tục.");
      return;
    }
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
      const approvedIds = items
        .filter((item) => decisions[item.id]?.action === "approve")
        .map((item) => item.id);

      const rejectedItems = items.filter(
        (item) => decisions[item.id]?.action === "reject"
      );

      if (approvedIds.length > 0) {
        await approveAtvsldReports(approvedIds);
      }

      if (rejectedItems.length > 0) {
        const groups: Record<string, number[]> = {};
        rejectedItems.forEach((item) => {
          const reason = decisions[item.id]?.reason.trim() || "—";
          if (!groups[reason]) groups[reason] = [];
          groups[reason].push(item.id);
        });

        for (const [reason, rIds] of Object.entries(groups)) {
          await rejectAtvsldReports(rIds, reason);
        }
      }

      sessionStorage.removeItem("bulk_review_atvsld_reports");
      setToast("Hoàn tất xử lý rà soát báo cáo.");
      setTimeout(() => {
        router.push("/sign-report");
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Có lỗi xảy ra trong quá trình xử lý.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted">
        Đang tải dữ liệu báo cáo ATVSLĐ...
      </div>
    );
  }

  if (!currentItem) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      <Toast message={toast} onDone={() => setToast(null)} />

      {/* Top Header Navigation Bar */}
      <div className="sticky top-0 z-20 border-b border-[#e2e8f0] bg-white px-6 py-3.5 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/sign-report")}
              className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3.5 text-xs font-medium text-[#374151] hover:bg-[#f9fafb]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Quay lại danh sách
            </button>
            <div className="h-4 w-[1px] bg-[#e2e8f0]" />
            <h1 className="text-base font-bold text-ink">
              Rà soát & Duyệt tập trung Báo cáo ATVSLĐ
            </h1>
          </div>

          {step === "review" && (
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-semibold text-primary">
                Báo cáo {currentIndex + 1} / {items.length}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                  className="flex h-8.5 items-center gap-1 rounded-md border border-line bg-white px-3 text-xs font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  Trước
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-8.5 items-center gap-1 rounded-md bg-primary px-3.5 text-xs font-semibold text-white hover:bg-[#1e40af]"
                >
                  {currentIndex < items.length - 1 ? "Tiếp theo" : "Bảng tổng kết"}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 pt-6">
        {errorMsg && (
          <div className="mb-5 rounded-lg border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-xs font-medium text-danger shadow-sm">
            ⚠️ {errorMsg}
          </div>
        )}

        {step === "review" ? (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Main Section: Full Report Detail View */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
                <PhuLucIIView
                  values={currentItem.declaration || EMPTY_DECLARATION}
                  report={currentItem}
                />
              </div>
            </div>

            {/* Right Sidebar Section: Decision Control Card */}
            <div className="col-span-12 lg:col-span-4">
              <div className="sticky top-20 rounded-xl border border-line bg-white p-5 shadow-sm space-y-4">
                <div className="border-b border-line pb-3">
                  <div className="text-xs text-muted">Báo cáo đang rà soát:</div>
                  <div className="text-sm font-bold text-ink mt-0.5">
                    {currentItem.ten}
                  </div>
                  <div className="text-xs text-muted mt-1">
                    MST: {currentItem.mst} | Kỳ: {currentItem.ky || "6 tháng"}/{currentItem.nam}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-ink">
                    Lựa chọn quyết định xử lý báo cáo này:
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        currentDecision.action === "approve"
                          ? "border-[#16a34a] bg-[#f0fdf4]"
                          : "border-line bg-white hover:bg-[#f9fafb]"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`decision-${currentItem.id}`}
                        checked={currentDecision.action === "approve"}
                        onChange={() => setItemAction(currentItem.id, "approve")}
                        className="h-4 w-4 accent-success"
                      />
                      <div>
                        <span className="text-xs font-bold text-[#15803d]">
                          Duyệt báo cáo
                        </span>
                        <p className="text-[11px] text-[#166534]">
                          Báo cáo đạt yêu cầu và được chấp nhận.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                        currentDecision.action === "reject"
                          ? "border-danger bg-[#fef2f2]"
                          : "border-line bg-white hover:bg-[#f9fafb]"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`decision-${currentItem.id}`}
                        checked={currentDecision.action === "reject"}
                        onChange={() => setItemAction(currentItem.id, "reject")}
                        className="h-4 w-4 accent-danger"
                      />
                      <div>
                        <span className="text-xs font-bold text-danger">
                          Từ chối báo cáo
                        </span>
                        <p className="text-[11px] text-[#991b1b]">
                          Yêu cầu doanh nghiệp chỉnh sửa / nộp lại.
                        </p>
                      </div>
                    </label>
                  </div>

                  {currentDecision.action === "reject" && (
                    <div className="pt-2 space-y-1.5">
                      <label className="block text-xs font-medium text-[#374151]">
                        Lý do từ chối <span className="text-danger">*</span>
                      </label>
                      <textarea
                        className="min-h-[100px] w-full rounded-lg border border-line bg-white p-3 text-xs text-ink outline-none focus:border-[#3b82f6] resize-none"
                        placeholder="Nhập cụ thể lý do từ chối báo cáo này..."
                        value={currentDecision.reason}
                        onChange={(e) => setItemReason(currentItem.id, e.target.value)}
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="flex h-9.5 items-center gap-1 rounded-md border border-line bg-white px-4 text-xs font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                    Báo cáo trước
                  </button>

                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex h-9.5 flex-1 items-center justify-center gap-1 rounded-md bg-primary px-4 text-xs font-semibold text-white hover:bg-[#1e40af]"
                  >
                    {currentIndex < items.length - 1 ? (
                      <>
                        Tiếp theo ({currentIndex + 2}/{items.length})
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </>
                    ) : (
                      <>
                        Xem bảng tổng kết
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Summary Table Step */
          <div className="rounded-xl border border-line bg-white p-6 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-ink">
                Bảng tổng kết quyết định Duyệt / Từ chối ({items.length} báo cáo)
              </h2>
              <p className="mt-1 text-xs text-muted">
                Vui lòng rà soát lại toàn bộ quyết định xử lý trước khi bấm nút Xác nhận chính thức.
              </p>
            </div>

            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f9fafb] border-b border-line text-left text-[#374151] font-semibold">
                    <th className="px-4 py-3 w-12 text-center">STT</th>
                    <th className="px-4 py-3">Tên doanh nghiệp</th>
                    <th className="px-4 py-3 w-32">MST</th>
                    <th className="px-4 py-3 w-32">Kỳ / Năm</th>
                    <th className="px-4 py-3 w-32 text-center">Quyết định</th>
                    <th className="px-4 py-3">Lý do từ chối</th>
                    <th className="px-4 py-3 w-20 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const dec = decisions[item.id] || { action: defaultAction, reason: "" };
                    const isApprove = dec.action === "approve";
                    return (
                      <tr key={item.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                        <td className="px-4 py-3 text-center text-muted font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-semibold text-ink">{item.ten}</td>
                        <td className="px-4 py-3 text-muted">{item.mst}</td>
                        <td className="px-4 py-3 text-muted">
                          {item.ky || "6 tháng"} - {item.nam}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              isApprove
                                ? "bg-[#dcfce7] text-[#15803d]"
                                : "bg-[#fee2e2] text-[#b91c1c]"
                            }`}
                          >
                            {isApprove ? "Duyệt" : "Từ chối"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink">
                          {isApprove ? "—" : dec.reason || <span className="text-danger italic">(Chưa nhập lý do)</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentIndex(idx);
                              setStep("review");
                            }}
                            className="text-primary hover:underline font-medium text-xs"
                          >
                            [Sửa]
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setStep("review")}
                className="flex h-9.5 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-xs font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Quay lại rà soát chi tiết
              </button>

              <button
                type="button"
                onClick={handleFinalConfirm}
                disabled={submitting}
                className="h-9.5 rounded-md bg-success px-6 text-xs font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50"
              >
                {submitting ? "Đang xử lý..." : "Xác nhận chính thức"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
