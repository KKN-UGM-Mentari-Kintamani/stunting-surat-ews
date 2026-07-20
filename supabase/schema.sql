-- =============================================================================
-- Phase 1 Backend Schema — Integrated Village Portal (Stunting & Education)
-- Run in Supabase SQL Editor. Idempotent-ish: uses IF NOT EXISTS / DO blocks.
--
-- Conventions (per AGENTS.md + 00_MASTER_CROSS_PHASE_CONSISTENCY.md):
--   - Soft delete (deleted_at) for all citizen personal-data tables (§3)
--   - RLS enabled on every personal-data table (§3)
--   - PDP Law §4: explicit consent column on users (consent_given_at)
--   - Generic updated_at trigger (DRY, reused by Phase 2 tables later)
-- =============================================================================

-- ---------- Extensions ----------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email

-- ---------- ENUM ----------
-- All three roles defined since Phase 1 so Phase 2 avoids risky ALTER TYPE
-- (00_MASTER_CROSS_PHASE_CONSISTENCY.md §1 Important Note).
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('warga', 'kader_kesehatan', 'admin_desa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- Reusable updated_at trigger function (DRY across phases) ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TABLES
-- =============================================================================

-- ---------- users (1:1 with auth.users via id = auth.uid()) ----------
CREATE TABLE IF NOT EXISTS public.users (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_id         text UNIQUE,
  email             citext UNIQUE NOT NULL,
  nama_lengkap      text NOT NULL,
  role              app_role NOT NULL DEFAULT 'warga',
  -- PDP Law §4 explicit consent timestamp (NULL until user accepts consent screen)
  consent_given_at  timestamptz NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  -- Soft delete (Master Doc §3): right-to-erasure via anonymization flows,
  -- history preserved for village aggregate statistics.
  deleted_at        timestamptz NULL
);
CREATE INDEX IF NOT EXISTS idx_users_role_active        ON public.users(role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_google_id          ON public.users(google_id);

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- anak (child profile, owner = warga) ----------
CREATE TABLE IF NOT EXISTS public.anak (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nama_anak       text NOT NULL CHECK (char_length(trim(nama_anak)) > 0),
  -- 'L' = laki-laki, 'P' = perempuan (Indonesian UI, constrained for safety)
  jenis_kelamin   char(1) NOT NULL CHECK (jenis_kelamin IN ('L','P')),
  tanggal_lahir   date NOT NULL CHECK (tanggal_lahir <= current_date),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL
);
CREATE INDEX IF NOT EXISTS idx_anak_user_active        ON public.anak(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_anak_tanggal_lahir      ON public.anak(tanggal_lahir);

DROP TRIGGER IF EXISTS trg_anak_updated_at ON public.anak;
CREATE TRIGGER trg_anak_updated_at
  BEFORE UPDATE ON public.anak
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- pengukuran (measurement log, owner chained via anak.user_id) ----------
CREATE TABLE IF NOT EXISTS public.pengukuran (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anak_id                uuid NOT NULL REFERENCES public.anak(id) ON DELETE CASCADE,
  tanggal_ukur           date NOT NULL CHECK (tanggal_ukur <= current_date),
  -- WHO 2006 reference boundary: 0–60 months (PRD §5.3, §4.2A)
  umur_bulan             int  NOT NULL CHECK (umur_bulan BETWEEN 0 AND 60),
  berat_badan_kg         numeric(5,2) NOT NULL CHECK (berat_badan_kg > 0 AND berat_badan_kg < 100),
  tinggi_badan_cm        numeric(5,1) NOT NULL CHECK (tinggi_badan_cm > 0 AND tinggi_badan_cm < 250),
  -- Snapshot of calculated Z-scores at measurement time (Master Doc §3 Snapshot pattern)
  z_score_tbu            numeric(4,2),  -- Z-score tinggi badan menurut umur (lhfa)
  z_score_bbu            numeric(4,2),  -- Z-score berat badan menurut umur (wfa)
  -- Optional screening Z-scores (hcfa/acfa exposed via form per PRD §5.3 update)
  z_score_lingkar_kepala numeric(4,2),
  z_score_lingkar_lengan numeric(4,2),
  status_hasil           text NOT NULL CHECK (status_hasil IN ('normal','risiko_sedang','risiko_tinggi')),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz NULL
);
CREATE INDEX IF NOT EXISTS idx_pengukuran_anak_tanggal ON public.pengukuran(anak_id, tanggal_ukur) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pengukuran_umur         ON public.pengukuran(umur_bulan);

DROP TRIGGER IF EXISTS trg_pengukuran_updated_at ON public.pengukuran;
CREATE TRIGGER trg_pengukuran_updated_at
  BEFORE UPDATE ON public.pengukuran
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- edukasi (nutrition articles & MPASI recipes — public content, no soft delete) ----------
CREATE TABLE IF NOT EXISTS public.edukasi (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  judul         text NOT NULL CHECK (char_length(trim(judul)) > 0),
  slug          text UNIQUE NOT NULL,
  kategori_umur text NOT NULL,  -- '0-6','6-8','9-11','12-24','24-60' per PRD §4.2B
  tipe_konten   text NOT NULL CHECK (tipe_konten IN ('artikel_gizi','resep_mpasi')),
  konten_html   text NOT NULL,
  thumbnail_url text,
  author_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  published     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_edukasi_slug          ON public.edukasi(slug);
CREATE INDEX IF NOT EXISTS idx_edukasi_kategori      ON public.edukasi(kategori_umur, tipe_konten);
CREATE INDEX IF NOT EXISTS idx_edukasi_author        ON public.edukasi(author_id);

DROP TRIGGER IF EXISTS trg_edukasi_updated_at ON public.edukasi;
CREATE TRIGGER trg_edukasi_updated_at
  BEFORE UPDATE ON public.edukasi
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RLS : enable on all personal-data + content tables
-- =============================================================================
ALTER TABLE public.users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anak       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengukuran ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edukasi    ENABLE ROW LEVEL SECURITY;

-- ---------- Ownership helper used by pengukuran policies ----------
-- Single reusable STABLE function so the planner doesn't inline a subquery per row.
CREATE OR REPLACE FUNCTION public.fn_user_owns_anak(_anak_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.anak a
    WHERE a.id = _anak_id
      AND a.user_id = auth.uid()
      AND a.deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =============================================================================
-- POLICIES
-- Convention: USING() controls visibility of existing rows;
--             WITH CHECK() controls acceptability of writes — kept symmetric.
-- =============================================================================

-- ---------- users ----------
-- warga can read & update their own profile row; INSERT is also allowed here
-- as a defensive fallback (the signup trigger below is the primary path).
DROP POLICY IF EXISTS users_select_own  ON public.users;
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (auth.uid() = id AND deleted_at IS NULL);

DROP POLICY IF EXISTS users_insert_own  ON public.users;
CREATE POLICY users_insert_own ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own  ON public.users;
CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (auth.uid() = id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = id);
-- No DELETE policy for warga on users → soft delete only (app-layer UPDATE deleted_at).
-- Cadres/admins never SELECT users directly (PDP §4, Q1 decision: health tables only).

-- ---------- anak ----------
DROP POLICY IF EXISTS anak_select_owner ON public.anak;
CREATE POLICY anak_select_owner ON public.anak
  FOR SELECT USING (
    deleted_at IS NULL AND (
      user_id = auth.uid()                              -- warga sees own children
      OR EXISTS (SELECT 1 FROM public.users u
                 WHERE u.id = auth.uid()
                   AND u.role = 'kader_kesehatan'
                   AND u.deleted_at IS NULL)             -- cadre sees village-wide
    )
  );

DROP POLICY IF EXISTS anak_insert_owner ON public.anak;
CREATE POLICY anak_insert_owner ON public.anak
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                  AND u.role = 'warga'
                  AND u.consent_given_at IS NOT NULL    -- consent gate (PDP §4)
                  AND u.deleted_at IS NULL)
  );

DROP POLICY IF EXISTS anak_update_owner ON public.anak;
CREATE POLICY anak_update_owner ON public.anak
  FOR UPDATE USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK  (user_id = auth.uid());
-- No DELETE policy → soft delete only. Cadre never mutates anak → default-deny.

-- ---------- pengukuran ----------
-- Owner identified transitively via anak.user_id (single source of truth).
DROP POLICY IF EXISTS pengukuran_select_owner ON public.pengukuran;
CREATE POLICY pengukuran_select_owner ON public.pengukuran
  FOR SELECT USING (
    deleted_at IS NULL AND (
      public.fn_user_owns_anak(anak_id)                  -- warga sees own child's measurements
      OR EXISTS (SELECT 1 FROM public.users u
                 WHERE u.id = auth.uid()
                   AND u.role = 'kader_kesehatan'
                   AND u.deleted_at IS NULL)             -- cadre sees village-wide measurements
    )
  );

DROP POLICY IF EXISTS pengukuran_insert_owner ON public.pengukuran;
CREATE POLICY pengukuran_insert_owner ON public.pengukuran
  FOR INSERT WITH CHECK (public.fn_user_owns_anak(anak_id));

DROP POLICY IF EXISTS pengukuran_update_owner ON public.pengukuran;
CREATE POLICY pengukuran_update_owner ON public.pengukuran
  FOR UPDATE USING (public.fn_user_owns_anak(anak_id) AND deleted_at IS NULL)
  WITH CHECK  (public.fn_user_owns_anak(anak_id));
-- Cadre never mutates pengukuran → default-deny (cadre is read-only per PRD §4.2D).

-- ---------- edukasi (public read; write restricted to cadre) ----------
DROP POLICY IF EXISTS edukasi_select_public ON public.edukasi;
CREATE POLICY edukasi_select_public ON public.edukasi
  FOR SELECT USING (published = true);                  -- public SEO directory

DROP POLICY IF EXISTS edukasi_manage_cadre ON public.edukasi;
CREATE POLICY edukasi_manage_cadre ON public.edukasi
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
              AND u.role = 'kader_kesehatan'
              AND u.deleted_at IS NULL)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u
            WHERE u.id = auth.uid()
              AND u.role = 'kader_kesehatan'
              AND u.deleted_at IS NULL)
  );

-- =============================================================================
-- SIGNUP TRIGGER : auto-insert a profile row when a new auth.users row appears.
-- Guarantees RLS policies always have a matching public.users row.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, nama_lengkap, google_id, role, consent_given_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name',
             NEW.raw_user_meta_data->>'name',
             split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'provider_id',            -- Google provider subject
    'warga',
    NULL                                               -- consent collected on first visit
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- =============================================================================
-- Phase 1 aggregate stats (cadre dashboard) — SECURITY DEFINER, no PII leakage.
-- Cadres call this instead of SELECTing users.* (Q1 decision compliance).
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_village_stats()
RETURNS table (
  total_anak        bigint,
  total_pengukuran  bigint,
  risiko_tinggi     bigint
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    (SELECT count(*) FROM public.anak WHERE deleted_at IS NULL),
    (SELECT count(*) FROM public.pengukuran WHERE deleted_at IS NULL),
    (SELECT count(*) FROM public.pengukuran
       WHERE deleted_at IS NULL AND status_hasil = 'risiko_tinggi');
$$;

REVOKE EXECUTE ON FUNCTION public.fn_village_stats() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_village_stats() TO authenticated;

-- =============================================================================
-- Done. Verify with:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
-- =============================================================================