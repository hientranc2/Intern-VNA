-- ============================================================================
-- Migration 007 — Bảo vệ vai trò cấp cao + vai trò "toàn quyền".
--   is_protected = true  → KHÔNG được phép xóa (kể cả khi có quyền SO_C_ROLE_DELETE).
--   is_super     = true  → tự động có TOÀN BỘ quyền khi đăng nhập (như ADMIN).
-- An toàn chạy lại (IF NOT EXISTS / UPDATE idempotent).
-- ============================================================================
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_protected boolean NOT NULL DEFAULT false;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_super     boolean NOT NULL DEFAULT false;

-- CEO (Role3): toàn quyền + không xóa được.
-- Gán perms = tất cả Component để hiển thị đầy đủ trong màn hình vai trò;
-- runtime vẫn lấy toàn quyền qua is_super dù perms có bị chỉnh.
UPDATE roles
   SET is_super     = true,
       is_protected = true,
       perms = COALESCE(
         (SELECT jsonb_agg(code ORDER BY sort_order) FROM permissions WHERE type = 'Component'),
         '[]'::jsonb)
 WHERE ma = 'Role3';

-- Manager (Role1): không xóa được (giữ nguyên quyền).
UPDATE roles SET is_protected = true WHERE ma = 'Role1';

-- Quản trị viên hệ thống (Role10): vai trò cao nhất — toàn quyền + không xóa được.
UPDATE roles SET is_super = true, is_protected = true WHERE ma = 'Role10';
