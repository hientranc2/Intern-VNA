export type AccidentReport = {
  id: number;
  ten: string;
  mst: string;
  ky: string;
  tt: "Đang báo cáo" | "Đã nộp" | "Đã tiếp nhận" | "Từ chối";
  rejectionReason?: string | null;
  province: string;
  ward: string;
  loaiHinh: string;
  soLaoDong: number;
  soLDCoBaoHiem: number;
  soVu: number;
  soVuCoNguoiChet: number;
  soVuCo2NguoiBiNan: number;
  soNguoiBiNan: number;
  soLDNu: number;
  soNguoiBiChet: number;
  soNguoiBiThuongNang: number;
  soNgayNghi: number;
  tongSoTien: number;
  chiPhiYTe: number;
  chiPhiTraLuong: number;
  boiThuongTroCap: number;
  thiethaiTaiSan: number;
  // Tổng số liệu theo mã dòng báo cáo (key = mã, value = number[11])
  rows?: Record<string, number[]>;
  // Phân loại phần II: key mã hạng mục "1".."24" -> number[13]
  phanLoaiRows?: Record<string, number[]>;
  submittedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  nam?: string | null;
  acceptedAt?: string | null;
  acceptedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  fileUrl?: string | null;
};

export type ReportRow =
  | { kind: "section"; label: string; vals?: number[] }
  | { kind: "sub"; label: string; bold?: boolean }
  | { kind: "normal"; label: string; ma?: string; vals?: number[] };

export const EMPTY_VALS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const INITIAL_ACCIDENT_REPORTS: AccidentReport[] = [
  {
    id: 1, ten: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHẠM THIÊN ÂN", mst: "0317118106", ky: "6 tháng", tt: "Đang báo cáo",
    province: "Thành phố Hồ Chí Minh", ward: "Phường Bình Thọ", loaiHinh: "Công ty trách nhiệm hữu hạn",
    soLaoDong: 50, soLDCoBaoHiem: 45, soVu: 2, soVuCoNguoiChet: 1, soVuCo2NguoiBiNan: 1,
    soNguoiBiNan: 10, soLDNu: 5, soNguoiBiChet: 5, soNguoiBiThuongNang: 5,
    soNgayNghi: 20, tongSoTien: 6_000_000, chiPhiYTe: 2_000_000, chiPhiTraLuong: 2_000_000, boiThuongTroCap: 2_000_000, thiethaiTaiSan: 20_000_000,
  },
  {
    id: 2, ten: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHẠM THIÊN ÂN", mst: "0317118106", ky: "Cả năm", tt: "Đã tiếp nhận",
    province: "Thành phố Hồ Chí Minh", ward: "Phường Bình Thọ", loaiHinh: "Công ty trách nhiệm hữu hạn",
    soLaoDong: 50, soLDCoBaoHiem: 45, soVu: 3, soVuCoNguoiChet: 1, soVuCo2NguoiBiNan: 2,
    soNguoiBiNan: 15, soLDNu: 7, soNguoiBiChet: 3, soNguoiBiThuongNang: 8,
    soNgayNghi: 30, tongSoTien: 9_000_000, chiPhiYTe: 3_000_000, chiPhiTraLuong: 3_000_000, boiThuongTroCap: 3_000_000, thiethaiTaiSan: 15_000_000,
  },
  {
    id: 3, ten: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHẠM THIÊN", mst: "0317118107", ky: "Cả năm", tt: "Đã tiếp nhận",
    province: "Thành phố Hồ Chí Minh", ward: "Phường Tân Định", loaiHinh: "Công ty trách nhiệm hữu hạn",
    soLaoDong: 80, soLDCoBaoHiem: 75, soVu: 1, soVuCoNguoiChet: 0, soVuCo2NguoiBiNan: 0,
    soNguoiBiNan: 5, soLDNu: 2, soNguoiBiChet: 0, soNguoiBiThuongNang: 3,
    soNgayNghi: 10, tongSoTien: 3_000_000, chiPhiYTe: 1_000_000, chiPhiTraLuong: 1_000_000, boiThuongTroCap: 1_000_000, thiethaiTaiSan: 5_000_000,
  },
  {
    id: 4, ten: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHẠM THIÊN", mst: "0317118106", ky: "Cả năm", tt: "Đã tiếp nhận",
    province: "Thành phố Hà Nội", ward: "Phường Cầu Giấy", loaiHinh: "Công ty cổ phần",
    soLaoDong: 100, soLDCoBaoHiem: 95, soVu: 4, soVuCoNguoiChet: 2, soVuCo2NguoiBiNan: 2,
    soNguoiBiNan: 20, soLDNu: 8, soNguoiBiChet: 8, soNguoiBiThuongNang: 10,
    soNgayNghi: 45, tongSoTien: 15_000_000, chiPhiYTe: 5_000_000, chiPhiTraLuong: 5_000_000, boiThuongTroCap: 5_000_000, thiethaiTaiSan: 30_000_000,
  },
];

