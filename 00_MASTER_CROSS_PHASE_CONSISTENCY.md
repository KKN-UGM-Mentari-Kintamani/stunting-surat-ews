# Supporting Document: Cross-Phase Consistency

**Project:** Integrated Village Portal

**Scope:** Phase 1 (Stunting & Education) + Phase 2 (Letter Service)

**Objective:** To serve as a single point of reference for elements that must remain consistent across all phases, ensuring that each new phase's PRD does not redefine (and potentially conflict with) established decisions. This document **must be reviewed** every time a new phase is initiated (including Phase 3 later).

## 1. Role & Permission Matrix (Globally Applicable)

The `role` enum in the `users` table has been defined **completely since Phase 1**, even though some values are only actively used in subsequent phases:

```
role ENUM ('warga', 'kader_kesehatan', 'admin_desa')
```

|   |   |   |
|---|---|---|
|**Role**|**Active Since**|**Description**|
|`warga` (citizen)|Phase 1|General public, access to public features & personal data|
|`kader_kesehatan` (health cadre)|Phase 1|Midwives/Posyandu Cadres, access to education module & village nutrition data|
|`admin_desa` (village admin)|Phase 2 (**implemented**; reserved since Phase 1)|Village officials, access to letter module & Village Head configuration|

> **Important Note:** The `role` column and its enum were fully created during the Phase 1 migration to avoid a risky `ALTER TYPE` when Phase 2 is released. The `admin_desa` value was simply not assigned to any user until Phase 2 became active — it was not added as an afterthought. Phase 2 (Letter Service) is now **implemented**; `admin_desa` accounts are activated via `supabase/upgrade_admin_desa.sql`.

### Route Permission Matrix

|   |   |   |   |
|---|---|---|---|
|**Route**|**warga**|**kader_kesehatan**|**admin_desa**|
|`/` (calculator, public)|✅|✅|✅|
|`/edukasi` (public)|✅|✅|✅|
|`/profil` (citizen dashboard)|✅ (own data only)|❌|❌|
|`/admin/kesehatan/*` (education CMS, nutrition log)|❌|✅|❌|
|`/layanan-surat/*` (request letter)|✅ (own data only)|❌|❌|
|`/admin/surat/*` (approval, walk-in, Village Head config)|❌|❌|✅|
|`/verifikasi/[kode]` (verify letter authenticity, public)|✅|✅|✅|

Middleware **no longer hardcodes a single role per prefix**. Instead, it reads this matrix per route (implementation: a `routePermissions` configuration object looped in Next.js Edge Middleware).

## 2. Unified Navigation (Update from `01_PRD_PHASE_1.md` §4.1)

The "Letter Service" menu is **integrated into the main navbar** alongside the stunting calculator & education, not as a separate application. **Layout (iterasi UI, tercatat di Design.md Revisi 1.1): logo di kiri, seluruh menu di kanan.** Item navigasi:

1. Village Logo
    
2. Stunting Calculator (Home)
    
3. Education & MPASI Center
    
4. **Letter Service** _(active since Phase 2)_
    
5. Auth/Profile → dropdown: **"My Profile"** (label changed from "Mother's Dashboard" to be gender-neutral, consistent with the term "warga" used throughout the system, and avoiding mixing English terms like "User"), "Logout". *Implementasi: "Profil Saya" tampil di dropdown akun (tidak sebagai link menu utama) — keputusan iterasi UI.*
    
6. Hidden Menu (role-based):
    
    - "Dasbor Posyandu" → appears if `role = kader_kesehatan`
        
    - "Dasbor Admin Surat" → appears if `role = admin_desa`
        


`/profil` (citizen dashboard) remains a single page, adding a "Letter History" tab next to the "Child Growth History" tab — avoiding a separate dashboard so citizens are not confused by having two "profiles".

## 3. Database Conventions (Applicable to All Phases)

- **Snapshot pattern**: Whenever the system generates a final document/result of a legal or historical nature (PDF letters, saved stunting calculation results), the data **must be copied as a snapshot** (JSONB) at the time of the event. It must not be re-joined to master tables whose values might change in the future.
    
- **Soft delete**, not hard delete, for all tables storing citizen data (`anak`, `pengukuran`, `permohonan_surat`, `warga_profil`) — utilizing a `deleted_at` column (nullable timestamp). This supports the right to erasure (see §4) without breaking historical integrity/village aggregate statistics.
    
- **RLS must be explicitly defined** on every new table that stores personal data; relying solely on application-level protection is prohibited.
    

## 4. Personal Data Protection Compliance (PDP Law) — Globally Applicable

Because the system stores child health data (specific category) and NIK/KK (personal data), the following provisions apply across all phases:

- **Explicit consent**: A consent checkbox for data collection & usage during Progressive Profiling/initial registration, not implicit assumption. *[Implementation note: a single shared `ConsentGate` component records `users.consent_given_at` once, shown inline on `/layanan-surat` & `/profil` — see `02_PHASE_2_LAYANAN_SURAT.md` §4.2.]*
    
- **Data retention**: Child measurement data & letter data are retained as long as the account is active; if the account is deleted, the data is _anonymized_ (not completely wiped) for village aggregate statistics purposes, except for legal documents (letters) which must be retained according to village archiving regulations.
    
    > **Recorded deviation (Phase 2):** the **final PDF artifact** is retained for only **7 days** after approval (storage-driven, free-tier friendly), then auto-deleted by a daily cron while `pdf_final_url` is nulled. The **snapshot data** (`data_isian_snapshot` JSONB) is kept indefinitely, and authenticity verification `/verifikasi/[kode]` continues to work from the DB. Details & rationale: `02_PHASE_2_LAYANAN_SURAT.md` §5.3.
    
- **Right to erasure (Right to be Forgotten) / data access**: Citizens can request the deletion/export of their personal data through the village admin (manual process for MVP, self-service form in future phases).
    

## 5. Checklist Before Initiating a New Phase

- [ ] Are there new roles/permissions? → Update matrix in §1.
    
- [ ] Are there new pages? → Update navigation in §2.
    
- [ ] Are there new tables with personal data? → Ensure RLS + soft delete comply with §3.
    
- [ ] Is there a process that generates a final document/result? → Apply the snapshot pattern.
    
- [ ] Review this document with the team before the first sprint of the new phase begins.