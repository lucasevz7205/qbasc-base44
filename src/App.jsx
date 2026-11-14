import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  Layers,
  LogIn,
  LogOut,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { base44 } from "./api/base44Client";
import {
  AchievementEmblem,
  Badge,
  BrandHeader,
  Button,
  CognitiveAlertBanner,
  FeedbackDrawer,
  HeroAscension,
  Panel,
  ProgressBar,
  RadialNavigation,
  StudySessionHeader,
  WelcomeScreen,
} from "./components/DesignSystem";
import {
  computeDashboardMetrics,
  DEMO_STUDY_DATA,
  loadStudyDataFromBase44,
  saveAnswerToBase44,
} from "./lib/study-store";
import {
  ConceptPanel,
  MindMapCanvas,
  mindMapToCanvasNodes,
} from "./components/MindMapCanvas";

const NAV_ITEMS = [
  { id: "hoje", label: "Hoje", icon: Compass },
  { id: "edital", label: "Edital", icon: BookOpen },
  { id: "retencao", label: "Retenção 7+ d", icon: ShieldCheck },
  { id: "treinar", label: "Treinar C/E", icon: Target },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "mapas", label: "Mapas", icon: Brain },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("hoje");
  const [enteredApp, setEnteredApp] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [mapReturnTo, setMapReturnTo] = useState(null);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [rawData, setRawData] = useState(DEMO_STUDY_DATA);
  const [isDemo, setIsDemo] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!enteredApp && !user) return undefined;
    if (activeTab !== "treinar" && activeTab !== "flashcards") return undefined;
    if (sessionPaused) return undefined;
    const id = window.setInterval(() => {
      setSessionElapsed((t) => t + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [enteredApp, user, activeTab, sessionPaused]);

  useEffect(() => {
    let alive = true;
    async function init() {
      setLoading(true);
      try {
        const me = await base44.auth.me().catch(() => null);
        if (!alive) return;
        setUser(me);
        if (me) {
          const loaded = await loadStudyDataFromBase44();
          if (!alive) return;
          const hasDocs =
            loaded.edital.length > 0 ||
            loaded.questoes.length > 0 ||
            loaded.respostas.length > 0;
          if (hasDocs) {
            setRawData(loaded);
            setIsDemo(false);
            setStatusMessage("");
          } else {
            setRawData(DEMO_STUDY_DATA);
            setIsDemo(true);
            setStatusMessage(
              "Conectado à Base44 (sem documentos migrados ainda — exibindo dados de demonstração)."
            );
          }
        }
      } catch (err) {
        if (!alive) return;
        setStatusMessage(
          err?.message || "Modo demonstração local ativo (sem sessão Base44)."
        );
      } finally {
        if (alive) setLoading(false);
      }
    }
    init();
    return () => {
      alive = false;
    };
  }, []);

  const metrics = useMemo(() => computeDashboardMetrics(rawData), [rawData]);

  function handleImportJson(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        setRawData({
          edital: Array.isArray(parsed.edital) ? parsed.edital : [],
          questoes: Array.isArray(parsed.questoes) ? parsed.questoes : [],
          respostas: Array.isArray(parsed.respostas) ? parsed.respostas : [],
          revisao: Array.isArray(parsed.revisao) ? parsed.revisao : [],
          diario: Array.isArray(parsed.diario) ? parsed.diario : [],
          pegadinhas: Array.isArray(parsed.pegadinhas) ? parsed.pegadinhas : [],
        });
        setIsDemo(false);
        setStatusMessage(`Arquivo "${file.name}" carregado para visualização.`);
      } catch {
        setStatusMessage("Arquivo JSON inválido para importação.");
      }
    };
    reader.readAsText(file);
  }

  function handleAnswerRecorded(qid, newRecord) {
    setRawData((prev) => {
      const rest = (prev.respostas || []).filter((r) => (r.qid || r.id) !== qid);
      return { ...prev, respostas: [...rest, newRecord] };
    });
  }

  if (!loading && !user && !enteredApp) {
    return (
      <WelcomeScreen
        onLogin={() => base44.auth.redirectToLogin?.()}
        onEnterDemo={() => setEnteredApp(true)}
      />
    );
  }

  const hideChromeForFocus = focusMode && (activeTab === "treinar" || activeTab === "flashcards");

  return (
    <div>
      {!hideChromeForFocus ? (
        <BrandHeader
          navItems={NAV_ITEMS}
          activeNav={activeTab}
          onSelectNav={(tab) => {
            setFocusMode(false);
            setActiveTab(tab);
          }}
          isDemo={isDemo}
        rightSlot={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Button
              variant="secondary"
              size="sm"
              icon={MessageSquare}
              onClick={() => setTutorOpen(true)}
            >
              Tutor IA
            </Button>
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                icon={LogOut}
                onClick={() => base44.auth.logout()}
              >
                Sair
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                icon={LogIn}
                onClick={() => base44.auth.redirectToLogin?.()}
              >
                Entrar
              </Button>
            )}
          </div>
        }
      />
      ) : null}

      <main className="qb-main-container">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={handleImportJson}
        />
        {(statusMessage || isDemo) && !hideChromeForFocus ? (
          <Panel
            variant="sunken"
            style={{
              padding: "10px 16px",
              marginBottom: 18,
              borderColor: "rgba(242, 199, 110, 0.35)",
              fontSize: 14,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>
              {statusMessage ||
                "Modo demonstração ativo. Faça login na Base44 ou importe um JSON do Controle de Estudo para ver seus dados reais."}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={Upload}
              onClick={() => fileInputRef.current?.click()}
            >
              Importar JSON
            </Button>
          </Panel>
        ) : null}

        {loading ? (
          <Panel style={{ padding: 32, textAlign: "center" }}>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>
              Carregando painel de estudo...
            </p>
          </Panel>
        ) : null}

        {!loading && activeTab === "hoje" ? (
          <HojeView
            userName={user?.full_name || user?.name || "Lucas"}
            metrics={metrics}
            onNavigate={setActiveTab}
            onOpenTutor={() => setTutorOpen(true)}
          />
        ) : null}

        {!loading && activeTab === "edital" ? (
          <EditalProgressView metrics={metrics} />
        ) : null}

        {!loading && activeTab === "retencao" ? (
          <RetentionView metrics={metrics} />
        ) : null}

        {!loading && activeTab === "treinar" ? (
          <TreinarView
            questoes={rawData.questoes}
            respostas={rawData.respostas}
            isDemo={isDemo || !user}
            elapsed={sessionElapsed}
            paused={sessionPaused}
            focusMode={focusMode}
            onTogglePause={() => setSessionPaused((p) => !p)}
            onToggleFocus={() => setFocusMode((f) => !f)}
            onBack={() => {
              setFocusMode(false);
              setActiveTab("hoje");
            }}
            onOpenConcept={(qid) => {
              setFocusMode(false);
              setMapReturnTo({ label: `questão ${qid}`, tab: "treinar" });
              setActiveTab("mapas");
            }}
            onGoFlashcards={() => {
              setFocusMode(false);
              setActiveTab("flashcards");
            }}
            onAnswerRecorded={handleAnswerRecorded}
            onOpenTutor={() => setTutorOpen(true)}
          />
        ) : null}

        {!loading && activeTab === "flashcards" ? (
          <FlashcardsView
            flashcards={metrics.flashcards}
            isDemo={isDemo || !user}
            user={user}
            elapsed={sessionElapsed}
            paused={sessionPaused}
            focusMode={focusMode}
            onTogglePause={() => setSessionPaused((p) => !p)}
            onToggleFocus={() => setFocusMode((f) => !f)}
            onBack={() => {
              setFocusMode(false);
              setActiveTab("hoje");
            }}
            onOpenOrigin={() => {
              setFocusMode(false);
              setMapReturnTo({ label: "revisão de flashcards", tab: "flashcards" });
              setActiveTab("mapas");
            }}
          />
        ) : null}

        {!loading && activeTab === "mapas" ? (
          <MindMapsView
            mindMaps={metrics.mindMaps}
            returnTo={mapReturnTo}
            onReturn={() => {
              if (mapReturnTo?.tab) setActiveTab(mapReturnTo.tab);
              setMapReturnTo(null);
            }}
            onReview={() => setActiveTab("flashcards")}
          />
        ) : null}
      </main>

      <TutorDrawer
        open={tutorOpen}
        onClose={() => setTutorOpen(false)}
        user={user}
        context={{
          activeTab,
          editalCoveragePercent: metrics.editalCoveragePercent,
          retainedCount: metrics.retainedCount,
          dueReviews: metrics.dueReviews,
          notebookCount: metrics.notebookCount,
        }}
      />
    </div>
  );
}

