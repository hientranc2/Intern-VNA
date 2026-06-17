# Ghi chú thay đổi theo phiên

> File này ghi lại các thay đổi Claude thực hiện trong từng phiên làm việc.

## Phiên 2026-06-17

### 1. Toast "Đăng nhập thành công" hiển thị ở góc phải (Sở + Doanh nghiệp)

**Vấn đề:** Sau khi đăng nhập, trang login điều hướng ngay sang trang đích nên không
kịp hiển thị popup thông báo "Đăng nhập thành công". Các trang đích (account /
enterprise-info) có sẵn `Toast` (góc trên phải) nhưng không có gì kích hoạt.

**Cách xử lý:** Dùng cờ trong `sessionStorage` truyền từ trang login sang trang đích.
Trang login set cờ trước khi điều hướng; trang đích đọc cờ đúng 1 lần khi mount rồi
hiển thị toast và xóa cờ.

**File đã sửa:**

- `libs/tts/auth/authApi.ts`
  - Thêm `markLoginSuccess()` và `consumeLoginSuccess()` dùng `sessionStorage`
    (key `tts_login_success`).

- `app/login/page.tsx`
  - Import `markLoginSuccess`.
  - Gọi `markLoginSuccess()` ngay trước `router.push` ở cả 2 nhánh: doanh nghiệp
    (→ `/enterprise-info`) và Sở (→ `/account`).

- `app/(so)/account/page.tsx`
  - Import `consumeLoginSuccess`.
  - Thêm `useEffect` lúc mount: nếu `consumeLoginSuccess()` true → hiện toast
    "Đăng nhập thành công!" (variant success).

- `app/(dn)/enterprise-info/page.tsx`
  - Import `consumeLoginSuccess`.
  - Thêm `useEffect` lúc mount: nếu `consumeLoginSuccess()` true → `showToast(...)`.

**Kiểm tra:** `npx tsc --noEmit` pass (không lỗi type).

---

### 2. Validate số điện thoại khi tạo mới doanh nghiệp (Sở)

**Vấn đề:** Form thêm mới doanh nghiệp chưa kiểm tra số điện thoại. Yêu cầu: bỏ trống
vẫn chấp nhận; nếu đã điền thì phải là số, đúng độ dài, hợp lệ. Lỗi hiển thị inline
ngay trên form (không dùng popup/toast).

**Cách xử lý:** Tận dụng `isValidPhone` có sẵn (`libs/tts/auth/authValidation.ts`) —
regex `^(0|\+84)\d{9,10}$` (đã tự loại dấu cách/chấm/gạch), kiểm tra đúng "là số +
độ dài + hợp lệ". Validate ở bước `goStep2` cho 2 ô SĐT; lỗi gắn vào `FieldGroup`
(hiển thị inline dưới input), tự xóa khi người dùng gõ lại.

**File đã sửa:** `app/(so)/enterprise/page.tsx`
- Import thêm `isValidPhone`.
- Thêm `officePhone?` và `representativePhone?` vào type `wizardFieldErrors`.
- Trong `goStep2`: nếu ô có giá trị mà `!isValidPhone(...)` → set lỗi
  "Số điện thoại không hợp lệ" (ô trống thì bỏ qua).
- Gắn `error` + viền đỏ + clear-on-change cho 2 ô "Số điện thoại cơ quan" và
  "SĐT liên hệ người đứng đầu".

**Kiểm tra:** `npx tsc --noEmit` pass (không lỗi type).

---

### 3. Validate "Ngành nghề kinh doanh, chính" khi bỏ trống (Sở)

**Vấn đề:** Field "Ngành nghề kinh doanh, chính" có dấu `*` (bắt buộc) nhưng chưa được
validate → bỏ trống không báo lỗi. Yêu cầu báo inline ngay tại field ở bước 1 như các
field bắt buộc khác (không popup, không để tới bước 2).

