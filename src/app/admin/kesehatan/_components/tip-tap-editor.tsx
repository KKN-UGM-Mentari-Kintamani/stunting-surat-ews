"use client";

/* src/app/admin/kesehatan/_components/tip-tap-editor.tsx
 * Lightweight WYSIWYG editor using TipTap (StarterKit + link + underline).
 * Toolbar replicates basic CKEditor-ish commands. Uses EditorContent with
 * immediatelyRender:false so the server doesn't try to hydrate a canvas-less
 * editor (tip-tap Next.js compat). Output HTML is stored in `konten_html`.
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TipTapLink from "@tiptap/extension-link";
import TipTapUnderline from "@tiptap/extension-underline";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Unlink,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Minus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  content?: string;
  onChange?: (html: string) => void;
}

export function TipTapEditor({ content = "", onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit, TipTapLink, TipTapUnderline],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[200px] px-4 py-3 rounded-b-md border-x border-b border-input bg-transparent text-[16px] leading-[1.7] text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
      },
    },
  });

  if (!editor) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-md border border-border bg-muted text-[15px] text-muted-foreground">
        Memuat editor…
      </div>
    );
  }

  function toggleLink() {
    const ed = editor;
    if (!ed) return;
    const prev = ed.getAttributes("link").href;
    if (prev) {
      ed.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt("Masukkan URL:");
      if (url) ed.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  const btnBase = "h-8 w-8 p-0";

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border-x border-t border-border bg-muted/50 px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(btnBase, editor.isActive("bold") && "bg-accent text-accent-foreground")}
        >
          <Bold className="size-4" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Tebal</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(btnBase, editor.isActive("italic") && "bg-accent text-accent-foreground")}
        >
          <Italic className="size-4" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Miring</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(btnBase, editor.isActive("underline") && "bg-accent text-accent-foreground")}
        >
          <Underline className="size-4" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Garis bawah</span>
        </Button>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(btnBase, editor.isActive("heading", { level: 1 }) && "bg-accent text-accent-foreground")}
        >
          <Heading1 className="size-4" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Judul 1</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(btnBase, editor.isActive("heading", { level: 2 }) && "bg-accent text-accent-foreground")}
        >
          <Heading2 className="size-4" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Judul 2</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(btnBase, editor.isActive("heading", { level: 3 }) && "bg-accent text-accent-foreground")}
        >
          <Heading3 className="size-4" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Judul 3</span>
        </Button>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(btnBase, editor.isActive("bulletList") && "bg-accent text-accent-foreground")}
        >
          <List className="size-4" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Daftar</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(btnBase, editor.isActive("orderedList") && "bg-accent text-accent-foreground")}
        >
          <ListOrdered className="size-4" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Daftar bernomor</span>
        </Button>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggleLink}
          className={cn(btnBase, editor.isActive("link") && "bg-accent text-accent-foreground")}
        >
          {editor.isActive("link") ? (
            <Unlink className="size-4" strokeWidth={1.5} aria-hidden />
          ) : (
            <Link className="size-4" strokeWidth={1.5} aria-hidden />
          )}
          <span className="sr-only">Tautan</span>
        </Button>

        <span className="mx-1 h-5 w-px bg-border" aria-hidden />

        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btnBase}
        >
          <Minus className="size-4" strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Pembatas</span>
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          className={btnBase}
        >
          {/* Clear formatting icon: generic label */}
          <span className="text-[11px] font-bold">Tx</span>
          <span className="sr-only">Hapus format</span>
        </Button>

        <span className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().undo().run()}
            className={btnBase}
          >
            <Undo className="size-4" strokeWidth={1.5} aria-hidden />
            <span className="sr-only">Undo</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => editor.chain().focus().redo().run()}
            className={btnBase}
          >
            <Redo className="size-4" strokeWidth={1.5} aria-hidden />
            <span className="sr-only">Redo</span>
          </Button>
        </span>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}