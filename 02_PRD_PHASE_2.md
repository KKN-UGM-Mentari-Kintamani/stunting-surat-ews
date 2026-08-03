# Product Requirements Document (PRD)

**Project:** Integrated Village Portal - Phase 2

**Module:** Village Instant Letter Service System (Online & Offline Integration)

**Status:** Revision 3.0 (Revision Status & Rejection Reason, Locked Numbering Format, Document Verification, Final Puppeteer, Explicit RLS)

> **Mandatory reference:** This document is linked to `00_MASTER_CROSS_PHASE_CONSISTENCY.md`. The Role, Navigation, and RBAC structure below is an excerpt synced with the master document — if there are any changes, the master document is the source of truth.

## 1. Executive Summary

Phase 2 expands the functionality of the Village Portal by introducing an integrated letter administration system (O2O - _Online to Offline_). This system allows citizens to request letters independently _online_, while also serving as the _Core System_ for village officials serving citizens who come directly to the village hall (_walk-in_). The main features of this phase are centralized automatic letter numbering, _Smart Preview_, systematic application of the Village Head's Electronic Signature (TTE), document authenticity verification, and the reduction of manual bureaucracy.

## 2. Goals & Success Metrics (KPIs)

- **Primary Goal:** Provide a digital "Single Window" for all village letter issuances (both _online_ requests and _offline_ face-to-face services) so that letter numbering is centralized and organized.
    
- **Success Metrics:**
    
    - No more incidents of duplicate, overlapping, or missed letter numbers in the village hall register book.
        
    - Administration turnaround time for _walk-in_ citizens drastically reduced from an average of >20 minutes to <5 minutes (due to _auto-fill templates_).
        
    - **[New]** The rate of starting requests over from scratch (due to minor data errors) is reduced, replaced by a revision flow.
        

## 3. Release Scope (MVP Phase 2)

**In Scope (MVP Phase 2):**

- _Progressive Profiling_ (Trigger-based Main Citizen Profile Registration).
    
- _Editable Auto-fill_ Form System (Can be edited to request on behalf of a family member/spouse/child or others).
    
- 3-5 Static Letter Template Components (Hardcoded in Next.js: e.g., Certificate of Incapacity/SKTM, Business Certificate, Domicile Cover Letter).
    
- _Smart Preview Engine_ (HTML preview before submission).
    
- _Workflow Approval_ for Admins, including revision flow (see §4.2).
    
- "Create Letter" feature specifically for Admins (_Walk-in_ Service / Citizens coming to the village hall).
    
- Automatic Letter Numbering _Generator_ & Village Head TTE Attachment when the letter is in the Approved status.
    
- **[New]** Public page for document authenticity verification via a unique code.
    

**Out of Scope (Deferred to Future Phases):**

- _Dynamic Template Builder / Form Builder CMS_
    
- WhatsApp Notification Integration (Users monitor independently via _dashboard_).
    
- Disaster Mitigation / EWS Module (Enters Phase 3).
    
- Document verification via direct QR code scanning (MVP only provides manual code input on the verification page; camera-based QR scanning can follow later).
    

## 4. Functional Requirements & Information Architecture (UI/UX)

### 4.1. Citizen Flow (Online Applicant)

1. **Progressive Profiling (Onboarding):** When a citizen clicks the "Letter Service" menu for the first time, the system detects if the NIK/Address is empty. Citizens are required to complete their **Main Profile** (NIK, Family Card/KK, Address, Occupation). If previously filled, this step is skipped. Data collection consent for NIK/KK follows the provisions in `00_MASTER_CROSS_PHASE_CONSISTENCY.md` §4 (expanding the consent given during Phase 1 registration).
    
