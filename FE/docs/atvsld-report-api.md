# Thiết kế API — Cụm "Ký báo cáo / Báo cáo định kỳ ATVSLĐ (Phụ lục II)"

> ✅ **ĐÃ TRIỂN KHAI** — BE (`atvsld_reports` + `AtvsldReportController`) và FE (2 page
> đã nối API thật) hoàn tất, đã test end-to-end. Tài liệu này giữ làm đặc tả tham chiếu.
>
> Cơ sở pháp lý mẫu biểu: **Phụ lục II – Thông tư 07/2016/TT-BLĐTBXH** (Báo cáo công tác ATVSLĐ định kỳ).
> Tài nguyên đề xuất: **`/atvsld-reports`** — tách bạch với 2 cụm TNLĐ đã có
> (`/accident-reports`, `/enterprise-reports`).

## 1. Vòng đời trạng thái

```
Chờ báo cáo ──(DN nhập)──► Nhập liệu ──(DN gửi)──► Chờ tiếp nhận ──(Sở duyệt)──► Hoàn thành
                              ▲                          │
                              └──────(DN sửa lại)────────┴──(Sở từ chối)──► Từ chối
```

| Trạng thái | Ai đặt | Ghi chú |
|---|---|---|
| `Chờ báo cáo` | Hệ thống | Kỳ mới mở, DN chưa nhập |
| `Nhập liệu` | DN | Lưu nháp (`POST` tạo mới hoặc `PUT` cập nhật) |
| `Chờ tiếp nhận` | DN | Sau khi `PATCH /:id/submit` |
| `Hoàn thành` | Sở | Sau khi duyệt |
| `Từ chối` | Sở | Kèm `lyDoTuChoi`; DN sửa lại được (về `Nhập liệu`) |

DN chỉ được sửa khi trạng thái ∈ `{Chờ báo cáo, Nhập liệu, Từ chối}` (FE `EDITABLE_STATUSES`).

## 2. DTO

### `AtvsldReport` — record cho cả 2 danh sách

```ts
{
  id: number;
  enterpriseId: number;
  ten: string;            // tên doanh nghiệp
  mst: string;            // mã số thuế
  nam: number;            // năm báo cáo (filter dropdown: 2022 / 2023 / 2024)
  ky: "6 tháng" | "Cả năm";
  ngayBatDau: string;     // dd/MM/yyyy
  ngayKetThuc: string;    // dd/MM/yyyy
  ngayNop: string;        // dd/MM/yyyy — rỗng "" nếu chưa nộp
  ngayCapNhat: string;    // dd/MM/yyyy
  nguoiChinhSua: string;
  province: string;
  ward: string;           // phường/xã — Sở filter theo cột này
  status: "Chờ báo cáo" | "Nhập liệu" | "Chờ tiếp nhận" | "Từ chối" | "Hoàn thành";
  lyDoTuChoi?: string;    // chỉ có khi status = "Từ chối"
}
```

### `declaration` — nội dung khai báo (chỉ trong detail)

Object phẳng `Record<string, string>`, key đúng theo `DECLARATION_KEYS` của FE
(`libs/tts/accident-report/atvsldReportData.ts`, ~70 key).

- Giá trị giữ kiểu **string**: có ô số nguyên (`"179"`), số thập phân (`"10.2"`),
  và ô dạng phân số (`hlNhom1 = "10/20"`, `qtNhietDo = "10/20"`).
- **Khuyến nghị lưu nguyên JSON map** (cột `jsonb` hoặc bảng key-value), không tách 70 cột.
- Cấu hình section / nhãn / đơn vị (`DECLARATION_SECTIONS`, `PHU_LUC_II_ROWS`) là metadata UI
  ở FE — BE **không cần** quản lý phần này.

Ví dụ rút gọn:

```json
{
  "tongLaoDong": "179", "nguoiATVSLD": "0", "laoDongNu": "0",
  "tnldTongVu": "0", "bnnChiPhi": "10.2",
  "hlNhom1": "10/10", "hlNhom2": "6/12", "hlTongChiPhi": "10.2",
  "qtNhietDo": "10/20", "thoiDiemDanhGia": "04/2022"
}
```

## 3. Endpoint — Role Doanh nghiệp

### `GET /atvsld-reports/my`
Danh sách báo cáo của DN đang đăng nhập.

Query (optional): `nam`, `status`, `ky`
Response: `AtvsldReport[]`

### `GET /atvsld-reports/:id`
Chi tiết 1 báo cáo (kèm `declaration`) để render form/`PhuLucIIView`.
Response: `AtvsldReport & { declaration: Record<string,string> }`

