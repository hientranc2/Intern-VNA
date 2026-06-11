import {
  PHU_LUC_II_ROWS,
  type AtvsldReport,
  type DeclarationValues,
} from "./atvsldReportData";

type PhuLucIIViewProps = {
  values: DeclarationValues;
  report?: AtvsldReport;
  nganhNghe?: string;
  loaiHinh?: string;
  diaChi?: string;
  dienThoai?: string;
};

const TH = "border border-line bg-[#f3f4f6] px-2 py-1.5 text-center align-middle font-semibold text-[#374151]";
const TD = "border border-line px-2 py-1.5 align-middle text-[#374151]";

function DottedLine({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline gap-1.5 text-[13px] text-ink">
      <span className="whitespace-nowrap">{label}</span>
      <span className="flex-1 border-b border-dotted border-[#9ca3af] px-1 text-center font-medium">
        {value || " "}
      </span>
    </div>
  );
}

// Tài liệu mẫu Phụ lục II – Thông tư 07/2016/TT-BLĐTBXH (read-only), điền theo dữ liệu khai báo.
export function PhuLucIIView({
  values,
  report,
  nganhNghe = "Sản xuất cơ khí hàng tiêu dùng",
  loaiHinh = "Công ty trách nhiệm hữu hạn",
  diaChi,
  dienThoai = "028 1234 5678",
}: PhuLucIIViewProps) {
  const nam = report?.ngayKetThuc?.slice(-4) || new Date().getFullYear().toString();

  return (
    <div className="mx-auto max-w-[820px] font-['Times_New_Roman',serif] text-[13px] text-ink">
      <div className="mb-2 text-right italic">Phụ lục II</div>
      <div className="text-center text-[14px] font-bold uppercase leading-snug">
        Mẫu báo cáo công tác an toàn – vệ sinh lao động của doanh nghiệp
      </div>
      <div className="mb-4 text-center text-[12px] italic">
        (Kèm theo Thông tư số 07/2016/TT-BLĐTBXH ngày 15 tháng 5 năm 2016 của
        <br />
        Bộ trưởng Bộ Lao động – Thương binh và Xã hội)
      </div>

      <div className="mb-3 space-y-1">
        <div className="font-bold">
          ĐỊA PHƯƠNG: <span className="font-normal">{report?.province || "............."}</span>
        </div>
        <div className="font-bold">
          DOANH NGHIỆP, CƠ SỞ: <span className="font-normal">{report?.ten || "............."}</span>
        </div>
        <div className="font-bold">
          Kính gửi: <span className="font-normal">Sở Lao động – Thương binh và Xã hội tỉnh, thành phố {report?.province || "................."}</span>
        </div>
      </div>

      <div className="text-center text-[14px] font-bold uppercase">Báo cáo công tác an toàn vệ sinh lao động</div>
      <div className="mb-4 text-center font-bold">Năm {nam}</div>

      <div className="mb-4 space-y-1.5">
        <DottedLine label="Tên¹:" value={report?.ten} />
        <DottedLine label="Ngành nghề sản xuất kinh doanh²:" value={nganhNghe} />
        <DottedLine label="Loại hình³:" value={loaiHinh} />
        <DottedLine label="Cơ quan cấp trên trực tiếp quản lý⁴:" />
        <DottedLine label="Địa chỉ (Số nhà, đường phố, quận, huyện, thị xã):" value={diaChi || `${report?.ward ?? ""}, ${report?.province ?? ""}`} />
        <DottedLine label="Điện thoại:" value={dienThoai} />
      </div>

      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className={`${TH} w-12`}>TT</th>
            <th className={`${TH} text-left`}>Các chỉ tiêu trong kỳ báo cáo</th>
            <th className={`${TH} w-24`}>ĐVT</th>
            <th className={`${TH} w-28`}>Số liệu</th>
          </tr>
        </thead>
        <tbody>
          {PHU_LUC_II_ROWS.map((row, idx) => {
            if (row.kind === "section") {
              return (
                <tr key={idx} className="bg-[#f9fafb]">
                  <td className={`${TD} text-center font-bold`}>{row.stt}</td>
                  <td className={`${TD} font-bold`} colSpan={3}>{row.label}</td>
                </tr>
              );
            }
            const val = row.key ? values[row.key] : "";
            return (
              <tr key={idx}>
                <td className={`${TD} text-center`}>{row.stt || ""}</td>
                <td className={TD} style={{ paddingLeft: 8 + (row.indent ?? 0) * 14 }}>{row.label}</td>
                <td className={`${TD} text-center`}>{row.dvt || ""}</td>
                <td className={`${TD} text-center font-medium`}>{val || ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
