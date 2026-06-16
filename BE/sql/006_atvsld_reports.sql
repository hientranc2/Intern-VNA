-- ============================================================================
-- Migration 006 — Bảng atvsld_reports.
-- Báo cáo công tác ATVSLĐ định kỳ (Phụ lục II – TT 07/2016/TT-BLĐTBXH).
-- Phục vụ AtvsldReportController /atvsld-reports (Role Sở duyệt + Role DN khai báo).
-- An toàn chạy lại (IF NOT EXISTS).
-- ============================================================================
CREATE TABLE IF NOT EXISTS atvsld_reports (
  id                SERIAL PRIMARY KEY,
  enterprise_id     UUID,
  ten               VARCHAR NOT NULL,
  mst               VARCHAR NOT NULL,
  nam               INTEGER NOT NULL,
  ky                VARCHAR NOT NULL,
  ngay_bat_dau      VARCHAR NOT NULL DEFAULT '',
  ngay_ket_thuc     VARCHAR NOT NULL DEFAULT '',
  ngay_nop          VARCHAR NOT NULL DEFAULT '',
  nguoi_chinh_sua   VARCHAR NOT NULL DEFAULT '',
  province          VARCHAR,
  ward              VARCHAR,
  status            VARCHAR NOT NULL DEFAULT 'Nhập liệu',
  ly_do_tu_choi     VARCHAR,
  declaration       JSONB   NOT NULL DEFAULT '{}'::jsonb,
  submitted_at      TIMESTAMP,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atvsld_reports_enterprise ON atvsld_reports (enterprise_id);
CREATE INDEX IF NOT EXISTS idx_atvsld_reports_nam ON atvsld_reports (nam);
