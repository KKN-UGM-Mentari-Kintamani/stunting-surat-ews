# Phase 2 — Layanan Surat Desa (PRD + Flow, As-Implemented)

**Project:** Integrated Village Portal

**Module:** Village Instant Letter Service System (Online & Offline Integration)

**Status:** **IMPLEMENTED** — dokumen ini menggabungkan `02_PRD_PHASE_2.md` dan `02_FLOW_PHASE_2.md` yang sudah selesai dibangun. Referensi yang sudah tidak berlaku lagi: status `revisi` (dihapus dari alur UI), nomor surat auto-counter (diganti input manual admin).

> **Referensi wajib:** `00_MASTER_CROSS_PHASE_CONSISTENCY.md` (role, navigasi, RLS, PDP), `Design.md` (token desain), `supabase/schema_phase2.sql` (skema aktual).

---

## 1. Ringkasan Eksekutif

Fase 2 memperluas Portal Desa dengan sistem administrasi surat terpadu (O2O — _Online to Offline_). Warga dapat mengajukan surat secara mandiri _online_, sekaligus menjadi _core system_ bagi perangkat desa yang melayani warga datang langsung ke kantor (_walk-in_). Fitur utama: progressive profiling NIK/KK, smart form auto-fill yang dapat diedit (fitur keluarga), preview, alur persetujuan admin, PDF final dengan TTE Kades + stempel, serta verifikasi keaslian dokumen publik.

## 2. Tujuan & Metrik

- **Tujuan utama:** "Single Window" digital untuk seluruh penerbitan surat desa (online & walk-in) sehingga penomoran surat terpusat dan teratur.
- **Metrik:**
  - Tidak ada lagi nomor surat duplikat/tumpang tindih/terlewat di buku register.
  - Waktu layanan walk-in turun dari rata-rata >20 menit menjadi <5 menit (auto-fill template).
  - Berkurangnya pengajuan diulang dari nol karena salah data kecil (diganti alur tolak-dengan-catatan).

## 3. Lingkup (MVP — yang sudah dibangun)

**In scope (selesai):**

- Progressive profiling (profil utama warga NIK/KK/alamat).
- Smart form editable auto-fill (bisa diubah untuk atas nama anggota keluarga).
- **7 template surat statis** (bukan 3-5 seperti draft awal): SKTM, SKU, SKP, SKD, SKL, SKLI, SKM.
- Smart preview (HTML tanpa nomor & TTE).
- Alur persetujuan admin: **Setujui / Tolak** (status `revisi` dihapus dari alur UI — lihat §4.2).
- Fitur "Buat Surat (Walk-In)" untuk admin — langsung terbit (`disetujui`) setelah PDF berhasil dibuat.
- PDF final + kode verifikasi saat status disetujui.
- Halaman publik verifikasi keaslian `/verifikasi/[kode]`.
- Retensi PDF 7 hari + cron cleanup + defense-in-depth cek umur unduh.
- Pagination client-side + filter status + banner/catatan retensi di antrian admin.

**Out of scope (defer ke fase berikutnya):**

- Dynamic template builder / form builder CMS (fase 4).
- Integrasi notifikasi WhatsApp.
- Modul EWS bencana (fase 3).
- Verifikasi via pemindaian QR langsung (MVP: input kode manual di halaman verifikasi).

---

## 4. Alur & Fungsionalitas

### 4.1. Peran

| Peran | Aktif | Keterangan |
|---|---|---|
| `warga` | Fase 1 | Mengajukan surat online |
| `kader_kesehatan` | Fase 1 | Tidak berubah (tidak punya akses surat) |
| `admin_desa` | **Phase 2** | Verifikasi, walk-in, konfigurasi Kades |

`admin_desa` di-reserve di enum `app_role` sejak Fase 1 — **tidak perlu ALTER TYPE** (Master Doc §1).

### 4.2. Alur Warga Online

