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
  tinh: "Thành phố Hồ Chí Minh",
  phuong: "Phường Hiệp Bình Phước",
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

export const TINH_OPTIONS = ["Thành phố Hồ Chí Minh", "Hà Nội", "Đà Nẵng"];
export const PHUONG_DKKD_OPTIONS = ["Phường Hiệp Bình Phước", "Phường Tân Định", "Phường Bình Thọ"];
export const PHUONG_FILTER_OPTIONS = ["Phường Bình Thọ", "Phường Tân Định"];

export const INITIAL_ENTERPRISES: Enterprise[] = [
  { id: 1, ten: "Công ty TNHH Dệt An Lạc Tây", mst: "7689972839", loai: "Doanh nghiệp tư nhân", nganh: "Trồng cau thuốc lá, thuốc lao", phuong: "Phường Bình Thọ", active: true },
  { id: 2, ten: "Công ty TNHH Dệt An Lạc Tây", mst: "7689972839", loai: "Doanh nghiệp tư nhân", nganh: "Trồng cau thuốc lá, thuốc lao", phuong: "Phường Bình Thọ", active: true },
  { id: 3, ten: "Công ty TNHH Dệt An Lạc Tây", mst: "7689972839", loai: "Doanh nghiệp tư nhân", nganh: "Trồng cau thuốc lá, thuốc lao", phuong: "Phường Bình Thọ", active: true },
  { id: 4, ten: "Công ty TNHH Dệt An Lạc Tây", mst: "7689972839", loai: "Doanh nghiệp tư nhân", nganh: "Trồng cau thuốc lá, thuốc lao", phuong: "Phường Bình Thọ", active: false },
  { id: 5, ten: "Công ty CP Công Nghệ VNA", mst: "0310000888292", loai: "Công ty cổ phần", nganh: "4669 - Bán buôn chuyên doanh khác", phuong: "Phường Tân Định", active: true },
];
