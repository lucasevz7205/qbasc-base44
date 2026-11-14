import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { getDashboardState } from "@/lib/server-fns";
import GitHubSyncPanel from "@/components/qb/GitHubSyncPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Search,
  Layers,
  Database,
  CheckCircle2,
  ArrowRight,
  Compass,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/")({
  validateSearch: (search) => ({
    discipline: typeof search?.discipline === "string" ? search.discipline : undefined,
    search: typeof search?.search === "string" ? search.search : undefined,
  }),
  loaderDeps: ({ search }) => ({
    discipline: search.discipline,
    search: search.search,
  }),
  loader: ({ deps }) =>
    getDashboardState({
      data: {
        discipline: deps.discipline,
        search: deps.search,
      },
    }),
  head: () => ({
    meta: [
      { title: "QBAsc · Quebrando a Banca — Ascensão que chamará" },
      {
        name: "description",
        content:
          "Repositório editorial e sincronização GitHub da obra narrativa e acervo Quebrando a Banca — Ascensão que chamará.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const data = Route.useLoaderData();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();

  const activeDiscipline = searchParams.discipline || "todas";
  const [searchInput, setSearchInput] = useState(searchParams.search || "");
  const [extraChapters, setExtraChapters] = useState([]);
  const [cursor, setCursor] = useState(data.nextCursor);
  const [hasMore, setHasMore] = useState(data.hasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const allChapters = [...(data.chapters || []), ...extraChapters];

  const handleFilterChange = (discipline, queryText = searchInput) => {
    setExtraChapters([]);
    navigate({
      to: "/",
      search: {
        discipline: discipline === "todas" ? undefined : discipline,
        search: queryText?.trim() ? queryText.trim() : undefined,
      },
    });
  };

  const handleLoadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await getDashboardState({
        data: {
          discipline: activeDiscipline === "todas" ? undefined : activeDiscipline,
          search: searchParams.search,
          cursor,
        },
      });
      setExtraChapters((prev) => [...prev, ...(next.chapters || [])]);
      setCursor(next.nextCursor);
      setHasMore(next.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  const totalPoints = (data.disciplineStats || []).reduce(
    (acc, r) => acc + (Number(r.sum_questions_count) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-secondary/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/40 bg-primary/15 text-primary shadow-sm">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs uppercase tracking-widest text-primary">
                  QBAsc · Acervo Integrado
                </span>
                <Badge variant="outline" className="border-primary/40 text-primary text-[11px]">
                  GitHub API Ativa
                </Badge>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Quebrando a Banca — Ascensão que chamará
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Capítulos:</span>
              <strong className="font-mono text-foreground">{data.totalChapters}</strong>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Documentos Base:</span>
              <strong className="font-mono text-foreground">{data.totalClaudeDocs}</strong>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Pontos & Questões:</span>
              <strong className="font-mono text-foreground">{totalPoints}</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* GitHub Sync Control */}
        <GitHubSyncPanel logs={data.logs} />

        {/* Discipline Filter & Search Bar */}
        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Capítulos e Trilhas Importadas do Repositório
              </h2>
              <p className="text-xs text-muted-foreground">
                Navegue pelos capítulos estruturados a partir do edital verticalizado, pontos de aula, armadilhas da banca e trilhas fiscais.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFilterChange(activeDiscipline, searchInput);
              }}
              className="flex w-full max-w-md items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar por código (ex: DA-2-1, FISCAL), título..."
                  className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <Button type="submit" variant="secondary" className="border border-border">
                Filtrar
              </Button>
            </form>
          </div>

          {/* Discipline Pills */}
          <div className="flex flex-wrap gap-2 pb-1">
            <button
              type="button"
              onClick={() => handleFilterChange("todas")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                activeDiscipline === "todas"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              Todas as Disciplinas ({data.totalChapters})
            </button>
            {(data.disciplines || []).map((disc) => {
              const stat = (data.disciplineStats || []).find((s) => s.discipline === disc);
              return (
                <button
                  key={disc}
                  type="button"
                  onClick={() => handleFilterChange(disc)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    activeDiscipline === disc
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {disc} {stat ? `(${stat.count})` : ""}
                </button>
              );
            })}
          </div>
        </section>

        {/* Chapters Grid */}
        {allChapters.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/50 p-12 text-center">
            <p className="text-base font-medium text-foreground">
              Nenhum capítulo encontrado para este filtro.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Experimente limpar a busca ou sincronizar novamente pelo painel do GitHub acima.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allChapters.map((ch) => (
              <Link
                key={ch.id}
                to="/capitulos/$chapterId"
                params={{ chapterId: ch.id }}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card/90 p-5 transition hover:border-primary/60 hover:bg-card shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-secondary px-2 py-0.5 font-mono text-xs font-semibold text-primary border border-border">
                      {ch.chapter_code}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        ch.status === "publicado"
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }
                    >
                      {ch.status === "publicado" && (
                        <CheckCircle2 className="mr-1 h-3 w-3 inline" />
                      )}
                      {ch.status}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {ch.discipline} · {ch.arc_name}
                    </p>
                    <h3 className="mt-1 line-clamp-2 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {ch.title}
                    </h3>
                  </div>

                  {ch.summary && (
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                      {ch.summary}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    {ch.questions_count > 0 && (
                      <span className="text-foreground font-medium">
                        {ch.questions_count} pontos/questões
                      </span>
                    )}
                    {ch.cards_count > 0 && <span>{ch.cards_count} materiais/cards</span>}
                  </div>
                  <span className="inline-flex items-center gap-1 font-medium text-primary group-hover:translate-x-0.5 transition-transform">
                    Abrir capítulo
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="border-primary/40 bg-card text-foreground hover:bg-secondary"
            >
              {loadingMore ? "Carregando mais capítulos..." : "Carregar mais capítulos"}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}