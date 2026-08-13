-- =============================================================================
-- Phase 2 Schema — Village Letter Service
-- Run in Supabase SQL Editor. Idempotent: uses IF NOT EXISTS / DO blocks.
--
-- Conventions (per AGENTS.md + 00_MASTER_CROSS_PHASE_CONSISTENCY.md):
--   - Soft delete (deleted_at) for all personal-data tables (§3)
--   - RLS enabled on every personal-data table (§3)
--   - Snapshot pattern for generated documents (§3): data_isian_snapshot JSONB
--   - admin_desa role already exists in app_role enum since Phase 1 (§1)
-- =============================================================================

-- ---------- warga_profil (1:1 with users — NIK/KK progressive profiling) ----------
CREATE TABLE IF NOT EXISTS public.warga_profil (
  user_id         uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  nik             text UNIQUE NOT NULL CHECK (nik ~ '^[0-9]{16}$'),
  no_kk           text CHECK (no_kk IS NULL OR no_kk ~ '^[0-9]{16}$'),
  nama            text NOT NULL CHECK (char_length(trim(nama)) > 0),
  tempat_lahir    text NOT NULL,
  tanggal_lahir   date NOT NULL CHECK (tanggal_lahir <= current_date),
  jenis_kelamin   char(1) NOT NULL DEFAULT 'L' CHECK (jenis_kelamin IN ('L','P')),
  status          text,
  kewarganegaraan text NOT NULL DEFAULT 'WNI',
  agama           text NOT NULL,
  pekerjaan       text NOT NULL,
  alamat          text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz NULL
);
-- Idempotent migration for DBs created before the 3 new columns.
ALTER TABLE public.warga_profil
  ADD COLUMN IF NOT EXISTS jenis_kelamin char(1) NOT NULL DEFAULT 'L'
    CHECK (jenis_kelamin IN ('L','P'));
ALTER TABLE public.warga_profil
  ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.warga_profil
  ADD COLUMN IF NOT EXISTS kewarganegaraan text NOT NULL DEFAULT 'WNI';
CREATE INDEX IF NOT EXISTS idx_warga_profil_nik ON public.warga_profil(nik);

