# PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Project Name:** Integrated Village Portal (Phase 1: Early Stunting Detection System & MPASI Education)

**Document Version:** 4.0 (Revision: Cross-Phase Role Consistency, Personal Data Compliance, LMS Boundary Validation)

> **Status: COMPLETED — historical reference.** Phase 1 has been fully built. This document describes the decisions at the time of Phase 1 and is kept for history/context; for the live cross-phase decisions refer to `00_MASTER_CROSS_PHASE_CONSISTENCY.md`, for the (implemented) letter module refer to `02_PHASE_2_LAYANAN_SURAT.md`.

> **Mandatory reference:** This document is linked to `00_MASTER_CROSS_PHASE_CONSISTENCY.md`. The Role, Navigation, and Security sections below are synchronized excerpts with the master document — if there are changes, the master document is the source of truth.

## 1. Executive Summary

This system is the foundation (Phase 1) of the Integrated Village Portal. This module focuses on the digitalization of toddler health monitoring at the village level. The application provides an early stunting detection calculator based on WHO standards (Guest & Registered User), a directory of nutritional education and complementary feeding (MPASI) recipes, and an aggregate reporting system for Village Midwives/Posyandu Cadres. This system is built with modern web architecture (Next.js) prioritizing scalability, accessibility, and search engine optimization (SEO), while preparing the *database* for integration with the Letter Administration module (Phase 2) and EWS (Phase 3).

## 2. Goals & Success Metrics (KPIs)

- **Primary Goal:** Increase parents' nutritional literacy awareness independently, provide structured access to MPASI information, and make it easier for health cadres to map stunting risks in the village through centralized digital data.
- **Success Metrics (Qualitative & Quantitative):**
    - *Adoption Rate:* The number of citizens/parents who register (Google SSO) and register at least 1 child profile.
    - *Engagement:* The number of public stunting calculator uses (measured through hits on the calculation function) and the Click-Through Rate on MPASI menu recommendations on the results page.
    - *Content Update:* The activity of Village Midwives/Cadres in using the CMS to publish local educational materials.

## 3. Release Scope (MVP - Minimum Viable Product Phase 1)

- Authentication (Google Single Sign-On).
- Public Early Stunting Detection Calculator (WHO 2006 LMS Method).
- Mother's Profile & Child Growth History Management (User Dashboard).
- Nutrition Education & MPASI Menu Directory (based on age range).
- Integrated Content Management System (CMS) for Health Admins.

## 4. Functional Requirements & Information Architecture (UI/UX)

Using a clean interface approach focused on mobile devices (*Mobile-First Design*).

### 4.1. Main Navigation Structure — **[REVISION]**

> This navigation structure is a Phase-1-only version. The combined version (after Phase 2 is active, including the "Letter Service" menu) is in `00_MASTER_CROSS_PHASE_CONSISTENCY.md` §2 — navbar implementation should ideally be prepared flexibly (data-driven menu items) so that adding Phase 2 menus doesn't require major refactoring.

1. **Village Logo** (Back to Home)
2. **Stunting Calculator** (Home)
3. **Education & MPASI Center** (Opens `/edukasi`)
4. **Auth / Profile** ("Login" button using Google. If *logged in*, changes to a *dropdown* menu: **"My Profile"** — [REVISION, label changed from "Mother's Dashboard"], "Logout").
    - *Reason for label change:* the system already consistently uses the term **"Warga"** (Citizen) as a role/actor name (`role: warga`), and this page in Phase 2 is also used by citizens in general (not just mothers of toddlers) to manage letter history. "My Profile" is gender-neutral and avoids mixing English terms ("User") into the Indonesian UI which consistently says "warga" throughout the system.
5. *Hidden Menu (Role Based):* **Posyandu Dashboard** (Only appears if the account has `kader_kesehatan` access).

*Implementation recommendation:* build the navbar component with an array of menu configurations (not hardcoded static JSX), so adding a menu item in Phase 2 only requires adding a data entry, not modifying the component.

### 4.2. Multi-Page Structure (User Flow)

**A. Home Page (Main Calculator)**

