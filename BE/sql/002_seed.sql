-- ============================================================================
-- Seed 002 — Dữ liệu mẫu cho các resource mới
-- Chạy SAU 001_new_resources.sql. An toàn chạy lại (ON CONFLICT DO NOTHING).
--
-- Bảng `permissions` là read-only qua API nên BẮT BUỘC seed ở đây thì
-- màn hình Phân quyền / Vai trò mới có dữ liệu. Các seed còn lại là tùy chọn
-- (khớp mock data của FE) để demo nhanh — có thể xóa nếu không cần.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- permissions (BẮT BUỘC) — khớp FE libs/tts/permission/permissionData.ts
-- ---------------------------------------------------------------------------
INSERT INTO permissions (id, type, code, name, parent_id, stt, sort_order) VALUES
  ('g1',  'Group',     'ADMIN_G_DEPARTMENT',        'Department Group',  NULL, 'I',   1),
  ('c1',  'Component', 'ADMIN_C_DEPARTMENT_VIEW',   'View Department',   'g1', '1',   2),
  ('c2',  'Component', 'ADMIN_C_DEPARTMENT_CREATE', 'Create Department', 'g1', '2',   3),
  ('c3',  'Component', 'ADMIN_C_DEPARTMENT_UPDATE', 'Update Department', 'g1', '3',   4),
  ('c4',  'Component', 'ADMIN_C_DEPARTMENT_DELETE', 'Delete Department', 'g1', '4',   5),
  ('g2',  'Group',     'ADMIN_G_ROLE',              'Role Group',        NULL, 'II',  6),
  ('c5',  'Component', 'ADMIN_C_ROLE_VIEW',         'View Role',         'g2', '1',   7),
  ('c6',  'Component', 'ADMIN_C_ROLE_CREATE',       'Create Role',       'g2', '2',   8),
  ('c7',  'Component', 'ADMIN_C_ROLE_UPDATE',       'Update Role',       'g2', '3',   9),
  ('c8',  'Component', 'ADMIN_C_ROLE_DELETE',       'Delete Role',       'g2', '4',  10),
  ('g3',  'Group',     'ADMIN_G_USER',              'User Group',        NULL, 'III', 11),
  ('c9',  'Component', 'ADMIN_C_USER_VIEW',         'View User',         'g3', '1',  12),
  ('c10', 'Component', 'ADMIN_C_USER_CREATE',       'Create User',       'g3', '2',  13),
  ('c11', 'Component', 'ADMIN_C_USER_UPDATE',       'Update User',       'g3', '3',  14),
  ('c12', 'Component', 'ADMIN_C_USER_DELETE',       'Delete User',       'g3', '4',  15)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- roles (tùy chọn) — khớp FE libs/tts/role/roleData.ts
-- ---------------------------------------------------------------------------
INSERT INTO roles (ma, ten, perms) VALUES
  ('Role1', 'Manager',  '["ADMIN_C_DEPARTMENT_VIEW","ADMIN_C_DEPARTMENT_CREATE","ADMIN_C_DEPARTMENT_UPDATE","ADMIN_C_DEPARTMENT_DELETE"]'::jsonb),
  ('Role2', 'Employee', '["ADMIN_C_DEPARTMENT_VIEW"]'::jsonb),
  ('Role3', 'CEO',      '["ADMIN_C_DEPARTMENT_VIEW","ADMIN_C_DEPARTMENT_CREATE","ADMIN_C_DEPARTMENT_UPDATE","ADMIN_C_DEPARTMENT_DELETE","ADMIN_C_ROLE_VIEW","ADMIN_C_USER_VIEW"]'::jsonb)
ON CONFLICT (ma) DO NOTHING;

-- ---------------------------------------------------------------------------
-- report_configs (tùy chọn) — khớp FE libs/tts/report-config/reportConfigData.ts
-- ---------------------------------------------------------------------------
INSERT INTO report_configs (nam, ten, ky, bat_dau, ket_thuc, active) VALUES
  ('2022', 'Báo cáo tai nạn lao động', 'Cả năm', '15/12/2023', '10/01/2024', true),
  ('2022', 'Báo cáo TNLĐ',            '6 tháng', '01/07/2022', '15/07/2022', true),
  ('2023', 'Báo cáo tai nạn lao động', 'Cả năm', '01/01/2024', '28/02/2024', false)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- injury_factors (tùy chọn) — khớp FE libs/tts/category/categoryData.ts
-- ---------------------------------------------------------------------------
INSERT INTO injury_factors (ma, ten, active) VALUES
  ('Mã 1', 'Điện', true),
  ('Mã 2', 'Phóng xạ', true),
  ('Mã 3', 'Thiết bị áp lực', true),
  ('Mã 4', 'Thiết bị nâng', true),
  ('Mã 5', 'Bộ phận truyền động, chuyển động của máy, thiết bị gây cắn, cùn, đè, ép, kẹp, cắt, va đập,...', true),
  ('Mã 6', 'Vật văng bắn', true),
  ('Mã 7', 'Vật rơi, đổ, sập', true),
  ('Mã 8', 'Sập đổ công trình, giàn giáo', true),
  ('Mã 9', 'Sập lở, sập đất đá', true)
ON CONFLICT (ma) DO NOTHING;

-- ---------------------------------------------------------------------------
-- injury_types (tùy chọn) — khớp FE
-- ---------------------------------------------------------------------------
INSERT INTO injury_types (ma, ten, cap, cha) VALUES
  ('1',   'Đầu, mặt, cổ', 1, ''),
  ('11',  '– Các chấn thương so não hở hoặc kín', 2, '1'),
  ('110', '– Bị thương vào cổ, tác hại đến thanh quản và thực quản', 3, '11')
ON CONFLICT (ma) DO NOTHING;

-- ---------------------------------------------------------------------------
-- occupations (tùy chọn) — khớp FE
-- ---------------------------------------------------------------------------
INSERT INTO occupations (ma, ten, cap, cha) VALUES
  ('1',    'Nhà lãnh đạo trong các ngành, các cấp và các đơn vị', 1, ''),
  ('11',   '– Nhà lãnh đạo cơ quan Đảng Cộng sản Việt Nam cấp Trung ương và địa phương', 2, '1'),
  ('111',  '– Nhà lãnh đạo cơ quan Đảng Cộng sản Việt Nam cấp Trung ương', 3, '11'),
  ('1111', '–– Trưởng ban, Phó Trưởng ban và tương đương trở lên thuộc cấp Trung ương', 4, '111')
ON CONFLICT (ma) DO NOTHING;
