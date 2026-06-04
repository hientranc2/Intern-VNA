export type AccidentReport = {
  id: number;
  ten: string;
  mst: string;
  ky: string;
  tt: "Đang báo cáo" | "Đã tiếp nhận";
};

export type ReportRow =
  | { kind: "section"; label: string; vals?: number[] }
  | { kind: "sub"; label: string; bold?: boolean }
  | { kind: "normal"; label: string; ma?: string; vals?: number[] };

export const EMPTY_VALS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export const INITIAL_ACCIDENT_REPORTS: AccidentReport[] = [
  { id: 1, ten: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHẠM THIÊN ÂN", mst: "0317118106", ky: "6 tháng", tt: "Đang báo cáo" },
  { id: 2, ten: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHẠM THIÊN ÂN", mst: "0317118106", ky: "Cả năm", tt: "Đã tiếp nhận" },
  { id: 3, ten: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHẠM THIÊN", mst: "0317118107", ky: "Cả năm", tt: "Đã tiếp nhận" },
  { id: 4, ten: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ VẬN TẢI PHẠM THIÊN", mst: "0317118106", ky: "Cả năm", tt: "Đã tiếp nhận" },
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

export const TONGHOP_II_GROUPS = [
  { category: "Phân theo ngành nghề", count: 8 },
  { category: "Phân theo nguyên nhân", count: 8 },
  { category: "Phân theo yếu tố gây chấn thương", count: 8 },
];
