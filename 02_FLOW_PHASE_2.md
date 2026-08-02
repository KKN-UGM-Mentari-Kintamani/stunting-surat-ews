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

### 2.1. VPS (compute) — target minimum

| Resource | Minimum | Rekomendasi | Alasan |
|---|---|---|---|
| RAM | 2 GB | **4 GB** | 2× Chromium Puppeteer (300-500MB/instance) + Node/Next.js (~300MB) + OS (~300MB) |
| CPU | 1 vCPU | **2 vCPU** | 1 untuk app, 1 untuk render PDF |
| Disk | 20 GB SSD | 30 GB SSD | Build + Chromium; PDF tidak disimpan di VPS |
| OS | — | Ubuntu 22.04 LTS | Mudah setup Chromium deps |

### 2.2. Database & Storage (Supabase Free)

- **DB PostgreSQL** (free 500MB): `warga_profil`, `permohonan_surat`, `master_jenis_surat`, `surat_kades_config`.
- **Storage buckets:**
  - `surat-pdf` — **PRIVATE**: PDF final (permanen, tidak pernah dihapus).
  - `surat-ttd` — **PRIVATE**: PNG TTE Kades (hanya diakses server).
  - `thumbnails` — **PUBLIC** (dari Phase 1): thumbnail artikel edukasi.
- **Kapasitas:** estimasi 50 user × 5 surat/tahun = 250 PDF (300KB-1MB) ≈ 75-250MB/tahun → free 1GB cukup 4-13 tahun.

### 2.3. Prinsip data

- VPS hanya compute — matinya VPS tidak menghilangkan data.
- PDF dirender dari `data_isian_snapshot` (Snapshot pattern, Master Doc §3), bukan profil live.
- `pdf_final_url` menyimpan **path storage**; download lewat **signed URL** (expired ±1 jam) — tidak pernah URL permanen publik.
- PDF legal = retained permanen (aturan kearsipan desa). Right-to-erasure hanya **anonymize** profil, PDF dipertahankan.

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
| `disetujui` | Badge hijau "Disetujui" | **Download PDF final** (berisi kode verifikasi) |
| `ditolak` | Badge merah "Ditolak" + alasan | Tidak bisa edit; buat permohonan baru |

**Case A4a:** Revisi → resubmit: `status` kembali `menunggu`, `catatan_admin` di-reset, riwayat tetap satu entri.
**Case A4b:** Download PDF via signed URL; tombol disabled jika status belum `disetujui`.

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
5. **Simpan** `pdf_final_url` + `status = 'disetujui'` + `admin_verifikator_id`.

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
- `pdf_final_url` (path storage PDF final)
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

---

## 9. Checklist Sebelum Implementasi (Master Doc §5)

- [ ] Role `admin_desa` aktif (sudah di enum sejak Phase 1 — hanya assign ke user)
- [ ] Menu "Layanan Surat" di navbar: flip `enabled = true` di `NAV_ITEMS`
- [ ] Tab "Riwayat Surat" aktif di `/profil` (slot sudah di-reserve)
- [ ] Route middleware: `/layanan-surat/*` → `warga`, `/admin/surat/*` → `admin_desa`, `/verifikasi/*` publik
- [ ] Tabel baru + RLS + soft delete
- [ ] Puppeteer setup di VPS (Chromium deps, concurrency max 2, timeout 15s, reuse browser)
- [ ] Snapshot pattern di semua generate dokumen
- [ ] TTE di bucket private; PDF di bucket private; signed URL untuk download
