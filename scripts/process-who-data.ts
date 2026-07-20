/* scripts/process-who-data.ts
 * One-time build script: merges WHO 2006 LMS .xlsx files into a static JSON.
 * O(1) runtime lookup per exact month (0..60) for wfa/lhfa/bmi, and per cm
 * for wfh/wfl indicators. hcfa/acfa are optional screening fields (PRD §5.3 v4.1).
 *
 * Why: PRD §5.3 forbids storing this reference data in PostgreSQL; a static
 * hash-map import gives O(1) lookup with zero DB I/O on calculator calls.
 *
 * Run via: npx tsx scripts/process-who-data.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as XLSX from 'xlsx';

interface LmsRow { L: number; M: number; S: number; }
type GenderMap = Record<string, LmsRow>;
type IndicatorMap = Record<'boys' | 'girls', GenderMap>;

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT, '..', 'who-standard-data');
const OUT_FILE = path.join(ROOT, 'src', 'lib', 'data', 'who-zscores.json');

const MAX_MONTH = 60;

function die(msg: string, ctx?: unknown): never {
  // Never swallow errors (AGENTS.md §2). Log with context, fail loudly so the
  // build fails rather than shipping a silently-broken JSON.
  console.error('[process-who-data] FATAL:', msg, ctx ? JSON.stringify(ctx) : '');
  process.exit(1);
}

function findHeaderIndex(header: string[], candidates: RegExp): number {
  if (!header) return -1;
  return header.findIndex(h => candidates.test(String(h || '').trim()));
}

// Parse a single xlsx sheet into [{key, row}] pairs. Defensive: validates that
// L/M/S columns exist and hold finite positive-M numerics (LMS math is undefined otherwise).
function parseLmsSheet(filePath: string): Array<{ key: number; row: LmsRow }> {
  if (!fs.existsSync(filePath)) die('Missing file', filePath);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, blankrows: false });
  if (rows.length < 2) die('Empty or header-only sheet', filePath);

  const header = rows[0].map(c => String(c ?? ''));
  // WHO files use Month / Week / Length / Height for the key column (varies per indicator).
  const keyIdx = findHeaderIndex(header, /^(month|week|length|height|age)$/i);
  const lIdx   = findHeaderIndex(header, /^L$/i);
  const mIdx   = findHeaderIndex(header, /^M$/i);
  const sIdx   = findHeaderIndex(header, /^S$/i);
  if (keyIdx < 0 || lIdx < 0 || mIdx < 0 || sIdx < 0)
    die('Could not find required L/M/S columns', { file: filePath, headerRow: header });

  const out: Array<{ key: number; row: LmsRow }> = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const keyRaw = r[keyIdx];
    const L = Number(r[lIdx]);
    const M = Number(r[mIdx]);
    const S = Number(r[sIdx]);
    if (keyRaw == null || keyRaw === '') continue;
    if (!Number.isFinite(L) || !Number.isFinite(M) || !Number.isFinite(S))
      die('Non-numeric L/M/S', { file: filePath, row: i + 1, raw: r });
    if (M <= 0) die('M must be positive (LMS math undefined)', { file: filePath, row: i + 1 });
    out.push({ key: Number(keyRaw), row: { L, M, S } });
  }
  if (out.length === 0) die('No data rows parsed', filePath);
  return out;
}

// Bucket weekly rows into month buckets 0..3 (approx). PRD §5.3 "use the granular
// weekly source for early months if available". Why floor + last-row-wins:
// WHO week rows are monotonically increasing; the last row in a bucket is closest
// to month-end, giving the most representative L/M/S for that month.
function weeksToMonthly(parsed: Array<{ key: number; row: LmsRow }>): Record<number, LmsRow> {
  const buckets: Record<number, LmsRow> = {};
  for (const { key, row } of parsed) {
    const month = Math.floor((key * 12) / 52.14);
    if (month < 0 || month > 3) continue;   // weekly file only informs months 0..3
    buckets[month] = row;                   // last row wins within bucket
  }
  return buckets;
}

// Merge overlapping age-range layers into months 0..MAX_MONTH.
// `strict:true`  → die if any month is missing (mandatory indicators).
// `strict:false`  → leave undefined months absent (optional indicators e.g. acfa 0..2).
function mergeMonthly(
  layers: Array<{ file: string; kind: 'weekly' | 'monthly-range'; from: number; to: number }>,
  strict: boolean,
): GenderMap {
  const monthMap: Record<number, LmsRow> = {};
  for (const layer of layers) {
    const parsed = parseLmsSheet(path.join(DATA_DIR, layer.file));
    if (layer.kind === 'weekly') {
      const buckets = weeksToMonthly(parsed);
      for (const [mStr, row] of Object.entries(buckets)) {
        const m = Number(mStr);
        if (m >= layer.from && m <= layer.to) monthMap[m] = row;
      }
    } else {
      for (const { key, row } of parsed) {
        const m = Math.round(key);
        if (m >= layer.from && m <= layer.to) monthMap[m] = row;
      }
    }
  }

  if (strict) {
    const gaps: number[] = [];
    for (let m = 0; m <= MAX_MONTH; m++) if (!monthMap[m]) gaps.push(m);
    if (gaps.length) die('Missing months after merge (mandatory indicator)', { gaps, layers });
  }

  const out: GenderMap = {};
  for (let m = 0; m <= MAX_MONTH; m++) if (monthMap[m]) out[String(m)] = monthMap[m];
  return out;
}

// CM-indexed indicator (wfh/wfl use linear measurement in cm as key; 0.5cm granularity).
function buildByCm(boysFile: string, girlsFile: string): IndicatorMap {
  const buildOne = (file: string): GenderMap => {
    const parsed = parseLmsSheet(path.join(DATA_DIR, file));
    const out: GenderMap = {};
    for (const { key, row } of parsed) {
      const rounded = Math.round(key * 2) / 2;   // snap to nearest 0.5 cm
      const k = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
      out[k] = row;
    }
    return out;
  };
  return { boys: buildOne(boysFile), girls: buildOne(girlsFile) };
}

function buildMonthlyIndicator(spec: {
  boys:  Array<{ file: string; kind: 'weekly' | 'monthly-range'; from: number; to: number }>;
  girls: Array<{ file: string; kind: 'weekly' | 'monthly-range'; from: number; to: number }>;
  strict?: boolean;
}): IndicatorMap {
  const strict = spec.strict ?? true;
  return {
    boys:  mergeMonthly(spec.boys,  strict),
    girls: mergeMonthly(spec.girls, strict),
  };
}

function main(): void {
  if (!fs.existsSync(DATA_DIR)) die('who-standard-data directory not found', DATA_DIR);
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });

  console.log('[process-who-data] Parsing WHO xlsx files from', DATA_DIR);

  // ----- Indicator source maps (validated against actual file listing) -----

  // wfa: weekly 0..3 (granular) layered over monthly 0..60.
  const wfa = buildMonthlyIndicator({
    boys: [
      { file: 'wfa_boys_0-to-13-weeks_zscores.xlsx', kind: 'weekly',        from: 0, to: 3  },
      { file: 'wfa_boys_0-to-5-years_zscores.xlsx',  kind: 'monthly-range', from: 0, to: 60 },
    ],
    girls: [
      { file: 'wfa_girls_0-to-13-weeks_zscores.xlsx', kind: 'weekly',        from: 0, to: 3  },
      { file: 'wfa_girls_0-to-5-years_zscores.xlsx',  kind: 'monthly-range', from: 0, to: 60 },
    ],
    strict: true,
  });

  // lhfa: weekly 0..3 → monthly 4..24 → monthly 25..60.
  // lhfa: weekly 0..3 (granular, but floor never reaches bucket 3 — see weeksToMonthly)
  // → monthly 3..24 → monthly 25..60. Monthly covers month 3 to close the gap.
  const lhfa = buildMonthlyIndicator({
    boys: [
      { file: 'lhfa_boys_0-to-13-weeks_zscores.xlsx', kind: 'weekly',        from: 0,  to: 3  },
      { file: 'lhfa_boys_0-to-2-years_zscores.xlsx',  kind: 'monthly-range', from: 3,  to: 24 },
      { file: 'lhfa_boys_2-to-5-years_zscores.xlsx',  kind: 'monthly-range', from: 25, to: 60 },
    ],
    girls: [
      { file: 'lhfa_girls_0-to-13-weeks_zscores.xlsx', kind: 'weekly',        from: 0,  to: 3  },
      { file: 'lhfa_girls_0-to-2-years_zscores.xlsx',  kind: 'monthly-range', from: 3,  to: 24 },
      { file: 'lhfa_girls_2-to-5-years_zscores.xlsx',  kind: 'monthly-range', from: 25, to: 60 },
    ],
    strict: true,
  });

  // bmi: weekly 0..3 → monthly 4..24 → monthly 25..60.
  // Note: source filename has a typo ("zcores"); preserved exactly.
  const bmi = buildMonthlyIndicator({
    boys: [
      { file: 'bmi_boys_0-to-13-weeks_zscores.xlsx',    kind: 'weekly',        from: 0,  to: 3  },
      { file: 'bmi_boys_0-to-2-years_zcores.xlsx',       kind: 'monthly-range', from: 3,  to: 24 },
      { file: 'bmi_boys_2-to-5-years_zscores.xlsx',     kind: 'monthly-range', from: 25, to: 60 },
    ],
    girls: [
      { file: 'bmi_girls_0-to-13-weeks_zscores.xlsx',   kind: 'weekly',        from: 0,  to: 3  },
      { file: 'bmi_girls_0-to-2-years_zscores.xlsx',     kind: 'monthly-range', from: 3,  to: 24 },
      { file: 'bmi_girls_2-to-5-years_zscores.xlsx',    kind: 'monthly-range', from: 25, to: 60 },
    ],
    strict: true,
  });

  // hcfa (optional): weekly 0..3 → monthly 0..60.
  const hcfa = buildMonthlyIndicator({
    boys: [
      { file: 'hcfa-boys-0-13-zscores.xlsx',  kind: 'weekly',        from: 0,  to: 3  },
      { file: 'hcfa-boys-0-5-zscores.xlsx',   kind: 'monthly-range', from: 0,  to: 60 },
    ],
    girls: [
      { file: 'hcfa-girls-0-13-zscores.xlsx',  kind: 'weekly',        from: 0,  to: 3  },
      { file: 'hcfa-girls-0-5-zscores.xlsx', kind: 'monthly-range',  from: 0,  to: 60 },
    ],
    strict: false,   // optional indicator — gaps tolerated
  });

  // acfa (optional): monthly 3..60 only (no WHO LMS data for months 0..2).
  const acfa = buildMonthlyIndicator({
    boys:  [{ file: 'acfa-boys-3-5-zscores.xlsx',  kind: 'monthly-range', from: 3, to: 60 }],
    girls: [{ file: 'acfa-girls-3-5-zscores.xlsx', kind: 'monthly-range', from: 3, to: 60 }],
    strict: false,
  });

  // CM-indexed indicators for "ideal weight for height" (PRD §4.2A Targets card).
  const wfh = buildByCm('wfh_boys_2-to-5-years_zscores.xlsx', 'wfh_girls_2-to-5-years_zscores.xlsx');
  const wfl = buildByCm('wfl_boys_0-to-2-years_zscores.xlsx', 'wfl_girls_0-to-2-years_zscores.xlsx');

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'WHO Child Growth Standards (2006)',
      monthlyRange: [0, 60],
      notes: 'wfa/lhfa/bmi = mandatory (full 0..60). wfh/wfl keyed by cm. hcfa/acfa optional (acfa starts month 3).',
    },
    wfa,
    lhfa,
    bmi,
    wfh,
    wfl,
    hcfa,
    acfa,
  };

  // Compact JSON (no pretty-print) minimizes bundle size — important for low-end
  // Android devices on rural connections (AGENTS.md low-end empathy rule).
  fs.writeFileSync(OUT_FILE, JSON.stringify(output));
  const sizeKb = Math.round(fs.statSync(OUT_FILE).size / 1024);
  console.log(`[process-who-data] Wrote ${OUT_FILE} (${sizeKb} KB).`);
  console.log('[process-who-data] Coverage summary:');
  console.log(`  wfa  boys: ${Object.keys(output.wfa.boys).length}  girls: ${Object.keys(output.wfa.girls).length}`);
  console.log(`  lhfa boys: ${Object.keys(output.lhfa.boys).length}  girls: ${Object.keys(output.lhfa.girls).length}`);
  console.log(`  bmi  boys: ${Object.keys(output.bmi.boys).length}  girls: ${Object.keys(output.bmi.girls).length}`);
  console.log(`  wfh  boys: ${Object.keys(output.wfh.boys).length}  girls: ${Object.keys(output.wfh.girls).length}`);
  console.log(`  wfl  boys: ${Object.keys(output.wfl.boys).length}  girls: ${Object.keys(output.wfl.girls).length}`);
  console.log(`  hcfa boys: ${Object.keys(output.hcfa.boys).length}  girls: ${Object.keys(output.hcfa.girls).length}`);
  console.log(`  acfa boys: ${Object.keys(output.acfa.boys).length}  girls: ${Object.keys(output.acfa.girls).length}`);
}

main();