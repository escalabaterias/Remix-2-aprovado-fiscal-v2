import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  AlertTriangle,
  Flag,
  TrendingUp,
  TrendingDown,
  Award,
  BookOpen,
  ArrowLeft,
  Sparkles,
  ShieldAlert,
  Brain,
  Timer,
  ChevronRight,
  Loader2,
  ListFilter,
  Check,
  AlertCircle,
  CheckCircle,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
} from "lucide-react";

import { analyzeSimulationPerformance } from "@/lib/questions/simulation-analytics";
import {
  getQuestionSet,
  fetchQuestionsByIds,
  getUserSimulationHistory,
} from "@/lib/questions/service";
import {
  analyzeSimulationHistory,
  analyzeSimulationComparison,
} from "@/lib/questions/simulation-historical-analytics";
import type {
  SimulationPerformanceAnalysis,
  QuestionSet,
  QuestionSetItem,
  QuestionBankItem,
  QuestionMetadataMap,
  PerformanceSignal,
  SubjectPerformance,
  TopicPerformance,
} from "@/lib/questions/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE FORMATAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

function formatSeconds(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getQuestionDetail(
  questionId: string,
  map?: Map<string, QuestionBankItem> | Record<string, QuestionBankItem> | null,
): QuestionBankItem | null {
  if (!map) return null;
  if (map instanceof Map) return map.get(questionId) ?? null;
  return map[questionId] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPS DO COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────

export type SimulationReportProps = {
  /** ID do simulado para busca remota automática */
  setId?: string;
  /** Análise pré-calculada do simulado (opcional) */
  analysis?: SimulationPerformanceAnalysis | null;
  /** Objeto do QuestionSet (se fornecido diretamente) */
  set?: QuestionSet | null;
  /** Lista dos itens do simulado (se fornecido diretamente) */
  items?: QuestionSetItem[] | null;
  /** Mapa de detalhes das questões (se fornecido diretamente) */
  questionsMap?: Map<string, QuestionBankItem> | Record<string, QuestionBankItem> | null;
  /** Sobrescreve estado de carregamento */
  isLoading?: boolean;
  /** Sobrescreve estado de erro */
  isError?: boolean;
  /** Mensagem de erro customizada */
  errorMessage?: string | null;
  /** Callback para voltar ou fechar o relatório */
  onClose?: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function SimulationReport({
  setId,
  analysis: directAnalysis,
  set: directSet,
  items: directItems,
  questionsMap: directQuestionsMap,
  isLoading: directIsLoading = false,
  isError: directIsError = false,
  errorMessage: directErrorMessage,
  onClose,
}: SimulationReportProps) {
  const [reviewFilter, setReviewFilter] = useState<
    "todos" | "corretas" | "incorretas" | "em_branco"
  >("todos");

  // 1. Busca remota do QuestionSet se setId for fornecido e analysis/items não existirem
  const shouldFetchSet = Boolean(setId && !directAnalysis && (!directSet || !directItems));

  const {
    data: fetchedSetData,
    isLoading: isFetchingSet,
    isError: isSetError,
    error: setError,
  } = useQuery({
    queryKey: ["simulado-report-set", setId],
    queryFn: async () => {
      if (!setId) return null;
      return getQuestionSet(setId);
    },
    enabled: shouldFetchSet,
  });

  const effectiveSet = directSet ?? fetchedSetData?.set ?? null;
  const effectiveItems = useMemo(
    () => directItems ?? fetchedSetData?.items ?? [],
    [directItems, fetchedSetData?.items],
  );

  // 2. Busca remota dos detalhes das questões
  const questionIds = useMemo(() => effectiveItems.map((i) => i.questionId), [effectiveItems]);

  const shouldFetchQuestions = Boolean(
    questionIds.length > 0 && !directAnalysis && !directQuestionsMap,
  );

  const { data: fetchedQuestionsMap, isLoading: isFetchingQuestions } = useQuery({
    queryKey: ["simulado-report-questions", questionIds],
    queryFn: () => fetchQuestionsByIds(questionIds),
    enabled: shouldFetchQuestions,
    staleTime: 1000 * 60 * 30,
  });

  const effectiveQuestionsMap = directQuestionsMap ?? fetchedQuestionsMap ?? null;

  // 3. Monta metadataMap para analyzeSimulationPerformance
  const metadataMap: QuestionMetadataMap = useMemo(() => {
    const metaMap: QuestionMetadataMap = {};
    if (!effectiveQuestionsMap) return metaMap;

    const entries =
      effectiveQuestionsMap instanceof Map
        ? Array.from(effectiveQuestionsMap.entries())
        : Object.entries(effectiveQuestionsMap);

    for (const [qId, qItem] of entries) {
      if (qItem) {
        metaMap[qId] = {
          subjectId: qItem.subjectId,
          topicId: qItem.topicId,
          difficulty: qItem.difficulty,
        };
      }
    }
    return metaMap;
  }, [effectiveQuestionsMap]);

  // 4. Análise calculada pelo motor oficial
  const calculatedAnalysis = useMemo(() => {
    if (directAnalysis) return directAnalysis;
    if (!effectiveSet || effectiveItems.length === 0) return null;

    // Converte QuestionSetItem para SimulationItemInput
    const simulationItems = effectiveItems.map((item) => {
      const qDetail = getQuestionDetail(item.questionId, effectiveQuestionsMap);
      return {
        itemId: item.itemId,
        questionId: item.questionId,
        position: item.position,
        isAnswered: item.isAnswered,
        isCorrect: item.isCorrect,
        chosenAnswer: item.chosenAnswer,
        timeSpentSeconds: item.timeSpentSeconds,
        subjectId: qDetail?.subjectId ?? null,
        topicId: qDetail?.topicId ?? null,
        difficulty: qDetail?.difficulty ?? null,
      };
    });

    return analyzeSimulationPerformance({
      set: {
        setId: effectiveSet.setId,
        name: effectiveSet.name,
        totalQuestions: effectiveSet.totalQuestions,
        timeLimitMinutes: effectiveSet.timeLimitMinutes,
        startedAt: effectiveSet.startedAt,
        completedAt: effectiveSet.completedAt,
      },
      items: simulationItems,
      questionsMap: metadataMap,
    });
  }, [directAnalysis, effectiveSet, effectiveItems, effectiveQuestionsMap, metadataMap]);

  const analysis = directAnalysis ?? calculatedAnalysis;

  // Busca do Histórico do Usuário para Análise Longitudinal (Etapa 8.2.5)
  const { data: simulationHistoryData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ["user-simulation-history"],
    queryFn: () => getUserSimulationHistory(),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const historicalAnalysis = useMemo(() => {
    if (!Array.isArray(simulationHistoryData) || simulationHistoryData.length === 0) return null;
    return analyzeSimulationHistory({ simulations: simulationHistoryData });
  }, [simulationHistoryData]);

  const comparativeAnalysis = useMemo(() => {
    if (!Array.isArray(simulationHistoryData) || simulationHistoryData.length === 0) return null;
    return analyzeSimulationComparison({ simulations: simulationHistoryData }, effectiveSet?.setId);
  }, [simulationHistoryData, effectiveSet?.setId]);

  const isLoading = directIsLoading || isFetchingSet || isFetchingQuestions;
  const isError = directIsError || isSetError;
  const errorMessage =
    directErrorMessage ||
    (setError instanceof Error ? setError.message : null) ||
    "Não foi possível carregar os dados do simulado.";

  // ───────────────────────────────────────────────────────────────────────────
  // ESTADO DE CARREGAMENTO
  // ───────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card
        id="simulation-report-loading"
        className="w-full max-w-5xl mx-auto my-8 border border-border shadow-xs"
      >
        <CardContent className="p-12 text-center flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              Processando Análise do Simulado...
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Gerando agregação de desempenho, análise de ritmo, mapa de matérias e sinais
              cognitivos.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ESTADO DE ERRO
  // ───────────────────────────────────────────────────────────────────────────
  if (isError || (!analysis && !effectiveSet)) {
    return (
      <Card
        id="simulation-report-error"
        className="w-full max-w-2xl mx-auto my-8 border-destructive/40"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Falha no Carregamento do Relatório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Voltar aos Simulados
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ESTADO VAZIO (SIMULADO SEM QUESTÕES)
  // ───────────────────────────────────────────────────────────────────────────
  if (analysis && analysis.overview.totalQuestions === 0) {
    return (
      <Card id="simulation-report-empty" className="w-full max-w-2xl mx-auto my-8 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            Simulado Sem Registros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Este simulado não contém questões registradas para análise de desempenho.
          </p>
        </CardContent>
        <CardFooter className="flex justify-end">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Voltar
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  if (!analysis) return null;

  const {
    overview,
    subjectPerformance,
    topicPerformance,
    pacing,
    signals,
    cognitiveImpactSummary,
    historicalComparison,
  } = analysis;

  // Itens para o gabarito
  const reviewItems = effectiveItems.length > 0 ? effectiveItems : [];

  const filteredReviewItems = reviewItems.filter((item) => {
    if (reviewFilter === "corretas") return item.isCorrect === true;
    if (reviewFilter === "incorretas") return item.isCorrect === false;
    if (reviewFilter === "em_branco") return !item.isAnswered && item.chosenAnswer === null;
    return true;
  });

  // Cor conceitual da nota
  const score = overview.accuracyPercentage;
  const scoreColorClass =
    score >= 70
      ? "text-emerald-600 dark:text-emerald-400"
      : score >= 50
        ? "text-amber-600 dark:text-amber-400"
        : "text-rose-600 dark:text-rose-400";

  return (
    <div id="simulation-report-container" className="w-full max-w-6xl mx-auto space-y-6 py-6 px-4">
      {/* BARRA SUPERIOR DE AÇÕES */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-2 text-xs">
              <ArrowLeft className="w-4 h-4" /> Voltar aos Simulados
            </Button>
          )}
          <Badge variant="outline" className="text-xs font-mono">
            ID: {analysis.setId}
          </Badge>
        </div>

        <span className="text-xs text-muted-foreground">
          Auditado pelo Engine Analítico em{" "}
          {new Date(analysis.analyzedAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          BLOCO 1 — HERO / RESUMO GLOBAL (HEADER & OVERALL SUMMARY)
         ─────────────────────────────────────────────────────────────────────── */}
      <Card id="simulation-report-hero" className="border-border shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-background to-primary/5 p-6 sm:p-8 border-b border-border">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="default"
                  className="px-2.5 py-0.5 text-xs bg-primary text-primary-foreground"
                >
                  Relatório Oficial de Desempenho
                </Badge>
                {score >= 70 ? (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                    Alto Desempenho
                  </Badge>
                ) : score >= 50 ? (
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  >
                    Aproveitamento Intermediário
                  </Badge>
                ) : (
                  <Badge variant="destructive">Atenção Necessária</Badge>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {effectiveSet?.name || "Análise do Simulado"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
                Diagnóstico analítico completo do desempenho por disciplina, tópicos críticos,
                gestão de tempo e padrão cognitivo.
              </p>
            </div>

            {/* CARD DE NOTA PRINCIPAL */}
            <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-card border border-border shadow-xs min-w-[170px]">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Aproveitamento
              </span>
              <span
                className={cn(
                  "text-4xl font-display font-black tracking-tight mt-1",
                  scoreColorClass,
                )}
              >
                {score.toFixed(1)}%
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">
                {overview.correctCount} de {overview.answeredCount} respondidas
              </span>
            </div>
          </div>
        </div>

        {/* GRID DE MÉTRICAS GLOBAIS */}
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5 text-primary" /> Questões
              </span>
              <span className="text-xl font-bold text-foreground">{overview.totalQuestions}</span>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Acertos
              </span>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                {overview.correctCount}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col gap-1">
              <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Erros
              </span>
              <span className="text-xl font-bold text-rose-700 dark:text-rose-400">
                {overview.wrongCount}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1">
              <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" /> Em Branco
              </span>
              <span className="text-xl font-bold text-amber-700 dark:text-amber-400">
                {overview.unansweredCount}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-primary" /> Tempo Total
              </span>
              <span className="text-xl font-bold text-foreground font-mono">
                {formatSeconds(overview.totalTimeSpentSeconds)}
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-muted/40 border border-border flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                <Timer className="w-3.5 h-3.5 text-primary" /> Média/Questão
              </span>
              <span className="text-xl font-bold text-foreground font-mono">
                {overview.avgTimePerQuestionSeconds.toFixed(0)}s
              </span>
            </div>
          </div>

          {/* COMPARAÇÃO HISTÓRICA */}
          {historicalComparison && (
            <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                {historicalComparison.trend === "IMPROVING" ? (
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                ) : historicalComparison.trend === "DECLINING" ? (
                  <TrendingDown className="w-4 h-4 text-rose-500" />
                ) : (
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <span className="font-semibold text-foreground">Evolução Histórica: </span>
                  <span className="text-muted-foreground">
                    Média anterior de {historicalComparison.historicalAvgAccuracyPercentage}% (
                    {historicalComparison.previousSimulationsCount} simulados anteriores)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    historicalComparison.accuracyDeltaPercentage >= 0 ? "outline" : "secondary"
                  }
                  className={cn(
                    "font-mono font-bold text-xs",
                    historicalComparison.accuracyDeltaPercentage > 0
                      ? "text-emerald-600 dark:text-emerald-400 border-emerald-300"
                      : historicalComparison.accuracyDeltaPercentage < 0
                        ? "text-rose-600 dark:text-rose-400 border-rose-300"
                        : "text-muted-foreground",
                  )}
                >
                  {historicalComparison.accuracyDeltaPercentage >= 0 ? "+" : ""}
                  {historicalComparison.accuracyDeltaPercentage.toFixed(1)}%
                </Badge>
                <span className="text-muted-foreground uppercase text-[10px] font-bold">
                  {historicalComparison.trend}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────
          BLOCO 2 — DESEMPENHO POR MATÉRIA (SUBJECT PERFORMANCE)
         ─────────────────────────────────────────────────────────────────────── */}
      <Card id="simulation-report-subjects" className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Desempenho por Matéria ({subjectPerformance.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Aproveitamento percentual, volume de erros e representatividade de cada disciplina.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {subjectPerformance.map((subj) => {
              const signalBadge =
                subj.signal === "STRONG_PERFORMANCE" ? (
                  <Badge className="bg-emerald-600 text-white">Desempenho Forte</Badge>
                ) : subj.signal === "HIGH_ATTENTION" ? (
                  <Badge variant="destructive">Atenção Crítica</Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/20 text-amber-700 dark:text-amber-400"
                  >
                    Atenção
                  </Badge>
                );

              return (
                <div
                  key={subj.subjectId}
                  className="p-4 bg-card hover:bg-muted/30 transition-colors space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {subj.subjectName}
                        </span>
                        {signalBadge}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {subj.totalQuestions} questão(ões) • {subj.shareOfTotalQuestionsPercentage}%
                        da prova
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">
                          Acertos/Erros
                        </span>
                        <span className="font-bold text-foreground">
                          {subj.correctCount}/{subj.wrongCount}
                          {subj.unansweredCount > 0 && (
                            <span className="text-amber-600 font-normal">
                              {" "}
                              ({subj.unansweredCount} em branco)
                            </span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Tempo Médio</span>
                        <span className="font-bold text-foreground">
                          {subj.avgTimePerQuestionSeconds.toFixed(0)}s
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-muted-foreground block text-[10px]">
                          Aproveitamento
                        </span>
                        <span
                          className={cn(
                            "font-bold text-sm",
                            subj.accuracyPercentage >= 70
                              ? "text-emerald-600 dark:text-emerald-400"
                              : subj.accuracyPercentage >= 50
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {subj.accuracyPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso do Aproveitamento */}
                  <Progress value={subj.accuracyPercentage} className="h-1.5" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────
          BLOCO 3 — DESEMPENHO POR TÓPICO (TOPIC PERFORMANCE)
         ─────────────────────────────────────────────────────────────────────── */}
      <Card id="simulation-report-topics" className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ListFilter className="w-5 h-5 text-primary" />
            Desempenho por Tópico ({topicPerformance.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Detalhamento micro-conceitual e identificação de concentração de erros por assunto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topicPerformance.map((top) => {
              const isVulnerable = top.signal === "VULNERABLE";
              const isHighErrorConcentration = top.errorConcentrationPercentage >= 25;

              return (
                <div
                  key={top.topicId}
                  className={cn(
                    "p-3.5 rounded-lg border transition-all space-y-2 text-xs",
                    isVulnerable
                      ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10"
                      : "border-border bg-card hover:border-border/80",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-foreground block">{top.topicName}</span>
                      {top.subjectName && (
                        <span className="text-[10px] text-muted-foreground">{top.subjectName}</span>
                      )}
                    </div>

                    <Badge
                      variant={
                        isVulnerable
                          ? "destructive"
                          : top.signal === "STRONG"
                            ? "default"
                            : "outline"
                      }
                      className="text-[10px]"
                    >
                      {isVulnerable ? "Vulnerável" : top.signal === "STRONG" ? "Sólido" : "Neutro"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2 rounded bg-muted/40 font-mono text-[11px]">
                    <div>
                      <span className="text-muted-foreground block text-[9px]">Taxa Acerto</span>
                      <span className="font-bold text-foreground">
                        {top.accuracyPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px]">Acertos/Erros</span>
                      <span className="font-bold text-foreground">
                        {top.correctCount}/{top.wrongCount}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px]">Conc. Erros</span>
                      <span
                        className={cn(
                          "font-bold",
                          isHighErrorConcentration
                            ? "text-rose-600 dark:text-rose-400"
                            : "text-foreground",
                        )}
                      >
                        {top.errorConcentrationPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────
          BLOCO 4 — RITMO E GESTÃO DE TEMPO (PACING)
         ─────────────────────────────────────────────────────────────────────── */}
      <Card id="simulation-report-pacing" className="border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                Gestão de Tempo e Análise de Ritmo (Pacing)
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Avaliação de velocidade, estabilidade ao longo do tempo e comportamento por terços.
              </CardDescription>
            </div>

            <Badge
              variant={
                pacing.rhythmTrendSignal === "EXCESSIVE_ACCELERATION" ||
                pacing.rhythmTrendSignal === "RHYTHM_LOSS"
                  ? "destructive"
                  : pacing.rhythmTrendSignal === "SLOWNESS"
                    ? "secondary"
                    : "outline"
              }
              className="text-xs px-2.5 py-1 w-fit"
            >
              {pacing.rhythmTrendSignal === "STABLE"
                ? "Ritmo Estável"
                : pacing.rhythmTrendSignal === "EXCESSIVE_ACCELERATION"
                  ? "Aceleração Excessiva no Final"
                  : pacing.rhythmTrendSignal === "SLOWNESS"
                    ? "Lentidão no Final"
                    : pacing.rhythmTrendSignal === "RHYTHM_LOSS"
                      ? "Queda de Ritmo e Precisão"
                      : "Dados Insuficientes"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Métricas de Tempo e Mediana */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground block text-[10px]">Média por Questão</span>
              <span className="font-bold text-base font-mono text-foreground">
                {pacing.avgTimePerQuestionSeconds.toFixed(0)}s
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-1">
              <span className="text-muted-foreground block text-[10px]">Mediana por Questão</span>
              <span className="font-bold text-base font-mono text-foreground">
                {pacing.medianTimePerQuestionSeconds.toFixed(0)}s
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <span className="text-emerald-700 dark:text-emerald-400 block text-[10px]">
                Média em Acertos
              </span>
              <span className="font-bold text-base font-mono text-emerald-700 dark:text-emerald-400">
                {pacing.avgTimeInCorrectQuestionsSeconds.toFixed(0)}s
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1">
              <span className="text-rose-700 dark:text-rose-400 block text-[10px]">
                Média em Erros
              </span>
              <span className="font-bold text-base font-mono text-rose-700 dark:text-rose-400">
                {pacing.avgTimeInWrongQuestionsSeconds.toFixed(0)}s
              </span>
            </div>
          </div>

          {/* Análise por Terços da Prova (Terciles) */}
          {pacing.terciles && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Distribuição e Comportamento por Terços da Prova
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border border-border bg-card space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">1º Terço (Início)</span>
                    <Badge variant="outline" className="text-[10px]">
                      {pacing.terciles.firstTercile.questionCount} questões
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                    <div>
                      <span className="text-muted-foreground block text-[9px]">Aproveitamento</span>
                      <span className="font-bold text-foreground">
                        {pacing.terciles.firstTercile.accuracyPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px]">Tempo Médio</span>
                      <span className="font-bold text-foreground">
                        {pacing.terciles.firstTercile.avgTimeSeconds.toFixed(0)}s
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">2º Terço (Meio)</span>
                    <Badge variant="outline" className="text-[10px]">
                      {pacing.terciles.middleTercile.questionCount} questões
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                    <div>
                      <span className="text-muted-foreground block text-[9px]">Aproveitamento</span>
                      <span className="font-bold text-foreground">
                        {pacing.terciles.middleTercile.accuracyPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px]">Tempo Médio</span>
                      <span className="font-bold text-foreground">
                        {pacing.terciles.middleTercile.avgTimeSeconds.toFixed(0)}s
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-border bg-card space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">3º Terço (Final)</span>
                    <Badge variant="outline" className="text-[10px]">
                      {pacing.terciles.finalTercile.questionCount} questões
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                    <div>
                      <span className="text-muted-foreground block text-[9px]">Aproveitamento</span>
                      <span className="font-bold text-foreground">
                        {pacing.terciles.finalTercile.accuracyPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[9px]">Tempo Médio</span>
                      <span className="font-bold text-foreground">
                        {pacing.terciles.finalTercile.avgTimeSeconds.toFixed(0)}s
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────
          BLOCO 5 — SINAIS E ALERTAS ANALÍTICOS (SIGNALS & WARNINGS)
         ─────────────────────────────────────────────────────────────────────── */}
      <Card id="simulation-report-signals" className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            Sinais Analíticos e Alertas ({signals.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Alertas determinísticos gerados automaticamente com base na análise estatística.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {signals.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
              Nenhum alerta crítico ou desvio acentuado detectado neste simulado.
            </div>
          ) : (
            <div className="space-y-2.5">
              {signals.map((sig, idx) => {
                const isHigh = sig.intensity === "high";
                const isMedium = sig.intensity === "medium";

                return (
                  <Alert
                    key={`${sig.type}-${idx}`}
                    variant={isHigh ? "destructive" : "default"}
                    className={cn(
                      "text-xs p-3.5 flex items-start justify-between gap-3",
                      !isHigh &&
                        isMedium &&
                        "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200",
                      !isHigh &&
                        !isMedium &&
                        "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200",
                    )}
                  >
                    <div className="space-y-1">
                      <AlertTitle className="font-bold text-xs flex items-center gap-2">
                        <span>{sig.reason}</span>
                      </AlertTitle>
                      {sig.entityName && (
                        <AlertDescription className="text-[11px] opacity-90">
                          Entidade relacionada: <strong>{sig.entityName}</strong>
                        </AlertDescription>
                      )}
                    </div>

                    <Badge
                      variant={isHigh ? "destructive" : "outline"}
                      className="text-[10px] shrink-0 font-mono uppercase"
                    >
                      {sig.intensity}
                    </Badge>
                  </Alert>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────
          BLOCO 6 — IMPACTO COGNITIVO E DIAGNÓSTICO (COGNITIVE IMPACT)
         ─────────────────────────────────────────────────────────────────────── */}
      <Card
        id="simulation-report-cognitive"
        className="border-border bg-gradient-to-br from-primary/5 via-background to-background"
      >
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Impacto Cognitivo e Diagnóstico de Aprendizado
          </CardTitle>
          <CardDescription className="text-xs">
            Resumo pedagógico e observações para retenção de conteúdo sem distorção estatística.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Findings */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Conclusões Principais
            </h4>
            <ul className="space-y-1.5 text-xs text-foreground/90">
              {cognitiveImpactSummary.keyFindings.map((finding, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          {/* Cards de Resumo Diagnóstico */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-card border border-border space-y-1">
              <span className="text-muted-foreground block text-[10px]">Tópicos Vulneráveis</span>
              <span className="font-bold text-lg text-foreground">
                {cognitiveImpactSummary.vulnerableTopicsCount}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-card border border-border space-y-1">
              <span className="text-muted-foreground block text-[10px]">Erros Registrados</span>
              <span className="font-bold text-lg text-rose-600 dark:text-rose-400">
                {cognitiveImpactSummary.criticalErrorsCount}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-card border border-border space-y-1">
              <span className="text-muted-foreground block text-[10px]">Maior Volume de Erro</span>
              <span className="font-bold text-sm text-foreground line-clamp-1">
                {cognitiveImpactSummary.highestErrorSubjectName || "Nenhum"}
              </span>
            </div>
          </div>

          {/* Preservação de Questões em Branco */}
          <Alert className="border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs">
            <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="font-bold text-xs">
              Preservação de Abstenção Consciente
            </AlertTitle>
            <AlertDescription className="text-[11px] mt-0.5 leading-relaxed">
              Questões deixadas em branco ({overview.unansweredCount}) foram preservadas como
              abstenção consciente. Elas reduzem a nota final do simulado, porém **não foram
              gravadas como erros no histórico cognitivo** para não distorcer o diagnóstico de
              domínio do aluno.
            </AlertDescription>
          </Alert>

          {cognitiveImpactSummary.pacingNote && (
            <p className="text-xs text-muted-foreground italic">
              * Nota de ritmo: {cognitiveImpactSummary.pacingNote}
            </p>
          )}
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────
          BLOCO 6.5 — SUA EVOLUÇÃO (HISTÓRICO E TENDÊNCIA HISTÓRICA - ETAPA 8.2.5)
         ─────────────────────────────────────────────────────────────────────── */}
      <Card id="simulation-report-evolution" className="border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <LineChart className="w-5 h-5 text-primary" />
                Sua Evolução
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Trajetória longitudinal e análise determinística de tendência entre simulados.
              </CardDescription>
            </div>

            {historicalAnalysis && historicalAnalysis.summary.totalSimulations >= 2 && (
              <Badge
                variant={
                  historicalAnalysis.summary.overallTrend === "IMPROVING"
                    ? "default"
                    : historicalAnalysis.summary.overallTrend === "DECLINING"
                      ? "destructive"
                      : "secondary"
                }
                className="text-xs px-2.5 py-1 w-fit flex items-center gap-1.5"
              >
                {historicalAnalysis.summary.overallTrend === "IMPROVING" && (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" /> Evolução Consistente
                  </>
                )}
                {historicalAnalysis.summary.overallTrend === "DECLINING" && (
                  <>
                    <TrendingDown className="w-3.5 h-3.5" /> Queda no Desempenho
                  </>
                )}
                {historicalAnalysis.summary.overallTrend === "STABLE" && (
                  <>
                    <Activity className="w-3.5 h-3.5" /> Desempenho Estável
                  </>
                )}
                {historicalAnalysis.summary.overallTrend === "VOLATILE" && (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> Resultados Oscilantes
                  </>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingHistory ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Carregando dados históricos...
            </div>
          ) : !historicalAnalysis || historicalAnalysis.summary.totalSimulations <= 1 ? (
            <div className="p-5 rounded-lg border border-dashed bg-muted/20 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">Histórico Inicial</p>
              <p>
                {historicalAnalysis?.summary.totalSimulations === 1
                  ? "Este é seu primeiro simulado concluído. Complete pelo menos mais 1 simulado para liberar a comparação de evolução histórica, gráfico de tendência por matéria e velocidade."
                  : "Nenhum simulado anterior encontrado para comparação histórica."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* GRID DE MÉTRICAS EVOLUTIVAS GLOBAIS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                  <span className="text-muted-foreground block text-[10px]">
                    Primeiro Resultado
                  </span>
                  <span className="font-bold text-lg text-foreground">
                    {historicalAnalysis.summary.firstPoint?.accuracyPercentage.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {historicalAnalysis.summary.firstPoint?.setName}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                  <span className="text-muted-foreground block text-[10px]">Resultado Recente</span>
                  <span className="font-bold text-lg text-foreground">
                    {historicalAnalysis.summary.latestPoint?.accuracyPercentage.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {historicalAnalysis.summary.latestPoint?.setName}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                  <span className="text-muted-foreground block text-[10px]">Variação Global</span>
                  <span
                    className={cn(
                      "font-bold text-lg flex items-center gap-0.5",
                      historicalAnalysis.summary.accuracyDeltaPercentage > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : historicalAnalysis.summary.accuracyDeltaPercentage < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground",
                    )}
                  >
                    {historicalAnalysis.summary.accuracyDeltaPercentage > 0 ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : historicalAnalysis.summary.accuracyDeltaPercentage < 0 ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4" />
                    )}
                    {historicalAnalysis.summary.accuracyDeltaPercentage > 0 ? "+" : ""}
                    {historicalAnalysis.summary.accuracyDeltaPercentage.toFixed(1)} p.p.
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Em {historicalAnalysis.summary.totalSimulations} simulados
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-card border border-border space-y-1">
                  <span className="text-muted-foreground block text-[10px]">Média Histórica</span>
                  <span className="font-bold text-lg text-foreground">
                    {historicalAnalysis.summary.averageAccuracyPercentage.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Melhor: {historicalAnalysis.summary.bestPoint?.accuracyPercentage.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* BENCHMARKING INTRAUSUÁRIO E MATRIZ MULTIDIMENSIONAL */}
              {comparativeAnalysis && comparativeAnalysis.internalBenchmark.hasSufficientData && (
                <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                      <Award className="w-4 h-4 text-primary" />
                      Benchmarking Intrausuário (Você vs. Seu Histórico)
                    </span>
                    {comparativeAnalysis.accuracySpeedMatrix && (
                      <Badge variant="outline" className="text-[10px] bg-background">
                        {comparativeAnalysis.accuracySpeedMatrix.label}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-2 rounded bg-background border border-border space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block">
                        vs. Sua Média Histórica
                      </span>
                      <span
                        className={cn(
                          "font-bold text-sm flex items-center gap-1",
                          (comparativeAnalysis.internalBenchmark.deltaVsAveragePp ?? 0) > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : (comparativeAnalysis.internalBenchmark.deltaVsAveragePp ?? 0) < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-foreground",
                        )}
                      >
                        {(comparativeAnalysis.internalBenchmark.deltaVsAveragePp ?? 0) > 0
                          ? "+"
                          : ""}
                        {(comparativeAnalysis.internalBenchmark.deltaVsAveragePp ?? 0).toFixed(1)}{" "}
                        p.p.
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Média: {comparativeAnalysis.internalBenchmark.averageScoreAccuracy}%
                      </span>
                    </div>

                    <div className="p-2 rounded bg-background border border-border space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block">
                        vs. Sua Mediana
                      </span>
                      <span
                        className={cn(
                          "font-bold text-sm flex items-center gap-1",
                          (comparativeAnalysis.internalBenchmark.deltaVsMedianPp ?? 0) > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : (comparativeAnalysis.internalBenchmark.deltaVsMedianPp ?? 0) < 0
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-foreground",
                        )}
                      >
                        {(comparativeAnalysis.internalBenchmark.deltaVsMedianPp ?? 0) > 0
                          ? "+"
                          : ""}
                        {(comparativeAnalysis.internalBenchmark.deltaVsMedianPp ?? 0).toFixed(1)}{" "}
                        p.p.
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Mediana: {comparativeAnalysis.internalBenchmark.medianScoreAccuracy}%
                      </span>
                    </div>

                    <div className="p-2 rounded bg-background border border-border space-y-0.5">
                      <span className="text-[10px] text-muted-foreground block">
                        Distância da Melhor Marca
                      </span>
                      <span
                        className={cn(
                          "font-bold text-sm flex items-center gap-1",
                          (comparativeAnalysis.internalBenchmark.gapToBestPp ?? 0) >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400",
                        )}
                      >
                        {(comparativeAnalysis.internalBenchmark.gapToBestPp ?? 0) >= 0
                          ? "Recorde Pessoal!"
                          : `${(comparativeAnalysis.internalBenchmark.gapToBestPp ?? 0).toFixed(1)} p.p.`}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Melhor: {comparativeAnalysis.internalBenchmark.bestScoreAccuracy}%
                      </span>
                    </div>
                  </div>

                  {comparativeAnalysis.accuracySpeedMatrix && (
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        Análise de Ritmo x Precisão:{" "}
                      </span>
                      {comparativeAnalysis.accuracySpeedMatrix.description}
                    </p>
                  )}
                </div>
              )}

              {/* TENDÊNCIA POR DISCIPLINA */}
              {historicalAnalysis.subjects.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Evolução por Disciplina
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {historicalAnalysis.subjects.map((sub) => {
                      const isUp = sub.trend === "IMPROVING";
                      const isDown = sub.trend === "DECLINING";

                      return (
                        <div
                          key={sub.subjectId}
                          className="p-2.5 rounded-lg border border-border bg-card/60 flex items-center justify-between text-xs"
                        >
                          <div className="space-y-0.5 max-w-[65%]">
                            <span className="font-semibold text-foreground truncate block">
                              {sub.subjectName}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              Inicial: {sub.firstAccuracyPercentage.toFixed(0)}% → Atual:{" "}
                              {sub.latestAccuracyPercentage.toFixed(0)}%
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={cn(
                                "font-bold text-xs flex items-center justify-end gap-0.5",
                                isUp
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : isDown
                                    ? "text-rose-600 dark:text-rose-400"
                                    : "text-muted-foreground",
                              )}
                            >
                              {isUp ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : isDown ? (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              ) : (
                                <Minus className="w-3.5 h-3.5" />
                              )}
                              {sub.accuracyDeltaPercentage > 0 ? "+" : ""}
                              {sub.accuracyDeltaPercentage.toFixed(1)} p.p.
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SINAIS HISTÓRICOS DESCRITIVOS */}
              {historicalAnalysis.signals.length > 0 && (
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Sinais de Trajetória
                  </h4>
                  <div className="space-y-1.5">
                    {historicalAnalysis.signals.map((sig, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-md bg-muted/40 border border-border text-xs flex items-start gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-foreground">{sig.label}: </span>
                          <span className="text-muted-foreground">{sig.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────────────────
          BLOCO 7 — GABARITO E DETALHAMENTO DAS QUESTÕES (QUESTION BREAKDOWN)
         ─────────────────────────────────────────────────────────────────────── */}
      <Card id="simulation-report-questions" className="border-border">
        <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Gabarito e Detalhamento das Questões ({reviewItems.length})
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Revisão questão a questão com enunciados, respostas escolhidas e comentários.
            </CardDescription>
          </div>

          {/* Filtros do Gabarito */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
            <Button
              variant={reviewFilter === "todos" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setReviewFilter("todos")}
            >
              Todas ({reviewItems.length})
            </Button>
            <Button
              variant={reviewFilter === "corretas" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setReviewFilter("corretas")}
            >
              Acertos ({overview.correctCount})
            </Button>
            <Button
              variant={reviewFilter === "incorretas" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setReviewFilter("incorretas")}
            >
              Erros ({overview.wrongCount})
            </Button>
            <Button
              variant={reviewFilter === "em_branco" ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setReviewFilter("em_branco")}
            >
              Em Branco ({overview.unansweredCount})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[520px]">
            <div className="divide-y divide-border">
              {filteredReviewItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhuma questão encontrada para o filtro selecionado.
                </div>
              ) : (
                filteredReviewItems.map((item, idx) => {
                  const qDetail = getQuestionDetail(item.questionId, effectiveQuestionsMap);
                  const isCorrect = item.isCorrect === true;
                  const isUnanswered = !item.isAnswered && item.chosenAnswer === null;

                  return (
                    <div
                      key={item.itemId || idx}
                      className="p-4 sm:p-5 space-y-3 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">
                            #{item.position !== undefined ? item.position + 1 : idx + 1}
                          </span>

                          {isUnanswered ? (
                            <Badge
                              variant="outline"
                              className="text-amber-600 border-amber-300 dark:text-amber-400"
                            >
                              Em Branco
                            </Badge>
                          ) : isCorrect ? (
                            <Badge className="bg-emerald-600 text-white">Acertou</Badge>
                          ) : (
                            <Badge variant="destructive">Errou</Badge>
                          )}

                          {qDetail?.examBoard && (
                            <Badge variant="secondary" className="text-[10px]">
                              {qDetail.examBoard}
                            </Badge>
                          )}

                          {item.timeSpentSeconds !== null &&
                            item.timeSpentSeconds !== undefined && (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                ({item.timeSpentSeconds}s)
                              </span>
                            )}
                        </div>

                        <span className="text-xs text-muted-foreground">
                          Sua escolha: <strong>{item.chosenAnswer || "Nenhuma"}</strong>
                          {qDetail?.correctAnswer && (
                            <>
                              {" "}
                              | Gabarito:{" "}
                              <strong className="text-emerald-600 dark:text-emerald-400">
                                {qDetail.correctAnswer}
                              </strong>
                            </>
                          )}
                        </span>
                      </div>

                      {/* Enunciado */}
                      {qDetail ? (
                        <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
                          {qDetail.statement}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">
                          Questão ID: {item.questionId}
                        </p>
                      )}

                      {/* Comentário / Justificativa */}
                      {qDetail?.explanation && (
                        <div className="p-3 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground space-y-1">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-primary" /> Comentário / Gabarito
                            Comentado:
                          </span>
                          <p className="leading-relaxed">{qDetail.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
