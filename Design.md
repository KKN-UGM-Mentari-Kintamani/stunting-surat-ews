# Design System — Integrated Village Portal

**Scope:** Phase 1 (Stunting Detection, Nutrition Education, MPASI) + Phase 2 (Letter Service) — with explicit reserved space for Phase 3 (Disaster EWS).

**Status:** v1.0

## 0. Design Philosophy

This portal serves two roles with very different emotional states when opening the same application:

- **A mother**, anxious or curious about her child's growth and development, opening the calculator from a smartphone with a limited connection.
    
- **A village official**, serving a queue of citizens at the village hall, needing to approve letters as quickly and accurately as possible without numbering errors.
    

This design must be **calming** for the first role and **reliable/assertive** for the second — without feeling like two different applications. One visual language, two "registers" of use.

Guiding principles:

1. **Calm, not clinical.** Colors and typography should not feel like a hospital diagnostic tool. The reference is the MCH (Maternal and Child Health) handbook and Posyandu — familiar, not intimidating.
    
2. **Official, not rigid.** The letter module must feel as trustworthy as a state document, but remain approachable — the reference is the village's official letterhead and carbon receipt books at the village hall, not cold bureaucratic forms.
    
3. **Content is decoration.** The distinct visual "signature" elements in this system are drawn directly from actual materials already present in the product — the WHO growth curve and torn receipt paper — not generic, tacked-on ornaments.
    
4. **Lightweight for low-end smartphones.** Every design decision (number of fonts, motion, images) is re-evaluated against reality: many users access this via low-spec Androids and rural cellular connections.
    

## 1. Color Palette

### 1.1. Core Palette (Brand)

|   |   |   |
|---|---|---|
|**Token**|**Hex**|**Role**|
|`--growth-green`|`#2F6B4F`|Main brand color. Deep paddy green, not bright mint green. **Intentionally the same** as the "Normal" status text color on the calculator — this brand _literally is the color of "healthy/growing well"_.|
|`--paper`|`#FBF8F1`|Base background. Warm ivory white, mimicking folio/HVS paper at the village hall — not sterile black-and-white.|
|`--ink`|`#2B2823`|Main text color. Warm brown-black (like pen ink), not solid `#000000`.|
|`--gold-header`|`#A9762E`|Secondary accent, specific to administrative/letter modules. Faded gold-bronze, referencing the lines of official letterheads & state document covers — **not** terracotta orange.|
|`--official-blue`|`#35526E`|Tertiary accent for trust/navigation elements (links, secondary buttons), referencing general government institution colors.|
|`--stamp-red`|`#A13D3D`|Strictly reserved: only for authentic "stamp/seal" elements and definitive destructive actions (e.g., "Reject" button). **Not used decoratively.**|

### 1.2. Semantic Colors — Health Module (calculator status)

Exact reuse from the Phase 1 PRD revision (`01_PRD_PHASE_1.md`), pastel and calm:

|   |   |   |
|---|---|---|
|**Status**|**Background**|**Text/Icon**|
|Normal|`#E3F6ED`|`#2F6B4F` (= `--growth-green`)|
|Mild Risk|`#FFF3D9`|`#8A6116`|
|High Risk|`#FDE4E1`|`#9C3B33`|

### 1.3. Semantic Colors — Letter Module (request status)

Designed so that **"approved" uses the same green as "Normal"** (one universal language for "good outcome" across the system), while **"rejected" intentionally does not use the same color as health's "High Risk"** — so citizens do not mistakenly associate "letter rejected" with "sick child".

|   |   |   |   |
|---|---|---|---|
|**Status**|**Background**|**Text/Icon**|**Notes**|
|Waiting|`#EEF1F4`|`#51606E`|Neutral blue-grey, not yellow (yellow is used for "action needed", not "passive waiting").|
|Needs Revision|`#F5E9D3`|`#8A6116`|`--gold-header` color family, indicating "citizen action is required".|
|Approved|`#E3F6ED`|`#2F6B4F`|Exactly the same as the health "Normal" token — consistent "done/good" meaning throughout the portal.|
|Rejected|`#F7E3E1`|`#A13D3D`|`--stamp-red` color family, not health's `--pastel-coral`. Administrative rejection ≠ health risk.|