**Cách xử lý:** Thêm `mainIndustry` vào validate trong `goStep2` (cùng chỗ với
businessName/taxCode/email...), lỗi gắn vào `FieldGroup` của field → hiển thị inline ở
bước 1, viền đỏ, tự xóa khi chọn ngành nghề.

**File đã sửa:** `app/(so)/enterprise/page.tsx`
- Thêm `mainIndustry?` vào type `wizardFieldErrors`.
- `goStep2`: `if (!form.mainIndustry) errors.mainIndustry = "Vui lòng chọn ngành nghề kinh doanh chính"`.
- Gắn `error` + `error` viền đỏ + clear-on-change cho `SearchableSelect` ngành nghề.

> Ghi chú: toàn bộ validate (kể cả SĐT ở mục 2) đều chạy trong `goStep2` (lúc bấm
> "Tiếp tục" ở bước 1) và báo lỗi inline tại field ở bước 1 — không có popup ở bước 2.

**Kiểm tra:** `npx tsc --noEmit` pass (không lỗi type).

---

### 4. Sửa stepper wizard thêm mới doanh nghiệp — node bước hiện tại phải "sáng"

**Vấn đề:** Wizard có 2 bước. Trước đó ở bước 1, node "Thông tin doanh nghiệp" chỉ
hiển thị viền (nền trắng) nên trông như chưa active. Yêu cầu: node của bước đang đứng
phải sáng lên (tô nền xanh primary).

**Cách xử lý:** `app/(so)/enterprise/page.tsx` — phần Stepper:
- Node 1 ("Thông tin doanh nghiệp"): luôn tô nền primary (`border-primary bg-primary
  text-white`) vì luôn ở bước ≥ 1; hiển thị "1" khi đang ở bước 1, đổi sang dấu check
  khi đã qua bước 2. Label luôn `text-ink`.
- Node 2 ("Xác nhận đăng ký"): khi `wizardStep === 2` tô nền primary
  (`border-primary bg-primary text-white`), chưa tới thì để xám.

Kết quả: bước 1 → node 1 sáng; bước 2 → node 1 (check) + node 2 đều sáng.

**Kiểm tra:** `npx tsc --noEmit` pass (không lỗi type).

---

### 5. Lỗi bước 2 (xác nhận) thuộc field bước 1 → quay về bước 1 hiện inline

**Vấn đề:** Khi bấm "Xác nhận" ở bước 2, nếu API trả lỗi thuộc field bước 1 (trùng mã
số thuế, trùng email...) thì trước đó chỉ hiện toast ở bước 2 → không hợp lý vì lỗi
nằm ở field bước 1. Yêu cầu: quay về bước 1 và hiện lỗi inline ngay tại field tương ứng.

**Cách xử lý:** `app/(so)/enterprise/page.tsx`
- Thêm hàm `mapServerErrorToStep1Field(message)`: map thông điệp lỗi BE về field
  bước 1 — `"mã số thuế"` → `taxCode`, `"email"` → `email`
  (khớp message BE: "Mã số thuế đã tồn tại", "Email đã được sử dụng cho doanh nghiệp khác").
- Trong `confirmWizard` (catch): nếu map được field → set `wizardFieldErrors[field]`
  = message và `setWizardStep(1)` (hiện inline tại field, không toast). Lỗi khác →
  vẫn dùng toast như cũ.

**Kiểm tra:** `npx tsc --noEmit` pass (không lỗi type).

> Lưu ý: từ mục 6, logic này đã được chuyển vào component dùng chung `EnterpriseWizard`.

---

### 6. Tách "Thêm mới doanh nghiệp" từ modal sang route riêng `/enterprise/create`

**Yêu cầu:** Bấm "Thêm mới" chuyển sang route mới thay vì mở modal; sidebar giữ
nguyên; vùng content đổi từ bảng danh sách sang form thêm mới; có nút "Trở về" về
danh sách (không dùng popup).