### `POST /atvsld-reports`
Tạo bản khai mới. BE set `status = "Nhập liệu"`, `nguoiChinhSua`/`ngayCapNhat` theo user.

```jsonc
// body
{ "ky": "Cả năm", "nam": 2022, "declaration": { /* ... */ } }
```
Response: `AtvsldReport`

### `PUT /atvsld-reports/:id`
Lưu nháp / sửa lại khi bị từ chối. BE giữ hoặc đặt `status = "Nhập liệu"`.
Body: `Partial<{ ky, nam, declaration }>` · Response: `AtvsldReport`

### `PATCH /atvsld-reports/:id/submit`
Gửi báo cáo → `status = "Chờ tiếp nhận"`.
BE **validate lại** đầy đủ field bắt buộc (FE đã validate phía client).
Response: `AtvsldReport`

## 4. Endpoint — Role Sở

### `GET /atvsld-reports`
Danh sách tiếp nhận, **có phân trang** (đồng bộ `/accident-reports`).

Query (optional): `nam`, `ten`, `mst`, `ward`, `status`, `page`, `pageSize`

```ts
// Response
{ data: AtvsldReport[]; total: number; page: number; pageSize: number }
```

### `GET /atvsld-reports/:id`
Như mục DN — Sở dùng để xem `PhuLucIIView`.

### `POST /atvsld-reports/:id/approve`
Duyệt 1 báo cáo → `Hoàn thành`. Response: `{ message: string }`

### `POST /atvsld-reports/:id/reject`
Từ chối 1 báo cáo → `Từ chối`. Body: `{ lyDoTuChoi: string }` · Response: `{ message: string }`

### `POST /atvsld-reports/approve` (hàng loạt)
Trang Sở chọn nhiều bằng checkbox → duyệt cả lô.
Body: `{ ids: number[] }` · Response: `{ message: string }`

### `POST /atvsld-reports/reject` (hàng loạt)
Từ chối cả lô với 1 lý do chung.
Body: `{ ids: number[], lyDoTuChoi: string }` · Response: `{ message: string }`

> 2 endpoint bulk là điểm khác biệt chính so với `/accident-reports/:id/approve` đơn lẻ —
> UI trang `sign-report` thao tác theo lô.

## 5. Phân quyền (CASL — khớp hệ thống đang có)

Trang Sở dùng `useCan("update", "SIGN_REPORT")` để bật/tắt nút Duyệt/Từ chối.

- Thêm subject permission **`SIGN_REPORT`** (action `update`) cho các route
  `approve` / `reject` (đơn lẻ + hàng loạt) — bổ sung vào seed
  (`BE/sql/002_seed.sql` / `reseed_permissions.js`).
- Route `/my`, `POST /atvsld-reports`, `PUT /:id`, `PATCH /:id/submit` thuộc quyền role Doanh nghiệp
  (ràng buộc theo `enterpriseId` của token).

## 6. Tổng hợp endpoint

| Method | Path | Role | Trạng thái sau |
|---|---|---|---|
| GET | `/atvsld-reports/my` | DN | — |
| GET | `/atvsld-reports/:id` | DN, Sở | — |
| POST | `/atvsld-reports` | DN | Nhập liệu |
| PUT | `/atvsld-reports/:id` | DN | Nhập liệu |
| PATCH | `/atvsld-reports/:id/submit` | DN | Chờ tiếp nhận |
| GET | `/atvsld-reports` | Sở | — |
| POST | `/atvsld-reports/:id/approve` | Sở | Hoàn thành |
| POST | `/atvsld-reports/:id/reject` | Sở | Từ chối |
| POST | `/atvsld-reports/approve` | Sở | Hoàn thành (lô) |
| POST | `/atvsld-reports/reject` | Sở | Từ chối (lô) |

## 7. Việc còn lại phía FE (sau khi BE xong)

1. `libs/tts/accident-report/atvsldReportApi.ts` — **đã tạo sẵn** đúng spec này.
2. `(dn)/enterprise-sign-report/page.tsx`: thay `INITIAL_ATVSLD_REPORTS` bằng `getMyAtvsldReports`;
   `saveDraft` → `createAtvsldReport`/`updateAtvsldReport`; `sendReport` → `submitAtvsldReport`.
3. `(so)/sign-report/page.tsx`: thay mock bằng `getAtvsldReportList`;
   `approveSelected` → `approveAtvsldReports`; `confirmReject` → `rejectAtvsldReports`.
4. `atvsldReportData.ts` giữ nguyên type + cấu hình section (metadata UI, không phải mock cần bỏ).