function HojeView({ userName, metrics, onNavigate }) {
  const radialItems = [
    { id: "treinar", label: "Treinar C/E", meta: `${metrics.totalQuestions} itens`, icon: Target },
    { id: "edital", label: "Edital", meta: `${metrics.doneEdital}/${metrics.totalEdital} tópicos`, icon: BookOpen },
    { id: "retencao", label: "Retenção 7+ d", meta: `${metrics.retainedCount} retidos`, icon: ShieldCheck },
    { id: "flashcards", label: "Flashcards", meta: `${metrics.flashcards.length} cartões`, icon: Layers },
    { id: "mapas", label: "Mapas Mentais", meta: `${metrics.mindMaps.length} mapa(s)`, icon: Brain },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <HeroAscension
        eyebrow="A Ascensão · Hoje"
        title={`Bom estudo, ${userName}`}
        subtitle={
          metrics.dueReviews > 0
            ? `Você tem ${metrics.dueReviews} revisão(ões) vencida(s) hoje e ${metrics.notebookCount} item(ns) no caderno de erros.`
            : "Painel limpo conectado ao esquema ClaudeDocument, focado em cobertura do edital, retenção de 7+ dias e treino ativo."
        }
        progress={metrics.editalCoveragePercent}
        primaryAction={
          <Button variant="primary" size="lg" icon={Target} onClick={() => onNavigate("treinar")}>
            Treinar questões C/E
          </Button>
        }
        secondaryAction={
          <Button variant="secondary" size="lg" icon={BookOpen} onClick={() => onNavigate("edital")}>
            Ver progresso do edital
          </Button>
        }
        metrics={[
          { label: "Acerto geral", value: `${metrics.accuracyPercent}%`, accent: "var(--state-correct)" },
          { label: "Retidos 7+ dias", value: `${metrics.retainedCount}`, accent: "var(--qb-gold-bright)" },
          {
            label: "Calibração certeza",
            value: metrics.calibrationPercent !== null ? `${metrics.calibrationPercent}%` : "—",
            accent:
              metrics.calibrationPercent !== null && metrics.calibrationPercent >= 90
                ? "var(--state-correct)"
                : "var(--state-attention)",
          },
          {
            label: "Revisões hoje",
            value: `${metrics.dueReviews}`,
            accent: metrics.dueReviews > 0 ? "var(--state-attention)" : "var(--qb-ivory)",
          },
        ]}
      />

      <div className="qb-dash-grid">
        <Panel style={{ padding: 24 }}>
          <span className="qb-overline">Bússola de Estudo</span>
          <h2 style={{ margin: "6px 0 14px", fontFamily: "var(--font-heading)", fontSize: 22 }}>
            Visão rápida do dia
          </h2>
          <RadialNavigation
            items={radialItems}
            activeId="treinar"
            onSelect={(id) => onNavigate(id)}
          />
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Panel variant="ornate" style={{ padding: 20 }}>
            <span className="qb-overline">Marcos de Retenção</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
              <AchievementEmblem
                id="soldado"
                title="Base Respondida"
                subtitle={`${metrics.answeredCount} de ${metrics.totalQuestions} itens respondidos`}
                unlocked={metrics.answeredCount >= 1}
              />
              <AchievementEmblem
                id="sabio"
                title="Retenção 7+ Dias"
                subtitle={`${metrics.retainedCount} itens consolidados após 7+ dias`}
                unlocked={metrics.retainedCount >= 1}
              />
              <AchievementEmblem
                id="estrategista"
                title="Meta de Calibração (90%+)"
                subtitle={
                  metrics.calibrationPercent !== null
                    ? `${metrics.certCorrect}/${metrics.certTotal} acertos com certeza`
                    : "Sem itens respondidos com certeza (3)"
                }
                unlocked={metrics.calibrationPercent !== null && metrics.calibrationPercent >= 90}
              />
            </div>
          </Panel>

          <Panel style={{ padding: 20 }}>
            <span className="qb-overline">Último Registro no Diário</span>
            {metrics.latestDiary ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--qb-gold)" }}>
                  {metrics.latestDiary.data || metrics.latestDiary.id}
                </div>
                <p style={{ margin: "6px 0 8px", color: "var(--text-secondary)", fontSize: 14 }}>
                  {metrics.latestDiary.resumo || metrics.latestDiary.texto || "Sessão registrada."}
                </p>
                {metrics.latestDiary.proximoPasso ? (
                  <div style={{ fontSize: 13, color: "var(--qb-gold-bright)" }}>
                    <strong>Próximo passo:</strong> {metrics.latestDiary.proximoPasso}
                  </div>
                ) : null}
              </div>
            ) : (
              <p style={{ margin: "10px 0 0", color: "var(--text-muted)", fontSize: 14 }}>
                Nenhum registro de diário encontrado ainda.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function EditalProgressView({ metrics }) {
  const [selectedMateria, setSelectedMateria] = useState("ALL");

  const filteredMaterias = useMemo(() => {
    if (selectedMateria === "ALL") return metrics.materias;
    return metrics.materias.filter((m) => m.materia === selectedMateria);
  }, [metrics.materias, selectedMateria]);

  const statusTone = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "dominado") return "correct";
    if (s === "revisado") return "gold";
    if (s === "em_andamento") return "attention";
    return "no-evidence";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Panel variant="ornate" style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <span className="qb-overline">Cobertura Programática</span>
            <h1 style={{ margin: "4px 0 0", fontFamily: "var(--font-heading)", fontSize: 26 }}>
              Progresso do Edital ({metrics.doneEdital}/{metrics.totalEdital} tópicos)
            </h1>
          </div>

          <select
            aria-label="Filtrar por matéria"
            className="qb-input"
            style={{ width: "auto", minWidth: 220 }}
            value={selectedMateria}
            onChange={(e) => setSelectedMateria(e.target.value)}
          >
            <option value="ALL">Todas as matérias</option>
            {metrics.materias.map((m) => (
              <option key={m.materia} value={m.materia}>
                {m.materia} ({m.done}/{m.total})
              </option>
            ))}
          </select>
        </div>

        <ProgressBar
          value={metrics.editalCoveragePercent}
          max={100}
          label="Percentual concluído/revisado do edital"
          height={10}
        />
      </Panel>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filteredMaterias.map((group) => (
          <Panel key={group.materia} style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <ProgressBar
                value={group.done}
                max={group.total}
                label={`${group.materia} (${group.done} de ${group.total})`}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {group.topics.map((topic) => (
                <div
                  key={topic.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "var(--surface-sunken)",
                    border: "var(--border-hairline)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 15, color: "var(--qb-ivory)" }}>
                      {topic.titulo || topic.nome || topic.id}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                      {topic.id}
                    </div>
                  </div>
                  <Badge tone={statusTone(topic.status)}>{topic.status || "pendente"}</Badge>
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

function RetentionView({ metrics }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Panel variant="ornate" style={{ padding: 24 }}>
        <span className="qb-overline">Evidência de Memória (7+ dias)</span>
        <h1 style={{ margin: "4px 0 8px", fontFamily: "var(--font-heading)", fontSize: 26 }}>
          Retenção de 7+ dias e Calibração
        </h1>
        <p style={{ margin: "0 0 18px", color: "var(--text-secondary)", fontSize: 14 }}>
          &ldquo;Dominado&rdquo; exige retenção comprovada após 7+ dias sem chute. Capítulos <code>SIM-</code> ficam fora dos percentuais.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <Panel variant="sunken" style={{ padding: 16 }}>
            <div className="qb-overline">Retidos (7+ dias)</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, color: "var(--state-correct)", marginTop: 6 }}>
              {metrics.retainedCount}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              {metrics.retentionPercent}% das questões respondidas
            </div>
          </Panel>

          <Panel variant="sunken" style={{ padding: 16 }}>
            <div className="qb-overline">Aguardando janela de 7d</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, color: "var(--qb-gold-bright)", marginTop: 6 }}>
              {metrics.pendingRetentionCount}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Acertos recentes ainda sem 7 dias
            </div>
          </Panel>

          <Panel variant="sunken" style={{ padding: 16 }}>
            <div className="qb-overline">Calibração em Certeza (3)</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, color: "var(--qb-ivory)", marginTop: 6 }}>
              {metrics.calibrationPercent !== null ? `${metrics.calibrationPercent}%` : "—"}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Meta: 90%+ ({metrics.certCorrect}/{metrics.certTotal})
            </div>
          </Panel>

          <Panel variant="sunken" style={{ padding: 16 }}>
            <div className="qb-overline">Caderno de Erros</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 28, color: "var(--state-incorrect)", marginTop: 6 }}>
              {metrics.notebookCount}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Saída após 2 acertos seguidos
            </div>
          </Panel>
        </div>
      </Panel>

      <div className="qb-dash-grid">
        <Panel style={{ padding: 20 }}>
          <span className="qb-overline">Itens Retidos (7+ dias)</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {metrics.retainedItems.length === 0 ? (
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
                Nenhum item completou a janela de retenção de 7+ dias ainda.
              </p>
            ) : (
              metrics.retainedItems.map(({ question, response }) => (
                <div
                  key={question.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--surface-sunken)",
                    border: "var(--border-hairline)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <Badge tone="correct" icon={CheckCircle2}>
                      Retido em {String(response.retidoEm).slice(0, 10)}
                    </Badge>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                      {question.cap}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--qb-ivory)" }}>{question.enunciado}</div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel style={{ padding: 20 }}>
          <span className="qb-overline">Caderno de Erros Ativo</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {metrics.notebookItems.length === 0 ? (
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
                Nenhum item pendente no caderno de erros.
              </p>
            ) : (
              metrics.notebookItems.map(({ question, response }) => (
                <div
                  key={question.id}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--surface-sunken)",
                    border: "var(--border-hairline)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                    <Badge tone="incorrect">Motivo: {response.motivo || "erro"}</Badge>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
                      Próx. revisão: {response.proxRevisao || "hoje"}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: "var(--qb-ivory)" }}>{question.enunciado}</div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function TreinarView({
  questoes,
  respostas,
  isDemo,
  elapsed = 0,
  paused = false,
  focusMode = false,
  onTogglePause,
  onToggleFocus,
  onBack,
  onOpenConcept,
  onGoFlashcards,
  onAnswerRecorded,
  onOpenTutor,
}) {
  const respMap = useMemo(
    () => new Map(respostas.map((r) => [r.qid || r.id, r])),
    [respostas]
  );
  const queue = useMemo(
    () => questoes.filter((q) => !String(q.cap || "").startsWith("SIM-")),
    [questoes]
  );
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [submitted, setSubmitted] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessionErrors, setSessionErrors] = useState([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = queue[idx] || null;
  const prevResp = current ? respMap.get(current.id) : null;

  async function handleConfirm() {
    if (!current || !choice) return;
    if (choice !== "B" && !confidence) return;
    setSaving(true);
    try {
      const result = await saveAnswerToBase44({
        question: current,
        prev: prevResp || {},
        marked: choice,
        confidence,
        isDemo,
      });
      setSubmitted(result);
      setDrawerOpen(true);
      if (!result.acertou && !result.isBlank) {
        setSessionErrors((prev) => [...prev, current]);
        setBannerDismissed(false);
      }
      onAnswerRecorded?.(current.id, result.record);
    } finally {
      setSaving(false);
    }
  }

  function nextQuestion() {
    if (idx + 1 < queue.length) {
      setIdx(idx + 1);
      setChoice(null);
      setConfidence(null);
      setSubmitted(null);
      setDrawerOpen(false);
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (!current) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase();
      if (!submitted) {
        if (k === "c") setChoice("C");
        else if (k === "e") setChoice("E");
        else if (k === "b") {
          setChoice("B");
          setConfidence(null);
        } else if ((k === "1" || k === "2" || k === "3") && choice !== "B") {
          setConfidence(Number(k));
        } else if (e.key === "Enter" && choice && (choice === "B" || confidence)) {
          e.preventDefault();
          handleConfirm();
        }
      } else if (e.key === "Enter" && idx + 1 < queue.length) {
        e.preventDefault();
        nextQuestion();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!current) {
    return (
      <Panel style={{ padding: 32, textAlign: "center" }}>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          Nenhuma questão disponível.
        </p>
      </Panel>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <StudySessionHeader
        subject={current.cap || "Treino C/E"}
        topic={current.tema || current.topico || "Questões padrão Cebraspe"}
        current={idx + 1}
        total={queue.length}
        unit="Questão"
        elapsed={elapsed}
        paused={paused}
        focusMode={focusMode}
        onTogglePause={onTogglePause}
        onToggleFocus={onToggleFocus}
        onBack={onBack}
      />

      {!focusMode && sessionErrors.length > 0 && !bannerDismissed ? (
        <CognitiveAlertBanner
          tone="attention"
          title={`${sessionErrors.length} ${sessionErrors.length > 1 ? "erros" : "erro"} nesta sessão`}
          onDismiss={() => setBannerDismissed(true)}
          actions={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenConcept?.(sessionErrors[sessionErrors.length - 1].id)}
            >
              Revisar conceito no mapa
            </Button>
          }
        >
          Último erro registrado em {sessionErrors[sessionErrors.length - 1].cap || "tópico atual"}. Confira a origem do erro antes de avançar.
        </CognitiveAlertBanner>
      ) : null}

      <Panel variant="ornate" style={{ padding: 26 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge tone="gold">
              Item {idx + 1} de {queue.length}
            </Badge>
            {current.cap ? <Badge tone="neutral">{current.cap}</Badge> : null}
            {current.origem ? <Badge tone="neutral">{current.origem}</Badge> : null}
          </div>
          <Button variant="ghost" size="sm" icon={MessageSquare} onClick={onOpenTutor}>
            Perguntar ao Tutor IA
          </Button>
        </div>

        <p style={{ margin: "0 0 22px", fontSize: 18, lineHeight: 1.65, color: "var(--qb-ivory)" }}>
          {current.enunciado || current.texto}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
          <button
            type="button"
            className={`qb-choice ${
              submitted
                ? current.gabarito === "C"
                  ? "is-correct"
                  : choice === "C"
                    ? "is-incorrect"
                    : ""
                : ""
            }`}
            aria-pressed={choice === "C"}
            disabled={Boolean(submitted)}
            onClick={() => setChoice("C")}
          >
            <span className="qb-choice__key">C</span>
            <span>Certo</span>
          </button>

          <button
            type="button"
            className={`qb-choice ${
              submitted
                ? current.gabarito === "E"
                  ? "is-correct"
                  : choice === "E"
                    ? "is-incorrect"
                    : ""
                : ""
            }`}
            aria-pressed={choice === "E"}
            disabled={Boolean(submitted)}
            onClick={() => setChoice("E")}
          >
            <span className="qb-choice__key">E</span>
            <span>Errado</span>
          </button>

          <button
            type="button"
            className="qb-choice"
            style={{ flex: "0.7 1 160px" }}
            aria-pressed={choice === "B"}
            disabled={Boolean(submitted)}
            onClick={() => {
              setChoice("B");
              setConfidence(null);
            }}
          >
            <span className="qb-choice__key">—</span>
            <span>Em branco</span>
          </button>
        </div>

        {!submitted ? (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 14,
              paddingTop: 14,
              borderTop: "var(--border-hairline)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Confiança antes do gabarito:
              </span>
              <div className="qb-seg" role="group" aria-label="Nível de confiança">
                {[
                  { val: 1, label: "1 · Chute" },
                  { val: 2, label: "2 · Dúvida" },
                  { val: 3, label: "3 · Certeza" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    className="qb-seg__opt"
                    aria-pressed={confidence === opt.val}
                    disabled={choice === "B"}
                    onClick={() => setConfidence(opt.val)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              loading={saving}
              disabled={!choice || (choice !== "B" && !confidence)}
              onClick={handleConfirm}
            >
              Confirmar e ver gabarito
            </Button>
          </div>
        ) : null}
      </Panel>

      {submitted ? (
        <Panel
          style={{
            padding: 24,
            borderColor: submitted.acertou
              ? "var(--state-correct)"
              : submitted.isBlank
                ? "var(--state-attention)"
                : "var(--state-incorrect)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {submitted.acertou ? (
                <CheckCircle2 size={22} style={{ color: "var(--state-correct)" }} />
              ) : (
                <XCircle size={22} style={{ color: "var(--state-incorrect)" }} />
              )}
              <strong style={{ fontSize: 18 }}>
                {submitted.acertou ? "Você acertou!" : "Você errou este item"}
              </strong>
              <Badge tone={current.gabarito === "C" ? "correct" : "incorrect"}>
                Gabarito: {current.gabarito === "C" ? "CERTO" : "ERRADO"}
              </Badge>
            </div>

            <Button
              variant="primary"
              icon={ChevronRight}
              disabled={idx + 1 >= queue.length}
              onClick={nextQuestion}
            >
              {idx + 1 >= queue.length ? "Fim da fila" : "Próxima questão"}
            </Button>
          </div>

          {current.comentario ? (
            <p style={{ margin: "0 0 12px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {current.comentario}
            </p>
          ) : null}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {current.mecanismo ? <Badge tone="gold">Mecanismo: {current.mecanismo}</Badge> : null}
            {current.fonte ? <Badge tone="neutral">Fonte: {current.fonte}</Badge> : null}
            <Badge tone="neutral">Próx. revisão: {submitted.record.proxRevisao}</Badge>
          </div>

          {current.vacina ? (
            <p style={{ margin: "12px 0 0", fontSize: 14, color: "var(--qb-gold)" }}>
              <strong>Vacina:</strong> {current.vacina}
            </p>
          ) : null}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
              Abrir gaveta de correção
            </Button>
            {onOpenConcept ? (
              <Button variant="ghost" size="sm" onClick={() => onOpenConcept(current.id)}>
                Ver conceito no mapa
              </Button>
            ) : null}
          </div>
        </Panel>
      ) : null}

      <div style={{ textAlign: "center", font: "400 12px/1 var(--font-mono)", color: "var(--text-muted)" }}>
        Atalhos: C / E / B para marcar · 1 / 2 / 3 para confiança · Enter para confirmar ou avançar
      </div>

      <FeedbackDrawer
        open={Boolean(submitted && drawerOpen)}
        onClose={() => setDrawerOpen(false)}
        result={submitted ? (submitted.acertou ? "correct" : submitted.isBlank ? "blank" : "incorrect") : null}
        answerKey={current.gabarito}
        explanation={current.comentario}
        legalBasis={current.fonte}
        trap={
          current.mecanismo || current.vacina
            ? {
                name: current.mecanismo ? `Mecanismo ${current.mecanismo}` : "Alerta de banca",
                description: current.vacina || current.evidencia || "",
              }
            : null
        }
        concept={{ path: [current.cap || "Edital", current.tema || current.topico || `Item ${current.id}`] }}
        onOpenConcept={() => {
          setDrawerOpen(false);
          onOpenConcept?.(current.id);
        }}
        onFlashcards={() => {
          setDrawerOpen(false);
          onGoFlashcards?.();
        }}
      />
    </div>
  );
}

const FLASH_RATES = [
  { key: "errei", label: "Errei", interval: "< 1 min" },
  { key: "dificil", label: "Difícil", interval: "10 min" },
  { key: "bom", label: "Bom", interval: "1 d" },
  { key: "facil", label: "Fácil", interval: "4 d" },
];

function FlashcardsView({
  flashcards,
  isDemo,
  user,
  elapsed = 0,
  paused = false,
  focusMode = false,
  onTogglePause,
  onToggleFocus,
  onBack,
  onOpenOrigin,
}) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [evocacao, setEvocacao] = useState("");
  const [ratings, setRatings] = useState([]);
  const [aiGrade, setAiGrade] = useState("");
  const [grading, setGrading] = useState(false);

  const card = flashcards[idx] || null;

  function go(delta) {
    if (!flashcards.length) return;
    setIdx((idx + delta + flashcards.length) % flashcards.length);
    setFlipped(false);
    setEvocacao("");
    setAiGrade("");
  }

  function handleRate(rateKey) {
    setRatings((prev) => [...prev, { id: card?.id || idx, rate: rateKey }]);
    go(1);
  }

  async function correctFlashcardWithAI() {
    if (!card || !evocacao.trim()) return;
    setGrading(true);
    try {
      if (user && !isDemo) {
        const res = await base44.functions.invoke("study-tutor", {
          mode: "grade_flashcard",
          front: card.front,
          back: card.back,
          userAnswer: evocacao.trim(),
        });
        setAiGrade(res?.data?.feedback || res?.feedback || "Correção concluída.");
      } else {
        const refWords = String(card.back || "")
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 3);
        const userWords = new Set(evocacao.toLowerCase().split(/\W+/));
        const hits = refWords.filter((w) => userWords.has(w)).length;
        const pct = refWords.length ? Math.round((hits / refWords.length) * 100) : 0;
        setAiGrade(
          `Modo Demonstração (sem IA conectada): coincidência lexical de ${pct}% com os termos-chave do verso. Compare com o gabarito ao virar o cartão.`
        );
      }
    } catch (err) {
      setAiGrade(err?.message || "Não foi possível avaliar a resposta agora.");
    } finally {
      setGrading(false);
    }
  }

  useEffect(() => {
    function onKey(e) {
      if (!card) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!card) {
    return (
      <Panel style={{ padding: 32, textAlign: "center" }}>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          Nenhum flashcard encontrado.
        </p>
      </Panel>
    );
  }

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <StudySessionHeader
        subject="Flashcards · Revisão Ativa"
        topic={card.topicId || "Caderno de revisão"}
        current={idx + 1}
        total={flashcards.length}
        unit="Cartão"
        elapsed={elapsed}
        paused={paused}
        focusMode={focusMode}
        onTogglePause={onTogglePause}
        onToggleFocus={onToggleFocus}
        onBack={onBack}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={{ font: "400 13px/1 var(--font-mono)", color: "var(--text-muted)" }}>
          {ratings.length} avaliados nesta sessão
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={() => go(-1)}>
            Anterior
          </Button>
          <Button variant="secondary" size="sm" icon={ChevronRight} onClick={() => go(1)}>
            Próximo
          </Button>
        </div>
      </div>

      <div className="qb-flash" style={{ minHeight: 270 }}>
        <div className={`qb-flash__inner ${flipped ? "is-flipped" : ""}`} style={{ minHeight: 270 }}>
          <Panel
            variant="ornate"
            className="qb-flash__face"
            style={{ padding: 26, justifyContent: "space-between" }}
          >
            <Badge tone="gold">{card.topicId}</Badge>
            <p style={{ fontSize: 20, lineHeight: 1.5, margin: "16px 0" }}>{card.front}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ font: "400 12px/1 var(--font-mono)", color: "var(--text-muted)" }}>
                Espaço · virar cartão
              </span>
              <Button variant="secondary" icon={RotateCcw} onClick={() => setFlipped(true)}>
                Virar cartão
              </Button>
            </div>
          </Panel>

          <Panel
            className="qb-flash__face qb-flash__face--back"
            style={{ padding: 26, justifyContent: "space-between", background: "var(--surface-sunken)", borderColor: "var(--qb-gold)" }}
          >
            <Badge tone="correct">Verso / Gabarito</Badge>
            <p style={{ fontSize: 18, lineHeight: 1.6, margin: "16px 0" }}>{card.back}</p>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              {onOpenOrigin ? (
                <button type="button" className="qb-linkbtn" onClick={onOpenOrigin}>
                  Origem no mapa: {card.topicId}
                </button>
              ) : <span />}
              <Button variant="ghost" icon={RotateCcw} onClick={() => setFlipped(false)}>
                Ver frente
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      {flipped ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div role="group" aria-label="Autoavaliação espaçada" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {FLASH_RATES.map((r) => (
              <button key={r.key} type="button" className="qb-rate" onClick={() => handleRate(r.key)}>
                {r.label}
                <small>{r.interval}</small>
              </button>
            ))}
          </div>
          {isDemo ? (
            <span style={{ font: "400 12px/1.4 var(--font-body)", color: "var(--text-muted)", textAlign: "center" }}>
              Intervalos ilustrativos — modo demonstração, sem agendamento real.
            </span>
          ) : null}
        </div>
      ) : null}

      <Panel style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <label htmlFor="v2-flash-evoc" className="qb-overline" style={{ display: "block" }}>
          Escreva sua resposta antes de virar
        </label>
        <textarea
          id="v2-flash-evoc"
          className="qb-input"
          rows={3}
          placeholder="Escreva o que você lembra..."
          value={evocacao}
          onChange={(e) => setEvocacao(e.target.value)}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            size="sm"
            icon={Sparkles}
            loading={grading}
            disabled={!evocacao.trim()}
            onClick={correctFlashcardWithAI}
          >
            Corrigir resposta com IA
          </Button>
          {!flipped ? (
            <Button variant="ghost" size="sm" onClick={() => setFlipped(true)}>
              Mostrar verso
            </Button>
          ) : null}
        </div>
        {aiGrade ? (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "var(--surface-sunken)",
              border: "var(--border-hairline)",
              fontSize: 14,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
            }}
          >
            {aiGrade}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}

function MindMapsView({ mindMaps, returnTo, onReturn, onReview }) {
  const [selectedMapIdx, setSelectedMapIdx] = useState(0);
  const currentMap = mindMaps[selectedMapIdx] || null;
  const nodes = useMemo(() => mindMapToCanvasNodes(currentMap), [currentMap]);
  const [selectedId, setSelectedId] = useState("root");

  useEffect(() => {
    setSelectedId("root");
  }, [selectedMapIdx, currentMap]);

  if (!currentMap) {
    return (
      <Panel style={{ padding: 32, textAlign: "center" }}>
        <p style={{ margin: 0, color: "var(--text-secondary)" }}>
          Nenhum mapa mental encontrado.
        </p>
      </Panel>
    );
  }

  const selectedNode = nodes.find((n) => n.id === selectedId) || nodes[0] || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Panel style={{ padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="qb-overline">Mapas Mentais Estruturados</span>
          <h1 style={{ margin: "4px 0 0", fontFamily: "var(--font-heading)", fontSize: 24 }}>
            {currentMap.title}
          </h1>
        </div>
        {mindMaps.length > 1 ? (
          <select
            aria-label="Selecionar mapa"
            className="qb-input"
            style={{ width: "auto", minWidth: 240 }}
            value={selectedMapIdx}
            onChange={(e) => setSelectedMapIdx(Number(e.target.value))}
          >
            {mindMaps.map((m, i) => (
              <option key={m.id} value={i}>
                {m.title}
              </option>
            ))}
          </select>
        ) : null}
      </Panel>

      <div className="qb-dash-grid">
        <MindMapCanvas
          nodes={nodes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          height={540}
        />
        <ConceptPanel
          node={selectedNode}
          returnTo={returnTo?.label}
          onReturn={onReturn}
          onReview={onReview}
        />
      </div>
    </div>
  );
}

function TutorDrawer({ open, onClose, user, context }) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: user
        ? "Tutor IA conectado à Base44. Pergunte sobre qualquer tópico do edital ou pegadinha."
        : "Modo Demonstração: faça login na Base44 para consultar o Tutor IA em tempo real.",
    },
  ]);

  if (!open) return null;

  async function sendQuestion(e) {
    e?.preventDefault?.();
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);

    if (!user) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "[Demonstração] Entre na sua conta Base44 para ativar a função `study-tutor` com IA real.",
        },
      ]);
      return;
    }

    setBusy(true);
    try {
      const res = await base44.functions.invoke("study-tutor", { question: q, context });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.data?.answer || "Sem resposta." },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: err?.response?.data?.error || err?.message || "Erro ao consultar Tutor IA." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutor IA"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-drawer)",
        background: "rgba(8, 10, 15, 0.65)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        className="qb-panel"
        style={{
          width: "min(440px, 100vw)",
          height: "100%",
          borderRadius: 0,
          borderLeft: "var(--border-ornament)",
          boxShadow: "var(--shadow-drawer)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "var(--border-hairline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Sparkles size={18} style={{ color: "var(--qb-gold-bright)" }} />
            <strong style={{ fontFamily: "var(--font-display)", letterSpacing: "0.04em" }}>
              Tutor IA
            </strong>
          </div>
          <Button variant="ghost" size="sm" icon={X} onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                padding: "10px 14px",
                borderRadius: 14,
                background: m.role === "user" ? "var(--qb-navy-hover)" : "var(--surface-sunken)",
                border: "var(--border-hairline)",
                fontSize: 14,
                lineHeight: 1.55,
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          ))}
        </div>

        <form onSubmit={sendQuestion} style={{ padding: 16, borderTop: "var(--border-hairline)", display: "flex", gap: 8 }}>
          <input
            type="text"
            className="qb-input"
            placeholder="Pergunte sobre um tópico ou pegadinha..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <Button type="submit" variant="primary" loading={busy} icon={Send} disabled={!input.trim()}>
            Enviar
          </Button>
        </form>
      </div>
    </div>
  );
}
