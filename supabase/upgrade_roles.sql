-- =============================================================================
-- Upgrade role user — admin_desa & kader_kesehatan
-- Jalankan di Supabase SQL Editor (satu per email). Ganti [EMAIL_GOOGLE] dengan
-- email Google akun yang bersangkutan. Akun tsb harus sudah login Google sekali
-- (agar baris public.users-nya ada via trigger on_auth_user_created).
--
-- Catatan: ketiga role sudah ada di enum app_role sejak Phase 1 — tidak perlu
-- ALTER TYPE (Master Doc §1).
-- =============================================================================

-- ---------- Admin Perangkat Desa ----------
UPDATE public.users
SET role = 'admin_desa'
WHERE email = '[EMAIL_GOOGLE]'
  AND deleted_at IS NULL
RETURNING email, role;

-- ---------- Kader Kesehatan ----------
UPDATE public.users
SET role = 'kader_kesehatan'
WHERE email = '[EMAIL_GOOGLE]'
  AND deleted_at IS NULL
RETURNING email, role;

-- =============================================================================
-- Opsional: cek semua role saat ini
-- =============================================================================
-- SELECT email, role FROM public.users WHERE deleted_at IS NULL ORDER BY role;