```
[Klik "Layanan Surat"]
  │
  ├─ User belum login → /login?next=/layanan-surat
  │
  ├─ consent_given_at = NULL → ConsentGate (komponen bersama, tampil inline)
  │     • Satu persetujuan untuk seluruh layanan data pribadi (PDP §4)
  │     • Disimpan di users.consent_given_at; tidak ada dialog consent di login
  │
  ├─ warga_profil kosong → Form lengkap (NIK, KK, tempat/tgl lahir, jenis kelamin,
  │     status, kewarganegaraan, agama, pekerjaan, alamat)
  │     • Validasi NIK: 16 digit numerik
  │     • Duplicate NIK → tolak dengan pesan jelas
  │     • Simpan ke warga_profil
  │
  └─ warga_profil sudah ada → langsung ke Smart Form
```

**Smart Form (editable auto-fill):**

1. Pilih jenis surat dari `master_jenis_surat` yang `is_active = true`.
2. Form identitas terisi otomatis dari `warga_profil`.
3. **Fitur Keluarga:** field bisa diedit/dihapus (mis. ganti NIK & nama dengan milik suami/anak). Profil default **tidak berubah** — hanya snapshot request ini.
4. Isi field khusus jenis surat (mis. "Nama Usaha" untuk SKU) + tujuan permohonan & telepon.
5. Validasi client → lanjut ke preview.

**Smart Preview:**

- Render HTML preview **tanpa** nomor surat & TTE.
- Tombol: **"Kembali Edit"** + **"Ajukan Surat"**.
- Case: preview gagal load jaringan → tombol **"Muat Ulang Preview"**.
- Submit → INSERT `permohonan_surat`:
  - `status = 'menunggu'`
  - `data_isian_snapshot` = JSONB semua data identitas + field khusus **persis saat submit** (Snapshot pattern)
  - `user_id` = user aktif, `admin_pembuat_id` = NULL

### 4.3. Alur Admin — `/admin/surat`

**Antrian & Statistik:**

- Tabel CRUD semua status, sorting terbaru dulu.
- Filter status (Semua/Menunggu/Disetujui/Ditolak) + **pagination client-side 20 baris/halaman**.
- Kartu statistik: total permohonan, disetujui hari ini, menunggu tindakan.
- Banner retensi 7 hari selalu tampil; catatan kecil di bawah tabel; baris expired → tombol PDF disabled.
- Aksi pada baris: **Lihat PDF** (jika disetujui) & **Detail** (panel 50:50 preview + detail + form aksi).

**Approval Workflow — 2 aksi** (status `revisi` **dihapus** dari alur; draft awal menulis 3 aksi):

| Aksi | Syarat | Efek |
|---|---|---|
| **Tolak** | `catatan_admin` wajib (alasan final) | Status → `ditolak`. Tidak bisa diedit; warga buat baru |
| **Setujui** | nomor surat wajib diisi manual; tujuan wajib untuk SKTM | Memicu pipeline §4.4. Tombol loading + disabled selama proses |

- Setelah aksi, dialog tertutup dan baris antrian ter-update langsung (status + data PDF/nomor/catatan dari server action) — tanpa reload.
- **Nomor surat dimasukkan MANUAL oleh admin** (bukan auto-counter). `nomor_surat_counter` tidak dipakai di alur ini.

**Walk-In Service:**

1. Admin → "Buat Surat (Walk-In)".
2. Pilih jenis surat → **ketik manual** data KTP warga.
3. PDF dirender & diunggah **terlebih dahulu**; setelah berhasil baris di-INSERT **langsung** sebagai `disetujui` (bukan `menunggu`) — `user_id = NULL`, `admin_pembuat_id = id_admin`.
4. Case: gagal di tengah → tidak ada baris yatim (tanpa status menengah).
5. Catatan backlog: NIK sudah punya akun → opsi auto-link agar riwayat tampil di `/profil` **belum diimplementasi** (defer).

### 4.4. Pipeline "Setujui" (transaksi atomik)

Urutan **satu unit kerja** di server action (Vercel); jika gagal di tengah → `processing_at` dibersihkan, status tetap `menunggu`, nomor tidak terpakai:

