export type InjuryFactor = {
  id: number;
  ma: string;
  ten: string;
  active: boolean;
};

export type TreeNode = {
  id: number;
  ma: string;
  ten: string;
  cap: number;
  cha: string;
};

export type CategoryTab = "factor" | "injuryType" | "occupation";

export const CAP_LABELS = ["", "Cấp 1", "Cấp 2", "Cấp 3", "Cấp 4"];

export const INJURY_FACTORS: InjuryFactor[] = [
  { id: 1, ma: "Mã 1", ten: "Điện", active: true },
  { id: 2, ma: "Mã 2", ten: "Phóng xạ", active: true },
  { id: 3, ma: "Mã 3", ten: "Thiết bị áp lực", active: true },
  { id: 4, ma: "Mã 4", ten: "Thiết bị nâng", active: true },
  { id: 5, ma: "Mã 5", ten: "Bộ phận truyền động, chuyển động của máy, thiết bị gây cắn, cùn, đè, ép, kẹp, cắt, va đập,...", active: true },
  { id: 6, ma: "Mã 6", ten: "Vật văng bắn", active: true },
  { id: 7, ma: "Mã 7", ten: "Vật rơi, đổ, sập", active: true },
  { id: 8, ma: "Mã 8", ten: "Sập đổ công trình, giàn giáo", active: true },
  { id: 9, ma: "Mã 9", ten: "Sập lở, sập đất đá", active: true },
];

export const INJURY_TYPES: TreeNode[] = [
  { id: 1, ma: "1", ten: "Đầu, mặt, cổ", cap: 1, cha: "" },
  { id: 2, ma: "11", ten: "– Các chấn thương so não hở hoặc kín", cap: 2, cha: "1" },
  { id: 3, ma: "110", ten: "– Bị thương vào cổ, tác hại đến thanh quản và thực quản", cap: 3, cha: "11" },
];

export const OCCUPATIONS: TreeNode[] = [
  { id: 1, ma: "1", ten: "Nhà lãnh đạo trong các ngành, các cấp và các đơn vị", cap: 1, cha: "" },
  { id: 2, ma: "11", ten: "– Nhà lãnh đạo cơ quan Đảng Cộng sản Việt Nam cấp Trung ương và địa phương ...", cap: 2, cha: "1" },
  { id: 3, ma: "111", ten: "– Nhà lãnh đạo cơ quan Đảng Cộng sản Việt Nam cấp Trung ương", cap: 3, cha: "11" },
  { id: 4, ma: "1111", ten: "–– Trưởng ban, Phó Trưởng ban và tương đương trở lên thuộc cấp Trung ương", cap: 4, cha: "111" },
];

export const INJURY_TYPE_PARENTS = [
  { value: "1", label: "01 Đầu mặt cổ" },
  { value: "11", label: "11 - Các chấn thương so não hở hoặc kín" },
];

export const OCCUPATION_PARENTS = [
  { value: "1", label: "1 - Nhà lãnh đạo trong các ngành..." },
  { value: "11", label: "11 - Nhà lãnh đạo cơ quan Đảng..." },
  { value: "111", label: "111 - Nhà lãnh đạo cơ quan Đảng cấp Trung ương" },
  { value: "122", label: "122 - Khai thác đá" },
];
