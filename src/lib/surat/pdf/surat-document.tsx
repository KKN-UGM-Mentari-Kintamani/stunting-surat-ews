/* src/lib/surat/pdf/surat-document.tsx
 * React-pdf letter template — the FINAL document (PRD §5.1, Design §9).
 * Official letter style: white bg, black text, serif body (Liberation Serif =
 * metric-compatible Times New Roman clone). TTE is embedded as base64.
 *
 * Mirrors the web preview (letter-preview.tsx) — same kop, parties, dynamic
 * body (buildSuratLayout) — plus nomor surat & TTE/nama Kades.
 * Village identity is fixed for Desa Songan B (Template_Surat_Desa_SonganB.md).
 *
 * Design §9 deliberately deviates from web tokens for legal documents.
 *
 * Layout per user's request (matches the original village letters):
 *   - logo kop kiri & kanan ~2.75cm, margin kiri 3.5cm, lainnya 2.5cm
 *   - font 12pt, line-height 1.15, isi justify, tabel identitas menjorok
 *   - judul + nomor surat center, line-height 1
 *   - TTD kanan bawah tetapi teks rata kiri; tanggal & jabatan line-height 1
 *   - blok agunan BRI: dotted leaders mengisi penuh (rata kanan-kiri)
 */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image as PdfImage,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import fs from "node:fs";
import path from "node:path";

import { buildSuratLayout, DESA, type TemplateKey } from "@/lib/surat/body";
import type { IsianSnapshot } from "@/lib/surat/types";

// Fonts live in public/fonts so they're present in the serverless bundle on
// Vercel. Font.register accepts a file path string (server-only module).
const FONT_DIR = path.join(process.cwd(), "public", "fonts");
const REGULAR_PATH = path.join(FONT_DIR, "LiberationSerif-Regular.ttf");
const BOLD_PATH = path.join(FONT_DIR, "LiberationSerif-Bold.ttf");
// Verify presence eagerly so a missing font fails loudly (AGENTS.md §2).
if (!fs.existsSync(REGULAR_PATH) || !fs.existsSync(BOLD_PATH)) {
  throw new Error(`Font Liberation Serif tidak ditemukan di ${FONT_DIR}`);
}

Font.register({
  family: "Liberation Serif",
  fonts: [
    { src: REGULAR_PATH, fontWeight: 400 },
    { src: BOLD_PATH, fontWeight: 700 },
  ],
});