export const DETAIL_REPORT_ROWS: ReportRow[] = [
  { kind: "section", label: "1. Tai nạn lao động", vals: [2, 1, 1, 10, 0, 5, 0, 5, 0, 10, 0] },
  { kind: "sub", label: "1.1 Phân theo nguyên nhân xảy ra TNLĐ", bold: true },
  { kind: "sub", label: "a. Do người sử dụng lao động" },
  { kind: "normal", label: "Không có thiết bị an toàn hoặc thiết bị không đảm bảo an toàn", ma: "1", vals: [1, 1, 1, 5, 0, 5, 0, 5, 0, 5, 0] },
  { kind: "normal", label: "Không có phương tiện bảo vệ cá nhân hoặc phương tiện bảo vệ cá nhân không tốt", ma: "2", vals: EMPTY_VALS },
  { kind: "normal", label: "Tổ chức lao động không hợp lý", ma: "3", vals: [1, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0] },
  { kind: "normal", label: "Chưa huấn luyện hoặc huấn luyện an toàn vệ sinh lao động chưa đầy đủ", ma: "4", vals: EMPTY_VALS },
  { kind: "normal", label: "Không có quy trình an toàn hoặc biện pháp làm việc an toàn", ma: "5", vals: EMPTY_VALS },
  { kind: "normal", label: "Điều kiện làm việc không tốt", ma: "6", vals: EMPTY_VALS },
  { kind: "sub", label: "b. Do người lao động" },
  { kind: "normal", label: "Quy phạm nội quy, quy trình, quy chuẩn, biện pháp làm việc an toàn", ma: "7", vals: EMPTY_VALS },
  { kind: "normal", label: "Không sử dụng phương tiện bảo vệ cá nhân", ma: "8", vals: EMPTY_VALS },
  { kind: "normal", label: "Khách quan khó tránh/ Nguyên nhân chưa kể đến", ma: "9", vals: EMPTY_VALS },
  { kind: "sub", label: "1.2. Phân theo yếu tố gây chấn thương", bold: true },
  { kind: "normal", label: "Thiết bị nâng", ma: "101", vals: [2, 1, 1, 10, 0, 5, 0, 5, 0, 10, 0] },
  { kind: "sub", label: "1.3 Phân theo nghề nghiệp", bold: true },
  { kind: "normal", label: "Nhà lãnh đạo cơ quan Đảng Cộng sản Việt nam cấp Trung ương", ma: "102", vals: [1, 1, 1, 5, 0, 5, 0, 5, 0, 5, 0] },
  { kind: "normal", label: "Công nhân", ma: "103", vals: [1, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0] },
  { kind: "section", label: "2. Tai nạn được hưởng trợ cấp theo quy định tại Khoản 2 Điều 39 Luật ATVSLĐ" },
  { kind: "normal", label: "", ma: "10", vals: EMPTY_VALS },
  { kind: "section", label: "3. Tổng số" },
  { kind: "normal", label: "Tổng số (3=1+2)", ma: "", vals: [2, 1, 1, 10, 0, 5, 0, 5, 0, 10, 0] },
];

export const TONGHOP_I_ROWS = [
  "Doanh nghiệp nhà nước",
  "Công ty trách nhiệm hữu hạn",
  "Công ty cổ phần",
  "Công ty hợp danh",
  "Doanh nghiệp tư nhân",
  "Doanh nghiệp có vốn đầu tư nước ngoài",
  "Đơn vị kinh tế tập thể",
  "Đơn vị kinh tế cá thể",
  "Đơn vị hành chính sự nghiệp, đảng, đoàn thể, hiệp hội",
];

// 13 cột số liệu của phần II (đúng thứ tự lưu trong phanLoaiRows[ma]).
export const PHAN_LOAI_COLS = [
  "Số vụ",
  "Số vụ có người chết",
  "Số vụ ≥2 người bị nạn",
  "Số người bị nạn",
  "Số LĐ nữ",
  "Số người bị chết",
  "Số người bị thương nặng",
  "Tổng ngày nghỉ",
  "Tổng số tiền (1.000đ)",
  "Y tế",
  "Trả lương",
  "Bồi thường/Trợ cấp",
  "Thiệt hại tài sản (1.000đ)",
];

export const TONGHOP_II_GROUPS: { category: string; items: { label: string; ma: string }[] }[] = [
  {
    category: "Phân theo ngành nghề",
    items: [
      { label: "Khai khoáng", ma: "1" },
      { label: "Công nghiệp chế biến, chế tạo", ma: "2" },
      { label: "Sản xuất và phân phối điện, khí đốt", ma: "3" },
      { label: "Cung cấp nước, thoát nước, xử lý chất thải", ma: "4" },
      { label: "Xây dựng", ma: "5" },
      { label: "Vận tải, kho bãi", ma: "6" },
      { label: "Nông nghiệp, lâm nghiệp và thủy sản", ma: "7" },
      { label: "Ngành khác", ma: "8" },
    ],
  },
  {
    category: "Phân theo nguyên nhân",
    items: [
      { label: "Thiết bị không đảm bảo an toàn", ma: "9" },
      { label: "Không có phương tiện bảo vệ cá nhân", ma: "10" },
      { label: "Tổ chức lao động không hợp lý", ma: "11" },
      { label: "Chưa huấn luyện ATVSLĐ đầy đủ", ma: "12" },
      { label: "Vi phạm quy trình, quy chuẩn an toàn", ma: "13" },
      { label: "Điều kiện làm việc không tốt", ma: "14" },
      { label: "Không sử dụng phương tiện bảo vệ cá nhân", ma: "15" },
      { label: "Nguyên nhân khác", ma: "16" },
    ],
  },
  {
    category: "Phân theo yếu tố gây chấn thương",
    items: [
      { label: "Ngã", ma: "17" },
      { label: "Vật rơi, vật văng bắn", ma: "18" },
      { label: "Máy, thiết bị", ma: "19" },
      { label: "Phương tiện vận tải", ma: "20" },
      { label: "Điện giật", ma: "21" },
      { label: "Chất độc hại", ma: "22" },
      { label: "Bỏng", ma: "23" },
      { label: "Yếu tố khác", ma: "24" },
    ],
  },
];
