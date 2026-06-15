-- ============================================================================
-- Migration 000 — Bảng gốc (5 bảng có từ commit f864704)
-- Suy ra từ các entity trong BE/src/entities/. Chạy TRƯỚC 001/002.
-- Dùng khi dựng database mới hoàn toàn (DB trống).
-- ============================================================================

-- pgcrypto cung cấp gen_random_uuid() (Supabase đã bật sẵn ở hầu hết project).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- accounts  (tài khoản doanh nghiệp) — tạo trước vì businesses tham chiếu tới
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    VARCHAR NOT NULL UNIQUE,
  password    VARCHAR NOT NULL,
  role        VARCHAR NOT NULL DEFAULT 'DoanhNghiep',
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- users  (tài khoản Role Sở)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username        VARCHAR NOT NULL UNIQUE,
  password        VARCHAR NOT NULL,
  email           VARCHAR NOT NULL UNIQUE,
  full_name       VARCHAR NOT NULL,
  dob             DATE,
  gender          VARCHAR,
  job_title       VARCHAR,
  role            VARCHAR NOT NULL DEFAULT 'USER',
  avatar_url      VARCHAR,
  province        VARCHAR,
  ward            VARCHAR,
  address         VARCHAR,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  otp_code        VARCHAR,
  otp_expires_at  TIMESTAMP,
  created_at      TIMESTAMP NOT NULL DEFAULT now(),
  updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- businesses  (thông tin doanh nghiệp)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS businesses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name         VARCHAR NOT NULL,
  tax_code              VARCHAR NOT NULL UNIQUE,
  business_type         VARCHAR NOT NULL,
  main_industry         VARCHAR NOT NULL,
  license_date          TIMESTAMP,
  registered_province   VARCHAR NOT NULL,
  registered_ward       VARCHAR NOT NULL,
  address               VARCHAR,
  foreign_name          VARCHAR,
  email                 VARCHAR NOT NULL UNIQUE,
  office_phone          VARCHAR,
  operating_province    VARCHAR,
  operating_ward        VARCHAR,
  operating_address     VARCHAR,
  representative        VARCHAR,
  representative_phone  VARCHAR,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  account_id            UUID,
  license_file          VARCHAR,
  other_file            VARCHAR,
  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- enterprise_types  (loại hình doanh nghiệp)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS enterprise_types (
  id          SERIAL PRIMARY KEY,
  ma          VARCHAR NOT NULL UNIQUE,
  ten         VARCHAR NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- business_sectors  (ngành nghề kinh doanh, phân cấp 1–4)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_sectors (
  id          SERIAL PRIMARY KEY,
  ma          VARCHAR NOT NULL UNIQUE,
  ten         VARCHAR NOT NULL,
  cap         INTEGER NOT NULL,
  cha         VARCHAR NOT NULL DEFAULT '',
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
