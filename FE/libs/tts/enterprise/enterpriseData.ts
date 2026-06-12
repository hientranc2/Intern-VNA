export type Enterprise = {
  id: number;
  ten: string;
  mst: string;
  loai: string;
  nganh: string;
  phuong: string;
  active: boolean;
};

export type EnterpriseForm = {
  ten: string;
  mst: string;
  loai: string;
  nganh: string;
  ngayCap: string;
  tinh: string;
  phuong: string;
  diaChi: string;
  tenNN: string;
  email: string;
  sdt: string;
  tinhHD: string;
  phuongHD: string;
  diaDiem: string;
  nguoiDD: string;
  sdtDD: string;
};

export const EMPTY_ENTERPRISE_FORM: EnterpriseForm = {
  ten: "",
  mst: "",
  loai: "",
  nganh: "",
  ngayCap: "",
  tinh: "",
  phuong: "",
  diaChi: "",
  tenNN: "",
  email: "",
  sdt: "",
  tinhHD: "",
  phuongHD: "",
  diaDiem: "",
  nguoiDD: "",
  sdtDD: "",
};

export type BusinessFormData = {
  businessName: string;
  taxCode: string;
  businessType: string;
  mainIndustry: string;
  licenseDate: string;
  registeredProvince: string;
  registeredWard: string;
  address: string;
  foreignName: string;
  email: string;
  officePhone: string;
  operatingProvince: string;
  operatingWard: string;
  operatingAddress: string;
  representative: string;
  representativePhone: string;
};

export const EMPTY_BUSINESS_FORM: BusinessFormData = {
  businessName: "",
  taxCode: "",
  businessType: "",
  mainIndustry: "",
  licenseDate: "",
  registeredProvince: "",
  registeredWard: "",
  address: "",
  foreignName: "",
  email: "",
  officePhone: "",
  operatingProvince: "",
  operatingWard: "",
  operatingAddress: "",
  representative: "",
  representativePhone: "",
};

export const LOAI_HINH_OPTIONS = [
  "Công ty TNHH 1 thành viên",
  "Công ty TNHH 2+ thành viên",
  "Công ty cổ phần",
  "Doanh nghiệp tư nhân",
  "Doanh nghiệp nhà nước",
];

export const LOAI_FILTER_OPTIONS = ["Doanh nghiệp tư nhân", "Công ty TNHH", "Công ty cổ phần"];

export const NGANH_OPTIONS = [
  "4669 - Bán buôn chuyên doanh khác chưa…",
  "0111 - Trồng lúa",
  "1222 - Khai thác đá tổ ong",
];
