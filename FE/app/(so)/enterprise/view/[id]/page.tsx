"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { EnterpriseWizard } from "@/libs/tts/enterprise/EnterpriseWizard/EnterpriseWizard";
import { getEnterpriseTypeList } from "@/libs/tts/enterprise-type/enterpriseTypeApi";
import { getBusinessSectorList } from "@/libs/tts/business-sector/businessSectorApi";
import { getBusinessById, type BusinessDetail } from "@/libs/tts/enterprise/enterpriseApi";
import { ApiError } from "@/libs/tts/auth/apiClient";

export default function EnterpriseViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loaiHinhOptions, setLoaiHinhOptions] = useState<string[]>([]);
  const [nganhCap4Options, setNganhCap4Options] = useState<string[]>([]);
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

  useEffect(() => {
    getEnterpriseTypeList()
      .then((types) => setLoaiHinhOptions(types.filter((t) => t.active).map((t) => t.ten)))
      .catch(() => {});
    getBusinessSectorList()
      .then((sectors) =>
        setNganhCap4Options(
          sectors.filter((s) => s.cap === 4).map((s) => `${s.ma} - ${s.ten.replace(/^[–-]\s*/, "")}`),
        ),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getBusinessById(id)
      .then(setDetail)
      .catch((err) => {
        setToast({
          message: err instanceof ApiError ? err.message : "Không thể tải thông tin doanh nghiệp",
          variant: "error",
        });
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  const backToList = () => router.push("/enterprise");

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
        <h1 className="text-base font-semibold text-ink">Chi tiết doanh nghiệp</h1>
        <button
          type="button"
          onClick={backToList}
          className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Trở về
        </button>
      </div>

      <div className="px-6 py-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-[13px] text-muted">Đang tải...</div>
        ) : detail ? (
          <EnterpriseWizard
            mode="view"
            detail={detail}
            fullWidth
            loaiHinhOptions={loaiHinhOptions}
            nganhCap4Options={nganhCap4Options}
            cancelLabel="Trở về"
            onCancel={backToList}
          />
        ) : (
          <div className="flex items-center justify-center py-16 text-[13px] text-danger">
            Không thể tải thông tin doanh nghiệp
          </div>
        )}
      </div>

      <Toast message={toast?.message ?? null} variant={toast?.variant} onDone={() => setToast(null)} />
    </>
  );
}
