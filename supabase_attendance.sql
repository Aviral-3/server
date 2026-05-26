-- ─── Database Migration: attendances ──────────────────────────────────────
-- Run this SQL in your Supabase SQL Editor (https://supabase.com dashboard)
-- to create the attendance check-in table and indexes.

CREATE TABLE IF NOT EXISTS attendances (
  id            BIGSERIAL PRIMARY KEY,
  company_id    TEXT        NOT NULL,
  user_id       INTEGER     NOT NULL,
  user_name     TEXT        NOT NULL DEFAULT '',
  doctor_id     TEXT        NOT NULL,
  doctor_name   TEXT        NOT NULL,
  visit_date    DATE        NOT NULL,   -- stored as YYYY-MM-DD
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitude      NUMERIC     NOT NULL,
  longitude     NUMERIC     NOT NULL,
  photo         TEXT        NOT NULL,   -- Base64 string containing the photo
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_attendances_user_company
  ON attendances (company_id, user_id);

-- Index for admin-wide view by company + date
CREATE INDEX IF NOT EXISTS idx_attendances_company_date
  ON attendances (company_id, visit_date);
