# Logic Issues — Cần xử lý sau

> Phát hiện ngày 2026-06-14 qua kiểm tra toàn bộ hệ thống FE.  
> Các bug đã được sửa nằm riêng — file này chỉ ghi **vấn đề logic / maintainability** chưa xử lý.

---

## 1. Phân luồng đăng nhập dựa vào regex username (rủi ro trung bình)

**File:** [app/login/page.tsx](../app/login/page.tsx) — dòng 14

```typescript
const isEnterpriseUsername = (username: string) => /^\d+$/.test(username);
```

**Vấn đề:** Hệ thống phân biệt user Sở và Doanh nghiệp bằng cách kiểm tra username có toàn chữ số hay không. Nếu sau này tạo user Sở có username dạng số (ví dụ: `0123456789`), họ sẽ bị gọi nhầm vào endpoint `loginBusiness` và đăng nhập thất bại.

**Đề xuất:** Thêm tab/radio "Đăng nhập Sở / Đăng nhập Doanh nghiệp" tường minh thay vì detect tự động từ username.

---

## 2. Logic đổi mật khẩu bị duplicate (maintainability)

**Files:**
- [app/(so)/layout.tsx](../app/(so)/layout.tsx) — dòng 49–200
- [app/(so)/account/page.tsx](../app/(so)/account/page.tsx) — phần modal đổi mật khẩu

**Vấn đề:** Modal đổi mật khẩu (state, validate, gọi API `changePassword`) được viết lại ở cả layout lẫn trang account. Hai nơi validate và xử lý lỗi độc lập — nếu sửa logic ở một bên sẽ dễ bị bỏ sót bên kia.

**Đề xuất:** Extract thành component `ChangePasswordModal` dùng chung, đặt tại `libs/tts/components/ChangePasswordModal/`.

---

## 3. Không có loading state khi profile load thất bại (UX)

**File:** [app/(so)/layout.tsx](../app/(so)/layout.tsx) — dòng 55–64

```typescript
getProfile().then((p) => {
  setSidebarOverride({ ... });
}).catch(() => {}); // silent fail
```

**Vấn đề:** Khi `getProfile()` thất bại (mạng chậm, server lỗi), sidebar hiển thị tên trống, không có thông báo gì cho người dùng biết đang tải hay bị lỗi.

**Đề xuất:** Thêm fallback hiển thị username từ token decode, hoặc toast thông báo lỗi nhẹ.

---

## 4. `apiClient.ts` không có request timeout (reliability)

**File:** [libs/tts/auth/apiClient.ts](../libs/tts/auth/apiClient.ts) — dòng 40, 82

```typescript
res = await fetch(`${API_URL}${path}`, { ... });
// không có timeout — request có thể treo vô thời hạn
```

**Vấn đề:** Nếu server không phản hồi, request sẽ treo mãi và UI bị kẹt ở trạng thái loading.

**Đề xuất:** Bọc `AbortController` với timeout 30 giây cho cả `request` và `requestFormData`.

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30_000);
try {
  res = await fetch(url, { ...options, signal: controller.signal });
} finally {
  clearTimeout(timeoutId);
}
```
