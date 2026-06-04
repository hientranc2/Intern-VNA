# Phần Mềm Quản Lý ATVSLĐ - Front-end

## Tổng quan

Dự án front-end cho hệ thống **Tạo lập Cơ sở dữ liệu An toàn vệ sinh lao động (ATVSLĐ)**. Codebase hiện tập trung xây dựng bộ giao diện tham khảo bằng Next.js, đồng thời lưu giữ các mockup HTML và ảnh thiết kế gốc để đội phát triển có thể đối chiếu khi chuyển đổi sang UI React hoàn chỉnh.

Ứng dụng đang dùng **Next.js App Router** trong thư mục [app/](app/). Các trang mockup trong [design/](design/) được render qua route `/mockup`, còn danh sách trang và metadata nằm ở [libs/tts/design-pages.ts](libs/tts/design-pages.ts).

## Công nghệ sử dụng

- **Next.js 16.2.6**: framework React, App Router, file-system routing.
- **React 19.2.4** và **React DOM 19.2.4**: xây dựng UI component.
- **TypeScript 5**: type checking với cấu hình strict.
- **Tailwind CSS 4**: styling qua plugin `@tailwindcss/postcss`.
- **PostCSS**: pipeline xử lý CSS cho Tailwind.
- **ESLint 9** với `eslint-config-next`: kiểm tra chất lượng code theo chuẩn Next.js core web vitals và TypeScript.
- **Node.js / npm**: quản lý dependency và scripts.

## Chức năng hiện có

- Trang chủ `/` giới thiệu nhanh cấu trúc dự án và danh sách giao diện tham khảo.
- Route `/mockup` liệt kê toàn bộ mockup HTML đã đưa vào dự án.
- Route động `/mockup/[page]` render từng file HTML trong [design/](design/) theo slug.
- Client component [libs/core/components/DesignFrame/DesignFrame.tsx](libs/core/components/DesignFrame/DesignFrame.tsx) render mỗi mockup trong `<iframe srcdoc>` để cô lập global scope, nhờ đó script inline (biến/hàm global) không va chạm giữa các trang.
- Một số component dùng chung ban đầu như `AuthShell`, `Alert`, `GovSeal`.

## Cài đặt và chạy dự án

Yêu cầu môi trường:

- Node.js 18+ hoặc phiên bản tương thích với Next.js 16.
- npm.

Cài dependencies:

```bash
npm install
```

Chạy môi trường phát triển:

```bash
npm run dev
```

Mở ứng dụng tại:

```text
http://localhost:3000
```

Các URL hữu ích:

- `http://localhost:3000/`: trang tổng quan.
- `http://localhost:3000/mockup`: danh sách mockup HTML.
- `http://localhost:3000/mockup/dang-nhap`: ví dụ trang đăng nhập từ `design/so/dangnhap.html`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Ý nghĩa:

- `npm run dev`: chạy Next.js dev server.
- `npm run build`: build production.
- `npm run start`: chạy bản production sau khi build.
- `npm run lint`: chạy ESLint.

## Cấu trúc dự án