DROP TRIGGER IF EXISTS trg_warga_profil_updated_at ON public.warga_profil;
CREATE TRIGGER trg_warga_profil_updated_at
  BEFORE UPDATE ON public.warga_profil
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- surat_kades_config (single-row config) ----------
CREATE TABLE IF NOT EXISTS public.surat_kades_config (
  id             int PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- enforce single row
  nama_kades     text NOT NULL,
  nip_kades      text,
  jabatan        text NOT NULL DEFAULT 'Kepala Desa',
  -- Paths in the PRIVATE 'surat-ttd' bucket (never a public URL).
  ttd_cap_url    text,
  stempel_url    text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
-- Idempotent migration: stamp (cap) overlay path.
ALTER TABLE public.surat_kades_config
  ADD COLUMN IF NOT EXISTS stempel_url text;

-- ---------- master_jenis_surat (letter types) ----------
CREATE TABLE IF NOT EXISTS public.master_jenis_surat (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_surat        text NOT NULL CHECK (char_length(trim(nama_surat)) > 0),
  kode_klasifikasi  text NOT NULL,
  -- Which body template renders this letter (7 template keys).
  template_key      text NOT NULL DEFAULT 'sktm'
                    CHECK (template_key IN ('sktm','sku','skp','skd','skl','skli','skm')),
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_master_jenis_surat_active ON public.master_jenis_surat(is_active);

-- Idempotent migration: add template_key to DBs created before this column,
-- then widen the CHECK to the full 7-template set.
ALTER TABLE public.master_jenis_surat
  ADD COLUMN IF NOT EXISTS template_key text NOT NULL DEFAULT 'sktm';
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'master_jenis_surat_template_key_check'
      AND conrelid = 'public.master_jenis_surat'::regclass
  ) THEN
    ALTER TABLE public.master_jenis_surat
      DROP CONSTRAINT master_jenis_surat_template_key_check;
  END IF;
END $$;
ALTER TABLE public.master_jenis_surat
  ADD CONSTRAINT master_jenis_surat_template_key_check
  CHECK (template_key IN ('sktm','sku','skp','skd','skl','skli','skm'));

-- Backfill template_key on existing rows (idempotent migration).
-- NOTE: the column is added with DEFAULT 'sktm', so existing rows are ALREADY
-- 'sktm' — backfill MUST match on nama_surat, not template_key IS NULL.
-- Order matters: more specific matchers (pindah / ibu) run first so the
-- generic '%domisili%' / '%lahir%' matchers never steal them.
UPDATE public.master_jenis_surat SET template_key = 'skp'
  WHERE nama_surat ILIKE '%pindah domisili%' OR nama_surat ILIKE '%skp%';
UPDATE public.master_jenis_surat SET template_key = 'skli'
  WHERE nama_surat ILIKE '%seorang ibu%' OR nama_surat ILIKE '%skli%';
UPDATE public.master_jenis_surat SET template_key = 'skd'
  WHERE nama_surat ILIKE '%domisili%' AND nama_surat NOT ILIKE '%pindah%';
UPDATE public.master_jenis_surat SET template_key = 'skl'
  WHERE nama_surat ILIKE '%lahir%' AND nama_surat NOT ILIKE '%ibu%'
    AND nama_surat NOT ILIKE '%seorang%';
UPDATE public.master_jenis_surat SET template_key = 'skm'
  WHERE nama_surat ILIKE '%meninggal%' OR nama_surat ILIKE '%skm%';
UPDATE public.master_jenis_surat SET template_key = 'sku'
  WHERE nama_surat ILIKE '%usaha%' OR nama_surat ILIKE '%sku%';
UPDATE public.master_jenis_surat SET template_key = 'sktm'
  WHERE nama_surat ILIKE '%tidak mampu%' OR nama_surat ILIKE '%sktm%';

-- Convert the legacy 'Surat Keterangan Domisili' row → Pindah Domisili (SKP).
UPDATE public.master_jenis_surat
  SET nama_surat = 'Surat Keterangan Pindah Domisili (SKP)',
      template_key = 'skp',
      kode_klasifikasi = '470'
  WHERE (nama_surat = 'Surat Pengantar Domisili' OR nama_surat = 'Surat Keterangan Domisili (SKD)')
    AND is_active = true;

-- Seed the 7 letter types (idempotent per template_key).
INSERT INTO public.master_jenis_surat (nama_surat, kode_klasifikasi, template_key, is_active)
SELECT seed.nama, seed.kode, seed.templ, true
FROM (VALUES
  ('Surat Keterangan Tidak Mampu (SKTM)',      '460',   'sktm'),
  ('Surat Keterangan Usaha (SKU)',             '593',   'sku'),
  ('Surat Keterangan Pindah Domisili (SKP)',   '470',   'skp'),
  ('Surat Keterangan Domisili (SKD)',          '470',   'skd'),
  ('Surat Keterangan Lahir (SKL)',             '474.1', 'skl'),
  ('Surat Keterangan Lahir dari Seorang Ibu',  '474.1', 'skli'),
  ('Surat Keterangan Meninggal (SKM)',         '474.3', 'skm')
) AS seed(nama, kode, templ)
WHERE NOT EXISTS (
  SELECT 1 FROM public.master_jenis_surat m
  WHERE m.template_key = seed.templ
);

-- ---------- nomor_surat_counter (race-safe numbering per kode/tahun) ----------
-- PRD §5.3: nomor_urut resets every year & is per kode_klasifikasi.
CREATE TABLE IF NOT EXISTS public.nomor_surat_counter (
  kode_klasifikasi text NOT NULL,
  tahun            int NOT NULL,
  nomor_urut       int NOT NULL DEFAULT 0,
  PRIMARY KEY (kode_klasifikasi, tahun)
);

-- ---------- permohonan_surat (central transaction log) ----------
DO $$ BEGIN
  CREATE TYPE status_permohonan AS ENUM ('menunggu', 'revisi', 'disetujui', 'ditolak');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.permohonan_surat (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL when created by Admin for a walk-in citizen without an account.
  user_id             uuid REFERENCES public.users(id) ON DELETE SET NULL,
  jenis_surat_id      uuid NOT NULL REFERENCES public.master_jenis_surat(id),
  -- Snapshot pattern (Master Doc §3): all identity + service-specific inputs
  -- frozen at request time. Never re-read from live profile.
  data_isian_snapshot jsonb NOT NULL,
  status              status_permohonan NOT NULL DEFAULT 'menunggu',
  -- Set when Admin clicks "Setujui" (marks "rendering PDF" without altering enum).
  processing_at       timestamptz NULL,
  admin_pembuat_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  admin_verifikator_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  catatan_admin       text,
  nomor_surat_final   text UNIQUE,
  kode_verifikasi     text UNIQUE,
  pdf_final_url       text,
  -- Filled when status -> 'disetujui'; basis for 7-day PDF retention.
  disetujui_at        timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz NULL
);
CREATE INDEX IF NOT EXISTS idx_permohonan_status        ON public.permohonan_surat(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_permohonan_user_active   ON public.permohonan_surat(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_permohonan_verif         ON public.permohonan_surat(kode_verifikasi) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_permohonan_nomor         ON public.permohonan_surat(nomor_surat_final) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_permohonan_updated_at ON public.permohonan_surat;
CREATE TRIGGER trg_permohonan_updated_at
  BEFORE UPDATE ON public.permohonan_surat
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- RLS : enable on all new tables
-- =============================================================================
ALTER TABLE public.warga_profil       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.surat_kades_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_jenis_surat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permohonan_surat   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nomor_surat_counter ENABLE ROW LEVEL SECURITY;

-- ---------- helper: is the current user admin_desa? ----------
CREATE OR REPLACE FUNCTION public.fn_is_admin_desa()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid()
      AND u.role = 'admin_desa'
      AND u.deleted_at IS NULL
  );
$$ LANGUAGE sql STABLE;

-- ---------- warga_profil policies (PRD §6) ----------
DROP POLICY IF EXISTS warga_profil_select_own ON public.warga_profil;
CREATE POLICY warga_profil_select_own ON public.warga_profil
  FOR SELECT USING (
    deleted_at IS NULL AND (
      user_id = auth.uid() OR public.fn_is_admin_desa()
    )
  );

DROP POLICY IF EXISTS warga_profil_insert_own ON public.warga_profil;
CREATE POLICY warga_profil_insert_own ON public.warga_profil
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                  AND u.consent_given_at IS NOT NULL   -- PDP consent for NIK/KK
                  AND u.deleted_at IS NULL)
  );

