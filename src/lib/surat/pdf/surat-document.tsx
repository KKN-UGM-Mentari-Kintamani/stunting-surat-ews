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

const styles = StyleSheet.create({
  page: {
    fontFamily: "Liberation Serif",
    fontSize: 12,
    lineHeight: 1.5,
    color: "#000000",
    backgroundColor: "#ffffff",
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 50,
    paddingRight: 50,
  },
  kopWrap: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  kopLogo: { width: 72, height: 72, objectFit: "contain" },
  kopLogoKan: { width: 56, height: 56, objectFit: "contain" },
  kopTeks: { flex: 1, paddingHorizontal: 8 },
  kopTitle: { fontSize: 14, fontWeight: 700, textAlign: "center", marginBottom: 2 },
  kopSub: { fontSize: 12, fontWeight: 700, textAlign: "center", marginBottom: 2 },
  kopWebsite: { fontSize: 9, textAlign: "center", marginTop: 2 },
  separator: {
    borderTopWidth: 3,
    borderBottomWidth: 1,
    borderTopColor: "#000000",
    borderBottomColor: "#000000",
    marginBottom: 16,
  },
  nomorSurat: { textAlign: "center", marginBottom: 18, fontSize: 12 },
  nomorSuratUnderline: { textDecoration: "underline" },
  isi: { fontSize: 12, lineHeight: 1.6 },
  intro: { textAlign: "justify", marginTop: 10, marginBottom: 6 },
  tabel: { width: "100%", marginTop: 2, marginBottom: 8 },
  tabelRow: { flexDirection: "row", marginBottom: 4 },
  tabelK: { width: 160 },
  tabelV: { width: 12 },
  tabelD: { flex: 1 },
  paragraf: { textAlign: "justify", marginBottom: 10 },
  paragrafIndent: { textAlign: "justify", marginBottom: 10, textIndent: 24 },
  blokStatis: { marginBottom: 8 },
  blokStatisLine: { fontSize: 11, marginBottom: 2 },
  tanggal: { textAlign: "right", marginTop: 24, fontSize: 11 },
  ttd: { marginTop: 4, alignItems: "flex-end" },
  ttdTeks: { textAlign: "right" },
  ttdRole: { textAlign: "right", marginTop: 8 },
  ttdNama: { textAlign: "right", fontWeight: 700, textDecoration: "underline", marginTop: 4 },
  ttdNip: { textAlign: "right", fontSize: 10, marginTop: 2 },
  ttdImage: { width: 110, height: 70, objectFit: "contain", marginTop: 4 },
  kodeVerifikasi: {
    textAlign: "center",
    fontSize: 9,
    marginTop: 24,
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
          <PdfImage src={path.join(process.cwd(), "public", "kop-logo-kiri.png")} style={styles.kopLogo} />
          <View style={styles.kopTeks}>
            <Text style={styles.kopTitle}>PEMERINTAH KABUPATEN BANGLI</Text>
            <Text style={styles.kopSub}>KECAMATAN KINTAMANI</Text>
            <Text style={styles.kopTitle}>DESA SONGAN B</Text>
            <Text style={styles.kopWebsite}>Website: {DESA.website}</Text>
          </View>
          <PdfImage src={path.join(process.cwd(), "public", "kop-logo-kanan.jpg")} style={styles.kopLogoKan} />
        </View>
        <View style={styles.separator} />

        {/* Judul & nomor */}
        <Text style={styles.nomorSurat}>
          <Text style={styles.nomorSuratUnderline}>{namaSurat}</Text>
        </Text>
        <Text style={styles.nomorSurat}>
          Nomor : <Text style={styles.nomorSuratUnderline}>{nomorSurat}</Text>
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
              {layout.blokStatis.map((line, i) => (
                <Text key={i} style={styles.blokStatisLine}>{line || "\u00A0"}</Text>
              ))}
            </View>
          )}
          {layout.isiPenutup && (
            <Text style={styles.paragrafIndent}>{layout.isiPenutup}</Text>
          )}
        </View>

        {/* Tanggal + TTE */}
        <View style={styles.tanggal}>
          <Text>{DESA.kota}, {fmtTanggalHariIni(tanggalTerbit)}</Text>
        </View>
        <View style={styles.ttd}>
          {layout.ttdRoleLine && <Text style={styles.ttdRole}>{layout.ttdRoleLine}</Text>}
          <Text style={styles.ttdTeks}>{jabatan},</Text>
          {tteBase64 && <PdfImage src={tteBase64} style={styles.ttdImage} />}
          <Text style={styles.ttdNama}>{namaKades}</Text>
          {nipKades && <Text style={styles.ttdNip}>NIP. {nipKades}</Text>}
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
