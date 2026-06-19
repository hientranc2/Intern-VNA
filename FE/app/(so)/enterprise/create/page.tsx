"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { EnterpriseWizard } from "@/libs/tts/enterprise/EnterpriseWizard/EnterpriseWizard";
import { getEnterpriseTypeList } from "@/libs/tts/enterprise-type/enterpriseTypeApi";
import { getBusinessSectorList } from "@/libs/tts/business-sector/businessSectorApi";

type Account = { username: string; password: string };

export default function EnterpriseCreatePage() {
  const router = useRouter();
  const [loaiHinhOptions, setLoaiHinhOptions] = useState<string[]>([]);
  const [nganhCap4Options, setNganhCap4Options] = useState<string[]>([]);
  const [account, setAccount] = useState<Account | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    variant: "success" | "error";
  } | null>(null);

  useEffect(() => {
    getEnterpriseTypeList()
      .then((types) =>
        setLoaiHinhOptions(types.filter((t) => t.active).map((t) => t.ten)),
      )
      .catch(() => {});
    getBusinessSectorList()
      .then((sectors) =>
        setNganhCap4Options(
          sectors
            .filter((s) => s.cap === 4)
            .map((s) => `${s.ma} - ${s.ten.replace(/^[–-]\s*/, "")}`),
        ),
      )
      .catch(() => {});
  }, []);

  const backToList = () => router.push("/enterprise");

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
        <h1 className="text-base font-semibold text-ink">
          Thêm mới doanh nghiệp
        </h1>
        <button
          type="button"
          onClick={backToList}
          className="flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Trở về
        </button>
      </div>

      <div className="px-6 py-5">
        <EnterpriseWizard
          mode="add"
          fullWidth
          loaiHinhOptions={loaiHinhOptions}
          nganhCap4Options={nganhCap4Options}
          cancelLabel="Trở về"
          onCancel={backToList}
          onCreated={setAccount}
          onError={(message) => setToast({ message, variant: "error" })}
        />
      </div>

      {/* Popup thông tin tài khoản sau khi thêm mới thành công */}
      {account ? (
        <>
          <div className="fixed inset-0 z-[399] bg-black/50" />
          <div className="fixed left-1/2 top-1/2 z-[400] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <div className="rounded-t-[10px] bg-primary px-5 py-3.5">
              <h3 className="text-center text-[15px] font-bold text-white">
                Thông tin tài khoản
              </h3>
            </div>
            <div className="px-5 pb-3 pt-4">
              <p className="mb-2 text-[13.5px] text-ink">
                • Tài khoản: <strong>{account.username}</strong>
              </p>
              <p className="mb-2 text-[13.5px] text-ink">
                • Mật khẩu: <strong>{account.password}</strong>
              </p>
            </div>
            <div className="px-5 pb-3.5 text-right">
              <button
                type="button"
                onClick={backToList}
                className="text-[13px] text-muted hover:text-[#374151]"
              >
                Đóng
              </button>
            </div>
          </div>
        </>
      ) : null}

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onDone={() => setToast(null)}
      />
    </>
  );
}
