-- =============================================================================
-- Cleanup PDF retensi 7 hari — FALLBACK MANUAL (jalankan di Supabase SQL Editor)
--
-- Cron harian di Vercel (/api/cron/cleanup-pdf, via vercel.json) sudah menangani
-- ini secara otomatis. Skrip ini hanya untuk keadaan cron mati lama / storage
-- membesar, agar admin bisa membersihkan manual.
--
-- LANGKAH:
--   1. Jalankan SELECT pertama untuk meninjau kandidat yang akan dibersihkan.
--   2. Hapus file PDF dari bucket 'surat-pdf' lewat Dashboard → Storage (atau
--      jalankan endpoint cron secara manual lewat curl, yang menghapus file +
--      men-null kan pdf_final_url sekaligus).
--   3. Jika file sudah terhapus dari Storage, jalankan UPDATE kedua untuk
--      men-null-kan pdf_final_url pada baris-baris tersebut.
--
-- CATATAN: penghapusan objek Storage sebaiknya via API (cron/curl), bukan SQL,
-- karena storage diakses lewat Supabase Storage service, bukan langsung SQL.
-- =============================================================================

-- 1) TINJAU kandidat (approved, lewat 7 hari sejak disetujui, masih ada PDF)
SELECT id, nomor_surat_final, disetujui_at, pdf_final_url
FROM public.permohonan_surat
WHERE status = 'disetujui'
  AND disetujui_at < now() - interval '7 days'
  AND pdf_final_url IS NOT NULL
  AND deleted_at IS NULL
ORDER BY disetujui_at ASC;

-- 2) JALANKAN SETELAH FILE SUDAH DIHAPUS DARI STORAGE:
--    UPDATE public.permohonan_surat
--    SET pdf_final_url = NULL
--    WHERE status = 'disetujui'
--      AND disetujui_at < now() - interval '7 days'
--      AND pdf_final_url IS NOT NULL
--      AND deleted_at IS NULL;
