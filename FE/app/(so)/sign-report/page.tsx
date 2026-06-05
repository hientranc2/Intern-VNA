"use client";

export default function SignReportPage() {
  return (
    <>
      <div className="flex items-center border-b border-[#e5e7eb] bg-white px-6 py-3.5">
        <h1 className="text-base font-semibold text-ink">Ký báo cáo</h1>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eff6ff]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="1.5">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <h2 className="mt-4 text-[16px] font-semibold text-ink">Tính năng đang phát triển</h2>
        <p className="mt-2 text-[13.5px] text-muted">Chức năng Ký báo cáo chưa có thiết kế giao diện và sẽ được cập nhật trong phiên bản tiếp theo.</p>
      </div>
    </>
  );
}
