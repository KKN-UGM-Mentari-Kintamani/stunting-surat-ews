# Phase 2 Flow — Rancangan Alur Sistem Layanan Surat Desa

**Project:** Integrated Village Portal
**Status:** Draft (sebelum implementasi)
**Referensi wajib:** `02_PRD_PHASE_2.md`, `00_MASTER_CROSS_PHASE_CONSISTENCY.md`, `Design.md`

---

## 1. Peran & Konteks

| Peran | Aktif | Keterangan |
|---|---|---|
| `warga` | Fase 1 | Mengajukan surat secara online |
| `kader_kesehatan` | Fase 1 | Tidak berubah (tidak punya akses surat) |
| `admin_desa` | **Phase 2** | Verifikasi, walk-in, konfigurasi Kades |

`admin_desa` sudah di-reserve di enum `app_role` sejak Phase 1 — **tidak perlu ALTER TYPE** (Master Doc §1).

---

## 2. Arsitektur & Infrastruktur

### 2.1. VPS (compute) — target minimum [REVISION: 1GB]

| Resource | Nilai | Alasan |
|---|---|---|
| RAM | **1 GB** + swap 1-2 GB | 1× Chromium Puppeteer (~400MB, concurrency = 1 + antrian) + Node/Next.js (~250MB) + OS (~200MB) ≈ 850MB |
| CPU | 1 vCPU | Cukup untuk beban 5-20 user aktif/hari |
| Disk | 20 GB SSD | Build + system Chromium; **PDF tidak disimpan di VPS** |
| OS | Ubuntu 22.04 LTS | Setup Chromium deps via apt |

**Cara mencapai 1GB (tetap Puppeteer, selaras PRD):**
- Concurrency Puppeteer diturunkan dari 2 → **1** + antrian render (PRD menulis "max 2", tapi beban approve bersamaan di sini rendah — PDF digenerate saat klik "Setujui", bukan saat submit). Ini penghemat terbesar (~-450MB).
- Pakai **`puppeteer-core` + Chromium dari sistem** (bukan bundle Chromium bawaan; hemat ±170MB disk + deps), dengan flags hemat memori:
  `--disable-gpu --no-sandbox --disable-dev-shm-usage --disable-extensions`
- **Reuse browser instance** (PRD §5.1) — tidak `launch()` setiap request.
- Tambah **swap 1-2GB** sebagai safety net saat peak.
- Preview surat = React client component (tanpa biaya server); Chromium hanya dipakai untuk PDF final.

### 2.2. Database & Storage (Supabase Free)

- **DB PostgreSQL** (free 500MB): `warga_profil`, `permohonan_surat`, `master_jenis_surat`, `surat_kades_config`.
- **Storage buckets:**
  - `surat-pdf` — **PRIVATE**: PDF final (**sementara — lihat §2.3**, dihapus otomatis 3 hari setelah disetujui).
  - `surat-ttd` — **PRIVATE**: PNG TTE Kades (hanya diakses server).
  - `thumbnails` — **PUBLIC** (dari Phase 1): thumbnail artikel edukasi.
- **Kapasitas dengan retensi 3 hari:** rata-rata PDF aktif ≈ (surat disetujui per 3 hari) × 0.5MB. Dengan 50 user × 5 surat/tahun ≈ 250 surat/tahun → rata-rata ~2 PDF aktif/tiap 3 hari ≈ **±1-2MB saja dalam storage** — sangat hemat.

### 2.3. Prinsip data & retensi PDF

- VPS hanya compute — matinya VPS tidak menghilangkan data.
- PDF dirender dari `data_isian_snapshot` (Snapshot pattern, Master Doc §3), bukan profil live.
- `pdf_final_url` menyimpan **path storage**; download lewat **signed URL** (expired ±1 jam) — tidak pernah URL permanen publik.
- **[REVISION] Retensi PDF = 3 hari:** 3 hari setelah `status = 'disetujui'`, PDF **dihapus otomatis** dari bucket `surat-pdf` dan `pdf_final_url` dikosongkan.
  - **Yang TIDAK hilang:** `data_isian_snapshot` (JSONB) tetap tersimpan di `permohonan_surat` — data surat abadi.
  - **Verifikasi tetap berfungsi:** `/verifikasi/[kode]` membaca dari `permohonan_surat` (jenis, nomor, tanggal, status, nama ter-mask), **bukan** dari file PDF.
  - Setelah lewat 3 hari, tombol unduh warga diganti pesan: *"Masa unduh telah berakhir. Silakan hubungi kantor desa."*
  - **Catatan kepatuhan:** ini menyimpang dari Master Doc §4 (dokumen legal idealnya dipertahankan utk kearsipan). Kompromi: snapshot data tetap ada; hanya artefak PDF yang dibatasi. Warga disarankan menyimpan salinan PDF sebelum masa unduh berakhir.
