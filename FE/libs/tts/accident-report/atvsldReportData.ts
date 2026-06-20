// Mô hình dữ liệu cho Báo cáo công tác ATVSLĐ (Phụ lục II – Thông tư 07/2016/TT-BLĐTBXH)
// Dùng chung cho cả Role Doanh nghiệp (khai báo + nộp) và Role Sở (tiếp nhận + duyệt).

// ─── Workflow trạng thái báo cáo (5 trạng thái) ──────────────────────────────
export type ReportStatus =
  | "Chờ báo cáo"
  | "Nhập liệu"
  | "Chờ tiếp nhận"
  | "Từ chối"
  | "Hoàn thành";

export const STATUS_OPTIONS: ReportStatus[] = [
  "Chờ báo cáo",
  "Nhập liệu",
  "Chờ tiếp nhận",
  "Từ chối",
  "Hoàn thành",
];

// Màu chấm tròn + chữ cho từng trạng thái (theo design "Mới nhất").
export const STATUS_META: Record<ReportStatus, { dot: string; text: string }> = {
  "Chờ báo cáo": { dot: "bg-[#9ca3af]", text: "text-[#6b7280]" },
  "Nhập liệu": { dot: "bg-[#3b82f6]", text: "text-[#2563eb]" },
  "Chờ tiếp nhận": { dot: "bg-[#f59e0b]", text: "text-[#d97706]" },
  "Từ chối": { dot: "bg-[#ef4444]", text: "text-[#dc2626]" },
  "Hoàn thành": { dot: "bg-[#22c55e]", text: "text-[#16a34a]" },
};

// ─── Bản ghi báo cáo trong danh sách ─────────────────────────────────────────
export type AtvsldReport = {
  id: number;
  ten: string;
  mst: string;
  nam: number;
  ky: "6 tháng" | "Cả năm";
  ngayBatDau: string; // dd/MM/yyyy
  ngayKetThuc: string;
  ngayNop: string; // ngày nộp báo cáo (rỗng nếu chưa nộp)
  ngayCapNhat: string;
  nguoiChinhSua: string;
  province: string;
  ward: string; // Phường/xã
  status: ReportStatus;
  lyDoTuChoi?: string;
  history?: Array<{
    timestamp: string;
    actor: string;
    action: string;
    lyDo?: string;
  }>;
};

export const INITIAL_ATVSLD_REPORTS: AtvsldReport[] = [
  {
    id: 1, ten: "Công ty TNHH ABC", mst: "0313000900", nam: 2022, ky: "Cả năm",
    ngayBatDau: "15/12/2022", ngayKetThuc: "", ngayNop: "",
    ngayCapNhat: "28/12/2022", nguoiChinhSua: "Phan Thanh Tùng",
    province: "Thành phố Hồ Chí Minh", ward: "Phường Tam Bình", status: "Nhập liệu",
  },
  {
    id: 2, ten: "Công ty TNHH ABC", mst: "0313000900", nam: 2022, ky: "6 tháng",
    ngayBatDau: "01/07/2022", ngayKetThuc: "", ngayNop: "02/07/2022",
    ngayCapNhat: "02/07/2022", nguoiChinhSua: "Phan Thanh Tùng",
    province: "Thành phố Hồ Chí Minh", ward: "Phường Tam Bình", status: "Chờ tiếp nhận",
  },
  {
    id: 3, ten: "Công ty TNHH Phạm Thiên Ân", mst: "0317118106", nam: 2022, ky: "Cả năm",
    ngayBatDau: "15/12/2022", ngayKetThuc: "", ngayNop: "29/12/2022",
    ngayCapNhat: "29/12/2022", nguoiChinhSua: "Nguyễn Văn B",
    province: "Thành phố Hồ Chí Minh", ward: "Phường Tam Bình", status: "Từ chối",
    lyDoTuChoi: "Kiểm tra lại dữ liệu",
  },
  {
    id: 4, ten: "Công ty Cổ phần Xây dựng Đại Phát", mst: "0312345678", nam: 2022, ky: "Cả năm",
    ngayBatDau: "15/12/2022", ngayKetThuc: "27/12/2022", ngayNop: "27/12/2022",
    ngayCapNhat: "27/12/2022", nguoiChinhSua: "Trần Thị C",
    province: "Thành phố Hồ Chí Minh", ward: "Phường Tân Định", status: "Hoàn thành",
  },
  {
    id: 5, ten: "Công ty TNHH Sản xuất Cơ khí Minh Long", mst: "0319998887", nam: 2022, ky: "6 tháng",
    ngayBatDau: "01/07/2022", ngayKetThuc: "", ngayNop: "",
    ngayCapNhat: "", nguoiChinhSua: "",
    province: "Thành phố Hồ Chí Minh", ward: "Phường Bình Thọ", status: "Chờ báo cáo",
  },
];

