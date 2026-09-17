import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { fetchDiagnosticDataForTopics, startTask } from "@/lib/planner/service";
import type { KnowledgeStateName } from "@/lib/diagnosis/engine";
import { ACTIVITY_LABELS, TASK_STATUS_LABELS } from "@/lib/domain";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type DiagnosticInfo = {
  knowledgeState: KnowledgeStateName;
  mastery: number;
  confidence: number;
  accuracy: number;
  recentErrors: number;
  unresolvedErrors: number;
  recurringErrors: number;
  daysSinceStudy: number | null;
  daysSinceError: number | null;
  interventionScore: number;
};

export type RecommendationItem = {
  id: string;
  title: string;
  subjectName: string;
  topicName: string;
  subjectId?: string | null;
  topicId?: string | null;
  activityType: string;
  plannedMinutes: number;
  priorityScore: number | null;
  priorityReason: string | null;
  status: string;
  source: string | null;
  position: number;
  scheduledDate: string | null;
  diagnostic?: DiagnosticInfo | null;
  recommendedMaterial?: { id: string; title: string } | null;
};

export type WhatToStudyNowCardProps = {
  activePlanId?: string | null;
  contestId?: string | null;
  onStartTask?: (taskId: string) => void;
  /** Optional pre-fetched recommendations for unit testing or custom injection */
  initialRecommendations?: RecommendationItem[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function getStateBadgeConfig(stateName?: KnowledgeStateName | string | null) {
  switch (stateName) {
    case "PONTO_CRITICO":
      return {
        label: "Ponto Crítico",
        className: "bg-red-500/15 text-red-500 dark:text-red-400 border-red-500/30 font-medium",
        icon: AlertTriangle,
      };
    case "RISCO_ESQUECIMENTO":
      return {
        label: "Risco de Esquecimento",
        className:
          "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-medium",
        icon: Clock,
      };
    case "INSTAVEL":
      return {
        label: "Desempenho Instável",
        className:
          "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 font-medium",
        icon: RotateCcw,
      };
    case "CONSOLIDANDO":
      return {
        label: "Em Consolidação",
        className: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 font-medium",
        icon: Target,
      };
    case "APRENDIZAGEM":
      return {
        label: "Em Aprendizagem",
        className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium",
        icon: BookOpen,
      };
    case "DOMINADO":
      return {
        label: "Dominado",
        className:
          "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-medium",
        icon: CheckCircle2,
      };
    case "SEM_EVIDENCIA":
    default:
      return {
        label: "Sem Evidência",
        className: "bg-secondary text-secondary-foreground border-border font-medium",
        icon: Sparkles,
      };
  }
}

export function getInterventionLabel(activityType?: string | null, source?: string | null): string {
  if (source === "review_engine") return "Revisão Adaptativa";
  switch (activityType) {
    case "teoria":
      return "Estudar Teoria";
    case "questoes":
      return "Resolver Questões";
    case "exercicios":
      return "Revisar Erros";
    case "revisao":
      return "Revisão Adaptativa";
    case "estudo_dirigido":
      return "Reforçar Ponto Fraco";
    case "flashcards":
      return "Consolidar (Flashcards)";
    case "simulado":
      return "Manutenção / Simulado";
    default:
      return ACTIVITY_LABELS[activityType as keyof typeof ACTIVITY_LABELS] ?? "Estudo Guiado";
  }
}

function formatRecency(days: number | null | undefined): string {
  if (days === null || days === undefined) return "Não estudado";
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return `Há ${days} dias`;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function WhatToStudyNowCard({
  activePlanId,
  contestId,
  onStartTask,
  initialRecommendations,
  isLoading: propIsLoading,
  isError: propIsError,
  error: propError,
  onRetry,
}: WhatToStudyNowCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query de busca de recomendações reias do plano e do diagnóstico
  const {
    data: fetchedRecommendations,
    isLoading: queryIsLoading,
    isError: queryIsError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["what-to-study-now", activePlanId, contestId],
    enabled: initialRecommendations === undefined,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);

      // Buscar tarefas do plano ativas para hoje ou pendentes
      let query = supabase
        .from("plan_tasks")
        .select(
          "id, title, status, planned_minutes, actual_minutes, activity_type, priority_score, priority_reason, plan_id, position, scheduled_date, source, topic_id, subject_id, subjects(name), topics(name)",
        )
        .in("status", ["pendente", "em_andamento"])
        .order("scheduled_date", { ascending: true })
        .order("position", { ascending: true })
        .limit(10);

      if (activePlanId) {
        query = query.eq("plan_id", activePlanId);
      }

      const { data: rawTasks, error: tasksError } = await query;
      if (tasksError) throw tasksError;

      const tasks = rawTasks ?? [];
      if (tasks.length === 0) return [];

      // Coletar topic_ids para enriquecer com dados do Diagnosis Engine
      const topicIds = Array.from(
        new Set(tasks.map((t) => t.topic_id).filter((id): id is string => Boolean(id))),
      );

      const diagnosticMap = new Map<string, DiagnosticInfo>();
      const materialMap = new Map<string, { id: string; title: string }>();

      if (topicIds.length > 0) {
        try {
          const [diagRes, matRes] = await Promise.allSettled([
            fetchDiagnosticDataForTopics(topicIds),
            supabase
              .from("material_items")
              .select("id, title, topic_id")
              .in("topic_id", topicIds)
              .limit(20),
          ]);

          if (diagRes.status === "fulfilled") {
            diagRes.value.forEach((v, k) => diagnosticMap.set(k, v));
          }

          if (matRes.status === "fulfilled" && !matRes.value.error && matRes.value.data) {
            for (const item of matRes.value.data) {
              if (item.topic_id && !materialMap.has(item.topic_id)) {
                materialMap.set(item.topic_id, { id: item.id, title: item.title });
              }
            }
          }
        } catch (diagErr) {
          console.warn("Aviso ao buscar diagnósticos/materiais para o card:", diagErr);
        }
      }

      // Mapear resultado final preservando ordem estrita do motor
      const items: RecommendationItem[] = tasks.map((t, idx) => {
        const subjectObj = Array.isArray(t.subjects) ? t.subjects[0] : t.subjects;
        const topicObj = Array.isArray(t.topics) ? t.topics[0] : t.topics;
        const topicId = t.topic_id ?? null;
        const diagnostic = topicId ? (diagnosticMap.get(topicId) ?? null) : null;
        const recommendedMaterial = topicId ? (materialMap.get(topicId) ?? null) : null;

        return {
          id: t.id,
          title: t.title,
          subjectName: subjectObj?.name ?? "Matéria Alvo",
          topicName: topicObj?.name ?? t.title,
          subjectId: t.subject_id,
          topicId: t.topic_id,
          activityType: t.activity_type ?? "teoria",
          plannedMinutes: t.planned_minutes ?? 50,
          priorityScore: t.priority_score,
          priorityReason: t.priority_reason,
          status: t.status,
          source: t.source,
          position: idx + 1,
          scheduledDate: t.scheduled_date,
          diagnostic,
          recommendedMaterial,
        };
      });

      return items;
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: string) => startTask(id),
    onSuccess: () => {
      toast.success("Atividade iniciada!");
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
      queryClient.invalidateQueries({ queryKey: ["what-to-study-now"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const recommendations = initialRecommendations ?? fetchedRecommendations ?? [];
  const isLoading = propIsLoading ?? queryIsLoading;
  const isError = propIsError ?? queryIsError;
  const error = propError ?? queryError;

  const handleStartActivity = (item: RecommendationItem) => {
    if (onStartTask && item.id) {
      onStartTask(item.id);
    } else if (item.id) {
      startMutation.mutate(item.id);
    }

    // Navegação contextual baseada na intervenção recomendada
    if (item.activityType === "questoes") {
      navigate({
        to: "/questoes",
        search: {
          topic: item.topicName || undefined,
          subject: item.subjectName || undefined,
        },
      });
    } else if (item.activityType === "exercicios" || item.source === "review_engine") {
      navigate({ to: "/central-erros" });
    } else if (item.activityType === "revisao" || item.activityType === "flashcards") {
      navigate({ to: "/revisao" });
    } else {
      navigate({ to: "/estudo" });
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  // UI ESTADO: LOADING
  // ───────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card variant="solid" className="border-primary/30 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-7 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28 rounded-md" />
            <Skeleton className="h-6 w-36 rounded-md" />
          </div>
          <Skeleton className="h-16 w-full rounded-md" />
        </div>
        <div className="pt-4 border-t border-border space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </Card>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UI ESTADO: ERRO
  // ───────────────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Card
        variant="solid"
        className="border-destructive/40 bg-destructive/5 p-6 text-center space-y-3"
      >
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
        <h3 className="font-semibold text-foreground">Não foi possível carregar a recomendação</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          {error?.message ?? "Ocorreu um erro ao consultar o motor de recomendações de estudo."}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => (onRetry ? onRetry() : refetch())}
          className="mt-2"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Tentar novamente
        </Button>
      </Card>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // UI ESTADO: SEM RECOMENDAÇÕES (VAZIO)
  // ───────────────────────────────────────────────────────────────────────────
  if (recommendations.length === 0) {
    return (
      <Card
        variant="solid"
        className="border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3"
      >
        <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-display text-lg font-bold text-foreground">
            Sua meta de estudos está em dia!
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Não há tarefas urgentes ou recomendações pendentes para este momento. Você pode praticar
            questões avulsas ou revisar flashcards livremente.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/questoes">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Banco de Questões
            </Link>
          </Button>
          <Button asChild size="sm" variant="default">
            <Link to="/revisao">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Fila de Revisões
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  // Primeira recomendação principal (CARD PRINCIPAL)
  const primary = recommendations[0];
  const nextPriorities = recommendations.slice(1, 5);

  const primaryBadgeConfig = getStateBadgeConfig(primary.diagnostic?.knowledgeState);
  const StateIcon = primaryBadgeConfig.icon;
  const interventionLabel = getInterventionLabel(primary.activityType, primary.source);

  const masteryPercent =
    primary.diagnostic?.mastery !== undefined ? Math.round(primary.diagnostic.mastery * 100) : null;

  const confidencePercent =
    primary.diagnostic?.confidence !== undefined
      ? Math.round(primary.diagnostic.confidence * 100)
      : null;

  return (
    <div className="space-y-6" id="what-to-study-now-container">
      {/* ── 1. BLOCO HERO DOMINANTE: MISSÃO DE ESTUDO (SEM CARDS ENCAIXADOS) ── */}
      <section
        className="relative rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 border border-primary/30 p-6 sm:p-8 shadow-sm overflow-hidden"
        aria-label="Missão de Estudo Principal"
      >
        {/* Accent Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-amber-500" />

        <div className="space-y-6 pt-1">
          {/* Top Label & State */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-black text-primary uppercase tracking-widest">
                🎯 O QUE FAZER AGORA
              </span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-xs text-muted-foreground font-semibold">
                Missão guiada pelo cérebro pedagógico
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "px-3 py-1 text-xs rounded-xl font-bold shadow-2xs",
                  primaryBadgeConfig.className,
                )}
              >
                <StateIcon className="mr-1.5 h-3.5 w-3.5" />
                {primaryBadgeConfig.label}
              </Badge>
              {primary.priorityScore ? (
                <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1 rounded-xl">
                  Score {primary.priorityScore.toFixed(1)}
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Unified Core Hero Section */}
          <div className="space-y-4">
            {/* Subject & Topic Heading */}
            <div>
              <span className="text-xs font-black text-primary uppercase tracking-wider font-mono bg-primary/10 px-3 py-1 rounded-lg inline-block mb-2">
                {primary.subjectName}
              </span>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-foreground leading-tight">
                {primary.topicName}
              </h2>
            </div>

            {/* Pedagogical Reason as integrated accent text */}
            <div className="border-l-2 border-primary/80 pl-4 py-1 text-xs sm:text-sm text-foreground/90 font-medium leading-relaxed">
              <p className="text-[11px] font-bold text-primary uppercase font-mono tracking-wider flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                Motivo Pedagógico:
              </p>
              {primary.priorityReason ||
                `Intervenção pedagógica recomendada (${interventionLabel}) para fortalecer seu desempenho no edital.`}
            </div>

            {/* Inline Meta Strip: Material, Time, Activity & Metrics */}
            <div className="pt-2 flex flex-wrap items-center gap-y-3 gap-x-6 text-xs text-muted-foreground font-medium">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Atividade:{" "}
                  <strong className="text-foreground font-bold">{interventionLabel}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Tempo:{" "}
                  <strong className="text-foreground font-mono font-bold">
                    {primary.plannedMinutes} min
                  </strong>
                </span>
              </div>

              {masteryPercent !== null ? (
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    Domínio:{" "}
                    <strong className="text-foreground font-mono font-bold">
                      {masteryPercent}%
                    </strong>
                  </span>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate max-w-xs">
                  Material:{" "}
                  <strong className="text-foreground font-bold">
                    {primary.recommendedMaterial?.title ?? "Apostila/Legislação do Edital"}
                  </strong>
                </span>
                {primary.recommendedMaterial ? (
                  <Link
                    to="/materiais"
                    className="text-primary font-bold hover:underline ml-1 inline-flex items-center"
                  >
                    Abrir →
                  </Link>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action Row — DOMINANT CTA */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/50">
            <span className="text-xs text-muted-foreground font-semibold">
              Sessão de estudo guiada e cronometrada
            </span>

            <Button
              size="lg"
              className="w-full sm:w-auto font-black text-sm px-9 py-6 rounded-2xl shadow-md bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600 dark:text-slate-950 transition-all hover:scale-[1.01] gap-3 tracking-wide"
              onClick={() => handleStartActivity(primary)}
              disabled={startMutation.isPending}
            >
              <Play className="h-4 w-4 fill-current" />
              {startMutation.isPending ? "INICIANDO SESSÃO..." : "COMEÇAR ESTUDO AGORA →"}
            </Button>
          </div>
        </div>
      </section>

      {/* ── 2. LISTA: PRÓXIMAS PRIORIDADES (SEM CARDS ENCAIXADOS) ───────────────── */}
      {nextPriorities.length > 0 ? (
        <section className="space-y-3" id="next-priorities-section">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">
              Próximas Prioridades Na Fila ({nextPriorities.length})
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              Sequência dos Motores
            </span>
          </div>

          <div className="space-y-2">
            {nextPriorities.map((item, index) => {
              const itemBadge = getStateBadgeConfig(item.diagnostic?.knowledgeState);
              const ItemIcon = itemBadge.icon;
              const itemIntervention = getInterventionLabel(item.activityType, item.source);

              return (
                <div
                  key={item.id}
                  className="p-3 sm:p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted font-mono text-xs font-bold text-muted-foreground">
                      #{index + 2}
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-primary">{item.subjectName}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <h4 className="font-bold truncate text-foreground">{item.topicName}</h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 rounded-lg ${itemBadge.className}`}
                        >
                          <ItemIcon className="mr-1 h-3 w-3" />
                          {itemBadge.label}
                        </Badge>
                        <span>
                          Intervenção:{" "}
                          <strong className="text-foreground font-bold">{itemIntervention}</strong>
                        </span>
                        <span>
                          Duração:{" "}
                          <strong className="text-foreground font-mono font-bold">
                            {itemPlannedMinutesFormat(item.plannedMinutes)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto shrink-0 text-xs font-bold rounded-xl"
                    onClick={() => handleStartActivity(item)}
                  >
                    Iniciar # {index + 2}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function itemPlannedMinutesFormat(min: number): string {
  return `${min} min`;
}