- Right-to-erasure: anonymize profil; PDF sudah otomatis dibersihkan dalam 3 hari.

### 2.4. Mekanisme pembersihan PDF (cleanup job)

- Kolom baru `disetujui_at` (timestamptz) di `permohonan_surat`, diisi saat status → `disetujui`.
- **Cron harian** (Supabase pg_cron atau script di VPS):
  1. SELECT `permohonan_surat` WHERE `status = 'disetujui'` AND `disetujui_at < now() - interval '3 days'` AND `pdf_final_url IS NOT NULL`.
  2. Hapus object dari bucket `surat-pdf` (via service role).
  3. UPDATE `pdf_final_url = NULL` pada row tsb.
- Idempoten & aman dijalankan ulang (guard `pdf_final_url IS NOT NULL`).

---

## 3. User Flow — Warga Online

### 3.1. Progressive Profiling (Onboarding NIK/KK)

```
[Klik "Layanan Surat"]
  │
  ├─ User belum login → /login?next=/layanan-surat
  │
  ├─ consent_given_at = NULL → Consent gate (PDP §4, diperluas untuk NIK/KK)
  │
  ├─ warga_profil kosong → Form lengkap (NIK, KK, tempat/tgl lahir, agama, pekerjaan, alamat)
  │     • Validasi NIK: 16 digit numerik
  │     • Duplicate NIK → tolak dengan pesan jelas
  │     • Simpan ke warga_profil
  │
  └─ warga_profil sudah ada → langsung ke Smart Form
```

### 3.2. Smart Form (Editable Auto-fill)

1. Pilih jenis surat dari `master_jenis_surat` yang `is_active = true`.
2. Form identitas terisi otomatis dari `warga_profil`.
3. **Fitur Keluarga:** field bisa diedit/dihapus (mis. ganti NIK & nama dengan milik suami/anak). Profil default **tidak berubah** — hanya snapshot request ini.
4. Isi field khusus jenis surat (mis. "Nama Usaha" untuk SKU).
5. Validasi client → lanjut ke preview.

### 3.3. Smart Preview

- Render HTML preview **tanpa** nomor surat & TTE.
- Tombol: **"Kembali Edit"** + **"Ajukan Surat"**.
- Case: preview gagal load jaringan → tombol **"Muat Ulang Preview"** (PRD §4.4).
- Submit → INSERT `permohonan_surat`:
  - `status = 'menunggu'`
  - `data_isian_snapshot` = JSONB semua data identitas + field khusus **persis saat submit**
  - `user_id` = user aktif, `admin_pembuat_id` = NULL

### 3.4. Tracking & Riwayat (tab "Riwayat Surat" di `/profil`)

| Status | Tampilan warga | Aksi warga |
|---|---|---|
| `menunggu` | Badge biru-grey "Menunggu" | Menunggu admin |
| `revisi` | Badge gold "Perlu Revisi" + catatan admin | **Edit & ajukan ulang** (permohonan yang sama, ID tetap) |
| `disetujui` | Badge hijau "Disetujui" | **Download PDF final** (berisi kode verifikasi) — tersedia **3 hari** sejak disetujui |
| `ditolak` | Badge merah "Ditolak" + alasan | Tidak bisa edit; buat permohonan baru |

**Case A4a:** Revisi → resubmit: `status` kembali `menunggu`, `catatan_admin` di-reset, riwayat tetap satu entri.
**Case A4b:** Download PDF via signed URL; tombol disabled jika status belum `disetujui`.
**Case A4c (masa unduh berakhir):** jika `pdf_final_url` sudah dikosongkan (PDF dihapus setelah 3 hari) → tombol unduh diganti teks *"Masa unduh telah berakhir. Silakan hubungi kantor desa."* Status badge tetap "Disetujui"; verifikasi keaslian tetap berfungsi via `/verifikasi/[kode]`.

---

## 4. Admin Flow — `/admin/surat`

### 4.1. Walk-In Service

1. Admin → "Buat Surat (Walk-In)".
2. Pilih jenis surat → **ketik manual** data KTP warga.
3. Submit → masuk queue `menunggu` yang sama dengan online.
   - `user_id = NULL`, `admin_pembuat_id = id_admin`.
   - Case: NIK sudah punya akun → opsi auto-link agar riwayat tampil di `/profil` warga.

### 4.2. Approval Workflow

Admin buka queue `menunggu`. **3 aksi** (PRD §4.2):

| Aksi | Syarat | Efek |
|---|---|---|
| **Minta Revisi** | `catatan_admin` wajib diisi | Status → `revisi`, kembali ke warga. Tidak ada nomor dibuat |
| **Tolak** | `catatan_admin` wajib (alasan final) | Status → `ditolak`. Tidak bisa diedit lagi; warga harus buat baru |
| **Setujui** | — | Memicu pipeline §4.3. Tombol loading + disabled selama proses |