**Cách xử lý:** Tách phần form wizard ra component dùng chung để cả route thêm mới và
modal chỉnh sửa cùng dùng (tránh trùng ~250 dòng).

**File mới:**
- `libs/tts/enterprise/EnterpriseWizard/EnterpriseWizard.tsx` — component wizard 2 bước
  (stepper + form bước 1 + xác nhận bước 2 + file đính kèm). Tự quản lý state/validate/
  submit. Props: `mode` ("add"/"edit"), `detail` (prefill khi edit), options dropdown,
  `cancelLabel`, `onCancel`, `onCreated`, `onUpdated`, `onError`. Gộp toàn bộ logic
  từ mục 2/3/4/5 (validate SĐT, ngành nghề, stepper sáng, map lỗi server về bước 1).
- `app/(so)/enterprise/create/page.tsx` — route Thêm mới: header có nút "Trở về" + render
  `EnterpriseWizard mode="add"`. Sau khi tạo thành công hiện popup tài khoản
  (username/password) → đóng/Trở về quay lại danh sách. Nằm trong group `(so)` nên tự
  có sidebar + topbar.

**File sửa:**
- `app/(so)/enterprise/page.tsx`: nút "Thêm mới" → `router.push("/enterprise/create")`;
  bỏ toàn bộ state/handler/markup wizard thêm mới (form, attachments, goStep2,
  buildFormData, confirmWizard, accountInfo, file inputs...); luồng "Chỉnh sửa" giờ
  mở modal chứa `EnterpriseWizard mode="edit"` (tải detail rồi truyền vào). Giữ lại
  FieldGroup/FORM_CONTROL_CLASS/formatLicenseDate cho modal Xem.
- `app/(so)/layout.tsx`: thêm `"/enterprise/create" → "Quản lý doanh nghiệp"` vào
  `PATH_ACTIVE` để sidebar vẫn sáng mục Quản lý doanh nghiệp ở trang thêm mới.

**Kiểm tra:** `npx tsc --noEmit` pass; eslint 3 file sạch (chỉ còn 1 lỗi
`react-hooks/set-state-in-effect` ở `useEffect(() => fetchList())` — code cũ có sẵn,
không thuộc thay đổi này).

---

### 7. Cho form Thêm mới giãn full chiều rộng (không trống 2 bên)

**Vấn đề:** Ở trang `/enterprise/create`, form bị bó `760px` + căn giữa nên trống
nhiều ở 2 bên vùng content.

**Cách xử lý:** Thêm prop `fullWidth` cho `EnterpriseWizard`:
- `fullWidth` → container `w-full` (giãn hết vùng content) — dùng cho trang Thêm mới.
- Mặc định (false) → `mx-auto w-[760px] max-w-full` — giữ cho modal Chỉnh sửa.

Trang `create/page.tsx` truyền `fullWidth`. Grid 3 cột trong form tự giãn đều, cân đối hơn.

**Kiểm tra:** `npx tsc --noEmit` pass.

---

### 8. Spinner che toàn màn hình khi xử lý (thêm mới / cập nhật / xóa)

**Yêu cầu:** Khi thêm mới doanh nghiệp (hay thao tác khác) hiện spinner load che màn
hình, chặn các thao tác khác.

**File mới:**
- `libs/shared/core/components/LoadingOverlay/LoadingOverlay.tsx` — overlay `fixed
  inset-0 z-[1000]` nền mờ + MUI `CircularProgress` + message tuỳ chọn. `z-[1000]` cao
  hơn modal (z-300)/popup (z-400) nên che được tất cả.

**File sửa:**
- `EnterpriseWizard.tsx`: render `<LoadingOverlay open={isSubmitting} ...>` →
  che màn hình khi submit cả luồng Thêm mới và Cập nhật.