DROP POLICY IF EXISTS warga_profil_update_own ON public.warga_profil;
CREATE POLICY warga_profil_update_own ON public.warga_profil
  FOR UPDATE USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- ---------- surat_kades_config policies (admin_desa only) ----------
DROP POLICY IF EXISTS kades_config_select_admin ON public.surat_kades_config;
CREATE POLICY kades_config_select_admin ON public.surat_kades_config
  FOR SELECT USING (public.fn_is_admin_desa());

DROP POLICY IF EXISTS kades_config_manage_admin ON public.surat_kades_config;
CREATE POLICY kades_config_manage_admin ON public.surat_kades_config
  FOR ALL USING (public.fn_is_admin_desa())
  WITH CHECK (public.fn_is_admin_desa());

-- Warga login (authenticated) perlu membaca identitas penanda tangan (nama/
-- jabatan/NIP Kades) untuk pratinjau surat di /layanan-surat. Data ini bersifat
-- publik — bukan data pribadi warga. Kolom ttd_cap_url hanyalah path storage
-- (bucket 'surat-ttd' bersifat private), bukan isi berkas.
DROP POLICY IF EXISTS kades_config_select_authenticated ON public.surat_kades_config;
CREATE POLICY kades_config_select_authenticated ON public.surat_kades_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- ---------- master_jenis_surat (public read for dropdowns; manage = admin_desa) ----------
DROP POLICY IF EXISTS master_jenis_select_public ON public.master_jenis_surat;
CREATE POLICY master_jenis_select_public ON public.master_jenis_surat
  FOR SELECT USING (is_active = true OR public.fn_is_admin_desa());

DROP POLICY IF EXISTS master_jenis_manage_admin ON public.master_jenis_surat;
CREATE POLICY master_jenis_manage_admin ON public.master_jenis_surat
  FOR ALL USING (public.fn_is_admin_desa())
  WITH CHECK (public.fn_is_admin_desa());

-- ---------- nomor_surat_counter (service-side only; no direct user access) ----------
DROP POLICY IF EXISTS counter_no_access ON public.nomor_surat_counter;
CREATE POLICY counter_no_access ON public.nomor_surat_counter
  FOR ALL USING (public.fn_is_admin_desa())
  WITH CHECK (public.fn_is_admin_desa());