Case B2a: `catatan_admin` kosong → tombol aksi disabled.

### 4.3. Pipeline "Setujui" (transaksi atomik)

Urutan **satu unit kerja**; jika gagal di tengah → rollback penuh:

1. **Generate nomor surat** — `{kode_klasifikasi}/{nomor_urut}/{bulan_romawi}/{tahun}` → `470/012/VII/2026`
   - Counter **per kode_klasifikasi per tahun** (reset 1 Januari).
   - **Race condition:** `SELECT ... FOR UPDATE` pada counter row (bukan global lock).
2. **Generate `kode_verifikasi`** — 8 karakter acak (A3F9K2LP), tidak bisa ditebak.
3. **Sisipkan TTE Kades** — baca dari bucket PRIVATE `surat-ttd` (server only).
4. **Render PDF via Puppeteer** — data dari `data_isian_snapshot`.
5. **Simpan** `pdf_final_url` + `status = 'disetujui'` + `admin_verifikator_id` + `disetujui_at = now()` (dipakai untuk retensi 3 hari).

**Case B3a (PDF gagal / timeout 15s / OOM):** rollback → status kembali `menunggu`, nomor & kode yang sudah dibuat **dibuang** (tidak dipakai ulang). Admin dapat pesan error.
**Case B3b (double click):** tombol disabled selama loading → aman.

### 4.4. Konfigurasi Kepala Desa

- Update nama Kades, NIP, jabatan, upload TTE (PNG transparan → bucket PRIVATE `surat-ttd`).
- Case B4a: TTE belum dikonfigurasi → tolak approve dengan pesan jelas.

---

## 5. Public Flow — Verifikasi Keaslian `/verifikasi/[kode]`

- Siapa saja (mis. bank/instansi penerima) buka `/verifikasi/[kode]` atau input kode.
- Query `permohonan_surat` by `kode_verifikasi` via **service role** (bukan session RLS).
- Tampilkan **minimal:** jenis surat, nomor surat, tanggal terbit, status ("Dokumen Valid" / "Kode Tidak Ditemukan").
- **Nama warga di-mask** → `Bu**i S.**` — tanpa NIK/KK/alamat (PRD §4.3).

---

## 6. Diagram State Permohonan

```
        [warga submit / admin walk-in]
                    │
                    ▼
                ┌─────────┐
                │ menunggu │◄───────────────────────────┐
                └────┬────┘                             │
                     │                                  │
        ┌────────────┼────────────┐                     │
        ▼            ▼            ▼                     │
   [Minta Revisi]  [Setujui]   [Tolak]                  │
        │            │            │                     │
        ▼            ▼            ▼                     │
   ┌─────────┐  ┌──────────┐  ┌────────┐               │
   │  revisi  │  │disetujui │  │ditolak │               │
   └────┬────┘  └──────────┘  └────────┘               │
        │                                               │
        └── warga edit & resubmit ──────────────────────┘
```

- `disetujui`: pipeline nomor + kode verifikasi + PDF (atomik, rollback jika gagal).
- `ditolak`: final, tidak bisa edit.

---

## 7. Database Schema Baru (Phase 2)

### 7.1. `warga_profil` (1:1 dengan `users`)

- `user_id` (PK, FK), `nik` (UNIQUE), `no_kk`, `tempat_lahir`, `tanggal_lahir`, `agama`, `pekerjaan`, `alamat`, `deleted_at` (soft delete).

### 7.2. `surat_kades_config`

- `id`, `nama_kades`, `nip_kades`, `ttd_cap_url` (path ke bucket private).

### 7.3. `master_jenis_surat`

- `id`, `nama_surat`, `kode_klasifikasi` (mis. "400"/"470"), `is_active`.

### 7.4. `permohonan_surat` (transaction log)

- `id` (PK)
- `user_id` (FK, **nullable** — NULL untuk walk-in)
- `admin_pembuat_id` (FK, admin yang melayani walk-in)
- `admin_verifikator_id` (FK, admin yang approve/revisi/tolak)
- `jenis_surat_id` (FK)
- `nomor_surat_final` (string, unique, format §5.3 PRD)
- `kode_verifikasi` (string, unique)
- `data_isian_snapshot` (JSONB — snapshot identitas + field khusus saat submit)
- `status` (ENUM: `menunggu`, `revisi`, `disetujui`, `ditolak`)
- `catatan_admin` (text, nullable — wajib saat `revisi`/`ditolak`)
- `pdf_final_url` (path storage PDF final; **dikosongkan setelah 3 hari**)
- `disetujui_at` (timestamptz, nullable — diisi saat approve; dasar retensi 3 hari)
- `deleted_at` (soft delete, Master Doc §3)

