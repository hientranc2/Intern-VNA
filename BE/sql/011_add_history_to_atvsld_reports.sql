-- ============================================================================
-- Migration 011 — Bảng atvsld_reports thêm cột history.
-- ============================================================================
ALTER TABLE atvsld_reports ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb;
