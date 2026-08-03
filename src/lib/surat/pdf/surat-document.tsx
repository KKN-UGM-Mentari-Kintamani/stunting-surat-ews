/* src/lib/surat/pdf/surat-document.tsx
 * React-pdf letter template — the FINAL document (PRD §5.1, Design §9).
 * Official letter style: white bg, black text, serif body (Liberation Serif =
 * metric-compatible Times New Roman clone), single gold header line feel via
 * the kop divider. TTE is embedded as base64.
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
  kop: {
    textAlign: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
    paddingBottom: 8,
    marginBottom: 16,
  },
  kopTitle: { fontSize: 14, fontWeight: 700, marginBottom: 2 },
  kopSub: { fontSize: 12, textDecoration: "underline", marginBottom: 2 },
  kopAlamat: { fontSize: 9 },
  nomorSurat: { textAlign: "center", marginBottom: 18, fontSize: 12 },
  nomorSuratUnderline: { textDecoration: "underline" },
  isi: { fontSize: 12, lineHeight: 1.6 },
  paragraf: { textAlign: "justify", marginBottom: 12 },
  tabel: { width: "100%", marginTop: 6, marginBottom: 12 },
  tabelRow: { flexDirection: "row", marginBottom: 4 },
  tabelK: { width: 140 },
  tabelV: { width: 12 },
  tabelD: { flex: 1 },
  tanggal: { textAlign: "right", marginTop: 20, fontSize: 11 },
  ttd: { marginTop: 4, alignItems: "flex-end" },
  ttdTeks: { textAlign: "right" },
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

function fmtTgl(v?: string): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtTanggalHariIni(date: Date): string {
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

interface Props {
  namaSurat: string;
  snapshot: IsianSnapshot;
  nomorSurat: string;
  kodeVerifikasi: string;
  namaKades: string;
  nipKades?: string | null;
  jabatanKades?: string | null;
  /** base64 data-URI of the Kades TTE image (e.g. data:image/png;base64,..) */
  tteBase64?: string | null;
  tanggalTerbit: Date;
}

export function SuratDocument({
  namaSurat,
  snapshot,
  nomorSurat,
  kodeVerifikasi,
  namaKades,
  nipKades,
  jabatanKades,
  tteBase64,
  tanggalTerbit,
}: Props) {
  const s = snapshot;
  const jabatan = jabatanKades ?? "Kepala Desa";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Kop surat */}
        <View style={styles.kop}>
          <Text style={styles.kopTitle}>PEMERINTAH KABUPATEN KLUNGKUNG</Text>
          <Text style={styles.kopSub}>KECAMATAN KINTAMANI</Text>
          <Text style={styles.kopSub}>DESA KINTAMANI</Text>
          <Text style={styles.kopAlamat}>
            Jl. Raya Kintamani No. 1, Kintamani, Bangli, Bali
          </Text>
        </View>

        {/* Nomor surat */}
        <Text style={styles.nomorSurat}>
          Nomor : <Text style={styles.nomorSuratUnderline}>{nomorSurat}</Text>
        </Text>

        {/* Isi */}
        <View style={styles.isi}>
          <Text style={styles.paragraf}>
            Yang bertanda tangan di bawah ini {jabatan}, menerangkan bahwa:
          </Text>

          {/* Identitas */}
          <View style={styles.tabel}>
            <View style={styles.tabelRow}>
              <Text style={styles.tabelK}>Nama</Text>
              <Text style={styles.tabelV}>:</Text>
              <Text style={styles.tabelD}>{s.nama}</Text>
            </View>
            <View style={styles.tabelRow}>
              <Text style={styles.tabelK}>NIK</Text>
              <Text style={styles.tabelV}>:</Text>
              <Text style={styles.tabelD}>{s.nik}</Text>
            </View>
            <View style={styles.tabelRow}>
              <Text style={styles.tabelK}>Tempat / Tgl. Lahir</Text>
              <Text style={styles.tabelV}>:</Text>
              <Text style={styles.tabelD}>
                {s.tempat_lahir} / {fmtTgl(s.tanggal_lahir)}
              </Text>
            </View>
            <View style={styles.tabelRow}>
              <Text style={styles.tabelK}>Agama</Text>
              <Text style={styles.tabelV}>:</Text>
              <Text style={styles.tabelD}>{s.agama}</Text>
            </View>
            <View style={styles.tabelRow}>
              <Text style={styles.tabelK}>Pekerjaan</Text>
              <Text style={styles.tabelV}>:</Text>
              <Text style={styles.tabelD}>{s.pekerjaan}</Text>
            </View>
            <View style={styles.tabelRow}>
              <Text style={styles.tabelK}>Alamat</Text>
              <Text style={styles.tabelV}>:</Text>
              <Text style={styles.tabelD}>{s.alamat}</Text>
            </View>
            {s.data_khusus?.nama_usaha && (
              <View style={styles.tabelRow}>
                <Text style={styles.tabelK}>Nama Usaha</Text>
                <Text style={styles.tabelV}>:</Text>
                <Text style={styles.tabelD}>{s.data_khusus.nama_usaha}</Text>
              </View>
            )}
            {s.data_khusus?.jenis_usaha && (
              <View style={styles.tabelRow}>
                <Text style={styles.tabelK}>Jenis Usaha</Text>
                <Text style={styles.tabelV}>:</Text>
                <Text style={styles.tabelD}>{s.data_khusus.jenis_usaha}</Text>
              </View>
            )}
          </View>

          <Text style={styles.paragraf}>
            Adalah benar penduduk Desa Kintamani, Kecamatan Kintamani, Kabupaten
            Klungkung, dan berdasarkan pengamatan serta data yang kami miliki,
            keterangan yang bersangkutan adalah benar.
          </Text>
          <Text style={styles.paragraf}>
            Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana
            mestinya.
          </Text>
        </View>

        {/* Tanggal + TTE */}
        <View style={styles.tanggal}>
          <Text>Kintamani, {fmtTanggalHariIni(tanggalTerbit)}</Text>
        </View>
        <View style={styles.ttd}>
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
