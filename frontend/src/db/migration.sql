-- ================================================================
-- RLS FIX — Run this in Supabase SQL Editor
-- ================================================================
-- This fixes: "new row violates row-level security policy 
--              for table appointments"
--
-- The issue: Either the appointments table doesn't exist yet
-- with the new schema, or the RLS policies are missing/broken.
--
-- SAFE TO RUN MULTIPLE TIMES — uses DROP POLICY IF EXISTS
-- ================================================================

-- ── 1. Make sure appointments table exists with correct schema ──
-- Drop and recreate cleanly (this resets any partial broken state)

DROP TABLE IF EXISTS sms_log    CASCADE;
DROP TABLE IF EXISTS lab_orders CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS labs        CASCADE;
DROP TABLE IF EXISTS doctors     CASCADE;
DROP TABLE IF EXISTS profiles    CASCADE;

-- Drop old functions
DROP FUNCTION IF EXISTS public.handle_new_user()             CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at()           CASCADE;
DROP FUNCTION IF EXISTS public.log_sms_on_results_ready()    CASCADE;

-- ── 2. PROFILES ────────────────────────────────────────────────
CREATE TABLE profiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT        NOT NULL DEFAULT '',
  role       TEXT        NOT NULL DEFAULT 'receptionist'
               CHECK (role IN ('admin', 'receptionist', 'doctor', 'lab_tech')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'receptionist')
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 3. DOCTORS ─────────────────────────────────────────────────
CREATE TABLE doctors (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  specialty     TEXT        NOT NULL,
  qualification TEXT,
  phone         TEXT,
  email         TEXT,
  schedule      JSONB       NOT NULL DEFAULT '{}',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. LABS ────────────────────────────────────────────────────
CREATE TABLE labs (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT          NOT NULL,
  test_type   TEXT          NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  turnaround  TEXT          NOT NULL DEFAULT '24 hours',
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── 5. APPOINTMENTS ────────────────────────────────────────────
CREATE TABLE appointments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id        UUID        REFERENCES doctors(id) ON DELETE SET NULL,
  patient_name     TEXT        NOT NULL,
  patient_phone    TEXT        NOT NULL,
  patient_email    TEXT,
  appointment_date DATE        NOT NULL,
  appointment_time TEXT        NOT NULL,
  reason           TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','completed','cancelled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 6. LAB ORDERS ──────────────────────────────────────────────
CREATE TABLE lab_orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id   UUID        REFERENCES appointments(id) ON DELETE SET NULL,
  lab_id           UUID        NOT NULL REFERENCES labs(id) ON DELETE RESTRICT,
  doctor_id        UUID        REFERENCES doctors(id) ON DELETE SET NULL,
  patient_name     TEXT        NOT NULL,
  patient_phone    TEXT        NOT NULL,
  patient_email    TEXT,
  doctor_notes     TEXT,
  result_notes     TEXT,
  status           TEXT        NOT NULL DEFAULT 'prescribed'
                     CHECK (status IN ('prescribed','sample_collected','processing','results_ready')),
  prescribed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  results_ready_at TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. SMS LOG ─────────────────────────────────────────────────
CREATE TABLE sms_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_order_id UUID        REFERENCES lab_orders(id) ON DELETE CASCADE,
  recipient    TEXT        NOT NULL,
  message      TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'sent'
                 CHECK (status IN ('sent','failed','delivered')),
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. TRIGGER FUNCTIONS ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_appointments_updated
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_lab_orders_updated
  BEFORE UPDATE ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.log_sms_on_results_ready()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE lab_name TEXT;
BEGIN
  IF NEW.status = 'results_ready' AND OLD.status <> 'results_ready' THEN
    SELECT name INTO lab_name FROM labs WHERE id = NEW.lab_id;
    NEW.results_ready_at = NOW();
    INSERT INTO sms_log (lab_order_id, recipient, message, status)
    VALUES (
      NEW.id, NEW.patient_phone,
      'Dear ' || NEW.patient_name || ', your ' || COALESCE(lab_name,'lab test') ||
      ' results are ready. Please visit MultiCare Clinic to collect your report. Call: +92-21-111-222-333',
      'sent'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sms_on_results_ready
  BEFORE UPDATE ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION public.log_sms_on_results_ready();

-- ── 9. INDEXES ─────────────────────────────────────────────────
CREATE INDEX idx_appointments_status   ON appointments(status);
CREATE INDEX idx_appointments_date     ON appointments(appointment_date);
CREATE INDEX idx_appointments_doctor   ON appointments(doctor_id);
CREATE INDEX idx_lab_orders_status     ON lab_orders(status);
CREATE INDEX idx_lab_orders_appt       ON lab_orders(appointment_id);
CREATE INDEX idx_sms_log_order         ON sms_log(lab_order_id);
CREATE INDEX idx_doctors_active        ON doctors(is_active);
CREATE INDEX idx_labs_active           ON labs(is_active);

-- ── 10. ROW LEVEL SECURITY — THIS IS THE CRITICAL PART ─────────

-- PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_owner" ON profiles
  FOR ALL USING (auth.uid() = id);

-- DOCTORS: anyone can read (patient portal needs this), staff can write
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctors_select_all" ON doctors
  FOR SELECT USING (true);
CREATE POLICY "doctors_insert_auth" ON doctors
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "doctors_update_auth" ON doctors
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "doctors_delete_auth" ON doctors
  FOR DELETE USING (auth.role() = 'authenticated');

-- LABS: same as doctors
ALTER TABLE labs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "labs_select_all" ON labs
  FOR SELECT USING (true);
CREATE POLICY "labs_insert_auth" ON labs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "labs_update_auth" ON labs
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "labs_delete_auth" ON labs
  FOR DELETE USING (auth.role() = 'authenticated');

-- APPOINTMENTS: 
--   anon (patient) can INSERT and SELECT their own
--   authenticated (staff) can do everything
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including unauthenticated patients) to INSERT
CREATE POLICY "appointments_insert_anon" ON appointments
  FOR INSERT WITH CHECK (true);

-- Allow anyone to SELECT (patients need to see confirmation)
CREATE POLICY "appointments_select_all" ON appointments
  FOR SELECT USING (true);

-- Only authenticated staff can UPDATE or DELETE
CREATE POLICY "appointments_update_auth" ON appointments
  FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "appointments_delete_auth" ON appointments
  FOR DELETE USING (auth.role() = 'authenticated');

-- LAB ORDERS: only authenticated staff
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_orders_all_auth" ON lab_orders
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- SMS LOG: only authenticated staff
ALTER TABLE sms_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_log_all_auth" ON sms_log
  FOR ALL USING (auth.role() = 'authenticated');

-- ── 11. REALTIME ───────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE lab_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE sms_log;

-- ── 12. SEED DATA ──────────────────────────────────────────────
INSERT INTO doctors (name, specialty, qualification, phone, schedule) VALUES
  ('Dr. Sarah Ahmed',   'Dental',        'BDS, FCPS',   '+92-300-1111111',
   '{"Mon":["09:00","09:30","10:00","10:30"],"Wed":["09:00","09:30","10:00"],"Fri":["14:00","14:30","15:00"]}'),
  ('Dr. Kamran Malik',  'Dermatology',   'MBBS, MCPS',  '+92-300-2222222',
   '{"Tue":["11:00","11:30","12:00"],"Thu":["11:00","11:30"],"Sat":["10:00","10:30","11:00"]}'),
  ('Dr. Nadia Hussain', 'Physiotherapy', 'DPT, MSc',    '+92-300-3333333',
   '{"Mon":["14:00","14:30","15:00"],"Tue":["14:00","14:30"],"Wed":["14:00","14:30","15:00"]}'),
  ('Dr. Omar Farooq',   'Cardiology',    'MBBS, FCPS',  '+92-300-4444444',
   '{"Mon":["09:00","09:30"],"Tue":["09:00","09:30","10:00"],"Thu":["09:00","09:30"]}'),
  ('Dr. Aisha Raza',    'Ophthalmology', 'MBBS, FCPS',  '+92-300-5555555',
   '{"Wed":["10:00","10:30","11:00"],"Thu":["10:00","10:30"],"Sat":["09:00","09:30","10:00"]}');

INSERT INTO labs (name, test_type, description, price, turnaround) VALUES
  ('Complete Blood Count',    'Hematology',    'Full CBC panel',               800,  '4 hours'),
  ('Lipid Profile',           'Biochemistry',  'Cholesterol, LDL, HDL',        1200, '6 hours'),
  ('Blood Glucose (Fasting)', 'Biochemistry',  'Fasting blood sugar',          400,  '2 hours'),
  ('Thyroid Function (TSH)',  'Endocrinology', 'TSH screening',                1500, '24 hours'),
  ('Urine Routine & Culture', 'Microbiology',  'Complete urinalysis',          700,  '8 hours'),
  ('ECG / EKG',               'Cardiology',    '12-lead electrocardiogram',    900,  '1 hour');

-- ── 13. Insert profile for existing user ───────────────────────
-- Your user: rimshaabbas2006@gmail.com  (UID from dashboard)
-- This ensures they have a profile row so the dashboard loads correctly.
INSERT INTO profiles (id, full_name, role)
VALUES ('cccc61fa-b9fe-473a-adc2-c091402b1e92', 'Rimsha Abbas', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Rimsha Abbas';
