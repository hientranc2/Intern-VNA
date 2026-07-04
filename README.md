# Phần Mềm Quản Lý - Tạo Lập Cơ Sở Dữ Liệu An Toàn Vệ Sinh Lao Động (ATVSLĐ)

Dự án này là hệ thống phần mềm phục vụ công tác quản lý, tạo lập cơ sở dữ liệu và báo cáo về **An toàn vệ sinh lao động (ATVSLĐ)** trên địa bàn tỉnh/thành phố. Hệ thống cung cấp hai cổng thông tin (Sở Lao động - Thương binh & Xã hội và Doanh nghiệp) giúp tin học hóa quy trình nộp và xử lý báo cáo tai nạn lao động (TNLĐ).

Dự án bao gồm cả Front-end (Next.js) và Back-end (NestJS) được tích hợp chung trong repository này.

---

## 🚀 Các Phân Hệ & Tính Năng Chi Tiết

Hệ thống được thiết kế và phát triển với hai cổng thông tin dành cho hai nhóm đối tượng chính:

### 1. Phân Hệ Dành Cho Sở (Role Sở / Quản Trị Viên)
Cung cấp công cụ quản lý toàn diện cho cán bộ Sở Lao động - Thương binh & Xã hội:
- **Xác thực & Tài khoản**: Đăng nhập hệ thống, khôi phục mật khẩu qua Email OTP và cập nhật thông tin cá nhân/mật khẩu mới.
- **Quản lý Phân Quyền & Vai Trò**: 
  - Quản lý các nhóm quyền hạn chi tiết của hệ thống.
  - Phân quyền động cho các vai trò thông qua giao diện dạng Cây (Checkbox Tree 3 trạng thái).
- **Quản lý Người Dùng**: Danh sách cán bộ sử dụng, chi tiết người dùng, chức năng Reset mật khẩu và khóa tài khoản.
- **Quản lý Doanh Nghiệp**: Tiếp nhận hồ sơ đăng ký của doanh nghiệp thông qua Wizard tạo lập 2 bước, cấp tài khoản và quản lý thông tin hoạt động của doanh nghiệp trên địa bàn.
- **Quản lý Danh Mục & Cấu Hình**:
  - Quản lý các loại hình doanh nghiệp, ngành nghề kinh doanh.
  - Khai báo danh mục dùng chung hệ thống.
  - Cấu hình chu kỳ và biểu mẫu báo cáo.
- **Xử lý Báo Cáo Tai Nạn Lao Động**: Tiếp nhận, xem chi tiết báo cáo từ doanh nghiệp, duyệt/từ chối báo cáo hàng loạt và thực hiện ký số phê duyệt báo cáo.

### 2. Phân Hệ Dành Cho Doanh Nghiệp (Role Doanh nghiệp)
Giúp doanh nghiệp thực hiện nghĩa vụ khai báo thông tin trực tuyến:
- **Đăng Ký & Đăng Nhập**: Đăng ký thông tin doanh nghiệp mới gửi lên cán bộ Sở phê duyệt, đăng nhập vào cổng thông tin doanh nghiệp.
- **Thông Tin Doanh Nghiệp**: Cập nhật hồ sơ năng lực, thông tin liên lạc, quy mô lao động, ngành nghề hoạt động chính của doanh nghiệp.
- **Báo Cáo Tai Nạn Lao Động**: Khai báo tình hình tai nạn lao động định kỳ theo Hợp đồng lao động, theo dõi trạng thái phê duyệt của cán bộ Sở (Chờ duyệt, Đã duyệt, Từ chối).

---

## 🛠️ Kiến Trúc Công Nghệ (Tech Stack)

### Front-end (FE)
- **Framework**: Next.js 16 (App Router), React 19.
- **Ngôn ngữ**: TypeScript.
- **Styling**: Tailwind CSS 4 và PostCSS.
- **Linter & Tools**: ESLint 9, Prettier.
- **Giao diện**: Được chuyển đổi từ mockup HTML tĩnh (`design/`) sang các React component động có hiệu ứng tương tác cao.

