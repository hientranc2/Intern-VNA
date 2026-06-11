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

export const INITIAL_ENTERPRISES: Enterprise[] = [
  { id: 1,  ten: "Công ty TNHH Dệt An Lạc Tây",      mst: "7689972839",    loai: "Doanh nghiệp tư nhân",       nganh: "Trồng cau thuốc lá, thuốc lao",              phuong: "Phường Bình Thọ",    active: true },
  { id: 2,  ten: "Công ty CP Công Nghệ VNA",           mst: "0310000888292", loai: "Công ty cổ phần",             nganh: "4669 - Bán buôn chuyên doanh khác",          phuong: "Phường Tân Định",    active: true },
  { id: 3,  ten: "Công ty TNHH Xây Dựng Minh Phúc",   mst: "0312345678",    loai: "Công ty TNHH 2+ thành viên", nganh: "4100 - Xây dựng nhà các loại",               phuong: "Phường An Lạc",      active: true },
  { id: 4,  ten: "Doanh nghiệp Tư nhân Hoa Sen",       mst: "0398765432",    loai: "Doanh nghiệp tư nhân",       nganh: "4711 - Bán lẻ lương thực, thực phẩm",        phuong: "Phường An Phú",      active: false },
  { id: 5,  ten: "Công ty CP Vận Tải Đại Việt",        mst: "0376543210",    loai: "Công ty cổ phần",             nganh: "4931 - Vận tải hành khách đường bộ",         phuong: "Phường Bình Chiểu",  active: true },
  { id: 6,  ten: "Công ty TNHH MTV Sản Xuất Bình Minh",mst: "0354321098",    loai: "Công ty TNHH 1 thành viên",  nganh: "1011 - Chế biến, bảo quản thịt",             phuong: "Phường Bình Hưng",   active: true },
  { id: 7,  ten: "Công ty CP Thương Mại Phú Quý",      mst: "0332109876",    loai: "Công ty cổ phần",             nganh: "4669 - Bán buôn chuyên doanh khác",          phuong: "Phường Cát Lái",     active: false },
  { id: 8,  ten: "Công ty TNHH Dịch Vụ Sao Việt",     mst: "0319876543",    loai: "Công ty TNHH 2+ thành viên", nganh: "6201 - Lập trình máy vi tính",               phuong: "Phường Hiệp Bình Chánh", active: true },
  { id: 9,  ten: "Doanh nghiệp Nhà nước Điện Lực TP",  mst: "0201234567",    loai: "Doanh nghiệp nhà nước",      nganh: "3510 - Sản xuất, truyền tải và phân phối điện", phuong: "Phường Linh Đông", active: true },
  { id: 10, ten: "Công ty CP Xuất Nhập Khẩu Hoàng Gia",mst: "0287654321",    loai: "Công ty cổ phần",             nganh: "4661 - Bán buôn vật liệu nông nghiệp",       phuong: "Phường Long Bình",   active: true },
];
