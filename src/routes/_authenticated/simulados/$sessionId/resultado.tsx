import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { ExamResultView } from "@/components/simulados/ExamResultView";
import { ExamAnswerKey } from "@/components/simulados/ExamAnswerKey";
import { ExamConsolidationService } from "@/lib/simulados/consolidationService";
import { ExamSession } from "@/lib/simulados/types";
import { ExamConsolidationResult } from "@/lib/simulados/consolidation";
import { ExamAnswerWithQuestion } from "@/hooks/useExamRunner";
import { AlertCircle, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/simulados/$sessionId/resultado")({
  head: () => ({
    meta: [
      { title: "Resultado do Simulado — Aprovado Fiscal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExamResultPage,
});

function ExamResultPage() {
  const { sessionId } = Route.useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [answers, setAnswers] = useState<ExamAnswerWithQuestion[]>([]);
  const [result, setResult] = useState<ExamConsolidationResult | null>(null);
  const answerKeyRef = useRef<HTMLDivElement>(null);

  const loadAndConsolidate = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Buscar a sessão para ver o status atual
      const { data: sData, error: sErr } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (sErr || !sData) {
        throw new Error(
          `Sessão de simulado não encontrada: ${sErr?.message || "Erro desconhecido"}`,
        );
      }

      const currentSession = sData as unknown as ExamSession;

      // 2. Se a sessão ainda não está 'completed', rodamos o serviço de consolidação atômica
      if (currentSession.status !== "completed") {
        const consolidated = await ExamConsolidationService.consolidateAndSave(sessionId);
        setSession(consolidated.session);
        setResult(consolidated.result);
      } else {
        // Se já está concluída, carregamos o resumo do performance_summary
        setSession(currentSession);
        if (currentSession.performance_summary) {
          setResult(currentSession.performance_summary as unknown as ExamConsolidationResult);
        } else {
          // Fallback caso não tenha sido gerado o summary por algum motivo
          const consolidated = await ExamConsolidationService.consolidateAndSave(sessionId);
          setSession(consolidated.session);
          setResult(consolidated.result);
        }
      }

      // 3. Carregar as respostas completas com as questões para renderizar no gabarito comentado
      const { data: answersData, error: answersErr } = await supabase
        .from("exam_session_answers")
        .select(
          `
          *,
          question:questions (
            id,
            statement,
            alternatives,
            correct_answer,
            exam_board,
            subject_id,
            topic_id,
            explanation
          )
        `,
        )
        .eq("session_id", sessionId);

      if (answersErr || !answersData) {
        throw new Error(`Falha ao obter respostas detalhadas: ${answersErr?.message}`);
      }

      setAnswers(answersData as unknown as ExamAnswerWithQuestion[]);
    } catch (err: any) {
      console.error("Erro ao consolidar resultados:", err);
      setError(err.message || "Ocorreu um erro desconhecido ao carregar os resultados.");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadAndConsolidate();
  }, [sessionId, loadAndConsolidate]);

  const scrollToAnswerKey = () => {
    answerKeyRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <AppShell
      title="Análise de Desempenho"
      description="Análise detalhada de erros, acertos, tempos e ritmo de prova por matéria."
    >
      <div className="py-2 space-y-8">
        {/* Estado de Carregamento e Consolidação Dinâmica */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <RefreshCw className="animate-spin h-10 w-10 text-primary" />
            <div className="space-y-1 text-center">
              <p className="text-sm font-semibold text-foreground">Consolidando Respostas...</p>
              <p className="text-xs text-muted-foreground">
                Calculando notas, descontando penalidades e alimentando a Central de Erros.
              </p>
            </div>
          </div>
        )}

        {/* Estado de Erro */}
        {!isLoading && error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl p-6 max-w-lg mx-auto space-y-4">
            <div className="flex items-center gap-2.5 font-semibold">
              <AlertCircle className="h-5 w-5" />
              <span>Erro ao processar resultados</span>
            </div>
            <p className="text-xs leading-relaxed">{error}</p>
            <div>
              <Button
                onClick={loadAndConsolidate}
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        {/* Dashboard de Resultados e Gabarito Comentado */}
        {!isLoading && !error && session && result && (
          <div className="space-y-12 animate-fade-in">
            {/* 1. Dashboard de Métricas e Gráficos */}
            <ExamResultView session={session} result={result} onViewAnswerKey={scrollToAnswerKey} />

            {/* Separador Visual com Botão de Scroll */}
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="h-px bg-border w-full max-w-4xl"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={scrollToAnswerKey}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                Gabarito Comentado Abaixo <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* 2. Gabarito Comentado Questão por Questão */}
            <div ref={answerKeyRef} className="scroll-mt-16">
              <ExamAnswerKey answers={answers} />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