- `app/(so)/enterprise/page.tsx`: thêm state `isDeleting`, set trong `deleteSelected`
  (try/finally) + render `<LoadingOverlay open={isDeleting} message="Đang xóa..." />`
  cho thao tác xóa hàng loạt.

**Kiểm tra:** `npx tsc --noEmit` pass.

---

### 9. Chẩn đoán: không upload được file Giấy phép kinh doanh (KHÔNG sửa code)

**Triệu chứng:** Tạo/sửa doanh nghiệp không đính kèm được file.

**Kết quả test:** Lỗi nằm ở **BE/Supabase Storage**, không phải FE.
- FE chọn file đúng (`accept` PDF/JPG/PNG khớp BE; field `licenseFile`/`otherFile` khớp
  controller).
- Test trực tiếp `supabaseAdmin.storage.from("businesses")`:
  `listBuckets()` và `upload()` đều trả **"signature verification failed"**.
- Tức `SUPABASE_SERVICE_KEY` trong `BE/.env` không hợp lệ với project
  `ziroujfjpyvswzjjsorf` (key bị rotate/sai project). Khi submit, `uploadFile()` ném lỗi
  → BE trả `"Lỗi khi tải file lên hệ thống!"`.

**Cách khắc phục (người dùng tự làm — secret):** Lấy lại `service_role` key mới trong
Supabase Dashboard → Project Settings → API, cập nhật `SUPABASE_SERVICE_KEY` (và kiểm tra
`SUPABASE_URL`, `SUPABASE_KEY`) trong `BE/.env`, khởi động lại BE. Đảm bảo bucket
`businesses` tồn tại. (Liên quan ghi chú [[project-avatar-upload]].)

> Ghi chú phụ: login `admin/12345678` trên BE đang chạy trả 401 — có thể seed DB khác,
> không liên quan lỗi upload.

---

### 10. File đính kèm: hiện file cũ khi sửa + chỉ cho PDF

**Vấn đề:** (1) Vào modal Chỉnh sửa, file đã có trên server không hiện ("Chưa có file"),
xem không được; (2) chỉ muốn cho upload PDF.

**Cách xử lý:** `EnterpriseWizard.tsx`
- Thêm `url?` vào `AttachedFile`; thêm `filenameFromUrl()` + `makeAttachments(licenseUrl,
  otherUrl)` (giống `enterprise-info`).
- Khởi tạo `attachments`: mode edit → nạp từ `detail.licenseFile`/`detail.otherFile`
  (hiện tên file cũ + cho Xem qua URL); mode add → rỗng.
- `handleFileSelect`: chỉ nhận PDF (`application/pdf` hoặc đuôi `.pdf`), khác → gọi
  `onError("Chỉ cho phép tải lên file PDF")` và reset input.
- `handleFileView`: ưu tiên file mới (blob), nếu không có thì mở `url` file cũ.
- `handleFileDelete`: xoá file mới chọn → quay lại file cũ trên server (nếu có).
- Bảng file (bước 1 + bước 2): điều kiện hiện tên/nút Xem dựa trên `file || url`.
- `accept` của 2 input đổi thành `application/pdf,.pdf`.

**Lưu ý quan trọng (liên quan mục 9):** File chỉ thật sự lưu được khi BE upload lên
Supabase thành công. Hiện `SUPABASE_SERVICE_KEY` đang lỗi → upload thất bại, nên dù FE
đã đúng, file vẫn chưa persist cho tới khi sửa key (xem mục 9).

**Kiểm tra:** `npx tsc --noEmit` pass.

---

### 11. Thêm bảng "File đính kèm" vào modal Xem doanh nghiệp

**Yêu cầu:** Modal Xem (Thông tin doanh nghiệp, chỉ đọc) chưa có bảng file đính kèm —
thêm bảng giống trong form, có nút Xem.

