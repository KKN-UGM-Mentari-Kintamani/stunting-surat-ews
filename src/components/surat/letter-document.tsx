/* src/components/surat/letter-document.tsx
 * Render isi surat dari data_isian_snapshot — dipakai untuk Preview (tanpa
 * TTE/nomor) dan halaman Verifikasi. Layout selaras dengan template final di
 * worker/ (kop, tabel identitas, isi). Tampilan "kertas resmi" per Design §9.
 */
import type { IsianSnapshot } from "@/lib/surat/types";

function escapeHtml(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tglLahirStr(v: unknown): string {
  if (typeof v !== "string" || !v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function LetterDocument({ snapshot }: { snapshot: IsianSnapshot }) {
  const s = snapshot ?? {};
  const rows: Array<[string, string]> = [
    ["Nama", s.nama ?? ""],
    ["NIK", s.nik ?? ""],
    ["Tempat / Tanggal Lahir", `${s.tempat_lahir ?? ""} / ${tglLahirStr(s.tanggal_lahir)}`],
    ["Agama", s.agama ?? ""],
    ["Pekerjaan", s.pekerjaan ?? ""],
    ["Alamat", s.alamat ?? ""],
    ...Object.entries(s.data_khusus ?? {}).map(([k, v]) => [
      k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      v ?? "",
    ] as [string, string]),
  ];

  return (
    <div className="rounded-md border border-border bg-white px-6 py-8 text-[13px] leading-[1.6] text-black shadow-[0_2px_8px_rgba(43,40,35,0.06)]">
      {/* Kop surat */}
      <div className="border-b-2 border-black pb-3 text-center">
        <p className="text-[15px] font-bold tracking-wide">PEMERINTAH KABUPATEN KLUNGKUNG</p>
        <p className="text-[13px] underline">KECAMATAN KINTAMANI</p>
        <p className="text-[13px] underline">DESA KINTAMANI</p>
        <p className="text-[10px]">Jl. Raya Kintamani No. 1, Kintamani, Bangli, Bali</p>
      </div>

      <div className="mt-6 text-[15px]">
        <p className="text-center">Surat Keterangan</p>
        <p className="text-center">
          Nomor : <span className="underline">……………</span>
        </p>
      </div>

      <p className="mt-5 text-justify" style={{ textIndent: 30 }}>
        Yang bertanda tangan di bawah ini Kepala Desa, menerangkan bahwa:
      </p>

      <table className="mt-3 w-full border-collapse">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="w-40 py-0.5 align-top pr-2">{escapeHtml(k)}</td>
              <td className="w-5 py-0.5 align-top">:</td>
              <td className="py-0.5 align-top">{escapeHtml(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 text-justify">
        Adalah benar penduduk Desa Kintamani, Kecamatan Kintamani, Kabupaten
        Klungkung, dan berdasarkan pengamatan serta data yang kami miliki,
        keterangan yang bersangkutan adalah benar.
      </p>
      <p className="mt-3 text-justify" style={{ textIndent: 30 }}>
        Demikian surat keterangan ini dibuat untuk dipergunakan sebagaimana
        mestinya.
      </p>

      <div className="mt-10 text-right">
        <p>Kintamani, ………………………</p>
        <p className="mt-6">Kepala Desa,</p>
        <div className="mt-10" />
        <p className="font-bold underline">……………</p>
      </div>
    </div>
  );
}
