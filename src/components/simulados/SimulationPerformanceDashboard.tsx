import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Clock,
  Target,
  Zap,
  CheckCircle2,
  Filter,
  ArrowUpRight,
  BookOpen,
  Layers,
  AlertCircle,
  Activity,
  FileText,
  Calendar,
  Sparkles,
} from "lucide-react";
import { getUserSimulationHistory } from "@/lib/questions/service";
import {
  analyzeSimulationComparison,
  type SimulationHistoricalInput,
} from "@/lib/questions/simulation-historical-analytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SimulationPerformanceDashboardProps {
  onSelectSimulationForReport?: (setId: string) => void;
}

export function SimulationPerformanceDashboard({
  onSelectSimulationForReport,
}: SimulationPerformanceDashboardProps) {
  // Filtros locais
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedBank, setSelectedBank] = useState<string>("all");

  // Requisitar histórico completo de simulados concluídos do usuário
  const {
    data: rawSimulations = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["user-simulation-history"],
    queryFn: () => getUserSimulationHistory(),
  });

  // Filtragem determinística no client antes da análise
  const filteredSimulations = useMemo(() => {
    if (!rawSimulations || rawSimulations.length === 0) return [];

    let result = [...rawSimulations];

    // Filtro por Período
    if (selectedPeriod !== "all") {
      const now = new Date();
      let days = 30;
      if (selectedPeriod === "90d") days = 90;
      if (selectedPeriod === "180d") days = 180;
      if (selectedPeriod === "365d") days = 365;

      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter((sim) => {
        const completedAt = sim.set.completedAt
          ? new Date(sim.set.completedAt)
          : new Date(sim.set.createdAt);
        return completedAt >= cutoff;
      });
    }

    // Filtro por Banca
    if (selectedBank !== "all") {
      result = result.filter((sim) => {
        if (!Array.isArray(sim.items)) return false;
        return sim.items.some((item) => {
          const rawBoard =
            (item as any).examBoard ||
            (item as any).exam_board ||
            (item as any).metadata?.exam_board ||
            (item as any).metadata?.banca;
          return rawBoard && String(rawBoard).trim().toUpperCase() === selectedBank.toUpperCase();
        });
      });
    }

    // Filtro por Disciplina
    if (selectedSubject !== "all") {
      result = result.filter((sim) => {
        if (!Array.isArray(sim.items)) return false;
        return sim.items.some((item) => {
          const rawSub =
            (item as any).subjectName ||
            (item as any).subject_name ||
            (item as any).subject ||
            (item as any).metadata?.subject_name;
          return rawSub && String(rawSub).trim().toLowerCase() === selectedSubject.toLowerCase();
        });
      });
    }

    return result;
  }, [rawSimulations, selectedPeriod, selectedBank, selectedSubject]);

  // Extrair bancas e disciplinas disponíveis para popular seletores de filtro
  const availableBanks = useMemo(() => {
    const banks = new Set<string>();
    for (const sim of rawSimulations) {
      if (Array.isArray(sim.items)) {
        for (const item of sim.items) {
          const rawBoard =
            (item as any).examBoard ||
            (item as any).exam_board ||
            (item as any).metadata?.exam_board ||
            (item as any).metadata?.banca;
          if (rawBoard && typeof rawBoard === "string" && rawBoard.trim()) {
            banks.add(rawBoard.trim().toUpperCase());
          }
        }
      }
    }
    return Array.from(banks).sort();
  }, [rawSimulations]);

  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    for (const sim of rawSimulations) {
      if (Array.isArray(sim.items)) {
        for (const item of sim.items) {
          const rawSub =
            (item as any).subjectName ||
            (item as any).subject_name ||
            (item as any).subject ||
            (item as any).metadata?.subject_name;
          if (rawSub && typeof rawSub === "string" && rawSub.trim()) {
            subjects.add(rawSub.trim());
          }
        }
      }
    }
    return Array.from(subjects).sort();
  }, [rawSimulations]);

  // Execução dos Analytics Consolidados
  const comparativeAnalysis = useMemo(() => {
    if (!filteredSimulations || filteredSimulations.length === 0) return null;
    const input: SimulationHistoricalInput = { simulations: filteredSimulations };
    try {
      return analyzeSimulationComparison(input);
    } catch (err) {
      console.error("analyzeSimulationComparison ERROR:", err);
      return null;
    }
  }, [filteredSimulations]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 text-center">
        <Activity className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          Carregando Central de Performance dos Simulados...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/10">
        <CardContent className="p-6 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h3 className="font-semibold text-rose-900 dark:text-rose-200">
            Erro ao carregar dados de performance
          </h3>
          <p className="text-xs text-rose-700 dark:text-rose-300">
            Não foi possível recuperar o histórico de simulados. Tente novamente em instantes.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!filteredSimulations || filteredSimulations.length === 0 || !comparativeAnalysis) {
    return (
      <div className="space-y-6">
        {/* Barra de Filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Filtros de Visão:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Período */}
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-8 text-xs w-[130px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o Histórico</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="180d">Últimos 6 meses</SelectItem>
              </SelectContent>
            </Select>

            {/* Banca */}
            {availableBanks.length > 0 && (
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="Banca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Bancas</SelectItem>
                  {availableBanks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Disciplina */}
            {availableSubjects.length > 0 && (
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-8 text-xs w-[140px]">
                  <SelectValue placeholder="Disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Disciplinas</SelectItem>
                  {availableSubjects.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <Card className="border-border">
          <CardContent className="p-12 text-center space-y-3">
            <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto" />
            <h3 className="text-base font-semibold text-foreground">
              Nenhum simulado concluído encontrado
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {rawSimulations.length === 0
                ? "Você ainda não possui simulados concluídos. Realize seu primeiro simulado para desbloquear a análise consolidada de performance."
                : "Nenhum simulado corresponde aos filtros selecionados. Tente ajustar os parâmetros de busca."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    historicalAnalysis,
    internalBenchmark,
    windowComparison,
    bankComparisons,
    accuracySpeedMatrix,
    consistency,
  } = comparativeAnalysis;
  const summary = historicalAnalysis.summary;
  const timeline = historicalAnalysis.timeline;

  try {
    return (
      <div className="space-y-6">
        {/* ─────────────────────────────────────────────────────────────────────────────
            TOOLBAR DE FILTROS DETERMINÍSTICOS (FASE 9)
           ───────────────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">Filtros da Central:</span>
            <Badge variant="secondary" className="text-[10px]">
              {filteredSimulations.length}{" "}
              {filteredSimulations.length === 1 ? "simulado" : "simulados"}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Período */}
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo o Histórico</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="180d">Últimos 6 meses</SelectItem>
              </SelectContent>
            </Select>

            {/* Banca */}
            {availableBanks.length > 0 && (
              <Select value={selectedBank} onValueChange={setSelectedBank}>
                <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
                  <SelectValue placeholder="Banca" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Bancas</SelectItem>
                  {availableBanks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Disciplina */}
            {availableSubjects.length > 0 && (
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-8 text-xs w-[150px] bg-background">
                  <SelectValue placeholder="Disciplina" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Disciplinas</SelectItem>
                  {availableSubjects.map((sub) => (
                    <SelectItem key={sub} value={sub}>
                      {sub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {(selectedPeriod !== "all" || selectedBank !== "all" || selectedSubject !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedPeriod("all");
                  setSelectedBank("all");
                  setSelectedSubject("all");
                }}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            FASE 2: VISÃO GERAL (KPI CARDS TOPO)
           ───────────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Simulados Concluídos */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Simulados Realizados</span>
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {summary.totalSimulations}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  ({timeline.reduce((acc, p) => acc + p.answeredCount, 0)} q. respondidas)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Taxa de resposta média:{" "}
                <span className="font-semibold text-foreground">
                  {summary.averageResponsePercentage}%
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Média de Desempenho */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Média de Desempenho</span>
                <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {summary.averageAccuracyPercentage}%
                </span>
                <span className="text-[11px] text-muted-foreground">
                  (Mediana: {internalBenchmark.medianScoreAccuracy}%)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Desvio padrão:{" "}
                <span className="font-semibold text-foreground">
                  ±{summary.accuracyStandardDeviation} p.p.
                </span>
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Personal Best / Melhor Desempenho */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Melhor Marca (Personal Best)</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {internalBenchmark.bestScoreAccuracy}%
                </span>
                {internalBenchmark.gapToBestPp !== null && (
                  <span
                    className={cn(
                      "text-[11px] font-semibold",
                      internalBenchmark.gapToBestPp >= 0 ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {internalBenchmark.gapToBestPp >= 0
                      ? "Recorde Atual"
                      : `${internalBenchmark.gapToBestPp.toFixed(1)} p.p.`}
                  </span>
                )}
              </div>
              <p
                className="text-[11px] text-muted-foreground truncate pt-1"
                title={internalBenchmark.bestScoreSetName || ""}
              >
                {internalBenchmark.bestScoreSetName || "Nenhum registrado"}
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Último Desempenho e Tendência */}
          <Card className="border-border">
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Último Desempenho</span>
                <div className="flex items-center gap-1">
                  {summary.overallTrend === "IMPROVING" && (
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  )}
                  {summary.overallTrend === "DECLINING" && (
                    <TrendingDown className="w-4 h-4 text-rose-500" />
                  )}
                  {summary.overallTrend === "STABLE" && (
                    <Minus className="w-4 h-4 text-amber-500" />
                  )}
                  {summary.overallTrend === "VOLATILE" && (
                    <Activity className="w-4 h-4 text-purple-500" />
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {summary.latestPoint ? `${summary.latestPoint.accuracyPercentage}%` : "—"}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-semibold px-1.5 py-0",
                    summary.overallTrend === "IMPROVING" &&
                      "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
                    summary.overallTrend === "DECLINING" &&
                      "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300",
                    summary.overallTrend === "STABLE" &&
                      "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
                    summary.overallTrend === "VOLATILE" &&
                      "border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300",
                  )}
                >
                  {summary.overallTrend === "IMPROVING"
                    ? "Em Evolução"
                    : summary.overallTrend === "DECLINING"
                      ? "Em Regressão"
                      : summary.overallTrend === "STABLE"
                        ? "Estável"
                        : summary.overallTrend === "VOLATILE"
                          ? "Volátil"
                          : "Insuficiente"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Pacing médio:{" "}
                <span className="font-semibold text-foreground">
                  {summary.averageTimePerQuestionSeconds}s / questão
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            FASE 3: TRAJETÓRIA DE EVOLUÇÃO LONGITUDINAL
           ───────────────────────────────────────────────────────────────────────────── */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Trajetória Longitudinal de Desempenho
                </CardTitle>
                <CardDescription className="text-xs">
                  Evolução cronológica dos simulados realizados e linha média histórica
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {timeline.length} Ponto(s) Registrado(s)
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {/* Gráfico / Barras Visuais de Evolução */}
            <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
              <div className="grid grid-cols-1 gap-2.5">
                {timeline.map((point, index) => {
                  const isBest = point.accuracyPercentage === internalBenchmark.bestScoreAccuracy;
                  const formattedDate = new Date(point.completedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  });

                  return (
                    <div
                      key={point.setId}
                      className={cn(
                        "group p-2.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-background hover:border-primary/50 cursor-pointer",
                        isBest
                          ? "border-amber-400/60 bg-amber-50/20 dark:bg-amber-950/10"
                          : "border-border",
                      )}
                      onClick={() => onSelectSimulationForReport?.(point.setId)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11px] font-mono text-muted-foreground w-6 text-center shrink-0">
                          #{index + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {point.setName}
                            </span>
                            {isBest && (
                              <Badge
                                variant="outline"
                                className="text-[9px] bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200"
                              >
                                PB {point.accuracyPercentage}%
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            Concluído em {formattedDate} • {point.totalQuestions} questões •{" "}
                            {point.avgTimePerQuestionSeconds}s/q
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-28 sm:w-36 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">Acurácia</span>
                            <span className="font-bold text-foreground">
                              {point.accuracyPercentage}%
                            </span>
                          </div>
                          <Progress value={point.accuracyPercentage} className="h-1.5" />
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSimulationForReport?.(point.setId);
                          }}
                        >
                          Ver Relatório
                          <ArrowUpRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─────────────────────────────────────────────────────────────────────────────
            FASE 4: BENCHMARKING INTRAUSUÁRIO E COMPARAÇÃO COM HISTÓRICO
           ───────────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Bloco 1: Benchmarking Intrausuário */}
          <Card className="border-border lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Benchmarking Intrausuário (Você vs. Seu Histórico)
              </CardTitle>
              <CardDescription className="text-xs">
                Métricas relativas de desempenho comparadas à sua própria linha de base
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground block">
                    vs. Média Histórica
                  </span>
                  <span
                    className={cn(
                      "font-bold text-base flex items-center gap-1",
                      (internalBenchmark.deltaVsAveragePp ?? 0) > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : (internalBenchmark.deltaVsAveragePp ?? 0) < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground",
                    )}
                  >
                    {(internalBenchmark.deltaVsAveragePp ?? 0) > 0 ? "+" : ""}
                    {(internalBenchmark.deltaVsAveragePp ?? 0).toFixed(1)} p.p.
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Média: {internalBenchmark.averageScoreAccuracy}%
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground block">
                    vs. Mediana Histórica
                  </span>
                  <span
                    className={cn(
                      "font-bold text-base flex items-center gap-1",
                      (internalBenchmark.deltaVsMedianPp ?? 0) > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : (internalBenchmark.deltaVsMedianPp ?? 0) < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-foreground",
                    )}
                  >
                    {(internalBenchmark.deltaVsMedianPp ?? 0) > 0 ? "+" : ""}
                    {(internalBenchmark.deltaVsMedianPp ?? 0).toFixed(1)} p.p.
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Mediana: {internalBenchmark.medianScoreAccuracy}%
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground block">
                    Gap para o Personal Best
                  </span>
                  <span
                    className={cn(
                      "font-bold text-base flex items-center gap-1",
                      (internalBenchmark.gapToBestPp ?? 0) >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {(internalBenchmark.gapToBestPp ?? 0) >= 0
                      ? "Novo Recorde!"
                      : `${(internalBenchmark.gapToBestPp ?? 0).toFixed(1)} p.p.`}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    PB: {internalBenchmark.bestScoreAccuracy}%
                  </span>
                </div>
              </div>

              {/* Comparação por Janelas Temporais */}
              {windowComparison.latestVsAvgPrevious3 && (
                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1.5 text-xs">
                  <span className="font-semibold text-foreground block">
                    {windowComparison.latestVsAvgPrevious3.label}
                  </span>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>
                      Último Simulado:{" "}
                      <strong className="text-foreground">
                        {windowComparison.latestVsAvgPrevious3.targetAccuracy}%
                      </strong>
                    </span>
                    <span>
                      Média dos 3 Anteriores:{" "}
                      <strong className="text-foreground">
                        {windowComparison.latestVsAvgPrevious3.baseAccuracy}%
                      </strong>
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        windowComparison.latestVsAvgPrevious3.accuracyDeltaPp >= 0
                          ? "text-emerald-600 border-emerald-300"
                          : "text-rose-600 border-rose-300",
                      )}
                    >
                      {windowComparison.latestVsAvgPrevious3.accuracyDeltaPp >= 0 ? "+" : ""}
                      {windowComparison.latestVsAvgPrevious3.accuracyDeltaPp} p.p.
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bloco 2: Matriz Precisão x Velocidade & Consistência (FASES 7 & 8) */}
          <Card className="border-border space-y-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Ritmo & Consistência
              </CardTitle>
              <CardDescription className="text-xs">
                Relação multidimensional entre acurácia, velocidade e estabilidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-1">
              {/* Matriz Precisão x Velocidade */}
              {accuracySpeedMatrix ? (
                <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    Análise Ritmo x Precisão
                  </span>
                  <Badge variant="secondary" className="font-bold text-xs">
                    {accuracySpeedMatrix.label}
                  </Badge>
                  <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                    {accuracySpeedMatrix.description}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-border bg-muted/10 text-xs text-muted-foreground">
                  São necessários pelo menos 2 simulados para calcular a matriz de Ritmo x Precisão.
                </div>
              )}

              {/* Consistência Longitudinal */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Classificação de Consistência
                </span>
                <span className="font-bold text-sm text-foreground block">
                  {consistency === "CONSISTENTLY_STRONG" && "● Consistente em Alto Nível"}
                  {consistency === "CONSISTENTLY_WEAK" && "● Estável em Nível Inicial"}
                  {consistency === "IMPROVING" && "● Em Evolução Gradual"}
                  {consistency === "DECLINING" && "● Tendência de Declínio"}
                  {consistency === "VOLATILE" && "○ Oscilante / Volátil"}
                  {consistency === "STABLE" && "● Desempenho Estável"}
                  {consistency === "INSUFFICIENT_DATA" && "○ Dados Insuficientes"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            FASE 5 & 6: DESEMPENHO POR DISCIPLINA E POR TÓPICO
           ───────────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Disciplinas */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                Desempenho Consolidado por Disciplina
              </CardTitle>
              <CardDescription className="text-xs">
                Acurácia histórica acumulada, tendência e amostragem de simulados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {historicalAnalysis.subjects.length > 0 ? (
                <div className="space-y-2">
                  {historicalAnalysis.subjects.map((sub) => (
                    <div
                      key={sub.subjectName}
                      className="p-2.5 rounded-lg border border-border bg-background space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{sub.subjectName}</span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] px-1.5 py-0",
                              sub.trend === "IMPROVING" &&
                                "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300",
                              sub.trend === "DECLINING" &&
                                "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-300",
                              sub.trend === "STABLE" &&
                                "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-300",
                            )}
                          >
                            {sub.trend === "IMPROVING"
                              ? "Em Alta"
                              : sub.trend === "DECLINING"
                                ? "Em Queda"
                                : "Estável"}
                          </Badge>
                          <span className="font-bold text-foreground">
                            {sub.averageAccuracyPercentage}%
                          </span>
                        </div>
                      </div>

                      <Progress value={sub.averageAccuracyPercentage} className="h-1.5" />

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                        <span>Presente em {sub.simulationCount} simulado(s)</span>
                        <span>
                          Variação: {sub.accuracyDeltaPercentage >= 0 ? "+" : ""}
                          {sub.accuracyDeltaPercentage} p.p.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Sem dados suficientes para mapear disciplinas.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tópicos */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Desempenho por Tópico (Visão Descritiva)
              </CardTitle>
              <CardDescription className="text-xs">
                Mapeamento longitudinal de variação e amostragem por assunto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {historicalAnalysis.topics.length > 0 ? (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {historicalAnalysis.topics.map((topic) => (
                    <div
                      key={`${topic.subjectName}-${topic.topicName}`}
                      className="p-2.5 rounded-lg border border-border bg-background space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className="font-medium text-foreground truncate max-w-[220px]"
                          title={topic.topicName}
                        >
                          {topic.topicName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {topic.isPersistentWeakness && (
                            <Badge
                              variant="outline"
                              className="text-[9px] text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/30"
                            >
                              Ponto Crítico
                            </Badge>
                          )}
                          <span className="font-bold text-foreground">
                            {topic.averageAccuracyPercentage}%
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {topic.subjectName || "Geral"} • {topic.simulationCount} simulado(s)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Sem dados suficientes para mapear tópicos.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            DESEMPENHO POR BANCA EXAMINADORA (SE HOUVER DADOS)
           ───────────────────────────────────────────────────────────────────────────── */}
        {bankComparisons.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                Desempenho por Banca Examinadora
              </CardTitle>
              <CardDescription className="text-xs">
                Acurácia e ritmo de prova por instituição examinadora
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {bankComparisons.map((bank) => (
                  <div
                    key={bank.examBoard}
                    className="p-3 rounded-lg border border-border bg-muted/20 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">{bank.examBoard}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {bank.questionCount} q.
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-extrabold text-foreground">
                        {bank.accuracyPercentage}%
                      </span>
                      <span className="text-[10px] text-muted-foreground">de acerto</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Pacing: {bank.avgTimePerQuestionSeconds}s/q • {bank.simulationCount} simulados
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (renderError) {
    console.error("CRITICAL RENDER ERROR IN SimulationPerformanceDashboard:", renderError);
    throw renderError;
  }
}