1. Guard: hanya `menunggu` yang bisa disetujui; set `processing_at` + `admin_verifikator_id`.
2. Muat snapshot + jenis surat (kode/nama/template).
3. Untuk SKTM: tujuan yang diketik admin digabung ke snapshot final.
4. **Render PDF via `@react-pdf/renderer`** (`renderToBuffer`, in-process, ~100-200ms) — data dari `data_isian_snapshot`, font Liberation Serif.
5. Sisipkan TTE & stempel Kades (base64 dari bucket PRIVATE `surat-ttd`).
6. **Upload PDF** ke bucket PRIVATE `surat-pdf`.
7. **Simpan** `status='disetujui'` + `nomor_surat_final` (manual) + `kode_verifikasi` + `pdf_final_url` + `disetujui_at = now()` + `processing_at = null`.
8. Server action **mengembalikan** data hasil (nomor, kode, `pdf_final_url`, `disetujui_at`) agar client meng-update baris tanpa reload → tombol PDF langsung aktif.

**Case (gagal render/upload):** `processing_at` dibersihkan → status kembali `menunggu`, nomor & kode dibuang (tidak dipakai ulang). Admin dapat pesan error, bisa retry.
**Case (double click):** tombol disabled selama loading → aman.

### 4.5. Konfigurasi Kepala Desa

- `/admin/surat/config` — update nama Kades, NIP, jabatan, upload TTE & **stempel/cap** (PNG transparan → bucket PRIVATE `surat-ttd`).
- Case: TTE/stempel belum dikonfigurasi → tolak approve dengan pesan jelas.

### 4.6. Tracking & Riwayat (tab "Riwayat Surat" di `/profil`)

| Status | Tampilan warga | Aksi warga |
|---|---|---|
| `menunggu` | Badge biru-grey "Menunggu" | Menunggu admin |
| `disetujui` | Badge hijau "Disetujui" | **Download PDF final** (berisi kode verifikasi) — tersedia **7 hari** sejak disetujui |
| `ditolak` | Badge merah "Ditolak" + alasan | Tidak bisa edit; buat permohonan baru |

**Case A4b:** Download PDF via signed URL (kedaluwarsa ±1 jam); tombol disabled jika status belum `disetujui`.
**Case A4c (masa unduh berakhir):** jika `pdf_final_url` sudah dikosongkan (PDF dihapus setelah 7 hari) **atau** `disetujui_at` lewat 7 hari (defense-in-depth) → tombol unduh diganti teks *"Masa unduh telah berakhir. Silakan hubungi kantor desa."* Status badge tetap "Disetujui"; verifikasi keaslian tetap berfungsi via `/verifikasi/[kode]`.

### 4.7. Public Flow — Verifikasi Keaslian `/verifikasi/[kode]`

- Siapa saja (mis. bank/instansi penerima) buka `/verifikasi/[kode]` atau input kode.
- Query `permohonan_surat` by `kode_verifikasi` via **service role** / `fn_verifikasi_surat` (bukan session RLS).
- Tampilkan **minimal:** jenis surat, nomor surat, tanggal terbit, status ("Dokumen Valid" / "Kode Tidak Ditemukan").
- **Nama warga di-mask** → `Bu**i S.**` — tanpa NIK/KK/alamat.

---

## 5. Arsitektur & Infrastruktur

### 5.1. Infrastruktur — [no VPS]

**Tidak ada VPS.** PDF surat dirender **di Vercel (serverless)** via `@react-pdf/renderer` (in-process di server action). Seluruh app berjalan di Vercel; data & file di Supabase Free.

| Komponen | Lokasi | Catatan |
|---|---|---|
| Next.js app (UI + server actions) | Vercel | Satu deployment |
| PDF render (`renderToBuffer`) | Vercel server action | react-pdf, ~100-200ms |
| Postgres + Storage | Supabase Free | DB + bucket private |
| Cron retensi PDF 7 hari | Vercel Cron (Hobby: 1×/hari) — `/api/cron/cleanup-pdf` | Hapus PDF kedaluwarsa |

