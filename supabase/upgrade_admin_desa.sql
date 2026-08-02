-- =============================================================================
-- Phase 2 — Upgrade role user ke 'admin_desa'
-- Jalankan di Supabase SQL Editor. Ganti [EMAIL_GOOGLE] dengan email Google
-- akun yang akan menjadi admin desa. Akun tsb harus sudah login Google sekali
-- (agar baris users-nya ada).
--
-- Catatan: role 'admin_desa' sudah ada di enum app_role sejak Phase 1 — tidak
-- perlu ALTER TYPE (Master Doc §1).
-- =============================================================================
UPDATE public.users
SET role = 'admin_desa'
WHERE email = '[EMAIL_GOOGLE]'
  AND deleted_at IS NULL
RETURNING email, role;

-- =============================================================================
-- Opsional: cek semua role saat ini
-- =============================================================================
-- SELECT email, role FROM public.users WHERE deleted_at IS NULL ORDER BY role;