### 1.4. Reserved for Phase 3 (Disaster EWS) — **important, do not use now**

The stunting calculator intentionally uses **pastel** colors so as not to be frightening. But disaster warnings in Phase 3 **must feel urgent** — if they use the same pastel palette, citizens might get used to ignoring the "alert" color because it's already associated with relaxed calculator results. Therefore, the following two colors are **locked early on and must not be borrowed** by other modules:

|   |   |   |
|---|---|---|
|**Token**|**Hex**|**Role**|
|`--alert-yellow`|`#F5B700`|Caution level disaster alert. High saturation, intentionally contrasts with health's `--pastel-yellow`.|
|`--alert-red`|`#D62828`|Danger/evacuation level disaster alert. High saturation, firm contrast with both `--pastel-coral` and `--stamp-red`.|

### 1.5. Contrast Rules

All text/background combinations above must be validated to ≥ **4.5:1** (WCAG AA) before final implementation — some pastel pairings above approach the threshold and must be checked with a contrast checker tool when actual styling is applied, not just assumed safe from the hex code. Statuses **must not rely solely on color** — every status badge must be accompanied by an icon + text label (see §6.3).

## 2. Typography

This system deliberately limits itself to **only 2 font families** (not 3), because loading performance on low-end smartphones and village connections is an explicit priority in the PRD (Phase 1 PRD §5.4 Chart.js optimization, etc.) — every additional font is an extra network request.

|   |   |   |
|---|---|---|
|**Role**|**Font**|**Reason**|
|**Display** (H1, H2, hero titles)|**Literata** (serif, Google Fonts)|A warm serif designed for comfortable long reading — suitable for parent educational content, while also possessing the right formal weight for the context of official documents. Used **sparingly**, only for large titles.|
|**Body / UI** (all other text, buttons, forms, navigation)|**Plus Jakarta Sans** (sans-serif, Google Fonts)|A humanist typeface designed in Indonesia — a choice rooted in the local context of this product, highly legible on small screens, supports diacritics well. Acts as the primary workhorse for the entire interface.|
|**Data/numbers** (Z-scores, letter numbers, dates)|Plus Jakarta Sans, **tabular figures** variant (`font-variant-numeric: tabular-nums`)|Does not add a third font — simply activates the tabular numbers feature on the already loaded body font, so numbers in tables/letter numbers align neatly.|

### 2.1. Type Scale (mobile → desktop)

|   |   |   |   |
|---|---|---|---|
|**Level**|**Mobile**|**Desktop**|**Font & Weight**|
|Display XL (Hero H1)|28px / 1.15|40px / 1.1|Literata SemiBold|
|Display L (Section H2)|22px / 1.25|28px / 1.2|Literata Medium|
|Heading (H3, card title)|18px / 1.3|20px / 1.3|Jakarta Sans SemiBold|
|Body|16px / 1.6|16px / 1.6|Jakarta Sans Regular|
|Body Small / Caption|13px / 1.5|13px / 1.5|Jakarta Sans Regular — used sparingly (timestamps, small notes)|
|Label / Button|15px / 1|15px / 1|Jakarta Sans Medium, letter-spacing 0.01em|
|Data/Numbers|16px|16px|Jakarta Sans Medium, tabular-nums, letter-spacing 0.02em|

> **Accessibility rule:** Body content text (not captions) is never below 15px — many target users are parents/elderly village officials who are sensitive to small font sizes.

### 2.2. Font Performance