**Cách xử lý:** `app/(so)/enterprise/page.tsx`
- Thêm helper `filenameFromUrl()` + hằng `VIEW_FILE_ROWS`.
- Trong modal Xem, sau khối "Thông tin liên hệ" thêm bảng "File đính kèm" (Giấy phép
  kinh doanh / Giấy tờ khác) đọc từ `viewDetail.licenseFile` / `viewDetail.otherFile`:
  hiện tên file + nút **Xem** mở URL (read-only, không có nút tải lên/xoá vì là modal xem).
  Không có file → "Chưa có file" + nút Xem disabled.

**Kiểm tra:** `npx tsc --noEmit` pass.

---

### 12. Sửa filter Trạng thái (Quản lý doanh nghiệp) không hoạt động — BE

**Vấn đề:** Lọc theo Trạng thái sai: chọn "Ngừng" vẫn ra doanh nghiệp đang hoạt động.

**Nguyên nhân:** `BE/libs/shared/models/business.dto.ts` — `BusinessQueryDto.isActive`
dùng `@Type(() => Boolean)`. Query string là chuỗi nên `Boolean("false") === true`
→ `isActive=false` bị hiểu thành `true`.

**Cách xử lý:** thay `@Type(() => Boolean)` bằng `@Transform` map đúng:
`"true"/true → true`, `"false"/false → false`, còn lại → `undefined`.

**Kiểm tra:** CHƯA tự chạy tsc/lint (theo yêu cầu user tự kiểm tra). Cần **restart BE**
để áp dụng.

---

### 13. Cụm Quản lý người dùng + quy tắc mật khẩu (batch 6 việc — phần đã làm)

**#3 Đổi nhãn "Quận / Huyện" → "Phường / Xã"** (form chi tiết người dùng):
`app/(so)/user/page.tsx` đổi label + placeholder.

**#4 Sửa user không load ngày sinh + lưu được dob/gender/...:**
- `openEdit`: `dob` cắt còn `yyyy-MM-dd` (`String(user.dob).slice(0,10)`) để `DateInput`
  hiển thị đúng (trước đó nhận full ISO nên trống).
- Trước đây `createUser`/`updateUser` KHÔNG gửi dob/gender/province/ward/address → sửa
  cũng mất. Đã wire đầy đủ:
  - BE `src/dtos/user-admin.dto.ts`: thêm `dob` (`@IsDateString`), `gender/province/ward/
    address` (optional, `emptyToUndefined`) cho cả Create + Update DTO. (Service vốn
    `create({...dto})` / `update(id, dto)` nên tự lưu; entity đã có sẵn các cột.)
  - FE `libs/tts/user/userApi.ts`: thêm field vào `CreateUserInput`/`UpdateUserInput`.
  - FE `user/page.tsx`: `saveUser` truyền các field này ở cả tạo & sửa.

**#5 Tạo người dùng bắt buộc chọn giới tính:** thêm `gender` vào `FieldErrors`; `saveUser`
khi tạo mới validate `!form.gender` → "Vui lòng chọn giới tính" (inline); ô Giới tính có
dấu `*` + viền đỏ khi lỗi. (Chỉ bắt buộc khi tạo.)

**#2 Quy tắc mật khẩu (hoa/thường/ký tự đặc biệt):**
- `libs/tts/auth/authValidation.ts`: thêm `isStrongPassword()` + `PASSWORD_RULE_MESSAGE`
  (regex: ≥8 ký tự, có chữ hoa, chữ thường, ký tự đặc biệt — *giả định độ dài 8, user
  chỉ nêu hoa/thường/đặc biệt*).
- Quản lý người dùng (`user/page.tsx`): áp dụng khi **tạo** (`saveUser`) và khi **đổi**
  (modal Đặt lại mật khẩu `confirmResetPwd`).
- Quản lý doanh nghiệp (`enterprise/page.tsx`): chỉ áp dụng khi **đổi** (modal Đặt lại
  mật khẩu `confirmResetPwd`); lúc tạo dùng mật khẩu mặc định nên không check (đúng yêu cầu).

