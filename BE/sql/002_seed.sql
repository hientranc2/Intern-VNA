-- ============================================================================
-- Seed 002 — Dữ liệu mẫu cho các resource mới
-- Chạy SAU 001_new_resources.sql. An toàn chạy lại (ON CONFLICT DO NOTHING).
--
-- Bảng `permissions` là read-only qua API nên BẮT BUỘC seed ở đây thì
-- màn hình Phân quyền / Vai trò mới có dữ liệu. Các seed còn lại là tùy chọn
-- (khớp mock data của FE) để demo nhanh — có thể xóa nếu không cần.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- permissions (BẮT BUỘC) — cây quyền THẬT theo module Role Sở.
-- 9 nhóm × {Xem, Thêm, Sửa, Xóa}. id = code để FE link parentId nhất quán.
-- (Đồng bộ với sql/reseed_permissions.js — sửa cả hai nơi nếu đổi.)
-- ---------------------------------------------------------------------------
INSERT INTO permissions (id, type, code, name, parent_id, stt, sort_order) VALUES
  ('SO_G_PERMISSION',      'Group',     'SO_G_PERMISSION',      'Phân quyền',             NULL,              'I',    0),
  ('SO_C_PERMISSION_VIEW', 'Component', 'SO_C_PERMISSION_VIEW', 'Xem phân quyền',         'SO_G_PERMISSION', '1',    1),
  ('SO_C_PERMISSION_CREATE','Component','SO_C_PERMISSION_CREATE','Thêm phân quyền',       'SO_G_PERMISSION', '2',    2),
  ('SO_C_PERMISSION_UPDATE','Component','SO_C_PERMISSION_UPDATE','Sửa phân quyền',        'SO_G_PERMISSION', '3',    3),
  ('SO_C_PERMISSION_DELETE','Component','SO_C_PERMISSION_DELETE','Xóa phân quyền',        'SO_G_PERMISSION', '4',    4),
  ('SO_G_ROLE',            'Group',     'SO_G_ROLE',            'Vai trò',                NULL,              'II',   5),
  ('SO_C_ROLE_VIEW',       'Component', 'SO_C_ROLE_VIEW',       'Xem vai trò',            'SO_G_ROLE',       '1',    6),
  ('SO_C_ROLE_CREATE',     'Component', 'SO_C_ROLE_CREATE',     'Thêm vai trò',           'SO_G_ROLE',       '2',    7),
  ('SO_C_ROLE_UPDATE',     'Component', 'SO_C_ROLE_UPDATE',     'Sửa vai trò',            'SO_G_ROLE',       '3',    8),
  ('SO_C_ROLE_DELETE',     'Component', 'SO_C_ROLE_DELETE',     'Xóa vai trò',            'SO_G_ROLE',       '4',    9),
  ('SO_G_USER',            'Group',     'SO_G_USER',            'Người dùng',             NULL,              'III',  10),
  ('SO_C_USER_VIEW',       'Component', 'SO_C_USER_VIEW',       'Xem người dùng',         'SO_G_USER',       '1',    11),
  ('SO_C_USER_CREATE',     'Component', 'SO_C_USER_CREATE',     'Thêm người dùng',        'SO_G_USER',       '2',    12),
  ('SO_C_USER_UPDATE',     'Component', 'SO_C_USER_UPDATE',     'Sửa người dùng',         'SO_G_USER',       '3',    13),
  ('SO_C_USER_DELETE',     'Component', 'SO_C_USER_DELETE',     'Xóa người dùng',         'SO_G_USER',       '4',    14),
  ('SO_G_ENTERPRISE_TYPE', 'Group',     'SO_G_ENTERPRISE_TYPE', 'Loại hình doanh nghiệp', NULL,              'IV',   15),
  ('SO_C_ENTERPRISE_TYPE_VIEW',  'Component','SO_C_ENTERPRISE_TYPE_VIEW',  'Xem loại hình doanh nghiệp',  'SO_G_ENTERPRISE_TYPE', '1', 16),
  ('SO_C_ENTERPRISE_TYPE_CREATE','Component','SO_C_ENTERPRISE_TYPE_CREATE','Thêm loại hình doanh nghiệp', 'SO_G_ENTERPRISE_TYPE', '2', 17),
  ('SO_C_ENTERPRISE_TYPE_UPDATE','Component','SO_C_ENTERPRISE_TYPE_UPDATE','Sửa loại hình doanh nghiệp',  'SO_G_ENTERPRISE_TYPE', '3', 18),
  ('SO_C_ENTERPRISE_TYPE_DELETE','Component','SO_C_ENTERPRISE_TYPE_DELETE','Xóa loại hình doanh nghiệp',  'SO_G_ENTERPRISE_TYPE', '4', 19),
  ('SO_G_BUSINESS_SECTOR', 'Group',     'SO_G_BUSINESS_SECTOR', 'Ngành nghề kinh doanh',  NULL,              'V',    20),
  ('SO_C_BUSINESS_SECTOR_VIEW',  'Component','SO_C_BUSINESS_SECTOR_VIEW',  'Xem ngành nghề kinh doanh',  'SO_G_BUSINESS_SECTOR', '1', 21),
  ('SO_C_BUSINESS_SECTOR_CREATE','Component','SO_C_BUSINESS_SECTOR_CREATE','Thêm ngành nghề kinh doanh', 'SO_G_BUSINESS_SECTOR', '2', 22),
  ('SO_C_BUSINESS_SECTOR_UPDATE','Component','SO_C_BUSINESS_SECTOR_UPDATE','Sửa ngành nghề kinh doanh',  'SO_G_BUSINESS_SECTOR', '3', 23),
  ('SO_C_BUSINESS_SECTOR_DELETE','Component','SO_C_BUSINESS_SECTOR_DELETE','Xóa ngành nghề kinh doanh',  'SO_G_BUSINESS_SECTOR', '4', 24),
  ('SO_G_ENTERPRISE',      'Group',     'SO_G_ENTERPRISE',      'Quản lý doanh nghiệp',   NULL,              'VI',   25),
  ('SO_C_ENTERPRISE_VIEW',   'Component','SO_C_ENTERPRISE_VIEW',   'Xem doanh nghiệp',     'SO_G_ENTERPRISE', '1', 26),
  ('SO_C_ENTERPRISE_CREATE', 'Component','SO_C_ENTERPRISE_CREATE', 'Thêm doanh nghiệp',    'SO_G_ENTERPRISE', '2', 27),
  ('SO_C_ENTERPRISE_UPDATE', 'Component','SO_C_ENTERPRISE_UPDATE', 'Sửa doanh nghiệp',     'SO_G_ENTERPRISE', '3', 28),
  ('SO_C_ENTERPRISE_DELETE', 'Component','SO_C_ENTERPRISE_DELETE', 'Xóa doanh nghiệp',     'SO_G_ENTERPRISE', '4', 29),
  ('SO_G_REPORT_CONFIG',   'Group',     'SO_G_REPORT_CONFIG',   'Cấu hình báo cáo',       NULL,              'VII',  30),
  ('SO_C_REPORT_CONFIG_VIEW',  'Component','SO_C_REPORT_CONFIG_VIEW',  'Xem cấu hình báo cáo',  'SO_G_REPORT_CONFIG', '1', 31),
  ('SO_C_REPORT_CONFIG_CREATE','Component','SO_C_REPORT_CONFIG_CREATE','Thêm cấu hình báo cáo', 'SO_G_REPORT_CONFIG', '2', 32),
  ('SO_C_REPORT_CONFIG_UPDATE','Component','SO_C_REPORT_CONFIG_UPDATE','Sửa cấu hình báo cáo',  'SO_G_REPORT_CONFIG', '3', 33),
  ('SO_C_REPORT_CONFIG_DELETE','Component','SO_C_REPORT_CONFIG_DELETE','Xóa cấu hình báo cáo',  'SO_G_REPORT_CONFIG', '4', 34),
  ('SO_G_CATEGORY',        'Group',     'SO_G_CATEGORY',        'Khai báo danh mục',      NULL,              'VIII', 35),
  ('SO_C_CATEGORY_VIEW',   'Component','SO_C_CATEGORY_VIEW',   'Xem danh mục',           'SO_G_CATEGORY',   '1', 36),
  ('SO_C_CATEGORY_CREATE', 'Component','SO_C_CATEGORY_CREATE', 'Thêm danh mục',          'SO_G_CATEGORY',   '2', 37),
  ('SO_C_CATEGORY_UPDATE', 'Component','SO_C_CATEGORY_UPDATE', 'Sửa danh mục',           'SO_G_CATEGORY',   '3', 38),
  ('SO_C_CATEGORY_DELETE', 'Component','SO_C_CATEGORY_DELETE', 'Xóa danh mục',           'SO_G_CATEGORY',   '4', 39),
  ('SO_G_ACCIDENT_REPORT', 'Group',     'SO_G_ACCIDENT_REPORT', 'Báo cáo TNLĐ',           NULL,              'IX',   40),
  ('SO_C_ACCIDENT_REPORT_VIEW',  'Component','SO_C_ACCIDENT_REPORT_VIEW',  'Xem báo cáo TNLĐ',  'SO_G_ACCIDENT_REPORT', '1', 41),
  ('SO_C_ACCIDENT_REPORT_CREATE','Component','SO_C_ACCIDENT_REPORT_CREATE','Thêm báo cáo TNLĐ', 'SO_G_ACCIDENT_REPORT', '2', 42),
  ('SO_C_ACCIDENT_REPORT_UPDATE','Component','SO_C_ACCIDENT_REPORT_UPDATE','Sửa báo cáo TNLĐ',  'SO_G_ACCIDENT_REPORT', '3', 43),
  ('SO_C_ACCIDENT_REPORT_DELETE','Component','SO_C_ACCIDENT_REPORT_DELETE','Xóa báo cáo TNLĐ',  'SO_G_ACCIDENT_REPORT', '4', 44),
  ('SO_G_SIGN_REPORT',      'Group',     'SO_G_SIGN_REPORT',      'Ký báo cáo',             NULL,              'X',    45),
  ('SO_C_SIGN_REPORT_VIEW',  'Component','SO_C_SIGN_REPORT_VIEW',  'Xem ký báo cáo',    'SO_G_SIGN_REPORT', '1', 46),
  ('SO_C_SIGN_REPORT_CREATE','Component','SO_C_SIGN_REPORT_CREATE','Thêm ký báo cáo',   'SO_G_SIGN_REPORT', '2', 47),
  ('SO_C_SIGN_REPORT_UPDATE','Component','SO_C_SIGN_REPORT_UPDATE','Sửa ký báo cáo',    'SO_G_SIGN_REPORT', '3', 48),
  ('SO_C_SIGN_REPORT_DELETE','Component','SO_C_SIGN_REPORT_DELETE','Xóa ký báo cáo',    'SO_G_SIGN_REPORT', '4', 49)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- roles (tùy chọn) — dùng mã quyền THẬT ở trên