// ─── Cấu hình form khai báo (12 mục theo Phụ lục II) ──────────────────────────
export type FieldType = "number" | "text" | "month";

export type FieldDef = {
  key: string;
  label: string;
  unit?: string; // hiển thị nhỏ dưới input (vd "Triệu đồng", "(SL huấn luyện/SL hiện có)")
  required?: boolean;
  type?: FieldType; // mặc định "number"
  fullWidth?: boolean; // chiếm cả hàng (textarea-like)
};

export type SectionDef = {
  no: number;
  title: string;
  note?: string; // dòng lưu ý màu đỏ
  fields: FieldDef[];
};

export const DECLARATION_SECTIONS: SectionDef[] = [
  {
    no: 1,
    title: "Thông tin lao động",
    fields: [
      { key: "tongLaoDong", label: "Tổng số lao động", required: true },
      { key: "nguoiATVSLD", label: "Người làm công tác ATVSLĐ" },
      { key: "nguoiYTe", label: "Người làm công tác y tế" },
      { key: "laoDongNu", label: "Lao động nữ" },
      { key: "laoDongNangNhoc", label: "Lao động làm việc trong điều kiện nặng nhọc, độc hại" },
      { key: "laoDongChuaThanhNien", label: "Lao động là người chưa thành niên" },
      { key: "laoDongDuoi15", label: "Lao động dưới 15 tuổi" },
      { key: "laoDongKhuyetTat", label: "Lao động là người khuyết tật" },
      { key: "laoDongCaoTuoi", label: "Lao động là người cao tuổi" },
    ],
  },
  {
    no: 2,
    title: "Thông tin tai nạn lao động",
    fields: [
      { key: "tnldTongVu", label: "Tổng số vụ TNLĐ" },
      { key: "tnldVuChet", label: "Số vụ có người chết" },
      { key: "tnldSoNguoiBiNan", label: "Số người bị TNLĐ" },
      { key: "tnldSoNguoiChet", label: "Số người chết vì TNLĐ" },
      { key: "tnldTongChiPhi", label: "Tổng chi phí cho TNLĐ", unit: "Triệu đồng" },
      { key: "tnldSoNgayCong", label: "Số ngày công vì TNLĐ" },
    ],
  },
  {
    no: 3,
    title: "Bệnh nghề nghiệp",
    note: "*** Lưu ý: nhập số tiền theo đơn vị Triệu đồng",
    fields: [
      { key: "bnnTongNguoi", label: "Tổng số người bị BNN tới thời điểm BC" },
      { key: "bnnMacMoi", label: "Số người mắc mới BNN" },
      { key: "bnnNgayNghiPhep", label: "Số ngày công nghỉ phép về BNN" },
      { key: "bnnNghiTruocTuoi", label: "Số người phải nghỉ trước tuổi hưu vì BNN" },
      { key: "bnnChiPhi", label: "Tổng chi phí BNN phát sinh trong năm", unit: "Triệu đồng" },
    ],
  },
  {
    no: 4,
    title: "Kết quả phân loại sức khoẻ của người lao động",
    fields: [
      { key: "skLoai1", label: "Loại I (người)" },
      { key: "skLoai2", label: "Loại II (người)" },
      { key: "skLoai3", label: "Loại III (người)" },
      { key: "skLoai4", label: "Loại IV (người)" },
      { key: "skLoai5", label: "Loại V (người)" },
    ],
  },
  {
    no: 5,
    title: "Huấn luyện về vệ sinh an toàn lao động",
    note: "*** Lưu ý: nhập số tiền theo đơn vị Triệu đồng",
    fields: [
      { key: "hlNhom1", label: "Nhóm 1: SL huấn luyện/SL hiện có (người/người)", type: "text" },
      { key: "hlNhom2", label: "Nhóm 2: SL huấn luyện/SL hiện có (người/người)", type: "text" },
      { key: "hlNhom3", label: "Nhóm 3: SL huấn luyện/SL hiện có (người/người)", type: "text" },
      { key: "hlTuHuanLuyen", label: "Trong đó: Tự huấn luyện" },
      { key: "hlThueToChuc", label: "Thuê tổ chức cung cấp dịch vụ huấn luyện" },
      { key: "hlNhom4", label: "Nhóm 4: SL huấn luyện/SL hiện có (người/người)", type: "text" },
      { key: "hlNhom5", label: "Nhóm 5: SL huấn luyện/SL hiện có (người/người)", type: "text" },
      { key: "hlNhom6", label: "Nhóm 6: SL huấn luyện/SL hiện có (người/người)", type: "text" },
      { key: "hlTongChiPhi", label: "Tổng chi phí huấn luyện", unit: "Triệu đồng" },
    ],
  },
  {
    no: 6,
    title: "Máy, thiết bị, vật tư có yêu cầu nghiêm ngặt về ATVSLĐ",
    fields: [
      { key: "mayTongSo", label: "Tổng số" },
      { key: "mayYeuCau", label: "Máy có yêu cầu nghiêm ngặt ATVSLĐ đang sử dụng" },
      { key: "mayDaKiemDinh", label: "Số đã được kiểm định" },
      { key: "mayChuaKiemDinh", label: "Số chưa được kiểm định" },
      { key: "mayDaKhaiBao", label: "Số đã được khai báo" },
      { key: "mayChuaKhaiBao", label: "Số chưa được khai báo" },
    ],
  },
  {
    no: 7,
    title: "Thời gian làm việc, thời gian nghỉ ngơi",
    fields: [
      { key: "tgNguoiLamThem", label: "Tổng số người làm thêm trong năm (người)" },
      { key: "tgGioLamThem", label: "Tổng số giờ làm thêm trong năm (giờ)" },
      { key: "tgGioCaoNhat", label: "Số giờ làm thêm cao nhất trong 1 tháng (giờ)" },
    ],
  },
  {
    no: 8,
    title: "Bồi dưỡng chống độc hại bằng hiện vật",
    note: "*** Lưu ý: nhập số tiền theo đơn vị Triệu đồng",
    fields: [
      { key: "bdTongNguoi", label: "Tổng số người" },
      { key: "bdChiPhi", label: "Tổng chi phí quy định tại điểm 10", unit: "Triệu đồng" },
    ],
  },
  {
    no: 9,
    title: "Tình hình quan trắc môi trường",
    fields: [
      { key: "qtTongMau", label: "Số mẫu quan trắc môi trường lao động (Mẫu)" },
      { key: "qtKhongDat", label: "Số mẫu không đạt tiêu chuẩn (Mẫu)" },
      { key: "qtNhietDo", label: "Mẫu nhiệt độ không đạt (Mẫu/Mẫu)", type: "text" },
      { key: "qtDoAm", label: "Mẫu độ ẩm không đạt (Mẫu/Mẫu)", type: "text" },
      { key: "qtTocDoGio", label: "Mẫu tốc độ gió không đạt (Mẫu/Mẫu)", type: "text" },
      { key: "qtAnhSang", label: "Mẫu ánh sáng không đạt (Mẫu/Mẫu)", type: "text" },
      { key: "qtTiengOn", label: "Mẫu tiếng ồn không đạt (Mẫu/Mẫu)", type: "text" },
      { key: "qtBui", label: "Mẫu bụi không đạt (Mẫu/Mẫu)", type: "text" },
      { key: "qtRung", label: "Mẫu rung không đạt (Mẫu/Mẫu)", type: "text" },
      { key: "qtHoiKhiDoc", label: "Mẫu hơi khí độc không đạt (Mẫu/Mẫu)", type: "text" },
      { key: "qtPhongXa", label: "Mẫu phóng xạ không đạt (Mẫu/Mẫu)", type: "text" },
      { key: "qtDienTuTruong", label: "Mẫu điện từ trường không đạt (Mẫu/Mẫu)", type: "text" },
      { key: "qtKhac", label: "Mẫu khác không đạt (Mẫu/Mẫu)", type: "text" },
    ],
  },
  {
    no: 10,
    title: "Chi phí thực hiện kế hoạch ATVSLĐ",
    note: "*** Lưu ý: nhập số tiền theo đơn vị Triệu đồng",
    fields: [
      { key: "cpKyThuatAnToan", label: "Các biện pháp kỹ thuật an toàn", unit: "Triệu đồng" },
      { key: "cpKyThuatVeSinh", label: "Các biện pháp kỹ thuật vệ sinh", unit: "Triệu đồng" },
      { key: "cpTrangBiPTBVCN", label: "Trang bị phương tiện bảo vệ cá nhân", unit: "Triệu đồng" },
      { key: "cpChamSocSucKhoe", label: "Chăm sóc sức khỏe người lao động", unit: "Triệu đồng" },
      { key: "cpTuyenTruyen", label: "Tuyên truyền huấn luyện", unit: "Triệu đồng" },
      { key: "cpDanhGiaRuiRo", label: "Đánh giá nguy cơ rủi ro về ATVSLĐ", unit: "Triệu đồng" },
      { key: "cpKhac", label: "Chi khác", unit: "Triệu đồng" },
    ],
  },
  {
    no: 11,
    title: "Tổ chức cung cấp dịch vụ",
    fields: [
      { key: "tcDichVuATVSLD", label: "Tên tổ chức dịch vụ ATVSLĐ được thuê", type: "text", fullWidth: true },
      { key: "tcDichVuYTe", label: "Tên tổ chức dịch vụ y tế được thuê", type: "text", fullWidth: true },
    ],
  },
  {
    no: 12,
    title: "Thời điểm tổ chức tiến hành đánh giá định kỳ nguy cơ rủi ro về ATVSLĐ",
    fields: [
      { key: "thoiDiemDanhGia", label: "Tháng/Năm", type: "month" },
    ],
  },
];