-- ---------- permohonan_surat policies (PRD §6) ----------
-- warga: SELECT own; INSERT new; UPDATE ONLY when status = 'revisi'
DROP POLICY IF EXISTS permohonan_select_owner ON public.permohonan_surat;
CREATE POLICY permohonan_select_owner ON public.permohonan_surat
  FOR SELECT USING (
    deleted_at IS NULL AND (
      user_id = auth.uid() OR public.fn_is_admin_desa()
    )
  );

DROP POLICY IF EXISTS permohonan_insert_owner ON public.permohonan_surat;
CREATE POLICY permohonan_insert_owner ON public.permohonan_surat
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.users u
                WHERE u.id = auth.uid()
                  AND u.consent_given_at IS NOT NULL
                  AND u.deleted_at IS NULL)
  );

-- warga may only edit rows currently in 'revisi' (resubmit flow).
DROP POLICY IF EXISTS permohonan_update_owner ON public.permohonan_surat;
CREATE POLICY permohonan_update_owner ON public.permohonan_surat
  FOR UPDATE USING (
    deleted_at IS NULL
    AND user_id = auth.uid()
    AND status = 'revisi'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'menunggu'   -- resubmit returns it to the queue
  );

-- admin_desa: full mutation (status, catatan, nomor, kode, pdf, processing).
DROP POLICY IF EXISTS permohonan_manage_admin ON public.permohonan_surat;
CREATE POLICY permohonan_manage_admin ON public.permohonan_surat
  FOR ALL USING (
    deleted_at IS NULL AND public.fn_is_admin_desa()
  )
  WITH CHECK (public.fn_is_admin_desa());

-- =============================================================================
-- Storage buckets (PRIVATE) + policies
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('surat-pdf', 'surat-pdf', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('surat-ttd', 'surat-ttd', false)
ON CONFLICT (id) DO NOTHING;

-- surat-ttd: admin_desa manages (upload/preview); server uses service role to read.
DROP POLICY IF EXISTS surat_ttd_admin ON storage.objects;
CREATE POLICY surat_ttd_admin ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'surat-ttd'
    AND public.fn_is_admin_desa()
  )
  WITH CHECK (
    bucket_id = 'surat-ttd'
    AND public.fn_is_admin_desa()
  );

-- surat-pdf: admin_desa may read/manage; citizen download handled server-side
-- via service role signed URL (never a public URL).
DROP POLICY IF EXISTS surat_pdf_admin ON storage.objects;
CREATE POLICY surat_pdf_admin ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'surat-pdf'
    AND public.fn_is_admin_desa()
  )
  WITH CHECK (
    bucket_id = 'surat-pdf'
    AND public.fn_is_admin_desa()
  );

-- =============================================================================
-- Verification function (PRD §4.3): SECURITY DEFINER exposes ONLY minimal
-- non-sensitive info, with the applicant name masked. Callable via service role
-- or a restricted endpoint — never leaks NIK/KK/address.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_verifikasi_surat(kode text)
RETURNS table (
  kode_verifikasi text,
  nama_surat text,
  nomor_surat text,
  tanggal_terbit timestamptz,
  status_verif text,
  nama_pemohon_masked text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT
    p.kode_verifikasi,
    m.nama_surat,
    p.nomor_surat_final,
    p.disetujui_at,
    CASE WHEN p.status = 'disetujui' THEN 'valid' ELSE 'tidak_valid' END,
    -- Mask: "Budi Santoso" -> "Bu**i S.**" (never reveal full name publicly)
    regexp_replace(
      COALESCE(p.data_isian_snapshot->>'nama', ''),
      '^(.{2}).(.) (.?)(.*)$',
      '\1**\2 \3.**',
      'g'
    )
  FROM public.permohonan_surat p
  JOIN public.master_jenis_surat m ON m.id = p.jenis_surat_id
  WHERE p.kode_verifikasi = kode
    AND p.deleted_at IS NULL
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_verifikasi_surat(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.fn_verifikasi_surat(text) TO authenticated;

-- =============================================================================
-- Done. Verify with:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
--   SELECT id, nama_surat, kode_klasifikasi FROM public.master_jenis_surat;
-- =============================================================================