-- ---------------------------------------------------------------------------
INSERT INTO roles (ma, ten, perms) VALUES
  ('Role1', 'Manager',  '["SO_C_ENTERPRISE_VIEW","SO_C_ENTERPRISE_CREATE","SO_C_ENTERPRISE_UPDATE","SO_C_ENTERPRISE_DELETE","SO_C_ACCIDENT_REPORT_VIEW","SO_C_ACCIDENT_REPORT_UPDATE"]'::jsonb),
  ('Role2', 'Employee', '["SO_C_PERMISSION_VIEW","SO_C_ROLE_VIEW","SO_C_USER_VIEW","SO_C_ENTERPRISE_TYPE_VIEW","SO_C_BUSINESS_SECTOR_VIEW","SO_C_ENTERPRISE_VIEW","SO_C_REPORT_CONFIG_VIEW","SO_C_CATEGORY_VIEW","SO_C_ACCIDENT_REPORT_VIEW"]'::jsonb),
  ('Role3', 'CEO',      '["SO_C_PERMISSION_VIEW","SO_C_PERMISSION_CREATE","SO_C_PERMISSION_UPDATE","SO_C_PERMISSION_DELETE","SO_C_ROLE_VIEW","SO_C_ROLE_CREATE","SO_C_ROLE_UPDATE","SO_C_ROLE_DELETE","SO_C_USER_VIEW","SO_C_USER_CREATE","SO_C_USER_UPDATE","SO_C_USER_DELETE","SO_C_ENTERPRISE_VIEW","SO_C_ENTERPRISE_CREATE","SO_C_ENTERPRISE_UPDATE","SO_C_ENTERPRISE_DELETE","SO_C_ACCIDENT_REPORT_VIEW","SO_C_ACCIDENT_REPORT_CREATE","SO_C_ACCIDENT_REPORT_UPDATE","SO_C_ACCIDENT_REPORT_DELETE"]'::jsonb)
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
