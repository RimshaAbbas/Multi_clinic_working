-- ============================================================
-- MultiCare Multi-Tenant Hospital Management System
-- PostgreSQL Schema — v2.0
--
-- Tenant isolation: every table that belongs to a hospital
-- carries a hospital_id foreign key.  Application-level JWT
-- middleware enforces that queries ALWAYS include WHERE
-- hospital_id = $tenantId so that Hospital A can never read
-- Hospital B's data.
-- ============================================================

-- Enable uuid extension (pgcrypto fallback provided in seed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. HOSPITALS  (the root tenant entity)
-- ────────────────────────────────────────────────────────────
CREATE TABLE hospitals (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  corporate_name      VARCHAR(200) NOT NULL,
  registration_number VARCHAR(100) NOT NULL UNIQUE,
  logo_url            TEXT,
  contact_email       VARCHAR(255) NOT NULL UNIQUE,
  -- stored as JSON {"primary":"#1E3A8A","accent":"#3B82F6"}
  theme_colors        JSONB        NOT NULL DEFAULT '{"primary":"#1E3A8A","accent":"#3B82F6"}',
  package_tier        VARCHAR(50)  NOT NULL DEFAULT 'starter'
                        CHECK (package_tier IN ('starter','professional','enterprise')),
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 2. HOSPITAL ADMIN USERS  (staff who log into the dashboard)
-- ────────────────────────────────────────────────────────────
CREATE TABLE hospital_users (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id   UUID        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  full_name     VARCHAR(200) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'receptionist'
                  CHECK (role IN ('super_admin','hospital_admin','receptionist','doctor')),
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 3. BRANCHES  (physical clinic locations per hospital)
-- ────────────────────────────────────────────────────────────
CREATE TABLE branches (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id UUID        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  branch_name VARCHAR(200) NOT NULL,
  city        VARCHAR(100) NOT NULL,
  address     TEXT        NOT NULL,
  phone       VARCHAR(30),
  email       VARCHAR(255),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 4. DOCTORS  (belong to a hospital, can serve multiple branches)
-- ────────────────────────────────────────────────────────────
CREATE TABLE doctors (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id           UUID        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name                  VARCHAR(200) NOT NULL,
  specialty             VARCHAR(100) NOT NULL,
  qualification         VARCHAR(255),
  experience_years      SMALLINT    DEFAULT 0,
  -- JSON array of branch UUIDs: ["uuid1","uuid2"]
  branch_ids            JSONB       NOT NULL DEFAULT '[]',
  -- availability schedule JSON:
  -- {"Mon":["09:00","09:30"],"Tue":["10:00","11:00"]}
  availability_schedule JSONB       NOT NULL DEFAULT '{}',
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 5. APPOINTMENTS  (the core booking record)
-- ────────────────────────────────────────────────────────────
CREATE TABLE appointments (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id      UUID        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  branch_id        UUID        NOT NULL REFERENCES branches(id)  ON DELETE RESTRICT,
  doctor_id        UUID        NOT NULL REFERENCES doctors(id)   ON DELETE RESTRICT,
  patient_name     VARCHAR(200) NOT NULL,
  patient_phone    VARCHAR(30)  NOT NULL,
  patient_email    VARCHAR(255),
  appointment_time TIMESTAMPTZ  NOT NULL,
  reason           TEXT,
  status           VARCHAR(30)  NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','rescheduled','cancelled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Prevent double-booking: same doctor, same time slot
  CONSTRAINT uq_doctor_slot UNIQUE (doctor_id, appointment_time)
);

-- ────────────────────────────────────────────────────────────
-- INDEXES  (performance for tenant-scoped queries)
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_branches_hospital     ON branches(hospital_id);
CREATE INDEX idx_doctors_hospital      ON doctors(hospital_id);
CREATE INDEX idx_appointments_hospital ON appointments(hospital_id);
CREATE INDEX idx_appointments_branch   ON appointments(branch_id);
CREATE INDEX idx_appointments_doctor   ON appointments(doctor_id);
CREATE INDEX idx_appointments_time     ON appointments(appointment_time);
CREATE INDEX idx_appointments_status   ON appointments(status);
CREATE INDEX idx_hospital_users_hosp   ON hospital_users(hospital_id);
CREATE INDEX idx_hospital_users_email  ON hospital_users(email);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: auto-update updated_at on every row mutation
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hospitals_updated
  BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_hospital_users_updated
  BEFORE UPDATE ON hospital_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_branches_updated
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_doctors_updated
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_appointments_updated
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
