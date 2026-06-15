-- ============================================================================
-- Migration 003 — Liên kết user (Role Sở) với một vai trò trong bảng roles
-- để login/profile trả về mảng quyền (permissions) thật.
-- An toàn chạy lại (IF NOT EXISTS).
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);

CREATE INDEX IF NOT EXISTS idx_users_role_id ON users (role_id);