- **Main Focus:** The front page focuses on SEO and fast accessibility. No heavy decorative elements.
- **Hero Section:** Interactive input form directly on the front page. Requests input: Gender, Age (Months), Weight (kg), Height/Length (cm).
- **Input Validation — [REVISION, new]:**
    - Age (months): strictly within the range of **0–60 months**, matching the limits of the WHO 2006 LMS reference table available in the system. Outside this range, the submit button is disabled and a message appears: *"This calculator is valid for children aged 0-60 months (5 years). For children outside this range, please consult directly with Posyandu/Puskesmas."*
    - Height/weight: proactive validation of reasonable ranges per age group (preventing extreme inputs like height 500cm, already mentioned in §4.3 Error State — emphasizing here that validation ranges refer to WHO plausible thresholds, not arbitrary numbers).
- **Result Section (Detection Results) — [REVISION]:**
    - Appears dynamically after the button is clicked.
    - **Parent UI — Pastel Color Palette (not solid/bold colors):**
        - Normal → pastel mint green (background `#E3F6ED`, text `#2F6B4F`)
        - Mild Risk → pastel yellow (background `#FFF3D9`, text `#8A6116`)
        - High Risk → pastel pink/coral (background `#FDE4E1`, text `#9C3B33`) — **not** solid/bright red
        - Implementation: *rounded* badge/card, soft icons (not "!" exclamation marks or danger signs), color only as accents (thin borders + pastel background), not full-color blocks dominating the screen. The goal is so "Risk" results do not feel like an alarm/verdict for parents.
        - Language remains empathetic and non-technical (example: not "Your child is STUNTED", but "Your little one's growth needs a little extra attention").
    - **"Targets & Next Steps" Card — [New]:** Placed right below the status badge, containing:
        - **Ideal range** for weight and/or height for the current child's age & gender, calculated from the **Median value (parameter M)** of the WHO reference table ± 1 SD (not just displaying the child's status, but concrete targets to aim for). Example display: *"Ideal weight for a 14-month-old girl: around 8.2–10.1 kg."*
        - **Next steps recommendations**, tone varies by status:
            - *Normal:* appreciation + advice to maintain current diet.
            - *Mild Risk:* concrete advice (direct link to 2-3 nutritional MPASI recipes appropriate for age) + invitation to routinely monitor at Posyandu.
            - *High Risk:* invitation to visit Posyandu/Puskesmas with supportive language, not scaring them (example: "Let's consult at the nearest Posyandu so your little one gets the best assistance" — not "Go to the doctor immediately, dangerous condition").
    - **Medical UI:** "Clinical Details (For Health Workers)" *Accordion* containing precise Z-Score values and WHO Median Reference Values (kept separate/collapsed from the parent UI to avoid confusion).
    - **Contextual Recommendations (Cross-selling Education):** Below the detection results, 3 recommendation cards for MPASI recipes or nutritional education appear that are **automatically filtered according to the child's age** just inputted. There is a "See All" button pointing to the `/edukasi` directory. **[Integration note — see §4.2B]:** the education directory age categories are now expanded up to 60 months so these recommendations are never empty, regardless of the child's age within the calculator's range.
    - **Action Button:** "Save to Growth History". If *guest*, triggers the *Login* modal.

**B. Master Directory (/edukasi) — [REVISION: URL structure & age categories]**

- Visual directory shaped as a *Grid* (Thumbnail, Title, Category).
- **URL Structure — [New]:** The parent route name remains **`/edukasi`** (not changed to `/mpasi`), because the content covers two different types — general Nutrition Articles and MPASI Recipes — and `/mpasi` would make non-recipe nutrition articles feel out of place. For SEO needs (aligned with §7), the structure is split per content type under the same parent:
    - `/edukasi/resep-mpasi/[slug]` — for MPASI recipes
    - `/edukasi/artikel-gizi/[slug]` — for general nutrition articles
    - The `/edukasi` page itself remains a combined directory/grid with Type & Age filters as usual.
- **Navigation Filter — [REVISION: expanded age categories]:** Previously, age categories stopped at 12-24 Months, whereas the calculator is now validated up to 60 months (§4.2A) — this caused contextual recommendations on the calculator result page (Home Page) to be empty for children aged 25-60 months. Age categories revised to **5 categories**:
    1. 0-6 Months (Exclusive Breastfeeding)
    2. 6-8 Months (Initial MPASI)
    3. 9-11 Months (Advanced MPASI)
    4. 12-24 Months (Family Food Transition Period)
    5. **24-60 Months (Toddler/Preschooler)** — *(new)*
    - Type filter remains: Nutrition Articles vs MPASI Recipes.

