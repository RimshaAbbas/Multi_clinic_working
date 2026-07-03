-- ================================================================
-- DOCTORS RLS FIX — Run this in Supabase SQL Editor
-- ================================================================
-- Fixes: Doctor data not persisting after page reload.
-- Root cause: auth.role() = 'authenticated' is unreliable in
-- Supabase RLS policies. The correct check is auth.uid() IS NOT NULL.
-- ================================================================

-- Drop old doctor policies
DROP POLICY IF EXISTS "doctors_select_all"   ON doctors;
DROP POLICY IF EXISTS "doctors_insert_auth"  ON doctors;
DROP POLICY IF EXISTS "doctors_update_auth"  ON doctors;
DROP POLICY IF EXISTS "doctors_delete_auth"  ON doctors;
DROP POLICY IF EXISTS "doctors_public_read"  ON doctors;
DROP POLICY IF EXISTS "doctors_staff_write"  ON doctors;

-- Recreate with correct auth check
-- Anyone can read (patient portal needs to list doctors)
CREATE POLICY "doctors_read_all" ON doctors
  FOR SELECT USING (true);

-- Only logged-in staff can insert / update / delete
CREATE POLICY "doctors_insert_auth" ON doctors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "doctors_update_auth" ON doctors
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "doctors_delete_auth" ON doctors
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── Same fix for labs ─────────────────────────────────────────────
DROP POLICY IF EXISTS "labs_select_all"    ON labs;
DROP POLICY IF EXISTS "labs_insert_auth"   ON labs;
DROP POLICY IF EXISTS "labs_update_auth"   ON labs;
DROP POLICY IF EXISTS "labs_delete_auth"   ON labs;
DROP POLICY IF EXISTS "labs_public_read"   ON labs;
DROP POLICY IF EXISTS "labs_staff_write"   ON labs;

CREATE POLICY "labs_read_all"     ON labs FOR SELECT USING (true);
CREATE POLICY "labs_insert_auth"  ON labs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "labs_update_auth"  ON labs FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "labs_delete_auth"  ON labs FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── Same fix for lab_orders ───────────────────────────────────────
DROP POLICY IF EXISTS "lab_orders_all_auth"  ON lab_orders;
DROP POLICY IF EXISTS "lab_orders_staff_all" ON lab_orders;

CREATE POLICY "lab_orders_auth" ON lab_orders
  FOR ALL
  USING      (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── Same fix for sms_log ─────────────────────────────────────────
DROP POLICY IF EXISTS "sms_log_all_auth"   ON sms_log;
DROP POLICY IF EXISTS "sms_log_staff_read" ON sms_log;

CREATE POLICY "sms_log_auth" ON sms_log
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ── Appointments: keep anon INSERT, fix update/delete ────────────
DROP POLICY IF EXISTS "appointments_update_auth" ON appointments;
DROP POLICY IF EXISTS "appointments_delete_auth" ON appointments;

CREATE POLICY "appointments_update_auth" ON appointments
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "appointments_delete_auth" ON appointments
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ── Verify policies are in place ─────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
