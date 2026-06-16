-- ============================================================================
-- Migration 005 — Thêm cột phan_loai_rows cho accident_reports.
-- Lưu phân loại TNLĐ phần II (theo ngành nghề / nguyên nhân / yếu tố gây chấn thương):
-- Record<string, number[13]> với key = mã hạng mục "1".."24".
-- An toàn chạy lại (IF NOT EXISTS).
-- ============================================================================

ALTER TABLE accident_reports
  ADD COLUMN IF NOT EXISTS phan_loai_rows jsonb DEFAULT '{}'::jsonb;
