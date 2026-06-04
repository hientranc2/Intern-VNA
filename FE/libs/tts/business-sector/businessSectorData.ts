export type BusinessSector = {
  id: number;
  ma: string;
  ten: string;
  cap: number;
  cha: string;
};

export const CAP_LABELS = ["", "Cấp 1", "Cấp 2", "Cấp 3", "Cấp 4"];

export const PARENT_OPTIONS = [
  { value: "A", label: "A - Nông nghiệp, lâm nghiệp và thủy sản" },
  { value: "01", label: "01 - Nông nghiệp và hoạt động dịch vụ có liên quan" },
  { value: "011", label: "011 - Trồng cây hàng năm" },
  { value: "B", label: "B - Khai khoáng" },
  { value: "122", label: "122 - Khai thác đá" },
];

export const INITIAL_BUSINESS_SECTORS: BusinessSector[] = [
  { id: 1, ma: "A", ten: "NÔNG NGHIỆP, LÂM NGHIỆP VÀ THỦY SẢN", cap: 1, cha: "" },
  { id: 2, ma: "01", ten: "– Nông nghiệp và hoạt động dịch vụ có liên quan", cap: 2, cha: "A" },
  { id: 3, ma: "011", ten: "– Trồng cây hàng năm", cap: 3, cha: "01" },
  { id: 4, ma: "0111", ten: "– Trồng lúa", cap: 4, cha: "011" },
  { id: 5, ma: "B", ten: "KHAI KHOÁNG", cap: 1, cha: "" },
  { id: 6, ma: "122", ten: "Khai thác đá", cap: 2, cha: "B" },
  { id: 7, ma: "1222", ten: "Khai thác đá tổ ong", cap: 3, cha: "122" },
];
