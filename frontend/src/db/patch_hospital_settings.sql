-- ============================================================
-- PATCH: Add missing columns to hospital_settings
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Safe to run multiple times — uses IF NOT EXISTS guards.
-- ============================================================

-- Add accent_color if missing
ALTER TABLE hospital_settings
  ADD COLUMN IF NOT EXISTS accent_color   VARCHAR(7) NOT NULL DEFAULT '#3B82F6';

-- Add tagline if missing
ALTER TABLE hospital_settings
  ADD COLUMN IF NOT EXISTS tagline        TEXT NOT NULL DEFAULT 'Your Health, Our Priority';

-- Add logo_url if missing
ALTER TABLE hospital_settings
  ADD COLUMN IF NOT EXISTS logo_url       TEXT;

-- Add support_phone if missing
ALTER TABLE hospital_settings
  ADD COLUMN IF NOT EXISTS support_phone  TEXT NOT NULL DEFAULT '+92-21-111-222-333';

-- Add support_email if missing
ALTER TABLE hospital_settings
  ADD COLUMN IF NOT EXISTS support_email  TEXT NOT NULL DEFAULT 'info@multicare.pk';

-- Add updated_by if missing
ALTER TABLE hospital_settings
  ADD COLUMN IF NOT EXISTS updated_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Refresh schema cache so PostgREST picks up the new columns immediately
NOTIFY pgrst, 'reload schema';
