-- ============================================================================
-- Migration 010 — Vai trò "Super Admin" — quyền cao nhất.
--   is_super     = true  → tự động có TOÀN BỘ quyền khi đăng nhập.
--   is_protected = true  → KHÔNG được phép xóa.
-- An toàn chạy lại (ON CONFLICT DO NOTHING).
-- ============================================================================

-- Tạo vai trò Super Admin nếu chưa tồn tại.
-- perms = tất cả Component permissions để hiển thị đầy đủ trong màn hình vai trò.
-- Runtime vẫn lấy toàn quyền qua is_super dù perms có bị chỉnh.
INSERT INTO roles (ma, ten, is_super, is_protected, perms)
VALUES (
  'SUPER_ADMIN',
  'Super Admin',
  true,
  true,
  COALESCE(
    (SELECT jsonb_agg(code ORDER BY sort_order)
     FROM permissions
     WHERE type = 'Component'),
    '[]'::jsonb
  )
)
ON CONFLICT (ma) DO UPDATE
  SET is_super     = true,
      is_protected = true,
      perms = COALESCE(
        (SELECT jsonb_agg(code ORDER BY sort_order)
         FROM permissions
         WHERE type = 'Component'),
        '[]'::jsonb
      );