2. **Smart Form Filling (Editable Auto-fill):**
    
    - The citizen selects the letter type.
        
    - The applicant identity form is **automatically pre-filled** with account profile data.
        
    - **Flexibility (Family Feature):** Citizens can directly delete and edit the fields in the form (e.g., replacing their NIK and Name with their spouse's NIK) if the letter is intended for another family member. The _default_ profile data will not change, only this specific request data.
        
    - Citizens fill in service-specific fields based on the selected letter type (e.g.: "Business Name").
        
3. **Smart Preview:** The system renders a letter preview (HTML) that contains the _input_ data, but without the Village Head's stamp/TTE and letter number. There are "Back to Edit" and "Submit Letter" buttons.
    
4. **Tracking:** Monitor status: `Menunggu` (Waiting) → `Perlu Revisi` (Needs Revision) → `Disetujui` (Approved) / `Ditolak` (Rejected) **[REVISION, expanded flow]**.
    
    - If `Perlu Revisi`: citizens see admin notes (see §4.2), can edit the same request form and resubmit without creating a new request from scratch.
        
    - If `Disetujui`: citizens can download the Final PDF, complete with the verification code printed on the document.
        
    - If `Ditolak`: citizens see the rejection reason (`catatan_admin` column).
        

### 4.2. Village Admin Flow (Management, Approval & Offline Service)

1. **Walk-In Service (Admin Create Letter):**
    
    - A citizen comes to the village hall without a smartphone/online account.
        
    - Admin opens the _Dashboard_ (`/admin/surat`) → "Create New Letter (Walk-In)".
        
    - Admin selects the letter type, then types the citizen's ID Card (KTP) identity data.
        
    - Upon submission, this request immediately enters the _Approval_ queue (joining the _online_ queue).
        
2. **Approval Workflow & Numbering Automation — [REVISION]:**
    
    - The Verifier Admin opens the `Menunggu` (Waiting) queue list.
        
    - The Admin has 3 action choices (not 2): **"Setujui" (Approve)**, **"Minta Revisi" (Request Revision)**, **"Tolak" (Reject)**.
        
        - **Minta Revisi:** admin must fill in `catatan_admin` (text field, mandatory, e.g.: "KK number swapped with husband, please fix"). Status changes to `revisi`, the request returns to the citizen to be edited and resubmitted without needing a new request.
            
        - **Tolak:** admin must fill in `catatan_admin` as the final rejection reason. The request can no longer be edited; citizens must create a new request if they want to reapply.
            
        - **Setujui:** triggers the automated process below.
            
    - **System works behind the scenes when "Setujui" is clicked:**
        
        1. Generates the latest sequential Letter Number according to the format locked in §5.3 (immune to _Race Conditions_).
            
        2. Generates a unique `kode_verifikasi` (verification code) (see §5.3) for checking document authenticity.
            
        3. Inserts the Village Head's Signature/Stamp into the document.
            
        4. Freezes the data into a static PDF file that can no longer be changed (rendered via Puppeteer, see §5.1).
            
3. **Village Head Identity Configuration:** Admins can update the Village Head's Name, NIP, Position, and upload the TTE image (_Transparent PNG_).
    

### 4.3. Public Flow: Document Authenticity Verification — **[New]**

- Every final PDF contains a `kode_verifikasi` (e.g., printed in the letter footer as text + code).
    
- Anyone (e.g., the receiving institution of the letter) can open `/verifikasi/[kode]` and input/access the code.
    
- The page displays minimal info for authenticity confirmation **without leaking full personal data**: letter type, letter number, issue date, status ("Valid Document" / "Code Not Found"). The applicant's name is displayed in a masked format (e.g.: "Bu**i S.**") — not the full name, to avoid personal data exposure on public pages without authentication.
    

### 4.4. UX States (Interface Conditions)

- **Empty State:** If a citizen has never created a letter, the _dashboard_ displays a simple illustration and friendly text: "No letter history yet. Need administration? Create your first letter here."
    
- **Loading State:** When the Admin clicks "Setujui" and the system is generating the PDF via Puppeteer (can take 2-5 seconds — longer than initial estimates due to _headless browser rendering_, see §5.1), the button must change to a _Loading_ status (disabled) with the text "Publishing Document..." to prevent admins from double-clicking and ruining the letter numbering sequence.
    
- **Error State:** If the _Letter Preview_ fails to load due to network issues, show a "Reload Preview" button. **[New]** If the PDF generation process via Puppeteer fails (e.g., timeout/out-of-memory on VPS), the request status **does not change to "Disetujui"** — the system must rollback the status to `menunggu` and display an error to the admin, so no letter number is generated without a valid final PDF (see also §6, transactional integrity).
    

## 5. Technical Architecture & Database

### 5.1. Tech Stack (PDF Rendering) — **[REVISION 2.0: final decision = react-pdf, no VPS]**

- Letter _Templates_ are hardcoded as React components (_Client Component_) for the _preview_ feature.
    
- **Final output: `@react-pdf/renderer`** (replaces the earlier Puppeteer-on-VPS decision). The approved letter is rendered **in-process inside the Vercel server action** (`renderToBuffer`) — no separate worker, no VPS, no headless browser.
    
- **Rationale for switching (rev 2.0):** the letter layout is simple (kop surat, identity table, paragraphs, TTE image, number + verification code), render takes ~100–200ms, and removing Puppeteer eliminates the entire VPS/Chromium/worker complexity. `@react-pdf/renderer` bundles fontkit WASM; ensure `serverExternalPackages` includes it in `next.config.ts` and render on the Node runtime (not Edge).
    
- **Font:** official letter body uses **Liberation Serif** (metric-compatible clone of Times New Roman, GPL+font-exception) — satisfies Design §9 (official print serif) without bundling proprietary TNR. Fonts stored in `public/fonts/` so they're available in the serverless bundle.
    
- **TTE image:** fetched from the PRIVATE `surat-ttd` bucket via service client → embedded as base64 in the PDF. Never exposed on a public URL.
    
- **Transactional integrity (unchanged from PRD):** nomor + kode + PDF render + upload + `status=disetujui` are one unit. On failure the letter stays `menunggu` and `processing_at` is cleared so the admin can retry; the nomor is not consumed.
    
- **Counter race:** at this scale (1–2 approvals/day) the nomor counter is incremented via upsert (not `SELECT ... FOR UPDATE`); risk of duplicate ≈ 0. If volume grows, reintroduce a DB lock.
    

### 5.2. Database Schema (Update from Phase 1) — **[REVISION]**

1. **`warga_profil`** (1-to-1 with `users` table)
    
    - `user_id` (PK, FK), `nik` (Unique), `no_kk`, `tempat_lahir`, `tanggal_lahir`, `agama`, `pekerjaan`, `alamat`, `deleted_at` (**new**, soft delete — see `00_MASTER_CROSS_PHASE_CONSISTENCY.md` §3).
        
2. **`surat_kades_config`** (Single-row config table)
    
    - `id`, `nama_kades`, `nip_kades`, `ttd_cap_url`.
        
3. **`master_jenis_surat`**
    
    - `id` (PK), `nama_surat`, `kode_klasifikasi` (e.g.: "400" or "470" - important for letter number prefix format), `is_active`.
        
4. **`permohonan_surat`** (Centralized Transaction Log) **[REVISION: new columns]**
    
    - `id` (PK)
        
    - `user_id` (FK, **Nullable**. Value is NULL if the letter is created by Admin for a _Walk-in_ citizen without an account).
        
    - `admin_pembuat_id` (FK to `users`. Records which admin served if it's a _Walk-in_ citizen).
        
    - `admin_verifikator_id` (FK to `users`, **new**. Records which admin approved/rejected/requested revision).
        
    - `jenis_surat_id` (FK)
        
    - `nomor_surat_final` (String, auto-generated, unique, format locked in §5.3).
        
    - `kode_verifikasi` (String, unique, **new** — for `/verifikasi/[kode]` page).
        
    - `data_isian_snapshot` (JSONB: Stores all KTP data & specific inputs _exactly at the time the letter was requested_. Crucial because identity forms are freely editable).
        
    - `status` (ENUM: `'menunggu'`, `'revisi'`, `'disetujui'`, `'ditolak'` — **[REVISION: added `'revisi'`]**).
        
    - `catatan_admin` (Text, nullable, **new** — mandatory when status is `revisi` or `ditolak`, stores reasons/improvement instructions).
        
    - `pdf_final_url` (Link to printed document).
        

### 5.3. Letter Numbering & Verification Code — **[New, locking ambiguity in previous drafts]**

- **Letter number format:** `{kode_klasifikasi}/{nomor_urut}/{bulan_romawi}/{tahun}` — example: `470/012/VII/2026`.
    
- **Counter scope:** `nomor_urut` resets at the beginning of every year, and **is calculated per `kode_klasifikasi`** (not one global counter across all letter types). This means SKTM and Business Certificates have their own number sequences even if approved on the same day.
    
- **Verification code:** short random string (e.g., 8 alphanumeric characters, example: `A3F9K2LP`), independent of the letter number, specifically created so it cannot be guessed/reverse-engineered by the public (unlike letter numbers which are sequential and guessable).
    

## 6. Security Requirements & Document Integrity — **[REVISION]**

- **Data Immutability (Data Freezing):** The final PDF file MUST be rendered using data from the `data_isian_snapshot` JSONB column, not by recalling it from the profile table. This maintains the letter's validity even if the citizen's profile changes 2 years later.
    
- **Signature Protection (TTE):** The Village Head's PNG Signature image is strictly prohibited from being exposed on public URLs. It must be stored in a _Private Bucket_ (Supabase RLS). Only the _Server (Backend)_ is allowed to access it during the PDF printing process via Puppeteer.
    
- **Database Lock (Race Condition):** The _backend_ logic when generating letter numbers must use _Database Transactions_ (e.g.: `SELECT ... FOR UPDATE`) that lock the counter row **per `kode_klasifikasi` per year** (not a global lock), so that approval of different letter types do not unnecessarily wait for each other.
    
- **Transactional Integrity Approval — [New]:** The "Approve" process (generate number → generate verification code → render PDF via Puppeteer → save `pdf_final_url`) must be treated as a single unit of work. If Puppeteer rendering fails midway, the generated letter number must be rolled back (or marked as failed and not reused) so that no letter numbers "disappear" without documents — status returns to `menunggu`, not stuck in an unclear state.
    
- **Row Level Security (RLS) — [New, explicit]:**
    
    - `warga_profil`: citizens can only `SELECT`/`UPDATE` their own rows (`user_id = auth.uid()`); `admin_desa` has read access for approval/walk-in purposes.
        
    - `permohonan_surat`: citizens can only `SELECT` their own rows and `INSERT` new requests/`UPDATE` when status is `revisi`; only `admin_desa` is allowed to `UPDATE` `status`, `catatan_admin`, `nomor_surat_final`, `kode_verifikasi` columns.
        
    - The `/verifikasi/[kode]` endpoint accesses data via a limited _service role_ (not regular user session RLS) which only exposes the non-sensitive columns mentioned in §4.3.
        
- **Personal Data Compliance:** Follows global consent, retention, and right-to-erasure provisions — see `00_MASTER_CROSS_PHASE_CONSISTENCY.md` §4. NIK/KK data in `warga_profil` falls under specific personal data categories, retention & soft delete must be applied (see §5.2).
    

## 7. Roadmap & Future Phases

- **Phase 3 (Disaster Mitigation EWS Dashboard):** Addition of a disaster alert information portal. (Awaiting coordination results with village officials regarding the procedure for determining hazard status).
    
- **Phase 4 (Dynamic Template Builder):** CMS creation so Admins can independently assemble forms and letter _layouts_ without modifying _source code_.
    
- **[New] Future Phase (optional):** Document verification via direct camera QR code scan (currently MVP is limited to code input/access at `/verifikasi/[kode]`).
    

## Appendix: Revision History

|   |   |
|---|---|
|**Version**|**Changes**|
|Final Draft|Initial version.|
|3.0|Added `revisi` + `catatan_admin` status (§4.1, §4.2, §5.2); locked numbering format per classification per year + lock per classification (§5.3, §6); added `kode_verifikasi` & public page `/verifikasi/[kode]` (§4.3, §5.2, §5.3); finalized Puppeteer as PDF tech with VPS implication notes (§5.1); added transactional integrity for approval process (§6); added explicit RLS for `warga_profil` and `permohonan_surat` (§6); admin path moved to `/admin/surat` following RBAC matrix in master doc; added soft delete to `warga_profil` (§5.2).|
|3.1|**PDF tech revised: Puppeteer-on-VPS → `@react-pdf/renderer` on Vercel (in-process).** Removes the VPS/worker requirement entirely. Approved letter rendered via `renderToBuffer` in the server action, uploaded to the private `surat-pdf` bucket, then marked `disetujui`. Font = Liberation Serif (Times New Roman metric-compatible, Design §9). VPS-related notes (§5.1) replaced with react-pdf notes (`serverExternalPackages`, Node runtime, public/fonts bundle).|