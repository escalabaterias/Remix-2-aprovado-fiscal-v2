import { useMemo } from "react";
import { ExamSession } from "@/lib/simulados/types";
import { ExamConsolidationResult, TopicPerformance } from "@/lib/simulados/consolidation";
import {
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ArrowLeft,
  BookOpen,
  HelpCircle,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

interface ExamResultViewProps {
  session: ExamSession;
  result: ExamConsolidationResult;
  onViewAnswerKey: () => void;
}

export function ExamResultView({ session, result, onViewAnswerKey }: ExamResultViewProps) {
  const { stats, topic_performances, critical_gaps } = result;

  // Formatar o tempo total (ex: 1h 45m 30s)
  const formattedTotalTime = useMemo(() => {
    const totalSecs = stats.total_time_spent_seconds;
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || hours > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);

    return parts.join(" ");
  }, [stats.total_time_spent_seconds]);

  // Formatar o tempo médio (ex: 2m 15s)
  const formattedAverageTime = useMemo(() => {
    const avgSecs = stats.average_time_per_question_seconds;
    const mins = Math.floor(avgSecs / 60);
    const secs = avgSecs % 60;

    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  }, [stats.average_time_per_question_seconds]);

  // Agrupar performance por matéria/subject_id caso haja IDs correspondentes de disciplinas reais
  // Se não, mostramos o aproveitamento detalhado por tópicos
  const topicsArray = useMemo(() => {
    return Object.values(topic_performances);
  }, [topic_performances]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-6" id="exam-result-view">
      {/* Cabeçalho da Prova Concluída */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border p-6 rounded-xl shadow-sm">
        <div className="space-y-1">
          <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Simulado Finalizado
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-2">
            Resultados Consolidados
          </h1>
          <p className="text-muted-foreground text-sm">
            Sessão iniciada em{" "}
            {session.started_at ? new Date(session.started_at).toLocaleDateString() : "N/A"}
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Link to="/simulados" className="w-full md:w-auto">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos Simulados
            </Button>
          </Link>
          <Button
            onClick={onViewAnswerKey}
            className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/95"
          >
            <BookOpen className="mr-2 h-4 w-4" /> Ver Gabarito Comentado
          </Button>
        </div>
      </div>

      {/* Grid de KPIs / Métricas Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Nota Líquida Final */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Nota Líquida
            </span>
            <Trophy className="h-5 w-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {stats.final_score_net.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              / {stats.max_possible_score.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Sua nota final considerando as deduções por erro.
          </p>
        </div>

        {/* KPI 2: Taxa de Acerto */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Aproveitamento
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              {stats.accuracy_percentage.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Taxa de acerto líquida em relação ao máximo possível.
          </p>
        </div>

        {/* KPI 3: Tempo Total de Prova */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tempo Total
            </span>
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {formattedTotalTime}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Tempo gasto na resolução de todas as questões.
          </p>
        </div>

        {/* KPI 4: Ritmo Médio */}
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tempo Médio
            </span>
            <HelpCircle className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-foreground">
              {formattedAverageTime}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Tempo médio gasto por questão.</p>
        </div>
      </div>

      {/* Estatísticas Numéricas Detalhadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Distribuição de Respostas */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" /> Distribuição de Respostas
          </h3>
          <div className="space-y-4">
            {/* Acertos */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Acertos ({stats.correct_count})
                </span>
                <span className="text-muted-foreground">
                  {stats.total_questions > 0
                    ? ((stats.correct_count / stats.total_questions) * 100).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${stats.total_questions > 0 ? (stats.correct_count / stats.total_questions) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Erros */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  Erros ({stats.incorrect_count})
                </span>
                <span className="text-muted-foreground">
                  {stats.total_questions > 0
                    ? ((stats.incorrect_count / stats.total_questions) * 100).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{
                    width: `${stats.total_questions > 0 ? (stats.incorrect_count / stats.total_questions) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            {/* Não Respondidas / Em Branco */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                  Em Branco ({stats.unanswered_count})
                </span>
                <span className="text-muted-foreground">
                  {stats.total_questions > 0
                    ? ((stats.unanswered_count / stats.total_questions) * 100).toFixed(0)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${stats.total_questions > 0 ? (stats.unanswered_count / stats.total_questions) * 100 : 0}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/60 mt-4 text-[11px] text-muted-foreground leading-relaxed">
            Seu aproveitamento bruto foi de {stats.raw_score.toFixed(1)} pontos. As penalidades por
            erros deduziram {stats.penalty_score.toFixed(1)} pontos.
          </div>
        </div>

        {/* Lacunas Críticas e Pontos Fortes */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm md:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Tópicos Críticos Identificados
            </h3>
            {critical_gaps.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2" />
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Excelente Desempenho!
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 text-center mt-1">
                  Nenhum tópico ficou abaixo do piso de 60% de aproveitamento neste simulado.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2">
                <p className="text-xs text-muted-foreground">
                  Os tópicos abaixo apresentaram aproveitamento inferior a 60% e foram mapeados para
                  a Central de Erros para revisão programada:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {critical_gaps.map((gapId) => {
                    const perf = topic_performances[gapId];
                    const accuracy = perf ? perf.accuracy_rate * 100 : 0;
                    return (
                      <div
                        key={gapId}
                        className="flex items-center justify-between p-2.5 bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs"
                      >
                        <span
                          className="font-medium text-foreground truncate max-w-[150px]"
                          title={gapId}
                        >
                          Tópico: {gapId.substring(0, 15)}...
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <TrendingDown className="h-3.5 w-3.5" /> {accuracy.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border/60 mt-4 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>A Central de Erros foi
            automaticamente alimentada de forma a recalibrar seu planejamento de estudos adaptativo.
          </div>
        </div>
      </div>

      {/* Relatório Detalhado por Tópico */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" /> Detalhamento de Aproveitamento
            por Tópico
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Resultados de tempo e precisão para cada tópico de foco cobrado na prova.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/40 text-muted-foreground text-xs font-semibold border-b border-border">
                <th className="p-4 pl-6">ID do Tópico</th>
                <th className="p-4">Qtd. Questões</th>
                <th className="p-4 text-emerald-600 dark:text-emerald-400">Acertos</th>
                <th className="p-4 text-rose-600 dark:text-rose-400">Erros</th>
                <th className="p-4 text-amber-600 dark:text-amber-400">Em Branco</th>
                <th className="p-4">Tempo Médio</th>
                <th className="p-4 pr-6 text-right">Aproveitamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {topicsArray.map((perf) => {
                const accuracy = perf.accuracy_rate * 100;
                const accuracyColor =
                  accuracy >= 80
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : accuracy >= 60
                      ? "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";

                return (
                  <tr key={perf.topic_id} className="hover:bg-muted/30 transition-colors">
                    <td
                      className="p-4 pl-6 font-medium text-foreground truncate max-w-[200px]"
                      title={perf.topic_id}
                    >
                      {perf.topic_id}
                    </td>
                    <td className="p-4 text-muted-foreground">{perf.total_questions}</td>
                    <td className="p-4 text-emerald-600 font-medium">{perf.correct_count}</td>
                    <td className="p-4 text-rose-600 font-medium">{perf.incorrect_count}</td>
                    <td className="p-4 text-amber-600 font-medium">{perf.unanswered_count}</td>
                    <td className="p-4 text-muted-foreground">{perf.average_time_seconds}s</td>
                    <td className="p-4 pr-6 text-right">
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${accuracyColor}`}
                      >
                        {accuracy.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
