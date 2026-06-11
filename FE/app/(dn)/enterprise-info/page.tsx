"use client";

import { useState } from "react";
import { FormHelperText } from "@mui/material";
import { Alert } from "@/libs/shared/core/components/Alert/Alert";
import { Toast } from "@/libs/shared/core/components/Toast/Toast";
import { useCountdown } from "@/libs/shared/core/hooks/useCountdown";
import { isValidEmail } from "@/libs/tts/auth/authValidation";
import { localISODate } from "@/libs/shared/core/utils/dateUtils";
import {
  LOAI_HINH_OPTIONS,
  NGANH_OPTIONS,
  TINH_OPTIONS,
  PHUONG_DKKD_OPTIONS,
} from "@/libs/tts/enterprise/enterpriseData";

type PageMode = "view" | "edit1" | "edit2";

const DEMO_INFO = {
  mst: "210987802",
  ten: "Công ty cổ phần công nghệ quốc tế VNA",
  tenNN: "VNA Group",
  email: "vna@gmail.com",
  ngayCap: "",
  loai: "Công ty TNHH 1 thành viên",
  nganh: "4669 - Bán buôn chuyên doanh khác chưa…",
  tinh: "Thành phố Hồ Chí Minh",
  phuong: "Phường Tân Định",
  diaChi: "162 đường số 2, khu đô thị Vạn Phúc",
  diaDiem: "Vạn phúc City, Phường Tân Định, Thành phố Hồ Chí Minh",
  nguoiDD: "111111",
  sdtDD: "0932768093",
  sdt: "",
};

const FORM_CONTROL_CLASS =
  "h-[38px] rounded-md border border-line px-3 text-[13.5px] text-ink outline-none focus:border-[#3b82f6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]";
