/* src/app/admin/kesehatan/page.tsx
 * Cadre CMS home: stats dashboard + CRUD article table (PRD §4.2D).
 * RLS policy `edukasi_manage_cadre` allows kader to see ALL articles
 * (published + draft) — no extra app-level filter needed.
 */
import Link from "next/link";
import {
  BookOpenText,
  CookingPot,
  Edit,
  FileText,
  Plus,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { AccountSecurity } from "@/components/auth/account-security";
import { AGE_BUCKET_LABEL, type AgeBucket } from "@/lib/calc/lms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PublishButton } from "@/app/admin/kesehatan/_components/publish-button";
import { DeleteButton } from "@/app/admin/kesehatan/_components/delete-button";

export const metadata = { title: "Dasbor Posyandu" };

interface ArticleRow {
  id: string;
  judul: string;
  slug: string;
  tipe_konten: "artikel_gizi" | "resep_mpasi";
  kategori_umur: string;
  published: boolean;
  created_at: string;
}

export default async function AdminKesehatanPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("edukasi")
    .select(
      "id, judul, slug, tipe_konten, kategori_umur, published, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/kesehatan] fetch failed:", error.message);
    return <p className="py-10 text-destructive">Gagal memuat data.</p>;
  }

  const articles = (data ?? []) as ArticleRow[];
  const published = articles.filter((a) => a.published);
  const drafts = articles.filter((a) => !a.published);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-8 py-10 md:py-14">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 @2xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total artikel</CardDescription>
            <CardTitle className="tabular-data text-[28px]">
              {articles.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Terbit</CardDescription>
            <CardTitle className="tabular-data text-[28px] text-status-normal-fg">
              {published.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Draft</CardDescription>
            <CardTitle className="tabular-data text-[28px] text-muted-foreground">
              {drafts.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resep MPASI</CardDescription>
            <CardTitle className="tabular-data text-[28px]">
              {articles.filter((a) => a.tipe_konten === "resep_mpasi").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[22px] leading-[1.25] font-medium">
            Daftar Konten
          </h2>
          <Button asChild variant="default" className="gap-2">
            <Link href="/admin/kesehatan/artikel/baru">
              <Plus className="size-4" strokeWidth={1.5} aria-hidden />
              Buat Artikel
            </Link>
          </Button>
        </div>

        {articles.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <FileText
                className="size-10 text-muted-foreground opacity-30"
                aria-hidden
              />
              <p className="text-[15px] text-muted-foreground">
                Belum ada konten. Buat artikel gizi atau resep MPASI pertama
                Anda.
              </p>
              <Button asChild variant="default" className="gap-2">
                <Link href="/admin/kesehatan/artikel/baru">
                  <Plus className="size-4" strokeWidth={1.5} aria-hidden />
                  Buat Artikel
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Usia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-60 truncate text-[15px] font-medium">
                      {a.judul}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1 text-[13px]">
                        {a.tipe_konten === "resep_mpasi" ? (
                          <CookingPot
                            className="size-3"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        ) : (
                          <BookOpenText
                            className="size-3"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        )}
                        {a.tipe_konten === "resep_mpasi" ? "Resep" : "Artikel"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[14px] text-muted-foreground">
                      {AGE_BUCKET_LABEL[a.kategori_umur as AgeBucket] ??
                        a.kategori_umur}
                    </TableCell>
                    <TableCell>
                      {a.published ? (
                        <Badge className="bg-status-normal-bg text-status-normal-fg">
                          Terbit
                        </Badge>
                      ) : (
                        <Badge variant="outline">Draft</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="xs">
                          <Link
                            href={`/admin/kesehatan/artikel/${a.id}/edit`}
                          >
                            <Edit
                              className="size-3.5"
                              strokeWidth={1.5}
                              aria-hidden
                            />
                            <span className="sr-only">Edit</span>
                          </Link>
                        </Button>
                        <PublishButton
                          id={a.id}
                          published={a.published}
                        />
                        <DeleteButton id={a.id} title={a.judul} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Keamanan Akun */}
      <AccountSecurity email={user?.email ?? null} />
    </div>
  );
}