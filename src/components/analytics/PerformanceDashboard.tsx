import React, { useState, useEffect, useCallback } from "react";
import { getLocalAttempts, FISCAL_QUESTIONS } from "@/lib/questions/errorTracker";
import { generatePerformanceReport } from "@/lib/analytics/performanceEngine";
import { StudentPerformanceReport, GapDiagnostic } from "@/lib/analytics/types";
import { ErrorCategory } from "@/lib/questions/types";
import {
  TrendingUp,
  AlertOctagon,
  Award,
  Clock,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Zap,
  Target,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ERROR_LABELS: Record<
  ErrorCategory,
  { label: string; bg: string; text: string; icon: string }
> = {
  atencao: { label: "Falta de Atenção", bg: "bg-amber-500/10", text: "text-amber-400", icon: "👁️" },
  conhecimento: {
    label: "Falta de Conhecimento",
    bg: "bg-red-500/10",
    text: "text-red-400",
    icon: "📚",
  },
  interpretacao: {
    label: "Pegadinha de Banca",
    bg: "bg-pink-500/10",
    text: "text-pink-400",
    icon: "🪤",
  },
  esquecimento: {
    label: "Esquecimento / Curva",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    icon: "🧠",
  },
  calculo: { label: "Erro de Cálculo", bg: "bg-blue-500/10", text: "text-blue-400", icon: "🔢" },
  estrategia: {
    label: "Estratégia de Prova",
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    icon: "🎯",
  },
  velocidade: { label: "Velocidade", bg: "bg-cyan-500/10", text: "text-cyan-400", icon: "⚡" },
  outros: { label: "Outros Fatores", bg: "bg-gray-500/10", text: "text-gray-400", icon: "⚙️" },
};

export const PerformanceDashboard: React.FC = () => {
  const [report, setReport] = useState<StudentPerformanceReport | null>(null);
  const [isDemoData, setIsDemoData] = useState(false);

  const generateMockAttempts = useCallback(() => {
    // 8 tentativas fictícias simuladas para demonstrar relatórios completos
    const mockAttempts = [
      {
        id: "M-1",
        userId: "user-123",
        questionId: "Q-01",
        selectedAlternative: "A",
        isCorrect: false,
        timeSpentSeconds: 145,
        errorCategory: "interpretacao" as const,
        notes: "Caí na pegadinha da FGV de achar que decreto serve para reduzir ISS",
        occurredAt: new Date().toISOString(),
      },
      {
        id: "M-2",
        userId: "user-123",
        questionId: "Q-01",
        selectedAlternative: "B",
        isCorrect: true,
        timeSpentSeconds: 95,
        occurredAt: new Date().toISOString(),
      },
      {
        id: "M-3",
        userId: "user-123",
        questionId: "Q-02",
        selectedAlternative: "C",
        isCorrect: true,
        timeSpentSeconds: 65,
        occurredAt: new Date().toISOString(),
      },
      {
        id: "M-4",
        userId: "user-123",
        questionId: "Q-03",
        selectedAlternative: "A",
        isCorrect: false,
        timeSpentSeconds: 110,
        errorCategory: "conhecimento" as const,
        notes: "Esqueci que outorga de isenção exige interpretação literal restrita no art 111",
        occurredAt: new Date().toISOString(),
      },
      {
        id: "M-5",
        userId: "user-123",
        questionId: "Q-04",
        selectedAlternative: "A",
        isCorrect: false,
        timeSpentSeconds: 130,
        errorCategory: "atencao" as const,
        notes: "Não prestei atenção no prazo novenal cumulativo",
        occurredAt: new Date().toISOString(),
      },
      {
        id: "M-6",
        userId: "user-123",
        questionId: "Q-02",
        selectedAlternative: "C",
        isCorrect: true,
        timeSpentSeconds: 40,
        occurredAt: new Date().toISOString(),
      },
    ];

    setIsDemoData(true);
    setReport(generatePerformanceReport(mockAttempts, FISCAL_QUESTIONS));
  }, []);

  const loadData = useCallback(() => {
    const attempts = getLocalAttempts();
    if (attempts.length === 0) {
      // Se não houver tentativas do aluno, simulamos dados fictícios realistas
      // para garantir a experiência imediata e visual maravilhosa ("Show the working application instantly")
      generateMockAttempts();
    } else {
      setIsDemoData(false);
      setReport(generatePerformanceReport(attempts));
    }
  }, [generateMockAttempts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetAttempts = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("aprovado_fiscal_attempts");
      loadData();
    }
  };

  if (!report) return null;

  const formatPercentage = (val: number) => {
    return `${Math.round(val * 100)}%`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" id="performance-analytics-panel">
      {/* Cabeçalho do Dashboard */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5 bg-card/40 p-4 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-black text-foreground tracking-tight">
              IA Analytics & Diagnóstico de Lacunas
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Mapeamos o seu histórico de erros, velocidade de resolução e indicamos planos de estudo
            prioritários.
          </p>
        </div>

        <div className="flex gap-2">
          {isDemoData && (
            <Badge
              variant="outline"
              className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-wider py-1 shrink-0"
            >
              Dados de Demonstração
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            className="text-xs font-semibold h-8 cursor-pointer border-border hover:bg-muted"
            id="refresh-analytics-btn"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
          </Button>
          {!isDemoData && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleResetAttempts}
              className="text-xs font-semibold h-8 cursor-pointer"
              id="reset-analytics-btn"
            >
              Resetar Histórico
            </Button>
          )}
        </div>
      </div>

      {/* Cartões de Métricas Globais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Acurácia */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
              Acurácia Geral
            </span>
            <h3 className="text-2xl font-black text-foreground">
              {formatPercentage(report.overallAccuracy)}
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">
              Meta recomendada: &ge;80%
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Target className="h-6 w-6" />
          </div>
        </div>

        {/* Questões Respondidas */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
              Exercícios Resolvidos
            </span>
            <h3 className="text-2xl font-black text-foreground">{report.totalQuestionsResolved}</h3>
            <span className="text-[10px] text-muted-foreground font-medium">
              Questões acumuladas
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
            <HelpCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Tempo Médio */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
              Tempo Médio / Questão
            </span>
            <h3 className="text-2xl font-black text-foreground">
              {formatTime(
                report.totalQuestionsResolved > 0
                  ? report.totalTimeSpentSeconds / report.totalQuestionsResolved
                  : 0,
              )}
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">
              Alvo: &le;120s por item
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#ffb86c]/10 flex items-center justify-center text-[#ffb86c]">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Tempo de Estudo */}
        <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
              Tempo de Resolução
            </span>
            <h3 className="text-2xl font-black text-foreground">
              {formatTime(report.totalTimeSpentSeconds)}
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">
              Dedicação em exercícios
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#50fa7b]/10 flex items-center justify-center text-[#50fa7b]">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Grid Principal: Gráfico de Erros (Esquerdo) vs Maturidade por Banca (Direito) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Painel Esquerdo: Distribuição de Desvio de Erros (3/5) */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 lg:col-span-3 space-y-5">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">
              Desvio de Erros &bull; Análise de Falhas Cognitivas
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Mapeamento detalhado dos fatores psicológicos ou teóricos que causaram as suas
              respostas incorretas.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {report.errorDistribution.filter((e) => e.count > 0).length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <CheckCircle className="h-8 w-8 text-[#50fa7b] mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">
                  Excelente! Nenhum erro catalogado.
                </p>
              </div>
            ) : (
              report.errorDistribution
                .filter((err) => err.count > 0)
                .sort((a, b) => b.count - a.count)
                .map((err) => {
                  const info = ERROR_LABELS[err.category];
                  return (
                    <div key={err.category} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{info.icon}</span>
                          <span className="font-bold text-foreground">{info.label}</span>
                        </div>
                        <span className="font-mono text-muted-foreground font-bold">
                          {err.count}x ({Math.round(err.percentage)}%)
                        </span>
                      </div>
                      <div className="h-2.5 bg-[#1a1b24] rounded-full overflow-hidden border border-border/40">
                        <div
                          className={`h-full rounded-full transition-all ${
                            err.category === "conhecimento"
                              ? "bg-red-500"
                              : err.category === "atencao"
                                ? "bg-amber-500"
                                : err.category === "interpretacao"
                                  ? "bg-pink-500"
                                  : "bg-primary"
                          }`}
                          style={{ width: `${err.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Painel Direito: Índice de Maturidade por Banca (2/5) */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-6 lg:col-span-2 space-y-5">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-foreground">Maturidade por Banca Examinadora</h4>
            <p className="text-[11px] text-muted-foreground">
              Mapeamos quão adaptado você está ao estilo peculiar das principais organizadoras.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {report.maturityIndexes.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground">Bancas ainda não diagnosticadas.</p>
              </div>
            ) : (
              report.maturityIndexes.map((mat) => (
                <div
                  key={mat.examBoard}
                  className="bg-[#13141c]/40 border border-border p-4 rounded-xl space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-foreground">{mat.examBoard}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        mat.level === "Alta Performance"
                          ? "text-[#50fa7b] border-[#50fa7b]/20 bg-[#50fa7b]/5"
                          : mat.level === "Avançado"
                            ? "text-primary border-primary/20 bg-primary/5"
                            : "text-[#ffb86c] border-[#ffb86c]/25 bg-[#ffb86c]/5"
                      }`}
                    >
                      {mat.level}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-[#1a1b24] rounded-lg p-2 border border-border/40">
                      <span className="text-[9px] text-muted-foreground uppercase block">
                        Acurácia
                      </span>
                      <strong className="text-xs text-foreground font-mono">
                        {formatPercentage(mat.accuracy)}
                      </strong>
                    </div>
                    <div className="bg-[#1a1b24] rounded-lg p-2 border border-border/40">
                      <span className="text-[9px] text-muted-foreground uppercase block">
                        Índice Geral
                      </span>
                      <strong className="text-xs text-[#8be9fd] font-mono">
                        {mat.maturityScore}/100
                      </strong>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Painel Inferior: Diagnóstico de Lacunas e Plano de Ação Recomendado */}
      <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-red-400">
            <AlertOctagon className="h-5 w-5" />
            <h4 className="text-sm font-bold text-foreground">
              Diagnóstico Clínico de Lacunas Prioritárias
            </h4>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Assuntos mapeados com desempenho abaixo da média recomendada para aprovação (&lt;75%).
            Exige revisão imediata.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.gapDiagnostics.length === 0 ? (
            <div className="col-span-2 bg-[#50fa7b]/5 border border-[#50fa7b]/20 rounded-xl p-6 text-center space-y-2">
              <CheckCircle className="h-8 w-8 text-[#50fa7b] mx-auto" />
              <p className="text-xs text-foreground font-bold">
                Nenhuma lacuna crítica localizada!
              </p>
              <p className="text-[10px] text-muted-foreground">
                Seu aproveitamento médio está alto em todas as matérias. Continue assim!
              </p>
            </div>
          ) : (
            report.gapDiagnostics.map((gap) => (
              <div
                key={gap.id}
                className={`border rounded-xl p-4 md:p-5 flex flex-col justify-between space-y-4 ${
                  gap.severity === "high"
                    ? "bg-red-500/[0.02] border-red-500/20"
                    : "bg-amber-500/[0.02] border-amber-500/20"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {gap.subjectName}
                    </span>
                    <Badge
                      className={`text-[9px] font-bold ${
                        gap.severity === "high"
                          ? "bg-red-500/10 text-red-400 border-red-500/25 hover:bg-red-500/10"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/25 hover:bg-amber-500/10"
                      }`}
                    >
                      {gap.severity === "high" ? "CRÍTICO" : "RECOMENDADO"}
                    </Badge>
                  </div>

                  <h5 className="text-sm font-bold text-foreground tracking-tight">
                    {gap.topicName}
                  </h5>

                  <div className="grid grid-cols-2 gap-2 text-center py-1">
                    <div className="bg-[#1a1b24] rounded-lg p-1.5 border border-border/40">
                      <span className="text-[8px] text-muted-foreground uppercase block">
                        Seu Aproveitamento
                      </span>
                      <strong
                        className={`text-xs font-mono font-bold ${gap.severity === "high" ? "text-red-400" : "text-amber-400"}`}
                      >
                        {formatPercentage(gap.accuracy)}
                      </strong>
                    </div>
                    <div className="bg-[#1a1b24] rounded-lg p-1.5 border border-border/40">
                      <span className="text-[8px] text-muted-foreground uppercase block">
                        Falha Dominante
                      </span>
                      <strong className="text-xs text-gray-200 block truncate">
                        {ERROR_LABELS[gap.primaryErrorCategory]?.label || gap.primaryErrorCategory}
                      </strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    💡 <strong>Plano de Ação sugerido por IA:</strong> {gap.recommendation}
                  </p>
                </div>

                {gap.suggestedLawTags && gap.suggestedLawTags.length > 0 && (
                  <div className="pt-2 border-t border-border/40 space-y-1.5">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block">
                      Artigos de Lei Foco
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {gap.suggestedLawTags.map((law, lIdx) => (
                        <span
                          key={lIdx}
                          className="bg-[#ff79c6]/10 text-[#ff79c6] border border-[#ff79c6]/20 px-2 py-0.5 rounded font-mono text-[9px] font-bold"
                        >
                          § {law}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
