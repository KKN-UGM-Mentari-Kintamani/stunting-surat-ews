# Panduan Admin & Keberlanjutan — Sigap Desa

**Aplikasi:** Portal Desa Songan B (Sigap Desa)

**Pembaca:** Admin Desa (`admin_desa`), Kader Kesehatan (`kader_kesehatan`), dan pengembang yang meneruskan pengembangan.

> **Dokumen terkait:** `02_PHASE_2_LAYANAN_SURAT.md` (spec as-implemented), `00_MASTER_CROSS_PHASE_CONSISTENCY.md`, `USER_GUIDE.md`, `Design.md`.

---

## Bagian A — Panduan Operasional

## 1. Peran & Hak Akses

| Peran | Halaman | Fungsi |
|---|---|---|
| `admin_desa` | `/admin/surat` | Antrian & persetujuan surat, layanan walk-in, konfigurasi Kepala Desa |
| `kader_kesehatan` | `/admin/kesehatan` | CMS artikel gizi & resep MPASI |
| `warga` | Portal warga | Kalkulator, edukasi, layanan surat, profil |

Middleware memblokir akses halaman admin untuk peran yang salah. Setiap server action juga memverifikasi ulang peran (defense-in-depth).

### 1.1. Cara Masuk ke Dasbor Admin

1. Buka website Sigap Desa.
2. Klik **Masuk** → login dengan akun Google yang sudah diaktivasi sebagai admin.
3. Buka URL dasbor:
   - Admin surat: `/admin/surat`
   - Kader kesehatan: `/admin/kesehatan`
4. (Jika akun belum aktif) — lihat Bagian B §13.1 untuk aktivasi.

---

## 2. Dasbor Admin Surat (`/admin/surat`)

### 2.1. Ringkasan Halaman

- **Kartu statistik** di atas: Total Permohonan, Disetujui Hari Ini, Menunggu Tindakan.
- **Banner info** (selalu tampil): "PDF surat yang disetujui hanya tersedia 7 hari sejak tanggal persetujuan…".
- **Tabel antrian**: kolom No · Nama Pemohon · Tanggal · Jenis Surat · Status · Tindakan.
- **Filter status**: Semua / Menunggu / Disetujui / Ditolak.
- **Pagination**: 20 baris/halaman, navigasi panah, keterangan "Menampilkan X–Y dari Z".
- **Catatan** di bawah tabel: penjelasan tombol unduh nonaktif untuk surat yang lewat masa unduh.

### 2.2. Membaca Status

| Badge | Arti |
|---|---|
| Menunggu | Belum ditindak. |
| Disetujui | Sudah terbit; PDF tersedia 7 hari. |
| Ditolak | Ditolak dengan catatan. |

### 2.3. Tindakan pada Baris

- **Ikon PDF** (hanya untuk disetujui): membuka PDF final di tab baru. **Nonaktif** jika masa unduh 7 hari sudah lewat.
- **Ikon mata (Detail)**: membuka panel 50:50 — pratinjau surat di kiri, detail data & form aksi di kanan.

---

## 3. Alur Persetujuan Surat

### 3.1. Menyetujui (Setujui)

1. Klik **Detail** pada baris berstatus **Menunggu**.
2. Panel terbuka: kiri = pratinjau surat, kanan = detail permohonan & pilihan aksi.
3. Pilih aksi **Setujui**.
4. Isi **Nomor Surat** (format `{kode}/{nomor}/{bulan-romawi}/{tahun}`, contoh `470/012/VII/2026`) — **dimasukkan manual** sesuai buku register desa.
5. Untuk **SKTM**: isi **tujuan** yang akan tercetak di surat.
6. Klik tombol aksi → muncul toast "Menerbitkan surat…".
7. Berhasil → status baris menjadi **Disetujui** dan tombol PDF langsung aktif (tanpa reload).

> **Catatan:** jika TTE/stempel Kepala Desa belum dikonfigurasi, persetujuan akan ditolak dengan pesan. Lihat §5.

### 3.2. Menolak (Tolak)

1. Klik **Detail** pada baris **Menunggu**.
2. Pilih aksi **Tolak**.
3. Isi **catatan/alasan** (wajib) — ini yang akan dilihat warga.
4. Klik tombol aksi → status menjadi **Ditolak**.
5. Warga tidak bisa mengedit surat yang ditolak; mereka membuat permohonan baru.

> Tidak ada lagi status "Perlu Revisi" pada alur saat ini — penolakan dengan catatan menggantikannya.

