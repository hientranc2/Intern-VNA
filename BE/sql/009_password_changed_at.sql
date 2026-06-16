-- ============================================================================
-- Migration 009 — Cột password_changed_at cho users + accounts.
-- Dùng để VÔ HIỆU phiên (JWT) phát hành trước thời điểm đổi mật khẩu:
-- mọi đổi/đặt lại mật khẩu đều buộc tài khoản đó đăng nhập lại.
-- An toàn chạy lại (IF NOT EXISTS).
-- ============================================================================
ALTER TABLE users    ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