const SELECT_CONTROL_CLASS = `${FORM_CONTROL_CLASS} cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pr-8`;

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-0 border-b border-[#e5e7eb] bg-white py-4">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[12px] font-bold ${step >= 1 ? "border-primary bg-primary text-white" : "border-[#d1d5db] bg-white text-[#9ca3af]"}`}>
          {step > 1 ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg> : "1"}
        </div>
        <span className={`text-[13px] ${step >= 1 ? "font-medium text-ink" : "text-[#9ca3af]"}`}>Thông tin doanh nghiệp</span>
      </div>
      <div className={`mx-2 h-0.5 w-[60px] ${step >= 2 ? "bg-primary" : "bg-[#e5e7eb]"}`} />
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[12px] font-bold ${step >= 2 ? "border-primary bg-white text-primary" : "border-[#d1d5db] bg-white text-[#9ca3af]"}`}>2</div>
        <span className={`text-[13px] ${step >= 2 ? "font-medium text-ink" : "text-[#9ca3af]"}`}>Xác nhận chỉnh sửa</span>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex border-b border-[#f3f4f6] py-3 last:border-b-0">
      <span className="w-[300px] shrink-0 text-[13.5px] font-semibold text-[#374151]">{label}</span>
      <span className="text-[13.5px] text-ink">{value}</span>
    </div>
  );
}

const FILE_ROWS = [
  { name: "Giấy phép kinh doanh", info: "GPKD.pdf" },
  { name: "Giấy tờ khác", info: "GTK1.pdf" },
];

export default function EnterpriseInfoPage() {
  const countdown = useCountdown(300);

  const [mode, setMode] = useState<PageMode>("view");
  const [info, setInfo] = useState({ ...DEMO_INFO });
  const [editForm, setEditForm] = useState({ ...DEMO_INFO });
  const [editErrors, setEditErrors] = useState<{ ten?: string; mst?: string; email?: string }>({});
  const [toast, setToast] = useState<string | null>(null);

  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const setField = (key: keyof typeof DEMO_INFO, value: string) =>
    setEditForm((prev) => ({ ...prev, [key]: value }));

  const goEdit1 = () => {
    setEditForm({ ...info });
    setEditErrors({});
    setMode("edit1");
  };

  const goEdit2 = () => {
    const errors: { ten?: string; mst?: string; email?: string } = {};
    if (!editForm.ten.trim()) errors.ten = "Tên doanh nghiệp không được để trống";
    if (!editForm.mst.trim()) errors.mst = "Mã số thuế không được để trống";
    if (editForm.email && !isValidEmail(editForm.email)) errors.email = "Email không hợp lệ";
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    setEditErrors({});
    setMode("edit2");
  };

  const confirmEdit2 = () => {
    if (editForm.email !== info.email) {
      setOtp("");
      setOtpError(null);
      setOtpOpen(true);
      countdown.start();
    } else {
      setInfo({ ...editForm });
      setMode("view");
      setToast("Cập nhật thành công");
    }
  };

  const confirmOtp = () => {
    if (!otp.trim()) { setOtpError("Vui lòng nhập mã OTP"); return; }
    setOtpOpen(false);
    countdown.stop();
    setInfo({ ...editForm });
    setMode("view");
    setToast("Cập nhật thành công");
  };

  const reviewRows: [string, string][] = [
    ["Mã số thuế :", editForm.mst],
    ["Tên doanh nghiệp :", editForm.ten],
    ["Tên viết bằng tiếng nước ngoài :", editForm.tenNN],
    ["Email:", editForm.email],
    ["Ngày cấp GPKD:", editForm.ngayCap],
    ["Loại hình kinh doanh:", editForm.loai],
    ["Ngành nghề kinh doanh:", editForm.nganh],
    ["Địa chỉ đăng ký GPKD:", `${editForm.diaChi}, ${editForm.phuong}, ${editForm.tinh}`],
    ["Địa điểm kinh doanh:", editForm.diaDiem],
    ["Người đứng đầu doanh nghiệp:", editForm.nguoiDD],
    ["SĐT người đứng đầu:", editForm.sdtDD],
  ];

  return (
    <>
      <>
        {mode === "view" ? (
          <>
            <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
              <h1 className="text-base font-semibold text-ink">Thông tin doanh nghiệp</h1>
              <button type="button" onClick={goEdit1} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                Chỉnh sửa
              </button>
            </div>
            <Stepper step={1} />
            <div className="px-6 py-5">
              <Toast message={toast} onDone={() => setToast(null)} />
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-4 border-b border-[#f3f4f6] pb-3.5 text-[14px] font-semibold text-[#374151]">Thông tin về hồ sơ</div>
                <ReviewRow label="Mã số thuế :" value={info.mst} />
                <ReviewRow label="Tên doanh nghiệp :" value={info.ten} />
                <ReviewRow label="Tên viết bằng tiếng nước ngoài :" value={info.tenNN} />
                <ReviewRow label="Email:" value={info.email} />
                <ReviewRow label="Ngày cấp GPKD:" value={info.ngayCap} />
                <ReviewRow label="Loại hình kinh doanh:" value={info.loai} />
                <ReviewRow label="Ngành nghề kinh doanh:" value={info.nganh} />
                <ReviewRow label="Địa chỉ đăng ký GPKD:" value={`${info.diaChi}, ${info.phuong}, ${info.tinh}`} />
                <ReviewRow label="Địa điểm kinh doanh:" value={info.diaDiem} />
                <ReviewRow label="Người đứng đầu doanh nghiệp:" value={info.nguoiDD} />
                <ReviewRow label="SĐT người đứng đầu:" value={info.sdtDD} />
              </div>

              <div className="mt-4 overflow-hidden rounded-lg bg-white shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <table className="w-full border-collapse text-[13.5px]">
                  <thead>
                    <tr>
                      <th className="w-[200px] border-b border-[#e5e7eb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-primary">Tên file</th>
                      <th className="border-b border-[#e5e7eb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-primary">Thông tin file</th>
                      <th className="w-24 border-b border-[#e5e7eb] px-3.5 py-2.5 text-left text-[13px] font-semibold text-primary">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FILE_ROWS.map((f) => (
                      <tr key={f.name} className="border-b border-[#f3f4f6] last:border-b-0">
                        <td className="px-3.5 py-2.5 text-[#374151]">{f.name}</td>
                        <td className="px-3.5 py-2.5 text-[#374151]">{f.info}</td>
                        <td className="px-3.5 py-2.5">
                          <button type="button" title="Xem" className="text-muted hover:text-primary">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : mode === "edit1" ? (
          <>
            <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
              <h1 className="text-base font-semibold text-ink">Thông tin doanh nghiệp</h1>
              <div className="flex gap-2.5">
                <button type="button" onClick={() => { setMode("view"); setEditErrors({}); }} className="h-9 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]">Trở về</button>
                <button type="button" onClick={goEdit2} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]">
                  Tiếp tục <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                </button>
              </div>
            </div>
            <Stepper step={1} />
            <div className="px-6 py-5">
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                <div className="mb-3.5 text-[13.5px] font-semibold text-[#374151]">Thông tin doanh nghiệp</div>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  {([
                    { label: "Tên doanh nghiệp", key: "ten", required: true, error: editErrors.ten },
                    { label: "Mã số thuế", key: "mst", required: true, error: editErrors.mst },
                    { label: "Loại hình kinh doanh", key: "loai", required: true },
                  ] as { label: string; key: keyof typeof DEMO_INFO; required?: boolean; error?: string }[]).map(({ label, key, required, error }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[12.5px] font-medium text-[#374151]">{label} {required ? <span className="text-danger">*</span> : null}</label>
                      {key === "loai" ? (
                        <select className={SELECT_CONTROL_CLASS} value={editForm[key]} onChange={(e) => setField(key, e.target.value)}>
                          {LOAI_HINH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input
                          className={`${FORM_CONTROL_CLASS}${error ? " border-danger" : ""}`}
                          value={editForm[key]}
                          onChange={(e) => { setField(key, e.target.value); if (error) setEditErrors((p) => ({ ...p, [key]: undefined })); }}
                        />
                      )}
                      {error && <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>{error}</FormHelperText>}
                    </div>
                  ))}
                </div>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Ngành nghề kinh doanh chính <span className="text-danger">*</span></label>
                    <select className={SELECT_CONTROL_CLASS} value={editForm.nganh} onChange={(e) => setField("nganh", e.target.value)}>
                      {NGANH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Ngày cấp GPKD</label>
                    <input type="date" className={FORM_CONTROL_CLASS} value={editForm.ngayCap} max={localISODate(new Date())} onChange={(e) => setField("ngayCap", e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Tỉnh/Thành phố ĐKKD <span className="text-danger">*</span></label>
                    <select className={SELECT_CONTROL_CLASS} value={editForm.tinh} onChange={(e) => setField("tinh", e.target.value)}>
                      {TINH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Phường/Xã ĐKKD <span className="text-danger">*</span></label>
                    <select className={SELECT_CONTROL_CLASS} value={editForm.phuong} onChange={(e) => setField("phuong", e.target.value)}>
                      {PHUONG_DKKD_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12.5px] font-medium text-[#374151]">Địa chỉ</label>
                    <input className={FORM_CONTROL_CLASS} value={editForm.diaChi} onChange={(e) => setField("diaChi", e.target.value)} />
                  </div>
                </div>

                <div className="mt-4 mb-2 text-[13.5px] font-semibold text-[#374151]">Thông tin liên hệ</div>
                <div className="mb-3.5 grid grid-cols-3 gap-3.5">
                  {([
                    { label: "Tên tiếng nước ngoài", key: "tenNN" },
                    { label: "Email", key: "email", error: editErrors.email },
                    { label: "SĐT cơ quan", key: "sdt" },
                  ] as { label: string; key: keyof typeof DEMO_INFO; error?: string }[]).map(({ label, key, error }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[12.5px] font-medium text-[#374151]">{label}</label>
                      <input
                        className={`${FORM_CONTROL_CLASS}${error ? " border-danger" : ""}`}
                        value={editForm[key]}
                        onChange={(e) => { setField(key, e.target.value); if (error) setEditErrors((p) => ({ ...p, [key]: undefined })); }}
                      />
                      {error && <FormHelperText error sx={{ mt: 0, mx: 0, fontSize: "11px" }}>{error}</FormHelperText>}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3.5">
                  {[["Địa điểm kinh doanh", "diaDiem"], ["Người đứng đầu DN", "nguoiDD"], ["SĐT người đứng đầu", "sdtDD"]].map(([label, key]) => (
                    <div key={key as string} className="flex flex-col gap-1.5">
                      <label className="text-[12.5px] font-medium text-[#374151]">{label as string}</label>
                      <input className={FORM_CONTROL_CLASS} value={editForm[key as keyof typeof DEMO_INFO]} onChange={(e) => setField(key as keyof typeof DEMO_INFO, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-6 py-3.5">
              <h1 className="text-base font-semibold text-ink">Thông tin doanh nghiệp</h1>
              <div className="flex gap-2.5">
                <button type="button" onClick={() => setMode("edit1")} className="h-9 rounded-md border border-line bg-white px-4 text-[13px] text-[#374151] hover:bg-[#f9fafb]">Trở về</button>
                <button type="button" onClick={confirmEdit2} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-[13px] font-semibold text-white hover:bg-[#1e40af]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Xác nhận
                </button>
              </div>
            </div>
            <Stepper step={2} />
            <div className="px-6 py-5">
              <div className="rounded-lg bg-white p-6 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
                {reviewRows.map(([label, value]) => (
                  <ReviewRow key={label} label={label} value={value} />
                ))}
              </div>
            </div>
          </>
        )}
      </>

      {/* OTP modal for email change */}
      <div className={`fixed inset-0 z-[300] flex items-center justify-center bg-black/50 transition-opacity duration-200 ${otpOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}>
        <div className={`w-[340px] rounded-[12px] bg-white px-7 py-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.25)] transition-transform duration-200 ${otpOpen ? "translate-y-0" : "translate-y-2.5"}`}>
          <div className="mb-2 text-[16px] font-bold text-primary">XÁC THỰC EMAIL</div>
          <p className="mb-1 text-[13px] text-muted">Mã xác minh đã gửi về email</p>
          <p className="mb-4 text-[13.5px] font-bold text-ink">{info.email}</p>
          {otpError ? <Alert variant="error" message={otpError} /> : null}
          <label className="mb-1.5 block text-left text-[12.5px] font-medium text-[#374151]">OTP <span className="text-danger">*</span></label>
          <input className="mb-2 h-10 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-[#3b82f6]" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Nhập mã OTP" />
          <div className="mb-1 text-sm font-bold text-primary">{countdown.formatted}</div>
          <div className="mb-4 text-[12.5px] text-muted">
            Chưa nhận được mã?{" "}
            <button type="button" onClick={() => countdown.start()} className="text-primary hover:underline">Gửi lại</button>
          </div>
          <button type="button" onClick={confirmOtp} className="mb-2 h-[42px] w-full rounded-md bg-primary text-sm font-semibold text-white hover:bg-[#1e40af]">Xác nhận</button>
          <button type="button" onClick={() => { setOtpOpen(false); countdown.stop(); }} className="text-[13px] text-muted hover:text-[#374151]">Huỷ bỏ</button>
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}