### 3.3. Pencegahan Kesalahan

- Tombol aksi **nonaktif** jika `catatan_admin` kosong (untuk tolak) atau nomor kosong (untuk setuju).
- Tombol **loading + disabled** selama proses agar tidak ada klik ganda.
- Jika render PDF gagal, status kembali **Menunggu** dan admin bisa mencoba lagi (nomor tidak terpakai).

---

## 4. Layanan Walk-In (`/admin/surat/walkin`)

Untuk warga yang datang langsung tanpa akun online.

1. Buka menu **Buat Surat (Walk-In)** di sidebar.
2. Pilih **jenis surat**.
3. Ketik manual data KTP warga (nama, NIK, TTL, agama, pekerjaan, alamat, dst) + field khusus + nomor surat.
4. Tinjau pratinjau → **Terbitkan**.
5. Surat langsung masuk status **Disetujui** (PDF dibuat sebelum data tersimpan; jika gagal, tidak ada baris yatim).

> Perbedaan dari pengajuan online: walk-in **langsung disetujui** saat dibuat, bukan masuk antrean `menunggu`.

---

## 5. Konfigurasi Kepala Desa (`/admin/surat/config`)

Kelola identitas & tanda tangan untuk PDF surat.

### 5.1. Data yang Dikonfigurasi

- **Nama Kepala Desa / Perbekel**
- **NIP** (opsional)
- **Jabatan** (default "Kepala Desa")
- **Tanda tangan (TTE)** — PNG transparan
- **Stempel/cap** — PNG transparan

### 5.2. Upload TTE & Stempel

1. Siapkan file **PNG transparan** (tanda tangan & stempel; maksimal ±2MB, dikompres otomatis).
2. Di halaman konfigurasi, klik **Unggah** pada masing-masing kolom.
3. File lama otomatis dihapus saat penggantian berhasil.
4. Klik **Simpan** setelah identitas diisi.

> File TTE/stempel disimpan di bucket **PRIVATE** (`surat-ttd`), hanya diakses server saat render PDF — tidak pernah dipublikasikan.

### 5.3. Posisi Stempel & Tanda Tangan di PDF

Stempel/cap sengaja digeser sedikit ke kiri sehingga **bagian kanan stempel beririsan dengan bagian kiri tanda tangan** (mengikuti konvensi surat desa). Nama & NIP tetap pada posisinya.

---

## 6. Retensi PDF 7 Hari

- PDF surat **disetujui** hanya tersedia **7 hari** sejak tanggal persetujuan.
- Setelah itu: file dihapus otomatis oleh **cron harian**, dan `pdf_final_url` dikosongkan → warga melihat "Masa unduh telah berakhir".
- **Defense-in-depth:** meski file fisik belum dihapus, sistem menolak unduhan untuk surat yang `disetujui_at`-nya sudah lewat 7 hari.
- **Data tidak hilang:** snapshot surat (JSONB) tetap tersimpan; verifikasi keaslian tetap berfungsi via kode.

> **Penting untuk admin:** warga disarankan menyimpan salinan PDF sebelum masa unduh berakhir. Jika warga kehilangan PDF, desa dapat menerbitkan ulang/beri salinan melalui jalur manual.

---

## 7. Verifikasi Keaslian Surat

- Publik dapat memeriksa keaslian di halaman **Verifikasi Surat** dengan memasukkan kode 8 karakter di surat.
- Menampilkan: jenis, nomor, tanggal terbit, status, dan **nama pemohon tersamarkan** (mis. `Bu**i S.**`) — tanpa NIK/KK/alamat.

---

## 8. Dasbor Kader Kesehatan (`/admin/kesehatan`)

1. Buka `/admin/kesehatan` (peran `kader_kesehatan`).
2. **Statistik**: total artikel, terbit, draft, resep MPASI.
3. **Daftar Konten**: tabel artikel dengan status Terbit/Draft.
4. **Buat Artikel** → isi judul, jenis (Artikel Gizi / Resep MPASI), kategori usia, konten (editor WYSIWYG), thumbnail (dikompres otomatis maks ±2MB).
5. **Aksi per baris**: edit, **Terbitkan/Tarik** (toggle), **Hapus**.

---

## Bagian B — Infrastruktur, Kredensial & Keberlanjutan

## 9. Arsitektur Singkat