**Kiểm tra:** CHƯA tự chạy tsc/lint (user tự kiểm tra). Phần BE cần **restart BE**.

**#1 Khóa tài khoản → văng ra ngay + popup (user duyệt: BE check mỗi request):**
- BE `src/services/jwt.strategy.ts`: inject `User/Account/Business` repo; `validate()`
  tra DB theo `payload.sub` — user Sở `!isActive` hoặc DN (business của account)
  `!isActive` → `throw UnauthorizedException(LOCKED_MESSAGE)`. Mỗi request đều kiểm →
  tài khoản bị tắt sẽ bị chặn ở thao tác kế tiếp.
- FE `libs/tts/auth/apiClient.ts`: parse body trước; khi 401 truyền message vào
  `handle401`; nếu message khớp /khóa|vô hiệu/ → set `sessionStorage["tts_account_locked"]`
  rồi clearToken + redirect login. (Áp cho cả `request` và `requestFormData`.)
- FE `libs/tts/auth/authApi.ts`: thêm `consumeAccountLocked()` đọc 1 lần cờ đó.
- FE `app/login/page.tsx`: mount đọc `consumeAccountLocked()` → hiện popup "Tài khoản bị
  khóa". DN bị đá về `/enterprise-login` (route này chỉ redirect `/login`) nên popup ở
  `/login` lo được cả 2 vai trò.
- Test: bật 2 tài khoản, tắt 1 → tài khoản bị tắt thao tác tiếp theo sẽ văng ra + popup.

**#6 Đồng nhất layout form sửa người dùng với trang "Thông tin tài khoản":**
- `app/(so)/user/page.tsx`: ở chế độ Sửa, bỏ ô trống `<div />` đặt chỗ mật khẩu (đổi
  thành `null`). Trước đó ô trống đẩy "Họ và tên" xuống dòng → lệch so với account page.
  Giờ thứ tự khớp: Tên đăng nhập, Họ và tên, Ngày sinh, Giới tính, Chức danh, Vai trò,
  Email. (Tạo mới vẫn giữ ô Mật khẩu cạnh Tên đăng nhập.)