### Back-end (BE)
- **Framework**: NestJS (Node.js framework).
- **Ngôn ngữ**: TypeScript.
- **ORM & Database**: TypeORM kết nối cơ sở dữ liệu PostgreSQL.
- **Bảo mật**: JWT (JSON Web Tokens) cho xác thực và RBAC (Role-Based Access Control) cho phân quyền.

---

## 📂 Cấu Trúc Thư Mục Dự Án

```text
ATVSLD/
├── FE/                        # Thư mục chứa mã nguồn Front-end
│   ├── app/                   # Next.js App Router (Mỗi page tương ứng với một route folder tiếng Anh)
│   ├── design/                # Các file HTML mockup tĩnh dùng làm tham chiếu thiết kế UI gốc
│   ├── libs/                  # Thư viện dùng chung (core components, shared models, tts business logic)
│   └── public/                # Tài nguyên tĩnh (ảnh, icon)
├── BE/                        # Thư mục chứa mã nguồn Back-end
│   ├── src/
│   │   ├── controllers/       # Các API Controllers (xử lý routing request)
│   │   ├── services/          # Các Services chứa logic nghiệp vụ chi tiết
│   │   ├── entities/          # Các Database Entities định nghĩa cấu trúc bảng
│   │   ├── dtos/              # Data Transfer Objects xác thực dữ liệu đầu vào
│   │   └── guards/            # Middleware bảo mật bảo vệ API (AuthGuard, RolesGuard)
│   └── sql/                   # Các file kịch bản SQL khởi tạo CSDL
└── README.md                  # File tài liệu này
```

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh

### Yêu Cầu Cài Đặt Trước
- Cài đặt **Node.js** (Khuyên dùng bản LTS 18 hoặc 20).
- Hệ quản trị cơ sở dữ liệu **PostgreSQL** đang hoạt động.

### 1. Khởi Chạy Back-end (BE)
1. Di chuyển vào thư mục BE:
   ```bash
   cd BE
   ```
2. Tạo file `.env` từ file cấu hình mẫu và điền thông tin kết nối CSDL PostgreSQL của bạn.
3. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
4. Khởi động server ở chế độ phát triển:
   ```bash
   npm run start:dev
   ```
Server NestJS sẽ mặc định khởi chạy tại địa chỉ: `http://localhost:3000` (hoặc cấu hình trong `.env`). Chi tiết xem tại [BE/README.md](file:///o:/TTS/Intern-VNA/BE/README.md).

### 2. Khởi Chạy Front-end (FE)
1. Mở một terminal mới và di chuyển vào thư mục FE:
   ```bash
   cd FE
   ```
2. Cấu hình file `.env.local` để kết nối tới API Endpoint của Backend.
3. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
4. Khởi động server ở chế độ phát triển:
   ```bash
   npm run dev
   ```
5. Mở trình duyệt và truy cập: `http://localhost:3000`. Chi tiết xem tại [FE/README.md](file:///o:/TTS/Intern-VNA/FE/README.md).

---

## 📝 Tài Liệu Liên Quan Của Dự Án

- **Tài liệu Back-end chi tiết**: [BE/README.md](file:///o:/TTS/Intern-VNA/BE/README.md)
- **Tài liệu Front-end chi tiết**: [FE/README.md](file:///o:/TTS/Intern-VNA/FE/README.md)
- **Hướng dẫn viết code cho AI Agent**: [FE/AGENTS.md](file:///o:/TTS/Intern-VNA/FE/AGENTS.md)
- **Bản đồ luồng trang & ghi chú cấu trúc**: [FE/CLAUDE.md](file:///o:/TTS/Intern-VNA/FE/CLAUDE.md)
- **Quy chuẩn thiết kế UI/UX & Design Tokens**: [FE/DESIGN.md](file:///o:/TTS/Intern-VNA/FE/DESIGN.md)
