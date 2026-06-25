-- 012: Thêm cột rejection_reason cho bảng accident_reports
-- Lưu lý do từ chối báo cáo TNLĐ. NULL = chưa bị từ chối.
ALTER TABLE accident_reports ADD COLUMN IF NOT EXISTS rejection_reason text;