**C. "My Profile" Page (/profil) — [REVISION: naming]**

> This page is **the exact same page** as the "Profile" mentioned in the Phase 2 PRD — not two separate features. The label is unified as **"My Profile"** (see §4.1) to be consistent with the "warga" (citizen) term used throughout the system, and gender-neutral (Phase 2 walk-ins can be served for any citizen, not just mothers).

- **Profile Summary:** Displays brief information from the *logged-in* user (Name, Email from Google) as well as personal summary metrics like **"Number of Registered Children"**.
- **Child Management:** List of child profiles. Button to add new child data (Name, Gender, Date of Birth).
- **History & Data Visualization:** Uses **Chart.js** to draw a growth trend curve per child (WHO reference Z-score line as *background* vs child's actual data points). Displays historical measurement table.
- **[Reserved, active in Phase 2]** An additional "My Letter History" tab will appear on this dashboard once the Letter module is active — see `00_MASTER_CROSS_PHASE_CONSISTENCY.md` §2. The tab structure on the dashboard component should ideally be designed modularly from the start to anticipate this.

**D. Content Management System (CMS) / Admin Panel (/admin/kesehatan) — [REVISION: path changed]**

> Path changed from `/admin` to `/admin/kesehatan` to avoid conflict with `/admin/surat` to be built in Phase 2, and so permission middleware can distinguish modules clearly (see Master Doc §1).

- Access is strictly limited using Middleware based on `role` type (`kader_kesehatan` only — see Route Permission Matrix in Master Doc).
- **Statistics Dashboard:** Summary of registered children count and village nutritional status aggregate.
- **Content Management (Education):** Input form (CRUD) with a simple *WYSIWYG editor*. Includes format validation and automatic image compression (max 2MB) before uploading to cloud *storage*.
- **Village Growth Log:** *Read-only* table for cadres to see the list of high-risk children and their historical data. *[REVISION: sementara ditunda (belum dibangun pada Frontend Phase 1); akan menyusul sebagai enhancement setelah fase ini.]*

### 4.3. UX States

- **404 (Not Found) & Empty State:** Uses light illustrations relevant to the child/family theme. If a mother newly registers, the *dashboard* displays an *Empty State* guiding them ("No child data yet, let's add your little one's profile").
- **Loading State:** Uses *Skeleton UI* when the system renders graphs from the *database* or loads educational articles.
- **Error State:** Proactive form validation (preventing 500 cm height *input*, see new §4.2 validation). If it fails to load *database* data, the system displays a soft *error* message ("Failed to load data, please try again") without breaking the entire interface.

### 4.4. Progressive Profiling & Consent — **[REVISION, new — PDP Law compliance]**

When a citizen registers for the first time (or when first accessing features requiring personal data):

1. Display explicit **consent screen**: brief explanation of what data is collected (child data, later NIK/KK in Phase 2), what it is used for, and agreement checkbox (must not be pre-checked).
2. Save `consent_given_at` (timestamp) in the `users` table.
3. Provide a mechanism (at minimum: contact village admin for MVP) for citizens wishing to delete/export their personal data — see Master Doc §4.

> **[Superseded — implementation note]** As built, consent is collected via a single shared `ConsentGate` component shown inline on `/layanan-surat` and `/profil` (recorded in `users.consent_given_at`), not in the login dialog. See `02_PHASE_2_LAYANAN_SURAT.md` §4.2.

## 5. Technical Specification & Architecture (Tech Stack)

### 5.1. Core Technology

- **Frontend/Backend:** Next.js (App Router) + Tailwind CSS + shadcn/ui.
- **Authentication:** Supabase Auth (Google OAuth via `@supabase/ssr`). *[DEVIATION — REVISION: versi 4.x menulis Auth.js/NextAuth; implementasi memakai Supabase Auth karena backend/middleware/RLS dibangun di atas @supabase/ssr, lihat Revisi 4.2.]*
- **Database:** PostgreSQL (via Supabase).
- **Visualization:** Chart.js.

### 5.2. Database Structure (High-Level ERD) — **[REVISION]**

1. **`users`**: `id`, `google_id`, `email`, `nama_lengkap`, `role` (enum: `'warga'`, `'kader_kesehatan'`, `'admin_desa'` — **all three values defined since Phase 1**, `admin_desa` is only *assigned* to users when Phase 2 is active, see Master Doc §1), `consent_given_at` (timestamp, **new**), `deleted_at` (nullable timestamp, **new**, for soft delete).
2. **`anak`**: `id`, `user_id` (FK), `nama_anak`, `jenis_kelamin`, `tanggal_lahir`, `deleted_at` (**new**).
3. **`pengukuran`**: `id`, `anak_id` (FK), `tanggal_ukur`, `umur_bulan`, `berat_badan_kg`, `tinggi_badan_cm`, `z_score_tbu`, `z_score_bbu`, `z_score_lingkar_kepala` *(optional, hcfa)*, `z_score_lingkar_lengan` *(optional, acfa)*, `status_hasil`. All Z-scores are snapshotted at measurement time per the Snapshot pattern (Master Doc §3).
4. **`edukasi`**: `id`, `judul`, `slug`, `kategori_umur`, `tipe_konten`, `konten_html`, `thumbnail_url`, `author_id` (FK).

### 5.3. Stunting Calculation Algorithm & Data Complexity

- **Complexity** $O(1)$**:** The WHO 2006 reference table data (LMS method) is **NOT** stored in PostgreSQL to prevent I/O *bottlenecks*. This data is extracted into a *Static Hash Map / JSON* within the *source code*. The time complexity for searching parameters $L, M, S$ based on age is $O(1)$.
- **Reference Data Boundary — [REVISION, new]:** The LMS hash map covers the age range of **0–60 months** (WHO Child Growth Standards for toddlers). Requests outside this range are rejected at the form validation level (see §4.2), not *fallback* to extrapolation, because extrapolating Z-scores outside the reference range is medically invalid.
- **Data Source & Instructions for Conversion to Static JSON — [New, mandatory for development/AI coding assistant team]:**
    - Raw data is available as **26 official WHO `.xlsx` files** (in the `who-standard-data` reference folder), covering indicators: `wfa` (weight-for-age), `lhfa`/`lfa` (length/height-for-age), `bmi` (BMI-for-age), `wfh`/`wfl` (weight-for-height/length), `hcfa` (head circumference-for-age), `acfa`/`tab_acfa` (arm circumference-for-age), each separated by gender (`boys`/`girls`) and by age range (e.g. `0-to-13-weeks`, `0-to-2-years`, `2-to-5-years`, `0-5`, `3-5`).
    - **A build-time script MUST be created** (Node.js with `xlsx`/SheetJS, or Python with `pandas`/`openpyxl` recommended) which:
        1. Reads each `.xlsx` file, extracts the age column (months/weeks) along with **L, M, S** parameters (and/or percentile columns if available, like in the `tab_acfa` file).
        2. **Merges files with overlapping age ranges** into one continuous sequence of months per indicator per gender — example: `bmi_boys_0-to-13-weeks`, `bmi_boys_0-to-2-years`, and `bmi_boys_2-to-5-years` merged into one `bmi.boys` map covering a full 0–60 months, using the granular weekly source for early months if available.
        3. Outputs the merged result as one (or several, per indicator) **static JSON** file with consistent structure, example:
            ```json
            {
              "wfa": {
                "boys": { "0": { "L": ..., "M": ..., "S": ... }, "1": { ... }, "...": "...", "60": { ... } },
                "girls": { "...": "..." }
              },
              "lhfa": { "boys": { "...": "..." }, "girls": { "...": "..." } },
              "bmi": { "boys": { "...": "..." }, "girls": { "...": "..." } },
              "wfh": { "boys": { "...": "..." }, "girls": { "...": "..." } },
              "hcfa": { "boys": { "...": "..." }, "girls": { "...": "..." } },
              "acfa": { "boys": { "...": "..." }, "girls": { "...": "..." } }
            }
            ```
        4. This script is run **once during build/setup** (not runtime), the JSON result is *imported* directly as a static module in the source code — according to the $O(1)$ principle and the prohibition of storing this reference data in PostgreSQL established above.
    - Indicators **`wfa`**, **`lhfa`**, and **`bmi`** are used as **mandatory** inputs for the main stunting calculator (§5.3 LMS formula). Indicators **`wfh`/`wfl`** are used to calculate the **ideal weight range for height** on the "Targets & Next Steps" card (§4.2A) and are included in the calculator's reference data. Indicators **`hcfa`** (head circumference-for-age) and **`acfa`** (arm circumference-for-age) are included in the static JSON as **optional screening fields** — the calculator form exposes them as non-blocking optional inputs; if a health worker fills them, supplementary Z-scores are computed and surfaced in the "Clinical Details (For Health Workers)" accordion (§4.2A). They do NOT block the main stunting status verdict (which is driven by wfa/lhfa/bmi only).
- **Mathematical Formula (LMS Method):**

    If $L \neq 0$:

    $$Z = \frac{(X/M)^L - 1}{L \cdot S}$$

    If $L = 0$:

    $$Z = \frac{\ln(X/M)}{S}$$

    *(X = Child's observation measurement value)*

### 5.4. Chart.js Performance Optimization

- Because the target application is low-spec smartphones, the *backend* MUST format the API JSON *payload* into a `[{x: value, y: value}]` format.
- The client Chart.js configuration must be set to `parsing: false` to save *rendering* memory.
- Enable *Decimation* if the measurement log reaches >50 points.

## 6. Security Requirements — **[REVISION]**

- **Middleware Protection:** Changed from hardcoded single-role to **route-permission matrix** (see Master Doc §1). URLs `/admin/kesehatan/*` are verified by Edge Middleware; only *sessions* with `role === 'kader_kesehatan'` pass. This middleware structure is written generically so Phase 2 only needs to add new route entries (`/admin/surat/*` → `admin_desa`), not rewrite logic.
- **Row Level Security (RLS):** Applied at the PostgreSQL level. Citizens/Mothers (`role === 'warga'`) only have `SELECT` and `INSERT/UPDATE` permissions on the `pengukuran` and `anak` tables related to their own `user_id`.
- **Personal Data Compliance (PDP Law) — [REVISION, new]:** See §4.4 and Master Doc §4 for consent, retention, and right-to-erasure provisions.

## 7. Marketing, SEO & Village Socialization

Marketing strategy does not only rely on *offline* socialization, but also the implementation of advanced SEO structures:

- **Technical SEO & On-Page:**
    - Use of *Semantic HTML* (`<article>`, `<header>`, `<h1>-<h3>` tags).
    - Dynamic *Meta Tags* optimization in Next.js (Specific Title and Description per page, for example: "Village X Stunting Risk Calculator" or "6-Month MPASI Recipes").
    - Automatic *Sitemap.xml* implementation.
- **Structured Data (JSON-LD):** Using *schema.org* `Article` and `HowTo` types for every education/MPASI recipe page to appear optimally in Google Search.
- **Google My Business:** Pinning this website link into the Village Hall's Google Maps profile for instant *ranking* in local searches.

## 8. Future Phases Roadmap (Out of Scope Phase 1)

- **Phase 2 (Letter Service System):** **[COMPLETED — see `02_PHASE_2_LAYANAN_SURAT.md`]** Activating the `admin_desa` role which has been reserved in the enum since Phase 1 (not adding new columns/enums), adding the letter administration *table* (Suket, Cover Letter), and *approval dashboard* at `/admin/surat`.
- **Phase 3 (EWS Dashboard):** Addition of public disaster mitigation notification features without *user* data integration.

---

## Appendix: Revision History

| Version | Changes |
|---|---|
| 3.0 | Restructured reference architecture, added SEO parameters and user profile. |
| 4.0 | Role enum synchronization with Phase 2 (§4.1, §5.2, §8), added 0-60 months LMS age boundary validation (§4.2, §5.3), added consent & personal data compliance (§4.4, §6), changed admin panel path to `/admin/kesehatan` (§4.2D), added soft delete (§5.2), linked to cross-phase consistency master document. |
| 4.1 | §5.3 / §5.2 update: `hcfa`+`acfa` promoted from "future backup" to **optional screening inputs** on the calculator form (with extra `z_score_lingkar_kepala` / `z_score_lingkar_lengan` columns in `pengukuran`). Main stunting verdict still driven by `wfa`/`lhfa`/`bmi` only. |
| 4.2 | **Implementation reconciliation (Frontend Phase 1 + Phase 2 backend):** §5.1 Auth direvisi ke **Supabase Auth** (bukan Auth.js/NextAuth) — konsisten dgn backend @supabase/ssr, middleware, RLS; §4.2D Village Growth Log ditunda; navigasi §4.1 direvisi ke data-driven `NAV_ITEMS` dengan logo kiri + menu kanan & "Profil Saya" di dropdown (detail di Design.md Revisi 1.1–1.2 & Master Doc §2). |