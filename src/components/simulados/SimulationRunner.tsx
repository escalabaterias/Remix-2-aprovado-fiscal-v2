import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flag,
  ChevronLeft,
  ChevronRight,
  Loader2,
  List,
  RotateCcw,
  Check,
  HelpCircle,
  BarChart3,
  ArrowLeft,
  Award,
} from "lucide-react";

import {
  useSimulationController,
  type SimulationStatus,
} from "@/lib/questions/useSimulationController";
import { fetchQuestionsByIds } from "@/lib/questions/service";
import type { QuestionBankItem, QuestionSet, QuestionSetItem } from "@/lib/questions/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE FORMATAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

function formatRemainingTime(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function difficultyText(d: number | null): string {
  if (d === null) return "Nível Médio";
  if (d <= 1) return "Muito Fácil";
  if (d <= 2) return "Fácil";
  if (d <= 3) return "Médio";
  if (d <= 4) return "Difícil";
  return "Muito Difícil";
}

export type SimulationRunnerProps = {
  setId: string;
  onClose?: () => void;
};

export function SimulationRunner({ setId, onClose }: SimulationRunnerProps) {
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<
    "todos" | "corretas" | "incorretas" | "em_branco"
  >("todos");

  // Controller React de Simulados (Fase C 🟢)
  const controller = useSimulationController({
    setId,
    autoStart: true,
  });

  const {
    status,
    set: questionSet,
    items,
    currentIndex,
    currentItem,
    answers,
    flaggedItemIds,
    remainingSeconds,
    completedResult,
    errorMessage,
    isSubmittingItem,
    selectAnswer,
    toggleFlag,
    goToIndex,
    nextQuestion,
    previousQuestion,
    completeSimulation,
    resetError,
  } = controller;

  // Busca em lote os dados ricos das questões (enunciado, alternativas, banca, etc.)
  const questionIds = useMemo(() => items.map((i) => i.questionId), [items]);

  const { data: questionsMap, isLoading: isLoadingQuestions } = useQuery({
    queryKey: ["simulado-questions-details", questionIds],
    queryFn: () => fetchQuestionsByIds(questionIds),
    enabled: questionIds.length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutos em cache
  });

  const currentQuestionDetail: QuestionBankItem | null = useMemo(() => {
    if (!currentItem) return null;
    return questionsMap?.get(currentItem.questionId) ?? null;
  }, [currentItem, questionsMap]);

  // Métricas do estado atual
  const totalQuestions = items.length;
  const answeredCount = useMemo(() => {
    return items.filter((item) => !!answers[item.itemId] || item.isAnswered).length;
  }, [items, answers]);
  const unansweredCount = Math.max(0, totalQuestions - answeredCount);
  const flaggedCount = flaggedItemIds.length;

  const currentSelectedLetter = currentItem
    ? (answers[currentItem.itemId] ?? currentItem.chosenAnswer ?? "")
    : "";
  const isCurrentFlagged = currentItem ? flaggedItemIds.includes(currentItem.itemId) : false;

  // Teclado para seleção rápida (A, B, C, D, E) e navegação
  useEffect(() => {
    if (status !== "ready") return;

    function handleKeyDown(e: KeyboardEvent) {
      // Evitar interceptar se estiver digitando em um input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toUpperCase();
      if (["A", "B", "C", "D", "E"].includes(key) && currentItem) {
        selectAnswer(currentItem.itemId, key);
      } else if (e.key === "ArrowRight") {
        nextQuestion();
      } else if (e.key === "ArrowLeft") {
        previousQuestion();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, currentItem, selectAnswer, nextQuestion, previousQuestion]);

  // Handler de confirmação de finalização
  const handleConfirmFinish = useCallback(async () => {
    setShowConfirmFinish(false);
    await completeSimulation();
  }, [completeSimulation]);

  // ───────────────────────────────────────────────────────────────────────────
  // ESTADO DE CARREGAMENTO / STARTING
  // ───────────────────────────────────────────────────────────────────────────
  if (status === "idle" || status === "starting" || (isLoadingQuestions && items.length > 0)) {
    return (
      <Card
        id="simulado-loading-card"
        className="w-full max-w-4xl mx-auto my-8 border border-border shadow-sm"
      >
        <CardContent className="p-12 text-center flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">Preparando seu Simulado...</h3>
            <p className="text-sm text-muted-foreground">
              Sincronizando questões, alternativas e temporizador oficial do servidor.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ESTADO ERRO GRAVE DE INICIALIZAÇÃO
  // ───────────────────────────────────────────────────────────────────────────
  if (status === "error" && !questionSet && items.length === 0) {
    return (
      <Card
        id="simulado-error-card"
        className="w-full max-w-2xl mx-auto my-8 border-destructive/40"
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Falha na Inicialização do Simulado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {errorMessage || "Não foi possível carregar o simulado informado."}
          </p>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Voltar
            </Button>
          )}
          <Button onClick={() => controller.startSimulation()}>Tentar Novamente</Button>
        </CardFooter>
      </Card>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ESTADO DE SIMULADO CONCLUÍDO / COMPLETED / TIMEOUT
  // ───────────────────────────────────────────────────────────────────────────
  if (status === "completed" || status === "timeout") {
    const resSet = completedResult?.set ?? questionSet;
    const resItems = completedResult?.items ?? items;
    const scoreVal = resSet?.score ?? 0;
    const isTimeout = status === "timeout";

    const correctCount = resItems.filter((i) => i.isCorrect === true).length;
    const wrongCount = resItems.filter((i) => i.isCorrect === false).length;
    const unansweredResCount = resItems.filter(
      (i) => !i.isAnswered && i.chosenAnswer === null,
    ).length;

    // Itens filtrados para a revisão
    const filteredReviewItems = resItems.filter((item) => {
      if (reviewFilter === "corretas") return item.isCorrect === true;
      if (reviewFilter === "incorretas") return item.isCorrect === false;
      if (reviewFilter === "em_branco") return !item.isAnswered && item.chosenAnswer === null;
      return true;
    });

    return (
      <div id="simulado-completed-view" className="w-full max-w-5xl mx-auto space-y-6 py-6 px-4">
        {/* Banner de Resultado */}
        <Card className="border-border shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-background to-primary/5 p-6 sm:p-8 border-b border-border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={isTimeout ? "destructive" : "default"}
                    className="px-2.5 py-0.5 text-xs"
                  >
                    {isTimeout ? "Tempo Esgotado" : "Simulado Finalizado"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {resSet?.completedAt
                      ? new Date(resSet.completedAt).toLocaleDateString("pt-BR")
                      : "Hoje"}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                  {resSet?.name || "Simulado Concluído"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Resultado oficial consolidado no servidor. Métricas de desempenho atualizadas.
                </p>
              </div>

              {/* Placa de Nota Final */}
              <div
                id="simulado-score-badge"
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-card border border-border shadow-inner min-w-[140px]"
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pontuação
                </span>
                <span
                  className={cn(
                    "text-3xl font-display font-black tracking-tight mt-0.5",
                    scoreVal >= 70
                      ? "text-emerald-600 dark:text-emerald-400"
                      : scoreVal >= 50
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {scoreVal.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            {/* Grid de Estatísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/40 border border-border flex flex-col gap-1">
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-primary" /> Total
                </span>
                <span className="text-2xl font-bold text-foreground">{resItems.length}</span>
              </div>

              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-1">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Acertos
                </span>
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {correctCount}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 flex flex-col gap-1">
                <span className="text-xs text-rose-700 dark:text-rose-400 font-medium flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" /> Erros
                </span>
                <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">
                  {wrongCount}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col gap-1">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" /> Em Branco
                </span>
                <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {unansweredResCount}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-muted/20 border-t border-border p-4 flex justify-between items-center">
            {onClose && (
              <Button variant="ghost" onClick={onClose} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar aos Simulados
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Questões não respondidas foram preservadas como UNANSWERED sem gerar falsos erros
              cognitivos.
            </p>
          </CardFooter>
        </Card>

        {/* Gabarito e Revisão de Questões */}
        <Card className="border-border">
          <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold">
                Gabarito e Detalhamento das Respostas
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Revise cada uma das questões e analise os gabaritos oficiais.
              </p>
            </div>

            {/* Filtros de Revisão */}
            <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg">
              <Button
                variant={reviewFilter === "todos" ? "default" : "ghost"}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setReviewFilter("todos")}
              >
                Todas ({resItems.length})
              </Button>
              <Button
                variant={reviewFilter === "corretas" ? "default" : "ghost"}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setReviewFilter("corretas")}
              >
                Acertos ({correctCount})
              </Button>
              <Button
                variant={reviewFilter === "incorretas" ? "default" : "ghost"}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setReviewFilter("incorretas")}
              >
                Erros ({wrongCount})
              </Button>
              <Button
                variant={reviewFilter === "em_branco" ? "default" : "ghost"}
                size="sm"
                className="text-xs h-7 px-2.5"
                onClick={() => setReviewFilter("em_branco")}
              >
                Em Branco ({unansweredResCount})
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[480px]">
              <div className="divide-y divide-border">
                {filteredReviewItems.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Nenhuma questão encontrada para este filtro.
                  </div>
                ) : (
                  filteredReviewItems.map((item, idx) => {
                    const qDetail = questionsMap?.get(item.questionId);
                    const isCorrect = item.isCorrect === true;
                    const isUnanswered = !item.isAnswered && item.chosenAnswer === null;

                    return (
                      <div
                        key={item.itemId}
                        className="p-4 sm:p-6 space-y-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-foreground">
                              #{item.position + 1}
                            </span>
                            {isUnanswered ? (
                              <Badge
                                variant="outline"
                                className="text-amber-600 border-amber-300 dark:text-amber-400"
                              >
                                Em Branco
                              </Badge>
                            ) : isCorrect ? (
                              <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                                Acertou
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Errou</Badge>
                            )}
                            {qDetail?.examBoard && (
                              <Badge variant="secondary" className="text-[11px]">
                                {qDetail.examBoard}
                              </Badge>
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

                        {qDetail ? (
                          <p className="text-sm text-foreground/90 leading-relaxed font-normal">
                            {qDetail.statement}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">
                            Carregando enunciado da questão #{item.position + 1}...
                          </p>
                        )}

                        {qDetail?.explanation && (
                          <div className="p-3 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground space-y-1">
                            <span className="font-semibold text-foreground flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-primary" /> Comentário /
                              Justificativa:
                            </span>
                            <p>{qDetail.explanation}</p>
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

  // ───────────────────────────────────────────────────────────────────────────
  // ESTADO EXECUTANDO SIMULADO / READY / SUBMITTING / COMPLETING
  // ───────────────────────────────────────────────────────────────────────────
  const isCompleting = status === "completing";

  return (
    <div
      id="simulado-active-runner"
      className="w-full max-w-6xl mx-auto space-y-4 py-4 px-2 sm:px-4"
    >
      {/* Alerta temporário de erro de rede recuperável */}
      {status === "error" && errorMessage && (
        <Alert
          id="simulado-network-error-alert"
          variant="destructive"
          className="flex items-center justify-between"
        >
          <div>
            <AlertTitle className="text-sm font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Falha de Conexão na Submissão
            </AlertTitle>
            <AlertDescription className="text-xs">
              {errorMessage}. Suas seleções continuam salvas no rascunho local.
            </AlertDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-background text-xs"
            onClick={resetError}
          >
            Continuar
          </Button>
        </Alert>
      )}

      {/* CABEÇALHO DO SIMULADO */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Título e Progresso */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs font-semibold">
                  Questão {currentIndex + 1} de {totalQuestions}
                </Badge>
                {isCurrentFlagged && (
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/15 text-amber-700 dark:text-amber-400 gap-1 text-[11px]"
                  >
                    <Flag className="w-3 h-3 fill-amber-500" /> Marcar p/ Revisar
                  </Badge>
                )}
              </div>
              <h1 className="text-lg sm:text-xl font-display font-bold text-foreground">
                {questionSet?.name || "Simulado em Andamento"}
              </h1>
            </div>

            {/* Cronômetro Oficial e Ação Principal */}
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              {/* Cronômetro derivado diretamente de remainingSeconds do Controller */}
              <div
                id="simulado-timer-display"
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono text-base font-bold shadow-xs transition-colors",
                  remainingSeconds !== null && remainingSeconds <= 300
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400 animate-pulse"
                    : "bg-muted/60 border-border text-foreground",
                )}
              >
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>{formatRemainingTime(remainingSeconds)}</span>
              </div>

              {/* Botão para abrir o seletor lateral de questões (Mobile) */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="sm:hidden gap-1.5 text-xs">
                    <List className="w-4 h-4" /> Grade ({answeredCount}/{totalQuestions})
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[380px] p-6">
                  <SheetHeader className="mb-4">
                    <SheetTitle className="text-base font-bold">Grade de Questões</SheetTitle>
                  </SheetHeader>
                  <QuestionNavigationGrid
                    items={items}
                    answers={answers}
                    flaggedItemIds={flaggedItemIds}
                    currentIndex={currentIndex}
                    onSelectIndex={(idx) => goToIndex(idx)}
                  />
                </SheetContent>
              </Sheet>

              {/* Finalizar Simulado */}
              <Button
                id="btn-finalizar-simulado"
                variant="default"
                size="sm"
                className="font-semibold text-xs gap-1.5"
                disabled={isCompleting}
                onClick={() => setShowConfirmFinish(true)}
              >
                {isCompleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Finalizar Simulado
              </Button>
            </div>
          </div>

          {/* Barra de Progresso do Simulado */}
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
              <span>Progresso de Respostas</span>
              <span>
                {answeredCount} de {totalQuestions} respondidas (
                {Math.round((answeredCount / totalQuestions) * 100)}%)
              </span>
            </div>
            <Progress value={(answeredCount / totalQuestions) * 100} className="h-1.5" />
          </div>
        </CardContent>
      </Card>

      {/* ÁREA PRINCIPAL: GRADE LATERAL (DESKTOP) + QUESTÃO ATUAL */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start">
        {/* CARD DA QUESTÃO ATUAL */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {currentQuestionDetail?.examBoard && (
                  <Badge variant="secondary" className="font-medium text-[11px]">
                    Banca: {currentQuestionDetail.examBoard}
                  </Badge>
                )}
                {currentQuestionDetail?.year && (
                  <Badge variant="outline" className="font-mono text-[11px]">
                    Ano: {currentQuestionDetail.year}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[11px]">
                  {difficultyText(currentQuestionDetail?.difficulty ?? null)}
                </Badge>
              </div>

              {/* Botão de Marcar para Revisão */}
              {currentItem && (
                <Button
                  variant={isCurrentFlagged ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "text-xs h-7 px-2.5 gap-1.5",
                    isCurrentFlagged && "text-amber-700 bg-amber-500/15 border-amber-300",
                  )}
                  onClick={() => toggleFlag(currentItem.itemId)}
                >
                  <Flag className={cn("w-3.5 h-3.5", isCurrentFlagged && "fill-amber-500")} />
                  {isCurrentFlagged ? "Marcada p/ Revisão" : "Marcar p/ Revisar"}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* ENUNCIADO */}
            {currentQuestionDetail ? (
              <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed font-normal text-foreground">
                <p className="whitespace-pre-wrap">{currentQuestionDetail.statement}</p>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground">Carregando enunciado da questão...</p>
              </div>
            )}

            <Separator />

            {/* LISTA DE ALTERNATIVAS */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Selecione uma alternativa:
              </p>

              {currentQuestionDetail?.alternatives &&
              currentQuestionDetail.alternatives.length > 0 ? (
                currentQuestionDetail.alternatives.map((alt, idx) => {
                  const letter = alt.letter || String.fromCharCode(65 + idx);
                  const isSelected = currentSelectedLetter === letter;

                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={isCompleting}
                      className={cn(
                        "w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start gap-3.5 group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-primary/40",
                        isSelected
                          ? "bg-primary/10 border-primary text-foreground font-medium ring-1 ring-primary shadow-xs"
                          : "bg-card border-border hover:bg-muted/40 hover:border-border/80 text-foreground/90",
                      )}
                      onClick={() => currentItem && selectAnswer(currentItem.itemId, letter)}
                    >
                      {/* Círculo com Letra (A, B, C...) */}
                      <span
                        className={cn(
                          "flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold font-mono shrink-0 transition-colors mt-0.5",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted text-muted-foreground group-hover:bg-muted/80",
                        )}
                      >
                        {letter}
                      </span>

                      {/* Texto da Alternativa */}
                      <span className="text-sm leading-relaxed pt-0.5 flex-1">{alt.text}</span>
                    </button>
                  );
                })
              ) : (
                <div className="text-xs text-muted-foreground italic p-4 text-center">
                  Alternativas não encontradas para esta questão.
                </div>
              )}
            </div>
          </CardContent>

          {/* RODAPÉ DE NAVEGAÇÃO ENTRE QUESTÕES */}
          <CardFooter className="p-4 bg-muted/20 border-t border-border flex items-center justify-between gap-2">
            <Button
              id="btn-prev-question"
              variant="outline"
              size="sm"
              disabled={currentIndex === 0 || isCompleting}
              onClick={previousQuestion}
              className="gap-1.5 text-xs font-medium"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </Button>

            {/* Status Feedback de Salvamento */}
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              {isSubmittingItem && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="hidden sm:inline">Salvando resposta...</span>
                </>
              )}
            </div>

            <Button
              id="btn-next-question"
              variant="default"
              size="sm"
              disabled={currentIndex === totalQuestions - 1 || isCompleting}
              onClick={nextQuestion}
              className="gap-1.5 text-xs font-medium"
            >
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* GRADE DE NAVEGAÇÃO DIRETA (DESKTOP) */}
        <Card className="hidden lg:block border-border shadow-xs sticky top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Grade de Questões</span>
              <span className="text-xs text-muted-foreground font-normal">
                {answeredCount}/{totalQuestions}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <QuestionNavigationGrid
              items={items}
              answers={answers}
              flaggedItemIds={flaggedItemIds}
              currentIndex={currentIndex}
              onSelectIndex={(idx) => goToIndex(idx)}
            />
          </CardContent>
        </Card>
      </div>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE FINALIZAÇÃO */}
      <AlertDialog open={showConfirmFinish} onOpenChange={setShowConfirmFinish}>
        <AlertDialogContent id="dialog-confirmar-finalizacao">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Finalizar Simulado Agora?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm pt-2">
              {unansweredCount > 0 ? (
                <span className="text-amber-700 dark:text-amber-400 font-medium block">
                  Atenção: Você possui {unansweredCount} questão(ões) sem resposta!
                </span>
              ) : (
                <span>Todas as {totalQuestions} questões possuem resposta selecionada.</span>
              )}
              <span>
                Ao finalizar, suas respostas serão consolidadas pelo servidor e a nota final será
                calculada. Questões não respondidas permanecerão em branco sem gerar falsos erros
                cognitivos.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompleting}>Continuar Simulado</AlertDialogCancel>
            <AlertDialogAction
              id="btn-confirmar-fechamento-simulado"
              disabled={isCompleting}
              onClick={handleConfirmFinish}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isCompleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Finalizar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE SECUNDÁRIO: GRADE DE NAVEGAÇÃO DE QUESTÕES
// ─────────────────────────────────────────────────────────────────────────────

type QuestionNavigationGridProps = {
  items: QuestionSetItem[];
  answers: Record<string, string>;
  flaggedItemIds: string[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
};

function QuestionNavigationGrid({
  items,
  answers,
  flaggedItemIds,
  currentIndex,
  onSelectIndex,
}: QuestionNavigationGridProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-1.5">
        {items.map((item, idx) => {
          const isAnswered = !!answers[item.itemId] || item.isAnswered;
          const isCurrent = currentIndex === idx;
          const isFlagged = flaggedItemIds.includes(item.itemId);

          return (
            <button
              key={item.itemId}
              type="button"
              className={cn(
                "h-8 rounded-md text-xs font-mono font-semibold transition-all relative flex items-center justify-center cursor-pointer border",
                isCurrent
                  ? "bg-primary text-primary-foreground border-primary ring-2 ring-primary/40 z-10 font-bold shadow-xs"
                  : isAnswered
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted",
              )}
              onClick={() => onSelectIndex(idx)}
              title={`Questão ${idx + 1}: ${isAnswered ? "Respondida" : "Em branco"}`}
            >
              {idx + 1}

              {/* Indicador de Marcada para Revisão */}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-background" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda de Cores/Semântica */}
      <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-xs bg-primary shrink-0" />
          <span>Atual</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500/30 border border-emerald-500/40 shrink-0" />
          <span>Respondida (✓)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-xs bg-muted border border-border shrink-0" />
          <span>Em branco (○)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
          <span>Marcada p/ revisão (🚩)</span>
        </div>
      </div>
    </div>
  );
}
