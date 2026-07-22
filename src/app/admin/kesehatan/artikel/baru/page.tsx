import { ArticleForm } from "@/app/admin/kesehatan/_components/article-form";

export const metadata = { title: "Buat Artikel Baru" };

export default function CreateArticlePage() {
  return (
    <div className="flex flex-col gap-6 py-10 md:py-14">
      <div>
        <h1 className="font-display text-[28px] leading-[1.15] font-semibold md:text-[40px] md:leading-[1.1]">
          Buat Artikel Baru
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">
          Isi formulir di bawah. Konten akan disimpan sebagai draft dan bisa
          diterbitkan nanti.
        </p>
      </div>

      <ArticleForm
        mode="create"
        defaultValues={{
          judul: "",
          slug: "",
          tipe_konten: "artikel_gizi",
          kategori_umur: "0-6",
          konten_html: "",
          thumbnail_url: "",
          published: false,
        }}
      />
    </div>
  );
}