### 7.5. RLS (PRD §6)

| Tabel | warga | admin_desa |
|---|---|---|
| `warga_profil` | SELECT/UPDATE own (`user_id = auth.uid()`) | read |
| `permohonan_surat` | SELECT own, INSERT, UPDATE **hanya saat status `revisi`** | UPDATE status/catatan/nomor/kode |
| `surat_kades_config` | — | ALL |
| `master_jenis_surat` | read (untuk dropdown) | manage |

---

## 8. Edge Cases yang Harus Ditangani

| # | Case | Penanganan |
|---|---|---|
| 1 | NIK duplikat saat profiling | Tolak + pesan jelas |
| 2 | NIK diubah ke anggota keluarga | Diizinkan (fitur keluarga) — hanya snapshot request |
| 3 | Preview gagal load | Tombol "Muat Ulang Preview" |
| 4 | `catatan_admin` kosong saat revisi/tolak | Tombol aksi disabled |
| 5 | Double click "Setujui" | Tombol loading + disabled |
| 6 | PDF gagal/timeout/OOM | Rollback status ke `menunggu`, buang nomor & kode |
| 7 | Walk-in tanpa akun | `user_id = NULL`, `admin_pembuat_id` terisi |
| 8 | Kode verifikasi tidak ditemukan | "Kode Tidak Ditemukan" |
| 9 | Surat ditolak ingin ngajuin lagi | Buat permohonan baru (bukan edit) |
| 10 | TTE belum dikonfigurasi | Tolak approve dengan pesan |
| 11 | Nomor surat race (2 admin approve bersamaan) | `SELECT ... FOR UPDATE` per kode_klasifikasi/tahun |
| 12 | NIK sudah punya akun saat walk-in | Opsi auto-link ke akun warga |
| 13 | PDF sudah lewat 3 hari (file dihapus) | `pdf_final_url` NULL → tombol unduh diganti "hubungi kantor desa"; verifikasi tetap jalan |
| 14 | Cleanup job jalan berulang | Idempoten — guard `pdf_final_url IS NOT NULL` |

---

## 9. Checklist Sebelum Implementasi (Master Doc §5)

- [ ] Role `admin_desa` aktif (sudah di enum sejak Phase 1 — hanya assign ke user)
- [ ] Menu "Layanan Surat" di navbar: flip `enabled = true` di `NAV_ITEMS`
- [ ] Tab "Riwayat Surat" aktif di `/profil` (slot sudah di-reserve)
- [ ] Route middleware: `/layanan-surat/*` → `warga`, `/admin/surat/*` → `admin_desa`, `/verifikasi/*` publik
- [ ] Tabel baru + RLS + soft delete
- [ ] Puppeteer setup di VPS (system Chromium, concurrency 1 + antrian, timeout 15s, reuse browser)
- [ ] Snapshot pattern di semua generate dokumen
- [ ] TTE di bucket private; PDF di bucket private; signed URL untuk download
- [ ] Kolom `disetujui_at` + cleanup job retensi PDF 3 hari (pg_cron/script VPS)

---

## 10. Setup Manual (Admin & TTE)

### 10.1. Aktifkan akun `admin_desa`

1. Login Google sekali di website (akun tersebut → role `warga`).
2. Jalankan `supabase/upgrade_admin_desa.sql` di SQL Editor (ganti email).
3. Verifikasi: buka `/admin/surat` (login sebagai akun tsb) → masuk dasbor.

### 10.2. Konfigurasi Kepala Desa + TTE placeholder

Belum ada gambar TTE resmi → pakai tanda tangan pengembang sebagai placeholder:

1. Siapkan **PNG transparan** tanda tangan (bisa foto tanda tangan, potong bg-nya).
2. Upload ke bucket PRIVATE `surat-ttd`:
   - Dashboard → Storage → `surat-ttd` → Upload → path `ttd.png`.
3. Set config Kades (via dasbor admin `/admin/surat` nanti, atau SQL sementara):
   ```sql
   INSERT INTO public.surat_kades_config (id, nama_kades, nip_kades, jabatan, ttd_cap_url)
   VALUES (1, 'Nama Kades', NULL, 'Kepala Desa', 'ttd.png')
   ON CONFLICT (id) DO UPDATE SET ttd_cap_url = EXCLUDED.ttd_cap_url;
   ```
4. Ganti `nama_kades` dengan nama asli saat data resmi tersedia.

### 10.3. Env vars

| Tempat | Var |
|---|---|
| **Vercel** | `WORKER_URL` (http://VPS_IP:8080), `WORKER_SECRET` |
| **VPS worker** (`worker/.env`) | `WORKER_SECRET` (sama), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_CONNECTION_STRING`, `CHROMIUM_EXECUTABLE_PATH` |
