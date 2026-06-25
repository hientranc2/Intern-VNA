-- 013: Thêm cột timeline cho bảng accident_reports
-- Lưu thời gian + người thực hiện khi duyệt/từ chối báo cáo TNLĐ.
ALTER TABLE accident_reports
  ADD COLUMN IF NOT EXISTS accepted_at timestamp,
  ADD COLUMN IF NOT EXISTS accepted_by text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamp,
  ADD COLUMN IF NOT EXISTS rejected_by text;
