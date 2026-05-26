-- ─── Visit Schedules Table ─────────────────────────────────────────────────
-- Admin assigns doctor visits to employees for specific dates.
-- Employees see their own schedules as read-only in the Visits page.

CREATE TABLE IF NOT EXISTS visit_schedules (
  id            BIGSERIAL PRIMARY KEY,
  company_id    TEXT        NOT NULL,
  user_id       INTEGER     NOT NULL,   -- the employee being scheduled (users_client.id)
  doctor_id     TEXT        NOT NULL,   -- doctors.id
  doctor_name   TEXT        NOT NULL,
  clinic        TEXT        NOT NULL DEFAULT '',
  specialty     TEXT        NOT NULL DEFAULT '',
  visit_date    DATE        NOT NULL,   -- stored as YYYY-MM-DD
  notes         TEXT        NOT NULL DEFAULT '',
  source        TEXT        NOT NULL DEFAULT 'admin', -- 'admin' | 'employee'
  created_by    INTEGER     NOT NULL DEFAULT 0,        -- user_id who created the entry
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Allow both admin-assigned AND employee self-scheduled for same doctor+date
  UNIQUE (company_id, user_id, doctor_id, visit_date, source)
);

-- Index for fast per-user per-date lookups (employee view)
CREATE INDEX IF NOT EXISTS idx_visit_schedules_user_date
  ON visit_schedules (company_id, user_id, visit_date);

-- Index for admin-wide view by company + date
CREATE INDEX IF NOT EXISTS idx_visit_schedules_company_date
  ON visit_schedules (company_id, visit_date);

-- Optional: enable RLS if needed
-- ALTER TABLE visit_schedules ENABLE ROW LEVEL SECURITY;
