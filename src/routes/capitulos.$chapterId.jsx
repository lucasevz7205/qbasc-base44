import React, { useState } from "react";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getChapterDetail, updateChapterContent } from "@/lib/server-fns";
import { useAuth } from "@/lib/AuthContext";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  BookOpen,
  FolderGit2,
  Edit3,
  Save,
  X,
  CheckCircle2,
  Layers,
  FileJson,
} from "lucide-react";

export const Route = createFileRoute("/capitulos/$chapterId")({
  loader: async ({ params }) => {
    const res = await getChapterDetail({ data: { id: params.chapterId } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData?.chapter
          ? `${loaderData.chapter.chapter_code} · ${loaderData.chapter.title} | QBAsc`
          : "Capítulo | QBAsc",
      },
    ],
  }),
  component: ChapterDetailPage,
});

function ChapterDetailPage() {
  const { chapter, relatedDocs } = Route.useLoaderData();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const saveChapter = useServerFn(updateChapterContent);

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chapter.title || "");
  const [summary, setSummary] = useState(chapter.summary || "");
  const [markdown, setMarkdown] = useState(chapter.content_markdown || "");
  const [status, setStatus] = useState(chapter.status || "importado");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await saveChapter({
        data: {
          id: chapter.id,
          title,
          summary,
          content_markdown: markdown,
          status,
        },
      });
      setEditing(false);
      setFeedback("Capítulo atualizado com sucesso.");
      await router.invalidate();
    } catch (err) {
      setFeedback(err.message || "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-secondary/80">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o acervo de capítulos
          </Link>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-primary/40 text-primary font-mono">
              {chapter.chapter_code}
            </Badge>
            <Badge className="bg-primary/20 text-primary border-primary/30">
              {chapter.status}
            </Badge>
            {isAuthenticated && !editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                className="gap-1.5 border-border bg-card text-foreground"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Editar Capítulo
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {feedback && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>{feedback}</span>
          </div>
        )}

        {editing ? (
          <form
            onSubmit={handleSave}
            className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-semibold text-foreground">
                Editando {chapter.chapter_code}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Título do Capítulo
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Status Editorial
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                >
                  <option value="rascunho">Rascunho</option>
                  <option value="importado">Importado</option>
                  <option value="revisado">Revisado</option>
                  <option value="publicado">Publicado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Resumo / Síntese
              </label>
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Conteúdo Narrativo & Doutrinário (Markdown)
              </label>
              <Textarea
                rows={16}
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                className="font-mono text-xs bg-secondary border-border text-foreground"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        ) : (
          <article className="rounded-xl border border-border bg-card/95 p-6 sm:p-8 shadow-lg space-y-6">
            <div className="space-y-3 border-b border-border/60 pb-6">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-primary font-medium">
                  <Layers className="h-3.5 w-3.5" />
                  {chapter.discipline}
                </span>
                <span>·</span>
                <span>{chapter.arc_name}</span>
                {chapter.source_repo && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-mono">
                      <FolderGit2 className="h-3.5 w-3.5 text-primary" />
                      {chapter.source_repo} ({chapter.source_path})
                    </span>
                  </>
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {chapter.title}
              </h1>

              {chapter.summary && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {chapter.summary}
                </p>
              )}

              <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  {chapter.questions_count || 0} pontos / questões mapeadas
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1 text-foreground">
                  {chapter.cards_count || 0} materiais / flashcards vinculados
                </span>
              </div>
            </div>

            <div className="prose prose-invert max-w-none space-y-4 text-sm leading-relaxed text-foreground">
              <ReactMarkdown>{chapter.content_markdown || ""}</ReactMarkdown>
            </div>
          </article>
        )}

        {relatedDocs && relatedDocs.length > 0 && (
          <section className="rounded-xl border border-border bg-card/80 p-6 space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileJson className="h-4 w-4 text-primary" />
              Registros Brutos Sincronizados (ClaudeDocument · {relatedDocs.length})
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {relatedDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-lg border border-border bg-secondary/60 p-3 text-xs"
                >
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-primary">
                      {doc.collection}/{doc.legacy_id}
                    </span>
                    <span className="text-muted-foreground">{doc.source}</span>
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto rounded bg-background/80 p-2 font-mono text-[11px] text-muted-foreground">
                    {JSON.stringify(doc.parsed, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}