// Tất cả key của form, suy ra từ cấu hình section.
export const DECLARATION_KEYS: string[] = DECLARATION_SECTIONS.flatMap((s) =>
  s.fields.map((f) => f.key),
);

export type DeclarationValues = Record<string, string>;

export const EMPTY_DECLARATION: DeclarationValues = Object.fromEntries(
  DECLARATION_KEYS.map((k) => [k, ""]),
);

// Dữ liệu mẫu đã điền (khớp với ảnh design 9.2/9.3) để xem trước.
export const SAMPLE_DECLARATION: DeclarationValues = {
  ...EMPTY_DECLARATION,
  tongLaoDong: "179", nguoiATVSLD: "0", nguoiYTe: "0", laoDongNu: "0",
  laoDongNangNhoc: "0", laoDongChuaThanhNien: "0", laoDongDuoi15: "0",
  laoDongKhuyetTat: "0", laoDongCaoTuoi: "0",
  tnldTongVu: "0", tnldVuChet: "0", tnldSoNguoiBiNan: "0", tnldSoNguoiChet: "0",
  tnldTongChiPhi: "0", tnldSoNgayCong: "0",
  bnnTongNguoi: "0", bnnMacMoi: "0", bnnNgayNghiPhep: "0", bnnNghiTruocTuoi: "0", bnnChiPhi: "10.2",
  skLoai1: "0", skLoai2: "4", skLoai3: "6", skLoai4: "0", skLoai5: "0",
  hlNhom1: "10/10", hlNhom2: "6/12", hlNhom3: "10/20", hlTuHuanLuyen: "5", hlThueToChuc: "5",
  hlNhom4: "5/20", hlNhom5: "5/20", hlNhom6: "5/20", hlTongChiPhi: "10.2",
  mayTongSo: "4", mayYeuCau: "4", mayDaKiemDinh: "4", mayChuaKiemDinh: "0",
  mayDaKhaiBao: "4", mayChuaKhaiBao: "0",
  tgNguoiLamThem: "4", tgGioLamThem: "4", tgGioCaoNhat: "4",
  bdTongNguoi: "1", bdChiPhi: "10.2",
  qtTongMau: "60", qtKhongDat: "20", qtNhietDo: "10/20", qtDoAm: "0/0", qtTocDoGio: "0/0",
  qtAnhSang: "10/40", qtTiengOn: "0/0", qtBui: "0/0", qtRung: "0/0", qtHoiKhiDoc: "0/0",
  qtPhongXa: "0/0", qtDienTuTruong: "0/0", qtKhac: "0/0",
  cpKyThuatAnToan: "10.258", cpKyThuatVeSinh: "4", cpTrangBiPTBVCN: "4",
  cpChamSocSucKhoe: "4", cpTuyenTruyen: "4", cpDanhGiaRuiRo: "4", cpKhac: "4",
  tcDichVuATVSLD: "", tcDichVuYTe: "",
  thoiDiemDanhGia: "04/2022",
};