- Load the 2 font families above with **only the weights the type scale requires** (§2.1), not the entire range:
    - **Literata** (display): Medium (500) + SemiBold (600) — 2 weights.
    - **Plus Jakarta Sans** (body): Regular (400) + Medium (500, untuk Label/Button) + SemiBold (600, untuk H3) — 3 weights. *(Revisi: §2.1 membutuhkan Medium untuk label & SemiBold untuk H3, sehingga "max 2 weights" di versi 1.0 diperbaiki menjadi 3 untuk body.)*
    
- Use `font-display: swap` and subset Latin + Indonesian characters (no need to subset Cyrillic/Greek etc.).
    
- Preload only the weights used above the _fold_ (Jakarta Sans Regular + SemiBold); lazy-load the rest.
    

## 3. Layout & Grid

### 3.1. Approach

Mobile-first, according to the PRDs. Breakpoints:

|   |   |
|---|---|
|**Name**|**Width**|
|Mobile|< 640px|
|Tablet|640px – 1024px|
|Desktop|> 1024px|

Max container: **1120px**, gutter padding 20px on mobile, 32px on tablet/desktop.

### 3.2. Spacing Scale (4px basis)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` (px) — used consistently for padding, gaps, and margins across all components. There are no "in-between" spacing values outside this scale.

### 3.3. Mobile Navigation — **revision recommendation from PRD**

The original Phase 1 PRD (`01_PRD_PHASE_1.md`) mentions a _hybrid_ navbar (desktop navbar + mobile hamburger). For the target users (parents, sometimes non-digital natives), **hamburger menus have a discoverability issue** — menus hidden behind icons are often not found. Recommendation:

- **Mobile:** use a **bottom tab bar** (a pattern already familiar from Indonesian public service/banking apps — e.g., mobile banking, JMO, etc.), 4 items remain visible: **Home (Calculator) · Education · Letter Service · My Profile**. Icon + small text label below it (not just an icon).
    
- **Desktop:** horizontal navbar as in the original PRD (logo, calculator, education, letter service, profile).
    
- Role-based hidden menus ("Posyandu Dashboard", "Letter Admin Dashboard") still appear via the Profile dropdown, not on the bottom tab bar (as they are only relevant to a small fraction of users).
    

### 3.4. Concept Wireframes (ASCII)

**Hero + Calculator Results (mobile):**

```
┌─────────────────────────┐
│ Village Logo     ☰      │  <- lightweight header
├─────────────────────────┤
│  "Let's check your      │
│   little one's growth"  │  <- Display, Literata
│  [Short input form]     │
│  [ Check Now ]          │
├─────────────────────────┤
│  ╭ Pastel status badge ╮│  <- appears after submit
│  │ ●  Needs attention   │  <- icon + label, not just color
│  ╰──────────────────────╯│
│  "Targets & Steps" Card  │
│  ~ small curve line ~    │  <- signature element
│  [Recommendation 1][2][3]│
├─────────────────────────┤
│ [Calculator][Education] │
│ [Letters]   [Profile]   │  <- bottom tab bar
└─────────────────────────┘
```

**Letter Document Card (admin/citizen):**

```
┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐   <- dotted perforation edge (signature)
┊ SKTM · 470/012/VII/2026 ┊
┊ ─────────────────────── ┊  <- thin line --gold-header
┊ Name: Budi S.            ┊
┊ Status: [Approved]       ┊  <- green badge (same as "Normal")
┊ [ Download PDF ]         ┊
└───────────────────────────┘
```

## 4. Radius & Elevation

