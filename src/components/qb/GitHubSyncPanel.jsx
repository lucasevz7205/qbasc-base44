import React, { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/AuthContext";
import {
  listGitHubRepos,
  inspectGitHubRepoFiles,
  syncGitHubRepositoryToQBAsc,
} from "@/lib/server-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  RefreshCw,
  CheckCircle2,
  FolderGit2,
  FileCode2,
  Sparkles,
  LogIn,
  Clock,
} from "lucide-react";

export default function GitHubSyncPanel({ logs = [] }) {
  const { isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const router = useRouter();
  const fetchRepos = useServerFn(listGitHubRepos);
  const inspectRepo = useServerFn(inspectGitHubRepoFiles);
  const runSync = useServerFn(syncGitHubRepositoryToQBAsc);

  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("lucasevz7205/quebrando-a-banca");
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [syncMode, setSyncMode] = useState("all");
  const [repoInspection, setRepoInspection] = useState(null);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setLoadingRepos(true);
    fetchRepos()
      .then((list) => {
        if (!active) return;
        setRepos(list || []);
        if (list?.length && !list.some((r) => r.full_name === selectedRepo)) {
          setSelectedRepo(list[0].full_name);
          setSelectedBranch(list[0].default_branch || "main");
        }
      })
      .catch((err) => {
        if (active) setErrorMessage(err.message || "Falha ao listar repositórios.");
      })
      .finally(() => {
        if (active) setLoadingRepos(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const handleInspect = async (repoName = selectedRepo, branchName = selectedBranch) => {
    if (!repoName) return;
    setInspecting(true);
    setErrorMessage(null);
    try {
      const info = await inspectRepo({
        data: { repoFullName: repoName, branch: branchName || "main" },
      });
      setRepoInspection(info);
    } catch (err) {
      setErrorMessage(err.message || "Erro ao inspecionar arquivos do repositório.");
    } finally {
      setInspecting(false);
    }
  };

  const handleSync = async () => {
    if (!selectedRepo) return;
    setSyncing(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const res = await runSync({
        data: {
          repoFullName: selectedRepo,
          branch: selectedBranch || "main",
          mode: syncMode,
        },
      });
      setStatusMessage(
        `Sincronização concluída de ${res.repo}: ${res.createdChapters} novos capítulos, ${res.updatedChapters} atualizados e ${res.createdDocs} registros no acervo.`
      );
      await router.invalidate();
    } catch (err) {
      setErrorMessage(err.message || "Falha durante a sincronização com o GitHub.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/90 p-5 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary border border-primary/30">
            <FolderGit2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-foreground">
                Ponte de Sincronização GitHub → QBAsc
              </h2>
              <Badge className="bg-primary/20 text-primary border-primary/40">
                Conectado (OAuth)
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Importe e atualize automaticamente capítulos, pontos doutrinários, trilhas fiscais e documentos Markdown dos seus repositórios.
            </p>
          </div>
        </div>

        {!isLoadingAuth && !isAuthenticated && (
          <Button onClick={() => navigateToLogin()} size="sm" className="gap-2">
            <LogIn className="h-4 w-4" />
            Entrar para sincronizar novos pacotes
          </Button>
        )}
      </div>

      {isAuthenticated ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Repositório GitHub
              </label>
              <select
                value={selectedRepo}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedRepo(val);
                  const found = repos.find((r) => r.full_name === val);
                  if (found) setSelectedBranch(found.default_branch || "main");
                  setRepoInspection(null);
                }}
                disabled={loadingRepos || syncing}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {repos.length === 0 ? (
                  <>
                    <option value="lucasevz7205/quebrando-a-banca">
                      lucasevz7205/quebrando-a-banca
                    </option>
                    <option value="lucasevz7205/TutorIA">lucasevz7205/TutorIA</option>
                    <option value="lucasevz7205/UI-Desing">lucasevz7205/UI-Desing</option>
                  </>
                ) : (
                  repos.map((r) => (
                    <option key={r.full_name} value={r.full_name}>
                      {r.full_name} {r.private ? "(Privado)" : "(Público)"}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Pacote de Importação
              </label>
              <select
                value={syncMode}
                onChange={(e) => setSyncMode(e.target.value)}
                disabled={syncing}
                className="w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">
                  Completo (Edital + Pontos + Trilhas Fiscais + Docs)
                </option>
                <option value="edital_pontos">
                  Apenas Edital, Pontos, Materiais e Textos (Claude Seed)
                </option>
                <option value="fiscal_trilhas">
                  Apenas Trilhas da Área Fiscal & TI (Seeds T05–T59)
                </option>
                <option value="markdown_docs">
                  Documentação e Capítulos Markdown (.md)
                </option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => handleInspect()}
                disabled={inspecting || syncing}
                className="flex-1 gap-2 border-border bg-secondary/60 text-foreground hover:bg-secondary"
              >
                <FileCode2 className="h-4 w-4" />
                {inspecting ? "Lendo..." : "Inspecionar Arquivos"}
              </Button>
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Sincronizando..." : "Sincronizar Agora"}
              </Button>
            </div>
          </div>

          {statusMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/15 px-4 py-3 text-sm text-foreground">
              {errorMessage}
            </div>
          )}

          {repoInspection && (
            <div className="rounded-lg border border-border/80 bg-secondary/50 p-3.5">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <GitBranch className="h-3.5 w-3.5 text-primary" />
                  {repoInspection.repoFullName} ({repoInspection.branch}) —{" "}
                  {repoInspection.totalFiles} arquivos no repositório
                </span>
                <span>
                  {repoInspection.importableFiles.length} pacotes de conteúdo detectados
                </span>
              </div>
              <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto pt-1">
                {repoInspection.importableFiles.map((file) => (
                  <span
                    key={file.path}
                    className="inline-flex items-center gap-1 rounded border border-border bg-background/70 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >
                    {file.path}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Acervo inicial de <strong className="text-foreground">lucasevz7205/quebrando-a-banca</strong> já importado e pronto para navegação.
          </span>
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-4 border-t border-border/50 pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span>
              Última sincronização:{" "}
              <strong className="text-foreground">{logs[0].repo_full_name}</strong> ({logs[0].chapters_synced} capítulos · {logs[0].documents_synced} documentos) —{" "}
              {logs[0].notes}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}