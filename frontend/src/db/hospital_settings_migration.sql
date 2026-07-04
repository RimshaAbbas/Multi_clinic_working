-- ============================================================
-- Migration: hospital_settings
-- Run this in Supabase SQL Editor:
--   Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- 1. Create the table (single-row settings store per deployment)
CREATE TABLE IF NOT EXISTS hospital_settings (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Branding
  hospital_name   TEXT         NOT NULL DEFAULT 'MultiCare Clinics',
  tagline         TEXT         NOT NULL DEFAULT 'Your Health, Our Priority',
  primary_color   VARCHAR(7)   NOT NULL DEFAULT '#1E3A8A',  -- hex e.g. #1E3A8A
  accent_color    VARCHAR(7)   NOT NULL DEFAULT '#3B82F6',  -- hex e.g. #3B82F6
  logo_url        TEXT,                                     -- public storage URL

  -- Contact
  support_phone   TEXT         NOT NULL DEFAULT '+92-21-111-222-333',
  support_email   TEXT         NOT NULL DEFAULT 'info@multicare.pk',

  -- Metadata
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by      UUID         REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Seed a single default row so the app always finds a row
INSERT INTO hospital_settings (
  hospital_name, tagline, primary_color, accent_color, support_phone, support_email
)
SELECT
  'MultiCare Clinics',
  'Your Health, Our Priority',
  '#1E3A8A',
  '#3B82F6',
  '+92-21-111-222-333',
  'info@multicare.pk'
WHERE NOT EXISTS (SELECT 1 FROM hospital_settings);

-- 3. Auto-update updated_at on every save
CREATE OR REPLACE FUNCTION set_hospital_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hospital_settings_updated ON hospital_settings;
CREATE TRIGGER trg_hospital_settings_updated
  BEFORE UPDATE ON hospital_settings
  FOR EACH ROW EXECUTE FUNCTION set_hospital_settings_updated_at();

-- 4. RLS: anyone authenticated can read; only admins can update
ALTER TABLE hospital_settings ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read settings (needed by frontend context)
DROP POLICY IF EXISTS "settings_read" ON hospital_settings;
CREATE POLICY "settings_read"
  ON hospital_settings FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to update (tighten to role = admin if you have roles)
DROP POLICY IF EXISTS "settings_update" ON hospital_settings;
CREATE POLICY "settings_update"
  ON hospital_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow anon read so the public PatientPortal can load branding
DROP POLICY IF EXISTS "settings_read_anon" ON hospital_settings;
CREATE POLICY "settings_read_anon"
  ON hospital_settings FOR SELECT
  TO anon
  USING (true);