|   |   |   |
|---|---|---|
|**Token**|**Value**|**Used for**|
|`--radius-sm`|8px|Form inputs, small buttons|
|`--radius-md`|14px|Cards, primary buttons|
|`--radius-lg`|24px|Hero panels, modals|
|`--radius-pill`|999px|**Only** status badges — not used for main buttons (so it doesn't feel like a generic startup app).|

**Elevation:** flat "paper" style, not neumorphism/glassmorphism. Cards use a thin border (`1px solid #E7E1D3`) + very subtle shadow (`0 2px 8px rgba(43,40,35,0.06)`). No heavy shadows or large blurs.

## 5. Signature Elements

Two visual elements that distinguish this system — **drawn directly from the product's actual content**, not tacked-on decorations:

### 5.1. "Growth Line" — Health Module

A curved line motif, derived from the shape of the WHO growth curve which **is actually generated by this product itself** (Chart.js in the dashboard). Used as:

- A subtle decorative element in the Home Page hero background (thin line, low opacity `--growth-green` color).
    
- A small icon inside the "Targets & Next Steps" card.
    
- **Specific loading indicator**: instead of a generic spinner, use a line animation that "draws itself" (path-drawing SVG) — connecting the waiting moment with the product's meaning (growth being calculated), rather than an abstract spinner.
    
- Inter-section dividers on the education page.
    

### 5.2. "Perforation Edge" — Letter Module

A jagged/dotted edge like the tear of a carbon receipt book at the village hall. Used on:

- The top edge of document/letter cards (see wireframe §3.4).
    
- The "Download Final PDF" button — a perforation line separates the button from the status badge, as if the document is "torn" from the queue.
    
- Decorative elements on the `/verifikasi/[kode]` page to emphasize the impression of a "genuine cut-out from an official document".
    

> **Important constraint:** both of these signature elements are used **sparingly** — one per page/key component, not repeated excessively until they feel like a generic decorative pattern.

## 6. Core Components

### 6.1. Buttons

|   |   |   |   |
|---|---|---|---|
|**Variant**|**Color**|**Radius**|**Used for**|
|Primary|Solid `--growth-green`, white text|`--radius-md`|Main actions (Check Now, Submit Letter, Approve)|
|Secondary|Outline `--official-blue`|`--radius-md`|Secondary actions (Back to Edit, Reload)|
|Tertiary|Text only, `--official-blue`|—|Lightweight action links ("See All")|
|Destructive|Outline `--stamp-red`, requires confirmation dialog|`--radius-md`|Reject, Delete data — **never** solid/flashy so it doesn't look overly "dangerous" visually, but still clearly distinct from other buttons.|

Minimum tap target **44×44px** — crucial for the admin "Approve" button (avoiding double clicks which is already identified as a race condition risk in the Phase 2 PRD).

### 6.2. Form Inputs

- Labels above the field (not placeholder-as-label — placeholders disappear when typing begins and confuse less experienced users).
    
- Helper text below the field, `--ink` color 70% opacity.
    
- Error state: error text in `--stamp-red` + small icon below the field — **not** the entire field border turning thick red (too startling for a health context).
    

### 6.3. Status Badges

Mandatory structure: `[icon] [text label]` inside a pastel pill (`--radius-pill`). Colors follow the tables in §1.2/§1.3. The text label is always explicitly written (e.g., "Needs Attention", not just a plain yellow color) — ensuring the status does not lose its meaning for color-blind users.

### 6.4. Cards

- **Recommendation Card** (education/MPASI): thumbnail + title + age category tag.
    
- **Targets & Next Steps Card**: status badge + ideal range + contextual CTA + small Growth Line motif.
    
- **Letter Document Card**: perforation edge, letter number uses tabular data font, letter module status badge.
    

### 6.5. Tables (Admin — Approval Queue)

- Very subtle zebra striping (`--paper` vs `#F5F1E7`), not thick lines between rows.
    
- Number/date columns use tabular data fonts to align.
    
- Action buttons per row (Approve/Revise/Reject) still meet the 44px tap target even in dense tables — prioritize admin usability over visual density.
    

### 6.6. Empty States & Loading

- Empty state: simple flat illustration (see §8) + 1 clear CTA, corresponding to the text already specified in the PRD ("No letter history yet...").
    
- Loading: skeleton UI with a subtle pulse animation (not high-contrast light-dark shimmer), or the Growth Line animation for the calculator/health dashboard context.
    

## 7. Motion & Interaction

- **Gradual reveal, not all at once:** calculator results appear sequentially (status badge → target card → recommendations), each with a light fade+slide (150ms, 80ms stagger between elements) — providing a calm "reading" rhythm, rather than the entire screen changing abruptly.
    
- **Meaningful specific loading:** see Growth Line in §5.1 — used to replace generic spinners at points relevant to the child growth context.
    
- **`prefers-reduced-motion` must be respected** across the system — fallback to instant opacity changes without slide/path animations.
    
- No excessive hover animations on touch devices (mobile-first); subtle hover animations are only relevant for desktop elements (e.g., education cards lifting slightly on mouse hover).
    

## 8. Iconography & Illustration

- **Icons:** line icon style, 1.5px stroke, rounded ends, 24px grid. Consistent single icon set across the portal (e.g., a Lucide-style icon family). Avoid literal scary medical icons (large exclamation marks, red crosses, danger signs) for health statuses — use softer shapes (leaves, sprouts, hearts) that align with the empathetic tone of the PRD.
    
- **Illustrations:** flat style, colors from the core palette (no neon gradients), representation of diverse Indonesian families/children — not generic stock photos. Used only in empty states and onboarding, not excessively as full-page decorations.
    

## 9. Official Document Design (Letter PDFs) — **Intentionally Deviating from Web Tokens**

The final PDF documents (SKTM, Business Certificates, etc.) **do not fully follow the palette/tokens above**, because these are legal documents that must follow Indonesian Official Letter conventions and remain clearly legible when photocopied/scanned — they are not representations of the application's "brand":

- **Pure white** background (`#FFFFFF`), not warm `--paper` — to maximize scan/photocopy contrast.
    
- **Solid black** text (`#000000`), not `--ink` — standard official document, not a stylistic preference.
    
- Document body font: standard official print serif widely supported by the PDF renderer (`@react-pdf/renderer`, see Revisi 1.4) — **Liberation Serif** (metric-compatible clone of Times New Roman) — **not** Literata, because citizens/receiving institutions recognize official letter formats by their own typographic conventions, and cross-system PDF rendering compatibility is more important than brand consistency at this point.
    
- `--gold-header` is only used as **a single thin line** below the letterhead — no gradients or other color decorations in the body of the document.
    
- The Village Head's TTE/stamp area is placed according to convention (bottom right), the verification code + issue date is printed in the footer with a small tabular data font.
    

## 10. Accessibility & Performance — Summary

- Text/bg contrast minimum 4.5:1 in all combinations (§1.5).
    
- Status is never just color — always icon + label (§6.3).
    
- Tap targets ≥ 44×44px, especially for admin approval buttons (§6.1, §6.5).
    
- Maximum 2 font families, maximum 2 weights each, `font-display: swap` (§2.2).
    
- Layout withstands browser zoom up to 200% without breaking (important for elderly users/village officials).
    
- `prefers-reduced-motion` is fully respected (§7).
    
- Images/illustrations are compressed & lazy-loaded, in line with the 2MB compression requirement already in the CMS PRD.
    

## 11. Anti-Cliche Checklist — Why This System Isn't the "Default AI Look"

Three visual patterns that most often emerge as defaults from generative AI tools — and why this system consciously avoids them:

1. **Warm beige + high-contrast serif + terracotta accents** → This system uses growth green as the primary color (not terracotta), and serifs (Literata) are only used sparingly in large titles, paired with a humanist sans-serif throughout the body — not a dominant serif across the entire page.
    
2. **Near-black background + single neon accent** → Completely irrelevant to the product context (village public service, not a tech/gaming product), not used anywhere in this system.
    
3. **Broadsheet/newspaper style, zero radius, dense hairlines** → This system uses soft radii (`--radius-md` 14px) and cards, not a sharp newspaper grid — because the intended impression is "friendly village hall", not "formal print media".
    

## Appendix: Consolidated Token Table (for Developer Handoff)

```
:root {
  /* Brand Core */
  --growth-green: #2F6B4F;
  --paper: #FBF8F1;
  --ink: #2B2823;
  --gold-header: #A9762E;
  --official-blue: #35526E;
  --stamp-red: #A13D3D;

  /* Health Status */
  --status-normal-bg: #E3F6ED;
  --status-normal-fg: #2F6B4F;
  --status-mild-risk-bg: #FFF3D9;
  --status-mild-risk-fg: #8A6116;
  --status-high-risk-bg: #FDE4E1;
  --status-high-risk-fg: #9C3B33;

  /* Letter Status */
  --status-waiting-bg: #EEF1F4;
  --status-waiting-fg: #51606E;
  --status-revision-bg: #F5E9D3;
  --status-revision-fg: #8A6116;
  --status-approved-bg: #E3F6ED;
  --status-approved-fg: #2F6B4F;
  --status-rejected-bg: #F7E3E1;
  --status-rejected-fg: #A13D3D;

  /* Reserved for Phase 3 — do not use before EWS is active */
  --alert-yellow: #F5B700;
  --alert-red: #D62828;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 24px;
  --radius-pill: 999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;

  /* Typography */
  --font-display: "Literata", serif;
  --font-body: "Plus Jakarta Sans", sans-serif;
}
```

## Revision History

|   |   |
|---|---|
|**Version**|**Changes**|
|1.0|Initial version — compiled based on the entire Phase 1 & Phase 2 PRDs and their revisions (health status pastel colors, "My Profile" naming, `/edukasi` structure, and all RBAC/navigation decisions in the `00_MASTER_CROSS_PHASE_CONSISTENCY.md` master consistency document).|
|1.1|**Implementation reconciliation (Frontend Phase 1):**<br/>- §2.2: Jakarta Sans dimuat **3 weight** (400/500/600) bukan "max 2" — karena §2.1 memerlukan Medium (label) + SemiBold (H3). Literata tetap 2 weight (500/600).<br/>- §8: Empty state memakai komponen shadcn `Empty` (ikon sederhana) sebagai pengganti ilustrasi flat — diterima sebagai penyederhanaan ringan, bukan melanggar prinsip "calm".<br/>- §5.1: Calculator berjalan **instan (O(1), tanpa jaringan)** sehingga animasi "growth line" sebagai loading tidak diperlukan; transisi hasil tetap memakai fade+slide dengan `prefers-reduced-motion` fallback.<br/>- §3.3: Desktop navbar memakai layout **logo di kiri, seluruh menu di kanan** (keputusan iterasi UI); mobile bottom tab 4 item sesuai spec.|
|1.2|**Deviations from Phase 1 PRD (recorded for consistency):**<br/>- Auth memakai **Supabase Auth** (Google OAuth via @supabase/ssr), bukan Auth.js/NextAuth (PRD §5.1) — demi konsistensi dengan backend/middleware/RLS yang sudah dibangun.<br/>- Village Growth Log (PRD §4.2D, tabel read-only anak berisiko) **belum dibangun** — ditunda.|
|1.3|**Phase 2 (Layanan Surat):** menambahkan semantik status surat (§1.3) yang telah dipetakan ke token `--status-*`; retensi PDF 3 hari (deviasi dari Master Doc §4, dicatat di `02_FLOW_PHASE_2.md`).|
|1.4|**PDF surat: `@react-pdf/renderer` (bukan Puppeteer).** Surat resmi dirender in-process di server action Vercel (`renderToBuffer`), tanpa VPS/worker. Font body dokumen memakai **Liberation Serif** (setara Times New Roman, Design §9) — di-bundle di `public/fonts/`, bukan Literata. Preview tetap React component (tanpa TTE/nomor).|