```text
.
├── app/
│   ├── mockup/
│   │   ├── page.tsx
│   │   └── [page]/
│   │       ├── loading.tsx
│   │       ├── not-found.tsx
│   │       └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── design/
│   ├── dn/
│   └── so/
├── docs/
├── Giao diện/
├── libs/
│   ├── core/
│   ├── shared/
│   └── tts/
├── public/
├── src/
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

### `app/`

Chứa routing, layout và page theo App Router của Next.js.

- [app/layout.tsx](app/layout.tsx): root layout, metadata và cấu hình HTML/body chung.
- [app/page.tsx](app/page.tsx): trang chủ.
- [app/mockup/page.tsx](app/mockup/page.tsx): danh sách mockup.
- [app/mockup/[page]/page.tsx](app/mockup/%5Bpage%5D/page.tsx): route động render HTML mockup theo slug.

Theo quy ước App Router, một folder chỉ trở thành route public khi có `page.tsx` hoặc `route.ts`.

### `design/`

Lưu các file HTML mockup tham khảo.

- `design/so/`: giao diện vai trò Sở.
- `design/dn/`: giao diện vai trò Doanh nghiệp.

Khi thêm mockup HTML mới, cần cập nhật thêm metadata trong [libs/tts/design-pages.ts](libs/tts/design-pages.ts) để route `/mockup` và `/mockup/[page]` nhận biết trang mới.

### `Giao diện/`

Lưu ảnh thiết kế gốc, thường là PNG từ tài liệu thiết kế. Thư mục này dùng để đối chiếu giao diện, không nên chỉnh sửa trực tiếp nếu không có yêu cầu rõ ràng.

### `libs/core/`

Chứa logic và component dùng chung, không phụ thuộc riêng vào nghiệp vụ ATVSLĐ.

Ví dụ:

- `libs/core/components/`: component nền tảng như `Alert`, `AuthShell`, `DesignFrame`, `GovSeal`.

### `libs/shared/`

Khu vực dành cho model, type, interface, enum dùng chung giữa front-end và back-end.

### `libs/tts/`

Chứa source riêng của dự án ATVSLĐ.

Ví dụ:

- [libs/tts/design-pages.ts](libs/tts/design-pages.ts): danh sách mockup, slug, file nguồn, category và mô tả.

### `public/`

Chứa static assets được Next.js serve trực tiếp.

### `docs/`

Chứa tài liệu nội bộ như route map, cấu trúc dự án và tài liệu tham khảo.

### `src/`

Thư mục tùy chọn. Dự án hiện đặt App Router ở root `app/`; `src/` có thể dùng về sau nếu đội muốn gom thêm source theo cấu trúc khác.

## Luồng render mockup HTML

1. Người dùng mở `/mockup/[page]`.
2. Next.js lấy slug từ dynamic segment `[page]`.
3. Slug được tra trong `DESIGN_PAGE_BY_SLUG`.
4. File HTML tương ứng trong [design/](design/) được đọc bằng `readFile`.
5. `DesignFrame` nhúng nguyên HTML vào `<iframe srcdoc>`.
6. Mỗi mockup chạy trong window riêng của iframe nên style và script inline không ảnh hưởng lẫn nhau.

Luồng này giúp giữ HTML mockup gần như nguyên bản nhưng vẫn xem được bên trong Next.js.

## Quy ước phát triển

- Đọc hướng dẫn trong [AGENTS.md](AGENTS.md) trước khi chỉnh code Next.js vì phiên bản Next.js trong dự án có thay đổi so với kiến thức cũ.
- Giữ `app/` tập trung vào routing, layout và page.
- Đặt helper, component nền tảng, UI dùng lại trong `libs/core/`.
- Đặt type/interface/enum dùng chung trong `libs/shared/`.
- Đặt logic riêng của dự án ATVSLĐ trong `libs/tts/`.
- Không chỉnh sửa ảnh gốc trong `Giao diện/` nếu chỉ đang chuyển đổi hoặc đối chiếu UI.
- Khi thêm trang mockup mới:
  - thêm file HTML vào `design/so/` hoặc `design/dn/`;
  - thêm entry vào `DESIGN_PAGES`;
  - kiểm tra route `/mockup` và `/mockup/<slug>`.
- Tuân thủ design token, layout và quy ước UI trong [DESIGN.md](DESIGN.md).

## Kiểm tra chất lượng

Chạy lint:

```bash
npm run lint
```

Chạy type check:

```bash
npx tsc --noEmit
```

Build production:

```bash
npm run build
```

## Tài liệu liên quan

- [AGENTS.md](AGENTS.md): quy tắc làm việc với phiên bản Next.js của dự án.
- [CLAUDE.md](CLAUDE.md): ghi chú chi tiết, bản đồ page và quy ước dự án.
- [DESIGN.md](DESIGN.md): design system, token, layout và guideline UI.
- [docs/route-map.md](docs/route-map.md): route map tham khảo.
- [docs/structure.md](docs/structure.md): cấu trúc thư mục.
- [libs/core/README.md](libs/core/README.md): mô tả core library.
- [libs/shared/README.md](libs/shared/README.md): mô tả shared library.
- [libs/tts/README.md](libs/tts/README.md): mô tả TTS library.
