export type User = {
  id: number;
  username: string;
  fullname: string;
  email: string;
  role: string;
  chucdanh: string;
  active: boolean;
  dob: string;
  gender: string;
  tinh: string;
  phuong: string;
  diachi: string;
};

export const ROLE_OPTIONS = ["Quản trị viên", "Chuyên viên", "Người dùng"];
export const PROVINCE_OPTIONS = ["Thành phố Hồ Chí Minh", "Hà Nội", "Đà Nẵng"];
export const WARD_OPTIONS = ["Phường Gò Vấp", "Phường 1", "Phường 2"];
export const GENDER_OPTIONS = ["Nam", "Nữ", "Khác"];

export const INITIAL_USERS: User[] = [
  { id: 1, username: "admin-vna", fullname: "Nguyễn Văn A", email: "phanthanhtung093@gmail.com", role: "Chuyên viên", chucdanh: "Chuyên viên", active: true, dob: "1995-06-01", gender: "Nam", tinh: "Thành phố Hồ Chí Minh", phuong: "Phường Gò Vấp", diachi: "" },
  { id: 2, username: "user-hanoi", fullname: "Trần Thị B", email: "tranthib@gmail.com", role: "Người dùng", chucdanh: "Nhân viên", active: true, dob: "1990-03-15", gender: "Nữ", tinh: "Hà Nội", phuong: "Phường 1", diachi: "" },
  { id: 3, username: "admin-dn", fullname: "Lê Văn C", email: "levanc@gmail.com", role: "Quản trị viên", chucdanh: "Trưởng phòng", active: false, dob: "1992-08-20", gender: "Nam", tinh: "Đà Nẵng", phuong: "Phường 2", diachi: "" },
  { id: 4, username: "user-hcm", fullname: "Phạm Thị D", email: "phamthid@gmail.com", role: "Chuyên viên", chucdanh: "Chuyên viên", active: true, dob: "1985-01-10", gender: "Nữ", tinh: "Thành phố Hồ Chí Minh", phuong: "Phường Gò Vấp", diachi: "" },
];