**Konfigurasi react-pdf di Vercel:**
- `next.config.ts`: `serverExternalPackages: ["@react-pdf/renderer"]` (fontkit WASM).
- Render pada **Node runtime** (bukan Edge).
- Font Liberation Serif di `public/fonts/` agar ada di bundle serverless.

### 5.2. Database & Storage

- **DB PostgreSQL** (free 500MB): `warga_profil`, `permohonan_surat`, `master_jenis_surat`, `surat_kades_config`, `nomor_surat_counter`.
- **Storage buckets:**
  - `surat-pdf` — **PRIVATE**: PDF final (dihapus otomatis 7 hari setelah disetujui).
  - `surat-ttd` — **PRIVATE**: PNG TTE & stempel Kades (hanya diakses server).
  - `thumbnails` — **PUBLIC** (dari Phase 1): thumbnail artikel edukasi.
- **Kapasitas dengan retensi 7 hari:** rata-rata PDF aktif ≈ (surat disetujui per 7 hari) × 0.5MB ≈ **±2MB saja** — sangat hemat.

### 5.3. Prinsip data & retensi PDF

- Data & PDF disimpan di Supabase (managed).
- PDF dirender dari `data_isian_snapshot` (Snapshot pattern, Master Doc §3), bukan profil live.
- `pdf_final_url` menyimpan **path storage**; download lewat **signed URL** (expired ±1 jam) — tidak pernah URL permanen publik.
- **Retensi PDF = 7 hari:** 7 hari setelah `status='disetujui'`, PDF **dihapus otomatis** dari bucket `surat-pdf` dan `pdf_final_url` dikosongkan. Pengaman tambahan: endpoint unduh juga menolak surat yang `disetujui_at`-nya sudah lewat 7 hari (defense-in-depth).
  - **Yang TIDAK hilang:** `data_isian_snapshot` (JSONB) tetap tersimpan — data surat abadi.
  - **Verifikasi tetap berfungsi:** `/verifikasi/[kode]` membaca dari `permohonan_surat`, bukan file PDF.
  - **Catatan kepatuhan:** ini **deviasi** dari Master Doc §4 (dokumen legal idealnya dipertahankan untuk kearsipan). Kompromi: snapshot data tetap ada; hanya artefak PDF yang dibatasi. Warga disarankan menyimpan salinan PDF sebelum masa unduh berakhir.

### 5.4. Mekanisme pembersihan PDF (cron)

- Kolom `disetujui_at` (timestamptz) di `permohonan_surat`, diisi saat status → `disetujui`.
- **Cron harian** (Vercel Cron — Hobby mendukung 1×/hari, presisi ±59 menit) → `GET /api/cron/cleanup-pdf` dengan header `Authorization: Bearer ${CRON_SECRET}`:
  1. SELECT `permohonan_surat` WHERE `status='disetujui'` AND `disetujui_at < now() - interval '7 days'` AND `pdf_final_url IS NOT NULL`.
  2. Hapus object dari bucket `surat-pdf` (via service role).
  3. UPDATE `pdf_final_url = NULL` pada row tsb.
- Idempoten & aman dijalankan ulang (guard `pdf_final_url IS NOT NULL`).
- Alternatif manual: `supabase/cleanup_pdf.sql` (SQL Editor).

---

## 6. Database Schema (aktual — `supabase/schema_phase2.sql`)

### 6.1. `warga_profil` (1:1 dengan `users`)

- `user_id` (PK, FK), `nik` (UNIQUE), `no_kk`, `nama`, `tempat_lahir`, `tanggal_lahir`, `jenis_kelamin` ('L'/'P'), `status`, `kewarganegaraan` (default 'WNI'), `agama`, `pekerjaan`, `alamat`, `deleted_at` (soft delete).

### 6.2. `surat_kades_config` (single-row)