// Kop logos: react-pdf resolves string src via url.parse, which mangles
// Windows absolute paths (treats "D:\..." as a remote URL → fetch fails, logo
// missing). Embed as base64 data-URIs instead — the same pattern that already
// works for the TTE image. Logos are in public/ so they ship in the bundle.
function toDataUri(filePath: string, mime: string): string {
  const buf = fs.readFileSync(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}
const LOGO_KIRI = toDataUri(path.join(process.cwd(), "public", "kop-logo-kiri.png"), "image/png");
const LOGO_KANAN = toDataUri(path.join(process.cwd(), "public", "kop-logo-kanan.jpg"), "image/jpeg");

// 1cm = 28.3465pt
const styles = StyleSheet.create({
  page: {
    fontFamily: "Liberation Serif",
    fontSize: 12,
    lineHeight: 1.5,
    color: "#000000",
    backgroundColor: "#ffffff",
    // kiri 2.5cm, atas 1.5cm, kanan 1.5cm, bawah 1.1cm
    paddingTop: 43,
    paddingBottom: 31,
    paddingLeft: 71,
    paddingRight: 43,
  },
  kopWrap: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  // logo ~2.33cm = 66pt, sama untuk kiri & kanan agar seimbang
  kopLogo: { width: 64, height: 64, objectFit: "contain" },
  kopLogoKan: { width: 64, height: 64, objectFit: "contain" },
  kopTeks: { flex: 1, paddingHorizontal: 8 },
  kopTitle: { fontSize: 13, fontWeight: 700, textAlign: "center", lineHeight: 1.05 },
  kopSub: { fontSize: 12, fontWeight: 700, textAlign: "center", lineHeight: 1.05 },
  separator: {
    borderTopWidth: 3,
    borderBottomWidth: 1,
    borderTopColor: "#000000",
    borderBottomColor: "#000000",
    marginTop: 2,
    marginBottom: 6,
  },
  // Judul & nomor surat: center, line-height 1
  judulSurat: { textAlign: "center", fontSize: 13, fontWeight: 700, textDecoration: "underline", lineHeight: 1, marginBottom: 2 },
  nomorSurat: { textAlign: "center", fontSize: 12, lineHeight: 1, marginBottom: 6 },
  isi: { fontSize: 12, lineHeight: 1.5 },
  intro: { textAlign: "justify", marginTop: 1, marginBottom: 1 },
  // Tabel identitas sedikit menjorok ke kanan; kolom label pas label terpanjang.
  // line-height 1.3 (data table, bukan teks naratif) agar hemat ruang vertikal.
  tabel: { width: "100%", marginTop: 1, marginBottom: 2, paddingLeft: 28 },
  tabelRow: { flexDirection: "row", marginBottom: 1, lineHeight: 1.3 },
  tabelK: { width: 122 },
  tabelV: { width: 8 },
  tabelD: { flex: 1 },
  paragraf: { textAlign: "justify", marginBottom: 4 },
  paragrafIndent: { textAlign: "justify", marginBottom: 3, textIndent: 24 },
  blokStatis: { marginTop: 1, marginBottom: 2, paddingLeft: 28 },
  // Baris agunan adalah form isian kosong → line-height 1 agar hemat & rapi
  blokStatisRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: 0, lineHeight: 1 },
  blokStatisText: { fontSize: 12, flexShrink: 0 },
  // Dotted leader mengisi penuh lebar baris → rata kanan-kiri, tanpa ruang kosong
  blokStatisDot: { flex: 1, borderBottomWidth: 1, borderBottomStyle: "dotted", marginBottom: 1, marginLeft: 2, marginRight: 2 },
  // TTD: blok di kanan bawah, teks di dalamnya rata kiri (sisakan 1 baris kosong)
  ttdWrap: { marginTop: 18, alignItems: "flex-end" },
  // Tanpa lebar tetap: blok menyesuaikan isi → menempel ke margin kanan
  ttdBlok: { alignItems: "flex-start" },
  tanggal: { fontSize: 12, lineHeight: 1, textAlign: "left" },
  ttdJabatan: { fontSize: 12, lineHeight: 1, textAlign: "left", marginTop: 2 },
  ttdNama: { fontWeight: 700, textDecoration: "underline", fontSize: 12, textAlign: "left", marginTop: 2 },
  ttdNip: { fontSize: 10, lineHeight: 1, textAlign: "left", marginTop: 1 },
  ttdImage: { width: 100, height: 60, objectFit: "contain", marginTop: 1 },
  kodeVerifikasi: {
    // Paling bawah halaman, terlepas dari tinggi isi.
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    textAlign: "center",
    fontSize: 9,
    color: "#444444",
  },
});

