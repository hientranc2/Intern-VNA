-- ============================================================================
-- Migration 001 — Bảng cho các resource API mới
-- Chạy trên Supabase SQL Editor (Postgres). An toàn chạy lại nhiều lần
-- (IF NOT EXISTS / ON CONFLICT DO NOTHING).
--
-- Khớp tên cột với TypeORM entity tương ứng trong BE/src/entities/.
-- App chạy synchronize:false nên bắt buộc tạo bảng tại đây trước khi gọi API.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. roles  (RoleController /roles)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  ma          VARCHAR NOT NULL UNIQUE,
  ten         VARCHAR NOT NULL,
  perms       JSONB   NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. permissions  (PermissionController /permissions — chỉ đọc, cần seed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
  id          VARCHAR PRIMARY KEY,
  type        VARCHAR NOT NULL,
  code        VARCHAR NOT NULL UNIQUE,
  name        VARCHAR NOT NULL,
  parent_id   VARCHAR,
  stt         VARCHAR NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 3. report_configs  (ReportConfigController /report-configs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_configs (
  id          SERIAL PRIMARY KEY,
  nam         VARCHAR NOT NULL,
  ten         VARCHAR NOT NULL,
  ky          VARCHAR NOT NULL,
  bat_dau     VARCHAR NOT NULL,
  ket_thuc    VARCHAR NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. injury_factors  (CategoryController /categories/injury-factors)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS injury_factors (
  id          SERIAL PRIMARY KEY,
  ma          VARCHAR NOT NULL UNIQUE,
  ten         VARCHAR NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. injury_types  (CategoryController /categories/injury-types — cây phân cấp)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS injury_types (
  id          SERIAL PRIMARY KEY,
  ma          VARCHAR NOT NULL UNIQUE,
  ten         VARCHAR NOT NULL,
  cap         INTEGER NOT NULL,
  cha         VARCHAR NOT NULL DEFAULT '',
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. occupations  (CategoryController /categories/occupations — cây phân cấp)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS occupations (
  id          SERIAL PRIMARY KEY,
  ma          VARCHAR NOT NULL UNIQUE,
  ten         VARCHAR NOT NULL,
  cap         INTEGER NOT NULL,
  cha         VARCHAR NOT NULL DEFAULT '',
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 7. accident_reports  (AccidentReportController /accident-reports
--                        + EnterpriseReportController /enterprise-reports)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accident_reports (
  id                        SERIAL PRIMARY KEY,
  enterprise_id             UUID,
  config_id                 INTEGER NOT NULL,
  ten                       VARCHAR NOT NULL,
  mst                       VARCHAR NOT NULL,
  ky                        VARCHAR NOT NULL,
  status                    VARCHAR NOT NULL DEFAULT 'Đang báo cáo',
  rows                      JSONB   NOT NULL DEFAULT '{}'::jsonb,
  chi_tiet_rows             JSONB   NOT NULL DEFAULT '[]'::jsonb,
  province                  VARCHAR,
  ward                      VARCHAR,
  loai_hinh                 VARCHAR,
  so_lao_dong               INTEGER NOT NULL DEFAULT 0,
  so_ld_co_bao_hiem         INTEGER NOT NULL DEFAULT 0,
  so_vu                     INTEGER NOT NULL DEFAULT 0,
  so_vu_co_nguoi_chet       INTEGER NOT NULL DEFAULT 0,
  so_vu_co_2_nguoi_bi_nan   INTEGER NOT NULL DEFAULT 0,
  so_nguoi_bi_nan           INTEGER NOT NULL DEFAULT 0,
  so_ld_nu                  INTEGER NOT NULL DEFAULT 0,
  so_nguoi_bi_chet          INTEGER NOT NULL DEFAULT 0,
  so_nguoi_bi_thuong_nang   INTEGER NOT NULL DEFAULT 0,
  so_ngay_nghi              INTEGER NOT NULL DEFAULT 0,
  tong_so_tien              INTEGER NOT NULL DEFAULT 0,
  chi_phi_y_te              INTEGER NOT NULL DEFAULT 0,
  chi_phi_tra_luong         INTEGER NOT NULL DEFAULT 0,
  boi_thuong_tro_cap        INTEGER NOT NULL DEFAULT 0,
  thiet_hai_tai_san         INTEGER NOT NULL DEFAULT 0,
  submitted_at              TIMESTAMP,
  created_at                TIMESTAMP NOT NULL DEFAULT now(),
  updated_at                TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accident_reports_enterprise ON accident_reports (enterprise_id);
CREATE INDEX IF NOT EXISTS idx_accident_reports_config ON accident_reports (config_id);
