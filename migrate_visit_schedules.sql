-- ─── Database Migration: visit_schedules ──────────────────────────────────────
-- Run this SQL in your Supabase SQL Editor (https://supabase.com dashboard)
-- to add the missing columns and update the unique constraint.

-- 1. Add the missing source column (defaults to 'admin')
ALTER TABLE visit_schedules ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'admin';

-- 2. Add the missing created_by column (defaults to 0)
ALTER TABLE visit_schedules ADD COLUMN IF NOT EXISTS created_by INTEGER NOT NULL DEFAULT 0;

-- 3. Drop the old unique constraint if it exists (which did not include the 'source' column)
ALTER TABLE visit_schedules DROP CONSTRAINT IF EXISTS visit_schedules_company_id_user_id_doctor_id_visit_date_key;

-- 4. Add the new unique constraint including the 'source' column
-- This allows both admin-assigned and employee self-scheduled visits for the same doctor/date
ALTER TABLE visit_schedules ADD CONSTRAINT visit_schedules_company_id_user_id_doctor_id_visit_date_sou_key UNIQUE (company_id, user_id, doctor_id, visit_date, source);