**Kiểm tra:** CHƯA tự chạy tsc/lint (user tự kiểm tra). Phần BE (#1) cần **restart BE**.

---

### 14. Đồng nhất style ô Mã số thuế (disabled khi sửa) với ô Phường/Xã disabled

**Vấn đề:** Ô "Mã số thuế" lúc sửa doanh nghiệp dùng nền `#f9fafb` + chữ đậm (text-ink),
không giống ô Phường/Xã khi bị disabled (chưa chọn tỉnh) → lệch thiết kế.

**Cách xử lý:** `EnterpriseWizard.tsx` — đổi class ô Mã số thuế sang đúng style disabled
của `SearchableSelect`: `disabled:bg-body disabled:text-muted disabled:cursor-not-allowed`
(bỏ `bg-[#f9fafb]`). Dùng biến thể `disabled:` nên chỉ áp khi disabled (chế độ sửa);
tạo mới vẫn nhập bình thường.

**Kiểm tra:** CHƯA tự chạy tsc/lint (user tự kiểm tra).

---

### 18. Lỗi "Tài khoản doanh nghiệp bị vô hiệu hóa" → Toast góc phải trên (không alert inline)

**Vấn đề:** Đăng nhập bằng tài khoản DN đã bị khóa → lỗi hiện trong alert inline bên trong
form đăng nhập. Yêu cầu: hiện ở **góc phải trên** (Toast) như các thông báo khác.

**Cách xử lý:** `app/login/page.tsx`
- Thêm helper `isLockedMessage(msg)` (`/khóa|vô hiệu/i`).
- Trong `catch` của `handleLogin`: nếu là `ApiError` và message khớp khóa → `setLockedMessage`
  (đi vào Toast); lỗi khác (sai mật khẩu...) vẫn `setApiError` inline như cũ.
- Thay **modal giữa màn hình** (khi bị đá giữa phiên) bằng `<Toast variant="error" duration={5000}>`
  góc phải trên → gộp cả 2 luồng (đăng nhập + bị đá giữa phiên) vào 1 Toast.
- Import thêm `Toast`.

**Kiểm tra:** CHƯA tự chạy tsc/lint (user tự kiểm tra).

---

### 19. DateInput: lịch mở thẳng hàng dưới field

**Vấn đề:** Bấm ô "Ngày cấp GPKD", lịch native bung ra lệch sang phải, đè lên cột
"Tỉnh/Thành phố" — do thẻ `<input>` neo sát phải (`right-0 w-10`), trình duyệt mở lịch
theo vị trí thẻ input (mép phải).

**Cách xử lý:** `DateInput.tsx` — đổi `<input>` về phủ full field
(`absolute inset-0 h-full w-full opacity-0`) → lịch bung ra thẳng hàng dưới mép trái field.
Vẫn giữ `<span>` hiển thị giá trị + container `onClick` mở lịch nên input trong suốt phủ
full không che nội dung. Component dùng chung → áp mọi trang có DateInput.

**Kiểm tra:** CHƯA tự chạy tsc/lint (user tự kiểm tra).

> Các mục 18–22 đã áp trên **cả 2 nhánh** `main` và `Toan` (chuyển nhánh qua lại trong phiên).
> Riêng nhánh Toan: #18 (login Toast) + #19 (DateInput) vốn đã có sẵn; bổ sung thêm
> #20 (BE quên MK doanh nghiệp), #21 + #22 (trang forgot-password).

---

### 20. Nối API quên mật khẩu cho doanh nghiệp (trang `/forgot-password` ngoài login) — BE

**Yêu cầu:** Quên mật khẩu cho tài khoản doanh nghiệp hoạt động được ở trang ngoài login.

**Bối cảnh:** `/login` là login hợp nhất (Sở + DN); link "Quên mật khẩu" → `/forgot-password`
(1 trang chung theo email). BE `/auth/forgot-password` + `/auth/reset-password` trước đó
**chỉ tra `userRepository` (Sở)**. DN: email ở `Business`, mật khẩu ở `Account`, **không có
cột otp** → không hỗ trợ được.

**Cách xử lý (BE — `src/services/auth.service.ts`):** mở rộng 2 endpoint sẵn có để fallback
sang DN (không cần đoán vai trò ở FE, trang forgot-password chung dùng được luôn):
- Thêm `businessForgotOtpStore = new Map<email, {code, expiresAt}>()` (in-memory, giống
  `registerOtpStore` vì Account/Business không có cột otp).
- `forgotPassword`: nếu email không phải user Sở → `return this.sendBusinessForgotOtp(email)`.
- `resetPassword`: đổi sang tìm user theo email trước; nếu không có user Sở →
  `return this.resetBusinessPassword(dto)`.
- `sendBusinessForgotOtp(email)` (private): tìm `Business` theo email (không có → 404),
  sinh OTP 6 số/5 phút lưu store, gửi mail (template DN), trả message.
- `resetBusinessPassword(dto)` (private): validate OTP từ store (sai/hết hạn → 400),
  tìm `Business` theo email → `Account` theo `business.accountId` → `bcrypt.hash` mật khẩu
  mới, lưu Account, xóa OTP khỏi store.

**FE:** KHÔNG đổi. Trang `app/forgot-password/page.tsx` vốn gọi `forgotPassword(email)` +
`resetPassword({email, otpCode, newPassword})` đúng 2 endpoint này → DN dùng được ngay.

**Kiểm tra:** CHƯA tự chạy tsc/lint (user tự kiểm tra). Cần **restart BE**. Test: dùng email
của 1 DN (vd tài khoản `0300000001`) ở `/forgot-password` → nhận OTP (xem log BE
`[OTP QUÊN MẬT KHẨU DN ...]`) → đặt lại mật khẩu → đăng nhập DN bằng mật khẩu mới.

---

### 21. Disable nút "Gửi lại" OTP trong lúc còn đếm ngược (quên mật khẩu)

**Vấn đề:** Bước 2 trang `/forgot-password`, nút "Chưa nhận được mã? Gửi lại" bấm được ngay
cả khi đồng hồ 5 phút chưa hết.

**Cách xử lý:** `app/forgot-password/page.tsx` — `useCountdown` đã expose `seconds`. Thêm
`disabled={countdown.seconds > 0}` cho nút Gửi lại (chỉ bấm được khi về 00:00) + style
disabled (`disabled:cursor-not-allowed disabled:text-muted disabled:no-underline`).

**Kiểm tra:** CHƯA tự chạy tsc/lint (user tự kiểm tra).

---

### 22. Quên mật khẩu: thông báo kết quả → Toast góc phải; lỗi validate → inline dưới input

**Yêu cầu (quy ước chung):** Mọi thông báo thành công/thất bại từ API dùng **Toast góc phải
trên**; chỉ lỗi **validate** mới báo inline dưới input.

**Cách xử lý:** Viết lại `app/forgot-password/page.tsx`:
- Bỏ `Alert` inline (`notice`) → thay bằng state `toast` + component `Toast`
  (`message`/`variant`/`onDone`) đặt cuối, ngoài `AuthShell`.
  - Toast: "Gửi email thành công" / "Gửi email thất bại" / "Đặt lại mật khẩu thành công"
    (delay 1s rồi `router.push("/login")`) / lỗi reset / "Đã gửi lại mã OTP" / "Gửi lại thất bại".
- Validate inline (mỗi field 1 state lỗi string, viền `border-danger`, text-[11px] text-danger,
  tự xóa khi gõ lại):
  - Bước 1: `emailError` ("Vui lòng nhập email" / "Email không đúng định dạng").
  - Bước 2: `otpError`, `newPasswordError`, `confirmPasswordError`
    (bỏ trống + "Mật khẩu xác nhận không khớp").
- Tách handler `resendOtp` ra ngoài (gọn JSX), giữ disable theo `countdown.seconds` (mục 21).
- Lưu ý: đặt `type ToastState` (không trùng tên component `Toast`).

> Đây là quy ước chung — các trang khác cũng nên theo (đã lưu memory `feedback-toast-vs-inline`).

**Kiểm tra:** CHƯA tự chạy tsc/lint (user tự kiểm tra).

---

### 23. Fix: Toast không tự tắt khi parent re-render liên tục (đồng hồ đếm ngược)

**Vấn đề:** Ở bước 2 quên mật khẩu, toast "Gửi email thành công" không tự biến mất.

**Nguyên nhân:** `Toast` có `useEffect(setTimeout(onDone, duration), [message, duration, onDone])`.
Đồng hồ đếm ngược tick mỗi 1s → `ForgotPasswordPage` re-render → `onDone` (`() => setToast(null)`)
là hàm mới mỗi lần → effect chạy lại, clear + đặt lại timer 2.5s. Timer bị reset mỗi giây nên
không bao giờ chạy hết → toast treo mãi.

**Cách xử lý:** `libs/shared/core/components/Toast/Toast.tsx` — giữ `onDone` trong `useRef`
(`onDoneRef.current = onDone` mỗi render), `setTimeout(() => onDoneRef.current(), duration)`,
deps effect chỉ còn `[message, duration]`. Timer chỉ đặt lại khi message/duration đổi, không bị
reset bởi re-render. Component dùng chung → fix cho mọi nơi dùng Toast.

**Kiểm tra:** CHƯA tự chạy tsc/lint (user tự kiểm tra).