- `id` (=1), `nama_kades`, `nip_kades`, `jabatan` (default 'Kepala Desa'), `ttd_cap_url`, `stempel_url` (path ke bucket private).

### 6.3. `master_jenis_surat`

- `id`, `nama_surat`, `kode_klasifikasi` (mis. "400"/"470"), `template_key` (7 nilai: sktm, sku, skp, skd, skl, skli, skm), `is_active`.

### 6.4. `nomor_surat_counter`

- `kode_klasifikasi`, `tahun`, `nomor_urut` (PK gabungan). **Tidak dipakai** di alur saat ini (nomor manual) — dipertahankan untuk kebutuhan masa depan.

### 6.5. `permohonan_surat` (transaction log)

- `id` (PK)
- `user_id` (FK, **nullable** — NULL untuk walk-in; `ON DELETE SET NULL`)
- `jenis_surat_id` (FK)
- `data_isian_snapshot` (JSONB — snapshot identitas + field khusus saat submit)
- `status` (ENUM: `menunggu`, `revisi`, `disetujui`, `ditolak` — `revisi` dipertahankan di enum tapi tidak dipakai UI)
- `processing_at` (timestamptz, nullable — penanda rendering PDF)
- `admin_pembuat_id` (FK, admin walk-in)
- `admin_verifikator_id` (FK, admin yang approve/tolak)
- `catatan_admin` (text, nullable — wajib saat tolak)
- `nomor_surat_final` (text, unique, format §5.5)
- `kode_verifikasi` (text, unique)
- `pdf_final_url` (text, path storage; **dikosongkan setelah 7 hari**)
- `disetujui_at` (timestamptz, nullable — dasar retensi 7 hari)
- `deleted_at` (soft delete)

### 6.6. RLS

| Tabel | warga | admin_desa |
|---|---|---|
| `warga_profil` | SELECT/UPDATE own (`user_id = auth.uid()`) + consent gate saat INSERT | read |
| `permohonan_surat` | SELECT own, INSERT (consent gate), UPDATE **hanya saat status `revisi`** (policy dipertahankan walau UI tidak memakai) | ALL (USING deleted_at IS NULL) |
| `surat_kades_config` | — (identitas Kades read via `auth.role()='authenticated'`) | ALL |
| `master_jenis_surat` | read (untuk dropdown) | manage |
| `nomor_surat_counter` | — | ALL |

### 6.7. Nomor surat & kode verifikasi

- **Format nomor:** `{kode_klasifikasi}/{nomor_urut}/{bulan_romawi}/{tahun}` — contoh `470/012/VII/2026`. **Dimasukkan manual oleh admin** (validasi format di `validateNomorSurat`).
- **Kode verifikasi:** string acak 8 karakter alfanumerik (contoh `A3F9K2LP`), independen dari nomor, tidak bisa ditebak.

---

## 7. Diagram State Permohonan

```
        [warga submit]        [admin walk-in → langsung disetujui]
            │
            ▼
        ┌──────────┐
        │ menunggu │
        └────┬─────┘
             │
        ┌────┴────┐
        ▼         ▼
    [Setujui]   [Tolak]
        │         │
        ▼         ▼
   ┌─────────┐  ┌────────┐
   │disetujui│  │ditolak │
   └─────────┘  └────────┘
```

- `disetujui`: pipeline nomor + kode verifikasi + PDF (atomik, rollback jika gagal); PDF tersedia 7 hari.
- `ditolak`: final, tidak bisa edit.

---

## 8. Edge Cases