// ─── Cấu hình bảng chỉ tiêu Phụ lục II (xem chi tiết / xem báo cáo) ───────────
export type PhuLucRow =
  | { kind: "section"; stt: string; label: string }
  | { kind: "item"; stt?: string; label: string; dvt?: string; key?: string; indent?: number };

export const PHU_LUC_II_ROWS: PhuLucRow[] = [
  { kind: "section", stt: "A", label: "Báo cáo chung" },

  { kind: "section", stt: "1", label: "Lao động" },
  { kind: "item", label: "Tổng số lao động", dvt: "Người", key: "tongLaoDong", indent: 1 },
  { kind: "item", label: "- Trong đó: Người làm công tác ATVSLĐ", dvt: "Người", key: "nguoiATVSLD", indent: 1 },
  { kind: "item", label: "- Người làm công tác y tế", dvt: "Người", key: "nguoiYTe", indent: 1 },
  { kind: "item", label: "- Lao động nữ", dvt: "Người", key: "laoDongNu", indent: 1 },
  { kind: "item", label: "- Lao động làm việc trong điều kiện nặng nhọc, độc hại, nguy hiểm", dvt: "Người", key: "laoDongNangNhoc", indent: 1 },
  { kind: "item", label: "- Lao động là người chưa thành niên", dvt: "Người", key: "laoDongChuaThanhNien", indent: 1 },
  { kind: "item", label: "- Người dưới 15 tuổi", dvt: "Người", key: "laoDongDuoi15", indent: 1 },
  { kind: "item", label: "- Người khuyết tật", dvt: "Người", key: "laoDongKhuyetTat", indent: 1 },
  { kind: "item", label: "- Lao động là người cao tuổi", dvt: "Người", key: "laoDongCaoTuoi", indent: 1 },

  { kind: "section", stt: "2", label: "Tai nạn lao động" },
  { kind: "item", label: "- Tổng số vụ tai nạn lao động", dvt: "Vụ", key: "tnldTongVu", indent: 1 },
  { kind: "item", label: "- Trong đó, số vụ có người chết", dvt: "Vụ", key: "tnldVuChet", indent: 1 },
  { kind: "item", label: "- Tổng số người bị tai nạn lao động", dvt: "Người", key: "tnldSoNguoiBiNan", indent: 1 },
  { kind: "item", label: "- Số người chết vì tai nạn lao động", dvt: "Người", key: "tnldSoNguoiChet", indent: 1 },
  { kind: "item", label: "- Tổng chi phí cho tai nạn lao động", dvt: "Triệu đồng", key: "tnldTongChiPhi", indent: 1 },
  { kind: "item", label: "- Số ngày công vì tai nạn lao động", dvt: "Ngày", key: "tnldSoNgayCong", indent: 1 },

  { kind: "section", stt: "3", label: "Bệnh nghề nghiệp" },
  { kind: "item", label: "- Tổng số người bị BNN tới thời điểm báo cáo", dvt: "Người", key: "bnnTongNguoi", indent: 1 },
  { kind: "item", label: "- Số người mắc mới BNN", dvt: "Người", key: "bnnMacMoi", indent: 1 },
  { kind: "item", label: "- Số ngày công nghỉ phép về BNN", dvt: "Ngày", key: "bnnNgayNghiPhep", indent: 1 },
  { kind: "item", label: "- Số người phải nghỉ trước tuổi hưu vì BNN", dvt: "Người", key: "bnnNghiTruocTuoi", indent: 1 },
  { kind: "item", label: "- Tổng chi phí BNN phát sinh trong năm", dvt: "Triệu đồng", key: "bnnChiPhi", indent: 1 },

  { kind: "section", stt: "4", label: "Kết quả phân loại sức khoẻ của người lao động" },
  { kind: "item", label: "- Loại I", dvt: "Người", key: "skLoai1", indent: 1 },
  { kind: "item", label: "- Loại II", dvt: "Người", key: "skLoai2", indent: 1 },
  { kind: "item", label: "- Loại III", dvt: "Người", key: "skLoai3", indent: 1 },
  { kind: "item", label: "- Loại IV", dvt: "Người", key: "skLoai4", indent: 1 },
  { kind: "item", label: "- Loại V", dvt: "Người", key: "skLoai5", indent: 1 },

  { kind: "section", stt: "5", label: "Huấn luyện về vệ sinh an toàn lao động" },
  { kind: "item", label: "- Nhóm 1 (SL huấn luyện/SL hiện có)", dvt: "Người", key: "hlNhom1", indent: 1 },
  { kind: "item", label: "- Nhóm 2 (SL huấn luyện/SL hiện có)", dvt: "Người", key: "hlNhom2", indent: 1 },
  { kind: "item", label: "- Nhóm 3 (SL huấn luyện/SL hiện có)", dvt: "Người", key: "hlNhom3", indent: 1 },
  { kind: "item", label: "- Nhóm 4 (SL huấn luyện/SL hiện có)", dvt: "Người", key: "hlNhom4", indent: 1 },
  { kind: "item", label: "- Nhóm 5 (SL huấn luyện/SL hiện có)", dvt: "Người", key: "hlNhom5", indent: 1 },
  { kind: "item", label: "- Nhóm 6 (SL huấn luyện/SL hiện có)", dvt: "Người", key: "hlNhom6", indent: 1 },
  { kind: "item", label: "- Trong đó: Tự huấn luyện", dvt: "Người", key: "hlTuHuanLuyen", indent: 1 },
  { kind: "item", label: "- Thuê tổ chức cung cấp dịch vụ huấn luyện", dvt: "Người", key: "hlThueToChuc", indent: 1 },
  { kind: "item", label: "- Tổng chi phí huấn luyện", dvt: "Triệu đồng", key: "hlTongChiPhi", indent: 1 },

  { kind: "section", stt: "6", label: "Máy, thiết bị, vật tư có yêu cầu nghiêm ngặt về ATVSLĐ" },
  { kind: "item", label: "- Tổng số", dvt: "Cái", key: "mayTongSo", indent: 1 },
  { kind: "item", label: "- Máy có yêu cầu nghiêm ngặt ATVSLĐ đang sử dụng", dvt: "Cái", key: "mayYeuCau", indent: 1 },
  { kind: "item", label: "- Số đã được kiểm định", dvt: "Cái", key: "mayDaKiemDinh", indent: 1 },
  { kind: "item", label: "- Số chưa được kiểm định", dvt: "Cái", key: "mayChuaKiemDinh", indent: 1 },
  { kind: "item", label: "- Số đã được khai báo", dvt: "Cái", key: "mayDaKhaiBao", indent: 1 },
  { kind: "item", label: "- Số chưa được khai báo", dvt: "Cái", key: "mayChuaKhaiBao", indent: 1 },

  { kind: "section", stt: "7", label: "Thời gian làm việc, thời gian nghỉ ngơi" },
  { kind: "item", label: "- Tổng số người làm thêm trong năm", dvt: "Người", key: "tgNguoiLamThem", indent: 1 },
  { kind: "item", label: "- Tổng số giờ làm thêm trong năm", dvt: "Giờ", key: "tgGioLamThem", indent: 1 },
  { kind: "item", label: "- Số giờ làm thêm cao nhất trong 1 tháng", dvt: "Giờ", key: "tgGioCaoNhat", indent: 1 },

  { kind: "section", stt: "8", label: "Bồi dưỡng chống độc hại bằng hiện vật" },
  { kind: "item", label: "- Tổng số người", dvt: "Người", key: "bdTongNguoi", indent: 1 },
  { kind: "item", label: "- Tổng chi phí quy định tại điểm 10", dvt: "Triệu đồng", key: "bdChiPhi", indent: 1 },

  { kind: "section", stt: "9", label: "Tình hình quan trắc môi trường" },
  { kind: "item", label: "- Số mẫu quan trắc môi trường lao động", dvt: "Mẫu", key: "qtTongMau", indent: 1 },
  { kind: "item", label: "- Số mẫu không đạt tiêu chuẩn", dvt: "Mẫu", key: "qtKhongDat", indent: 1 },
  { kind: "item", label: "- Mẫu nhiệt độ không đạt", dvt: "Mẫu/Mẫu", key: "qtNhietDo", indent: 1 },
  { kind: "item", label: "- Mẫu độ ẩm không đạt", dvt: "Mẫu/Mẫu", key: "qtDoAm", indent: 1 },
  { kind: "item", label: "- Mẫu tốc độ gió không đạt", dvt: "Mẫu/Mẫu", key: "qtTocDoGio", indent: 1 },
  { kind: "item", label: "- Mẫu ánh sáng không đạt", dvt: "Mẫu/Mẫu", key: "qtAnhSang", indent: 1 },
  { kind: "item", label: "- Mẫu tiếng ồn không đạt", dvt: "Mẫu/Mẫu", key: "qtTiengOn", indent: 1 },
  { kind: "item", label: "- Mẫu bụi không đạt", dvt: "Mẫu/Mẫu", key: "qtBui", indent: 1 },
  { kind: "item", label: "- Mẫu rung không đạt", dvt: "Mẫu/Mẫu", key: "qtRung", indent: 1 },
  { kind: "item", label: "- Mẫu hơi khí độc không đạt", dvt: "Mẫu/Mẫu", key: "qtHoiKhiDoc", indent: 1 },
  { kind: "item", label: "- Mẫu phóng xạ không đạt", dvt: "Mẫu/Mẫu", key: "qtPhongXa", indent: 1 },
  { kind: "item", label: "- Mẫu điện từ trường không đạt", dvt: "Mẫu/Mẫu", key: "qtDienTuTruong", indent: 1 },
  { kind: "item", label: "- Mẫu khác không đạt", dvt: "Mẫu/Mẫu", key: "qtKhac", indent: 1 },

  { kind: "section", stt: "10", label: "Chi phí thực hiện kế hoạch ATVSLĐ" },
  { kind: "item", label: "- Các biện pháp kỹ thuật an toàn", dvt: "Triệu đồng", key: "cpKyThuatAnToan", indent: 1 },
  { kind: "item", label: "- Các biện pháp kỹ thuật vệ sinh", dvt: "Triệu đồng", key: "cpKyThuatVeSinh", indent: 1 },
  { kind: "item", label: "- Trang bị phương tiện bảo vệ cá nhân", dvt: "Triệu đồng", key: "cpTrangBiPTBVCN", indent: 1 },
  { kind: "item", label: "- Chăm sóc sức khỏe người lao động", dvt: "Triệu đồng", key: "cpChamSocSucKhoe", indent: 1 },
  { kind: "item", label: "- Tuyên truyền huấn luyện", dvt: "Triệu đồng", key: "cpTuyenTruyen", indent: 1 },
  { kind: "item", label: "- Đánh giá nguy cơ rủi ro về ATVSLĐ", dvt: "Triệu đồng", key: "cpDanhGiaRuiRo", indent: 1 },
  { kind: "item", label: "- Chi khác", dvt: "Triệu đồng", key: "cpKhac", indent: 1 },

  { kind: "section", stt: "11", label: "Tổ chức cung cấp dịch vụ" },
  { kind: "item", label: "- Tên tổ chức dịch vụ ATVSLĐ được thuê", key: "tcDichVuATVSLD", indent: 1 },
  { kind: "item", label: "- Tên tổ chức dịch vụ y tế được thuê", key: "tcDichVuYTe", indent: 1 },

  { kind: "section", stt: "12", label: "Thời điểm tiến hành đánh giá định kỳ nguy cơ rủi ro về ATVSLĐ" },
  { kind: "item", label: "- Tháng/Năm", key: "thoiDiemDanhGia", indent: 1 },
];
