-- ============================================================================
-- Migration 004 — Đồng bộ users.role_id theo cột role string (legacy).
-- Chỉ điền khi role_id đang NULL → an toàn chạy lại, KHÔNG đè vai trò đã gán tay.
-- Map: ADMIN → "Quản trị viên hệ thống", MANAGER → "Manager", USER → "Employee".
-- ============================================================================

UPDATE users SET role_id = (SELECT id FROM roles WHERE ten = 'Quản trị viên hệ thống' LIMIT 1)
  WHERE role = 'ADMIN' AND role_id IS NULL;

UPDATE users SET role_id = (SELECT id FROM roles WHERE ten = 'Manager' LIMIT 1)
  WHERE role = 'MANAGER' AND role_id IS NULL;

UPDATE users SET role_id = (SELECT id FROM roles WHERE ten = 'Employee' LIMIT 1)
  WHERE role = 'USER' AND role_id IS NULL;
