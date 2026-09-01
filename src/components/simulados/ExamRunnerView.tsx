import { useState } from "react";
import { useExamRunner } from "@/hooks/useExamRunner";
import { ExamNavigationPanel } from "./ExamNavigationPanel";
import { ExamQuestionCard } from "./ExamQuestionCard";
import { ExamConfirmationModal } from "./ExamConfirmationModal";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Play,
  Pause,
  Save,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

interface ExamRunnerViewProps {
  sessionId: string;
}

export function ExamRunnerView({ sessionId }: ExamRunnerViewProps) {
  const {
    state,
    setCurrentQuestionIndex,
    selectAnswer,
    toggleFlagReview,
    toggleEliminateAlternative,
    pauseSession,
    resumeSession,
    finishSession,
  } = useExamRunner(sessionId);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const {
    session,
    answers,
    currentQuestionIndex,
    timeRemainingSeconds,
    isSyncing,
    isPaused,
    eliminatedAlternatives,
    error,
    isLoading,
  } = state;

  // Utilitário para formatar tempo (HH:MM:SS)
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hrs.toString().padStart(2, "0"),
      mins.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        <p className="text-muted-foreground text-sm font-medium">Iniciando simulado...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-6 max-w-md mx-auto space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-5 w-5" />
          <span>Erro ao carregar sessão</span>
        </div>
        <p className="text-sm">{error || "Sessão inválida"}</p>
        <div className="pt-2">
          <Link to="/">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
            >
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Se o simulado já foi encerrado, redireciona ou mostra tela de conclusão
  if (
    session.status === "submitted" ||
    session.status === "processing" ||
    session.status === "analyzed" ||
    session.status === "completed"
  ) {
    return (
      <div className="bg-card border border-border rounded-lg p-8 max-w-md mx-auto text-center space-y-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
          <CheckSquare className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-foreground">Simulado Concluído!</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            As suas respostas foram enviadas e estão sendo consolidadas. Você já pode visualizar o
            seu gabarito comentado e a análise de lacunas cognitivas.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <Link to={`/simulados/${sessionId}/resultado`}>
            <Button className="w-full cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95">
              Visualizar Desempenho & Gabarito
            </Button>
          </Link>
          <Link to="/simulados">
            <Button variant="outline" className="w-full cursor-pointer">
              Meus Simulados
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentAnswer = answers[currentQuestionIndex];
  const totalQuestions = answers.length;
  const answeredCount = answers.filter(
    (a) => a.chosen_answer !== null && a.chosen_answer !== "",
  ).length;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      {/* Barra de Progresso Superior e Timer */}
      <div className="bg-card border border-border rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex-1 w-full space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="font-semibold text-foreground">Progresso do Simulado</span>
            <span className="text-muted-foreground font-medium">
              {answeredCount} de {totalQuestions} respondidas ({Math.round(progressPercent)}%)
            </span>
          </div>
          <Progress value={progressPercent} className="h-2 bg-secondary" />
        </div>

        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xl font-mono font-bold text-foreground tabular-nums tracking-tight">
              {formatTime(timeRemainingSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isPaused ? (
              <Button
                variant="outline"
                size="sm"
                id="resume-exam-btn"
                onClick={resumeSession}
                className="h-9 cursor-pointer text-xs font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
              >
                <Play className="h-3.5 w-3.5 mr-1.5 fill-current" />
                Retomar
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                id="pause-exam-btn"
                onClick={pauseSession}
                className="h-9 cursor-pointer text-xs font-semibold text-amber-700 border-amber-200 hover:bg-amber-50"
              >
                <Pause className="h-3.5 w-3.5 mr-1.5" />
                Pausar
              </Button>
            )}

            {isSyncing && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                <Save className="h-3.5 w-3.5 text-emerald-500 animate-spin" />
                <span>salvando...</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Grid Principal: Questão vs Navegador */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Esquerda: Questão Ativa */}
        <div className="lg:col-span-8 space-y-6 relative">
          {isPaused ? (
            <div className="bg-card border border-border rounded-lg p-10 min-h-[400px] flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-3 bg-amber-50 rounded-full text-amber-600 animate-bounce">
                <Pause className="h-8 w-8" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-lg font-bold text-foreground">Simulado Pausado</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Para garantir a idoneidade do teste e evitar consultas extras, as questões ficam
                  ocultas enquanto o cronômetro estiver pausado.
                </p>
              </div>
              <Button onClick={resumeSession} className="px-6 cursor-pointer">
                Retomar Simulado
              </Button>
            </div>
          ) : currentAnswer ? (
            <>
              <ExamQuestionCard
                answer={currentAnswer}
                eliminatedAlternatives={eliminatedAlternatives[currentAnswer.question_id] || []}
                onSelectAnswer={(choice) => selectAnswer(currentAnswer.question_id, choice)}
                onToggleFlag={() => toggleFlagReview(currentAnswer.question_id)}
                onToggleEliminate={(letter) =>
                  toggleEliminateAlternative(currentAnswer.question_id, letter)
                }
              />

              {/* Navegação Inferior de Questões */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  id="prev-question-btn"
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4 mr-1.5" />
                  Questão Anterior
                </Button>

                <Button
                  variant="default"
                  id="finish-exam-trigger-btn"
                  onClick={() => setIsConfirmOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                >
                  <CheckSquare className="h-4 w-4 mr-1.5" />
                  Finalizar Simulado
                </Button>

                <Button
                  variant="outline"
                  id="next-question-btn"
                  onClick={() =>
                    setCurrentQuestionIndex(Math.min(totalQuestions - 1, currentQuestionIndex + 1))
                  }
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="cursor-pointer"
                >
                  Próxima Questão
                  <ChevronRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </>
          ) : (
            <div className="bg-card border border-border rounded-lg p-10 text-center text-muted-foreground">
              Nenhuma questão selecionada para esta posição.
            </div>
          )}
        </div>

        {/* Direita: Painel Lateral com Navegador */}
        <div className="lg:col-span-4">
          <ExamNavigationPanel
            answers={answers}
            currentIndex={currentQuestionIndex}
            onSelectIndex={setCurrentQuestionIndex}
          />
        </div>
      </div>

      {/* Modal de Confirmação de Finalização */}
      <ExamConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={async () => {
          setIsConfirmOpen(false);
          await finishSession();
        }}
        answers={answers}
        isSubmitting={isSyncing}
      />
    </div>
  );
}