function fmtTanggalHariIni(date: Date): string {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

interface Props {
  namaSurat: string;
  templateKey: TemplateKey;
  snapshot: IsianSnapshot;
  nomorSurat: string;
  kodeVerifikasi: string;
  namaKades: string;
  nipKades?: string | null;
  jabatanKades?: string | null;
  /** base64 data-URI of the Kades TTE image (e.g. data:image/png;base64,..) */
  tteBase64?: string | null;
  tanggalTerbit: Date;
  /** SKTM: purpose phrase typed by the staff at approval time. */
  tujuanSktm?: string;
}

export function SuratDocument({
  namaSurat,
  templateKey,
  snapshot,
  nomorSurat,
  kodeVerifikasi,
  namaKades,
  nipKades,
  jabatanKades,
  tteBase64,
  tanggalTerbit,
  tujuanSktm,
}: Props) {
  const s = snapshot;
  const jabatan = jabatanKades ?? "Perbekel Desa Songan B";
  const layout = buildSuratLayout(templateKey, s, { tujuanSktm });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Kop surat */}
        <View style={styles.kopWrap}>
          <PdfImage src={LOGO_KIRI} style={styles.kopLogo} />
          <View style={styles.kopTeks}>
            <Text style={styles.kopTitle}>PEMERINTAH KABUPATEN BANGLI</Text>
            <Text style={styles.kopSub}>KECAMATAN KINTAMANI</Text>
            <Text style={styles.kopTitle}>DESA SONGAN B</Text>
          </View>
          <PdfImage src={LOGO_KANAN} style={styles.kopLogoKan} />
        </View>
        <View style={styles.separator} />

        {/* Judul & nomor */}
        <Text style={styles.judulSurat}>{namaSurat}</Text>
        <Text style={styles.nomorSurat}>
          Nomor : {nomorSurat}
        </Text>

        {/* Isi */}
        <View style={styles.isi}>
          {/* Pihak pertama (penandatangan) */}
          <Text style={styles.intro}>{layout.introPenandatangan}</Text>
          <View style={styles.tabel}>
            <View style={styles.tabelRow}>
              <Text style={styles.tabelK}>Nama</Text>
              <Text style={styles.tabelV}>:</Text>
              <Text style={styles.tabelD}>{namaKades}</Text>
            </View>
            <View style={styles.tabelRow}>
              <Text style={styles.tabelK}>Jabatan</Text>
              <Text style={styles.tabelV}>:</Text>
              <Text style={styles.tabelD}>{jabatan}</Text>
            </View>
          </View>

          {/* Pihak kedua (pemohon) */}
          <Text style={styles.intro}>{layout.introPemohon}</Text>
          <View style={styles.tabel}>
            {layout.identitasPemohon.map((r, i) => (
              <View key={i} style={styles.tabelRow}>
                <Text style={styles.tabelK}>{r.label}</Text>
                <Text style={styles.tabelV}>:</Text>
                <Text style={styles.tabelD}>{r.value}</Text>
              </View>
            ))}
          </View>

          {/* Body dinamis per jenis surat */}
          {layout.isi.map((t, i) => (
            <Text key={i} style={styles.paragrafIndent}>{t}</Text>
          ))}
          {layout.blokStatis && (
            <View style={styles.blokStatis}>
              {layout.blokStatis.map((baris, i) => (
                <View
                  key={i}
                  style={[
                    styles.blokStatisRow,
                    ...(baris.indent ? [{ marginLeft: 24 }] : []),
                  ]}
                >
                  {baris.segmen.map((seg, j) =>
                    seg.titik ? (
                      <View key={j} style={styles.blokStatisDot} />
                    ) : (
                      <Text key={j} style={styles.blokStatisText}>{seg.teks}</Text>
                    ),
                  )}
                </View>
              ))}
            </View>
          )}
          {layout.isiPenutup && (
            <Text style={styles.paragrafIndent}>{layout.isiPenutup}</Text>
          )}
        </View>

        {/* Tanggal + TTE — blok di kanan bawah, teks rata kiri */}
        <View style={styles.ttdWrap}>
          <View style={styles.ttdBlok}>
            <Text style={styles.tanggal}>{DESA.kota}, {fmtTanggalHariIni(tanggalTerbit)}</Text>
            <Text style={styles.ttdJabatan}>{jabatan},</Text>
            {tteBase64 && <PdfImage src={tteBase64} style={styles.ttdImage} />}
            <Text style={styles.ttdNama}>{namaKades}</Text>
            {nipKades && <Text style={styles.ttdNip}>NIP. {nipKades}</Text>}
          </View>
        </View>

        {/* Kode verifikasi */}
        <Text style={styles.kodeVerifikasi}>
          Kode Verifikasi: {kodeVerifikasi}
        </Text>
      </Page>
    </Document>
  );
}

/** Render helper — keeps renderToBuffer usage in one place. */
export async function renderSuratPdf(props: Omit<Props, "tanggalTerbit">): Promise<Buffer> {
  return renderToBuffer(
    <SuratDocument {...props} tanggalTerbit={new Date()} />,
  );
}