| # | Case | Penanganan |
|---|---|---|
| 1 | NIK duplikat saat profiling | Tolak + pesan jelas (unique violation 23505) |
| 2 | NIK diubah ke anggota keluarga | Diizinkan (fitur keluarga) — hanya snapshot request |
| 3 | Preview gagal load | Tombol "Muat Ulang Preview" |
| 4 | `catatan_admin` kosong saat tolak | Tombol aksi disabled |
| 5 | Double click "Setujui" | Tombol loading + disabled |
| 6 | PDF gagal/timeout/OOM | Rollback status ke `menunggu`, buang nomor & kode, `processing_at` dibersihkan |
| 7 | Walk-in tanpa akun | `user_id = NULL`, `admin_pembuat_id` terisi; insert langsung `disetujui` setelah PDF berhasil |
| 8 | Kode verifikasi tidak ditemukan | "Kode Tidak Ditemukan" |
| 9 | Surat ditolak ingin ngajuin lagi | Buat permohonan baru (bukan edit) |
| 10 | TTE/stempel belum dikonfigurasi | Tolak approve dengan pesan |
| 11 | Nomor surat duplikat | Unique violation → "Nomor surat sudah dipakai" |
| 12 | NIK sudah punya akun saat walk-in | **Belum diimplementasi** (backlog: opsi auto-link) |
| 13 | PDF sudah lewat 7 hari (file dihapus / cek umur) | `pdf_final_url` NULL atau `disetujui_at` > 7 hari → tombol unduh diganti "hubungi kantor desa"; verifikasi tetap jalan |
| 14 | Cron jalan berulang | Idempoten — guard `pdf_final_url IS NOT NULL` |
| 15 | Sesi refresh token expired di middleware | Middleware menulis ke `request.cookies` + `response.cookies` (Set-Cookie) → tidak ada `refresh_token_already_used` |

---

## 9. Checklist (semua terpenuhi)

- [x] Role `admin_desa` aktif (enum sejak Phase 1; assign via `supabase/upgrade_admin_desa.sql`)
- [x] Menu "Layanan Surat" di navbar (`enabled = true` di `NAV_ITEMS`)
- [x] Tab "Riwayat Surat" aktif di `/profil`
- [x] Route middleware: `/layanan-surat/*` → `warga`, `/admin/surat/*` → `admin_desa`, `/verifikasi/*` publik
- [x] Tabel baru + RLS + soft delete
- [x] react-pdf setup (`@react-pdf/renderer` + `serverExternalPackages` + font di `public/fonts`)
- [x] Snapshot pattern di semua generate dokumen
- [x] TTE/stempel di bucket private; PDF di bucket private; signed URL untuk download
- [x] Kolom `disetujui_at` + cleanup job retensi PDF 7 hari (Vercel Cron + cek umur di endpoint unduh + fallback `supabase/cleanup_pdf.sql`)

---

## 10. Setup Manual (Admin & TTE)

### 10.1. Aktifkan akun `admin_desa`

1. Login Google sekali di website (akun tersebut → role `warga`).
2. Jalankan `supabase/upgrade_admin_desa.sql` di SQL Editor (ganti email).
3. Verifikasi: buka `/admin/surat` (login sebagai akun tsb) → masuk dasbor.

### 10.2. Konfigurasi Kepala Desa + TTE/stempel

1. Siapkan **PNG transparan** tanda tangan & stempel.
2. Upload via dasbor admin `/admin/surat/config` (atau langsung ke bucket PRIVATE `surat-ttd`).
3. Set config Kades (via dasbor atau SQL sementara):
   ```sql
   INSERT INTO public.surat_kades_config (id, nama_kades, nip_kades, jabatan, ttd_cap_url, stempel_url)
   VALUES (1, 'Nama Kades', NULL, 'Kepala Desa', 'ttd.png', 'stempel.png')
   ON CONFLICT (id) DO UPDATE SET ttd_cap_url = EXCLUDED.ttd_cap_url, stempel_url = EXCLUDED.stempel_url;
   ```
4. Ganti `nama_kades` dengan nama asli saat data resmi tersedia.

### 10.3. Env vars

| Tempat | Var |
|---|---|
| **Vercel** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, **`CRON_SECRET`** |
| **Supabase Dashboard** | Redirect URLs harus include domain Vercel (dan `http://localhost:3000/**` untuk dev) |
| **Google Cloud OAuth** | Authorized redirect URI = `https://<project>.supabase.co/auth/v1/callback` (tidak berubah) |