- **Frontend/Backend:** Next.js (App Router) + Tailwind CSS + shadcn/ui.
- **Database & Auth:** Supabase (PostgreSQL, RLS, Google OAuth via @supabase/ssr).
- **PDF surat:** `@react-pdf/renderer`, dirender in-process di server action Vercel (tanpa VPS).
- **Deploy:** Vercel (serverless).
- **Cron retensi PDF:** Vercel Cron harian → `/api/cron/cleanup-pdf`.

---

## 10. Tabel Platform & Status Penggunaan

| Platform | Peran dalam proyek | Status | Keterangan |
|---|---|---|---|
| **Vercel** | Hosting & deploy aplikasi; Cron job retensi PDF | **Free (Hobby)** | 1 cron/hari (retensi PDF); domain `*.vercel.app` atau custom |
| **Supabase** | Database PostgreSQL, Auth (Google OAuth), Storage (bucket private), RLS | **Free** | Batas DB ±500MB, storage ±1GB |
| **Google Cloud Console** | OAuth Client ID (login Google) | **Gratis** | Authorized redirect URI mengarah ke Supabase callback |
| **GitHub** | Repositori kode | **Free** | Hosting source code, kolaborasi |
| **Next.js / Tailwind / shadcn/ui / react-pdf / Chart.js** | Framework & library | **Open source / gratis** | |
| **Rumahweb** | **Registrar domain `.site`** | **Berbayar** | Domain dibeli di Rumahweb |
| **Domain `.site`** | Alamat website produksi | **Berbayar** — **Rp35.875/tahun** (dibayar 1 tahun) | Bukti pembelian: [Google Drive](https://drive.google.com/file/d/1bT1oLHGx_EyTDWBt-Wf5_KvB3RQCXlM8/view?usp=sharing) |

> **Catatan biaya saat ini:** seluruh layanan gratis kecuali **domain `.site`** (Rp35.875/tahun, sudah dibayar 1 tahun). Tidak ada biaya bulanan lain.

---

## 11. Kredensial & Lokasi Penyimpanan

> **Keamanan:** nilai rahasia berikut **TIDAK ditulis di dokumen ini** — hanya dicantumkan lokasinya. Isi kolom kredensial di bawah dengan akun yang Anda miliki.

| Platform | Email / Akun | URL / Lokasi | Catatan |
|---|---|---|---|
| Gmail | `________` | mail.google.com | Pemilik akun-akun di bawah |
| GitHub | `________` | github.com | Repositori kode |
| Supabase | `________` | supabase.com/dashboard | Project ref: `________` |
| Google Cloud Console | `________` | console.cloud.google.com | Project OAuth |
| Vercel | `________` | vercel.com/dashboard | Deployment & env vars |
| Rumahweb | `________` | rumahweb.com | Registrar domain `.site` |
| Domain `.site` | — | — | Masa aktif: 1 tahun sejak pembelian |

### 11.1. Nilai Rahasia — Lokasinya Saja

| Rahasia | Disimpan di | Jangan dicetak di dokumen |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel env + `.env.local` (lokal) | ✅ |
| `CRON_SECRET` | Vercel env + `.env.local` | ✅ |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Vercel env + `.env.local` | Publik-safe, tapi tetap rapi |
| Password DB (`SUPABASE_DB_CONNECTION_STRING`) | `.env.local` (lokal saja) | ✅ |
| `NEXT_PUBLIC_SITE_URL` | Vercel env + `.env.local` | — |

> **Rekomendasi:** simpan daftar kredensial lengkap di password manager (mis. Bitwarden/Google Password Manager), bukan di file ini.

---

## 12. Alur Keberlanjutan & Pengembangan

### 12.1. Siklus Pengembangan Normal

1. **Kode** → edit di lokal (branch fitur).
2. **Commit** dengan pesan jelas; **push** ke GitHub.
3. **Vercel** otomatis build & deploy dari branch `main`.
4. **Verifikasi** di domain produksi.

### 12.2. Variabel Lingkungan (Env)

Dibutuhkan di Vercel (`Settings → Environment Variables`) dan `.env.local` lokal:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL
CRON_SECRET
```

> `CRON_SECRET` harus **sama** antara `.env.local` dan Vercel — Vercel mengirimkannya sebagai header `Authorization: Bearer <CRON_SECRET>` saat memanggil cron. Tanpa itu, cron mengembalikan 401.

### 12.3. Cron Retensi PDF

- Didefinisikan di `vercel.json` → `GET /api/cron/cleanup-pdf` harian (`0 0 * * *`).
- Vercel Hobby: 1×/hari, presisi ±59 menit (tidak masalah untuk job pembersihan).
- **Uji manual:**
  ```bash
  curl http://localhost:3000/api/cron/cleanup-pdf                      # → 401
  curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/cleanup-pdf
  ```
- **Fallback manual** bila cron mati lama: jalankan `supabase/cleanup_pdf.sql` di SQL Editor (SELECT kandidat → hapus file → UPDATE `pdf_final_url = NULL`).

### 12.4. Aktivasi Akun Admin Baru

1. Login Google sekali di website (akun tersebut → role `warga`).
2. Jalankan `supabase/upgrade_admin_desa.sql` di SQL Editor (ganti email target).
3. Buka `/admin/surat` dengan akun tsb.

### 12.5. Menambah Jenis Surat Baru

1. Tambahkan baris di `master_jenis_surat` (nama, `kode_klasifikasi`, `template_key`).
2. Jika membutuhkan layout baru → tambahkan template di `src/lib/surat/body.ts` + key di `FIELD_DEFS` (`src/lib/surat/fields.ts`).
3. Tandai `is_active = true` agar tampil untuk warga.

### 12.6. Backup & Pemulihan

- **Database:** Supabase Dashboard → Database → Backup (fitur platform). Ekspor SQL berkala sebagai cadangan.
- **Kode:** GitHub adalah sumber kebenaran kode; pastikan selalu push.
- **Env vars:** simpan salinan di password manager (nilai rahasia tidak di repo).

### 12.7. Roadmap / Backlog Fase Selanjutnya

Belum dikerjakan & direncanakan untuk iterasi berikutnya:

- **Notifikasi permohonan baru ke admin** (polling atau Supabase Realtime) — admin saat ini harus reload manual untuk melihat ajuan baru.
- **Right-to-erasure self-service** — tombol "Hapus Akun & Data" di aplikasi (sekarang manual via perangkat desa).
- **Walk-in auto-link NIK ke akun warga** — agar riwayat surat walk-in muncul di `/profil` warga yang punya akun.
- (Fase 3) **EWS bencana** — dashboard mitigasi bencana.

---

## 13. Setup Awal & Troubleshooting

### 13.1. Setup Awal

1. **Supabase:** buat project → jalankan `supabase/schema.sql` lalu `supabase/schema_phase2.sql` di SQL Editor.
2. **Bucket storage:** `surat-pdf` (PRIVATE), `surat-ttd` (PRIVATE), `thumbnails` (PUBLIC) — dibuat oleh skema.
3. **Google OAuth:** buat OAuth Client di Google Cloud Console → set Authorized redirect URI ke Supabase callback (`https://<project>.supabase.co/auth/v1/callback`).
4. **Supabase Auth:** aktifkan provider Google + set Redirect URLs (domain Vercel & `http://localhost:3000/**` untuk dev).
5. **Aktivasi admin** (lihat §12.4) & **konfigurasi Kades** (lihat §5).
6. **Vercel:** import repo → set env vars (§12.2) → deploy → tambahkan domain custom `.site`.
7. **Cron:** pastikan `vercel.json` ter-deploy & `CRON_SECRET` di env Vercel.

### 13.2. Troubleshooting Umum

| Gejala | Kemungkinan Penyebab | Solusi |
|---|---|---|
| Login gagal / refresh token error di log | Cookie sesi lama / middleware | Bersihkan cookie situs atau coba window incognito; restart dev server |
| Cron mengembalikan 401 | `CRON_SECRET` tidak sama di `.env.local` & Vercel | Samakan nilainya; pastikan env Vercel ter-set |
| PDF tidak bisa dibuat saat Setujui | Bucket `surat-pdf` belum ada / kredensial service role salah | Buat bucket / cek `SUPABASE_SERVICE_ROLE_KEY` |
| Tombol PDF disabled padahal sudah disetujui | Masa unduh 7 hari lewat | Sesuai aturan retensi; beri tahu warga hubungi desa |
| Tidak bisa approve karena "TTE belum dikonfigurasi" | TTE/stempel belum di-upload di config Kades | Upload di `/admin/surat/config` |
| NIK duplikat saat walk-in/profiling | NIK sudah terdaftar | Cek kebenaran NIK; hubungi warga |
| Admin tidak bisa buka `/admin/surat` | Role belum diaktifkan | Jalankan `supabase/upgrade_admin_desa.sql` |

---

*Dokumen ini mencerminkan kondisi implementasi saat ini. Perbarui seiring pengembangan (lihat §12.7 roadmap).*
