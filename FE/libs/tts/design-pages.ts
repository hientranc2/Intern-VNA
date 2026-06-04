export type DesignPage = {
  slug: string;
  title: string;
  sourceFile: string;
  category: "auth" | "account" | "system" | "report" | "email" | "dn";
  description?: string;
};

export const DESIGN_PAGES: DesignPage[] = [
  // ── Role Sở — Auth ──────────────────────────────
  {
    slug: "dang-nhap",
    title: "Đăng nhập",
    sourceFile: "so/dangnhap.html",
    category: "auth",
    description: "Trang đăng nhập vai trò Sở.",
  },
  {
    slug: "khoi-phuc-mat-khau",
    title: "Khôi phục mật khẩu",
    sourceFile: "so/khoiphucmatkhau.html",
    category: "auth",
    description: "Quy trình khôi phục mật khẩu qua email (2 bước).",
  },
  {
    slug: "email-template",
    title: "Email template",
    sourceFile: "so/email-template.html",
    category: "email",
    description: "Mẫu email thông báo OTP khôi phục mật khẩu.",
  },
  // ── Role Sở — Account ────────────────────────────
  {
    slug: "thong-tin-tai-khoan",
    title: "Thông tin tài khoản",
    sourceFile: "so/thongtintaikhoan.html",
    category: "account",
    description: "Thông tin tài khoản, đổi mật khẩu, đổi email có OTP.",
  },
  // ── Role Sở — System ─────────────────────────────
  {
    slug: "quan-ly-quyen",
    title: "Quản lý quyền",
    sourceFile: "so/quanlyquyen.html",
    category: "system",
    description: "Tree table phân quyền, expand/collapse, filter, phân trang.",
  },
  {
    slug: "quan-ly-vai-tro",
    title: "Quản lý vai trò",
    sourceFile: "so/quanlyvairo.html",
    category: "system",
    description: "CRUD vai trò, phân quyền checkbox 3 trạng thái.",
  },
  {
    slug: "quan-ly-nguoi-dung",
    title: "Quản lý người dùng",
    sourceFile: "so/quanlynguoidung.html",
    category: "system",
    description: "CRUD tài khoản, avatar initials, toggle trạng thái.",
  },
  {
    slug: "quan-ly-doanh-nghiep",
    title: "Quản lý doanh nghiệp",
    sourceFile: "so/quanlydoanhnghiep.html",
    category: "system",
    description: "CRUD doanh nghiệp, wizard xác nhận thông tin.",
  },
  {
    slug: "loai-hinh-doanh-nghiep",
    title: "Loại hình doanh nghiệp",
    sourceFile: "so/loaihinhdoanhnghiep.html",
    category: "system",
    description: "Danh mục loại hình doanh nghiệp, popup thêm/sửa.",
  },
  {
    slug: "nganh-nghe-kinh-doanh",
    title: "Ngành nghề kinh doanh",
    sourceFile: "so/nganhnghekinhdoanh.html",
    category: "system",
    description: "Danh mục ngành nghề kinh doanh, popup thêm/sửa.",
  },
  {
    slug: "cau-hinh-doanh-nghiep",
    title: "Cấu hình doanh nghiệp",
    sourceFile: "so/cauhinhdoanhnghiep.html",
    category: "system",
    description: "Cấu hình chu kỳ báo cáo, popup thêm/sửa.",
  },
  {
    slug: "khai-bao-danh-muc",
    title: "Khai báo danh mục",
    sourceFile: "so/khaibaodanhmuc.html",
    category: "system",
    description: "3 tab: yếu tố chấn thương / nghề nghiệp / loại chấn thương.",
  },
  // ── Role Sở — Report ─────────────────────────────
  {
    slug: "bao-cao-tnld-so",
    title: "Báo cáo TNLĐ (Sở)",
    sourceFile: "so/baocaotnld-so.html",
    category: "report",
    description: "Danh sách báo cáo DN, xem lại, báo cáo tổng hợp.",
  },
  // ── Role Doanh nghiệp ─────────────────────────────
  {
    slug: "dang-nhap-dn",
    title: "Đăng nhập Doanh nghiệp",
    sourceFile: "dn/dangnhap-dn.html",
    category: "dn",
    description: "Đăng nhập + modal đăng ký tài khoản DN + OTP.",
  },
  {
    slug: "dang-ky-doanh-nghiep",
    title: "Đăng ký doanh nghiệp",
    sourceFile: "dn/dangkydoanhnghiep.html",
    category: "dn",
    description: "Đăng ký DN: wizard 2 bước + OTP xác thực email + popup tài khoản.",
  },
  {
    slug: "thong-tin-doanh-nghiep",
    title: "Thông tin doanh nghiệp",
    sourceFile: "dn/thongtindoanhnghiep.html",
    category: "dn",
    description: "Xem/chỉnh sửa thông tin DN, đổi email OTP.",
  },
  {
    slug: "bao-cao-tnld-dn",
    title: "Báo cáo TNLĐ (DN)",
    sourceFile: "dn/baocaotnld-dn.html",
    category: "dn",
    description: "Tạo, điền, nộp báo cáo định kỳ theo HĐLĐ.",
  },
];

export const DESIGN_PAGE_BY_SLUG = Object.fromEntries(
  DESIGN_PAGES.map((page) => [page.slug, page]),
) as Record<string, DesignPage>;
