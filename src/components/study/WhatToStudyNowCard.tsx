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
      {/* ── 1. CARD PRINCIPAL: O QUE ESTUDAR AGORA ────────────────────────────── */}
      <Card
        variant="solid"
        className="panel border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-7 shadow-lg relative overflow-hidden ring-1 ring-primary/20 rounded-2xl"
      >
        {/* Visual Accent Top Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-emerald-500 to-amber-500" />

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="font-mono text-xs font-extrabold text-primary uppercase tracking-widest block">
                  🎯 O QUE FAZER AGORA
                </p>
                <p className="text-xs text-muted-foreground font-medium">
                  Ação recomendada pelo cérebro pedagógico
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "px-3 py-1 text-xs rounded-lg font-bold",
                  primaryBadgeConfig.className,
                )}
              >
                <StateIcon className="mr-1.5 h-3.5 w-3.5" />
                {primaryBadgeConfig.label}
              </Badge>
              {primary.priorityScore ? (
                <Badge variant="secondary" className="font-mono text-xs px-2.5 py-1 rounded-lg">
                  Score {primary.priorityScore.toFixed(1)}
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Core Info Grid */}
          <div className="grid gap-6 md:grid-cols-3 items-start">
            {/* Zones 1, 2, 3: Subject/Topic, Reason, Material */}
            <div className="md:col-span-2 space-y-4">
              {/* Context */}
              <div>
                <span className="text-xs font-extrabold text-primary uppercase tracking-wider font-mono bg-primary/10 px-2.5 py-1 rounded-md inline-block mb-1.5">
                  {primary.subjectName}
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                  {primary.topicName}
                </h2>
              </div>

              {/* Pedagogical Reason */}
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-xs text-foreground space-y-1.5">
                <span className="font-bold text-primary flex items-center gap-1.5 uppercase font-mono tracking-wider text-[11px]">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  Por que estudar este tópico agora:
                </span>
                <p className="leading-relaxed text-foreground/90 font-medium text-xs sm:text-sm">
                  {primary.priorityReason ||
                    `Intervenção pedagógica recomendada (${interventionLabel}) para fortalecer seu desempenho no edital.`}
                </p>
              </div>

              {/* Recommended Material */}
              <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 text-xs flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <FileText className="h-4 w-4 shrink-0" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono block">
                      Material de Apoio
                    </span>
                    <p className="font-semibold text-foreground truncate">
                      {primary.recommendedMaterial?.title ??
                        "Sugerimos consultar a legislação e PDFs de Teoria."}
                    </p>
                  </div>
                </div>
                {primary.recommendedMaterial ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold gap-1 shrink-0 text-primary hover:bg-primary/10"
                  >
                    <Link to="/materiais">Abrir Material →</Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs font-bold gap-1 shrink-0 text-muted-foreground"
                  >
                    <Link to="/materiais">Buscar PDF</Link>
                  </Button>
                )}
              </div>
            </div>

            {/* Cognitive Metrics Box */}
            <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 space-y-4 shadow-2xs">
              <p className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Diagnóstico de Domínio
              </p>

              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-muted-foreground">Domínio Estimado</span>
                    <span className="text-foreground font-bold font-mono">
                      {masteryPercent !== null ? `${masteryPercent}%` : "Em análise"}
                    </span>
                  </div>
                  {masteryPercent !== null ? (
                    <Progress value={masteryPercent} className="h-2 rounded-full" />
                  ) : (
                    <div className="h-2 w-full bg-muted rounded-full" />
                  )}
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-muted-foreground">Nível de Confiança</span>
                    <span className="text-foreground font-bold font-mono">
                      {confidencePercent !== null ? `${confidencePercent}%` : "Inicial"}
                    </span>
                  </div>
                  {confidencePercent !== null ? (
                    <Progress value={confidencePercent} className="h-2 rounded-full" />
                  ) : (
                    <div className="h-2 w-full bg-muted rounded-full" />
                  )}
                </div>

                <div className="pt-3 border-t border-border/60 space-y-1.5 text-[11px] text-muted-foreground font-mono">
                  <div className="flex justify-between">
                    <span>Erros pendentes:</span>
                    <strong className="text-foreground font-bold">
                      {primary.diagnostic?.unresolvedErrors ?? 0} questões
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Recorrência:</span>
                    <strong className="text-foreground font-bold">
                      {formatRecency(primary.diagnostic?.daysSinceStudy)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border/80">
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-border/60">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>
                  Atividade:{" "}
                  <strong className="text-foreground font-bold">{interventionLabel}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-border/60">
                <Clock className="h-4 w-4 text-primary" />
                <span>
                  Sessão:{" "}
                  <strong className="text-foreground font-mono font-bold">
                    {primary.plannedMinutes} min
                  </strong>
                </span>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full sm:w-auto font-extrabold text-sm px-8 py-6 rounded-xl shadow-md bg-gradient-to-r from-primary to-primary/90 text-primary-foreground hover:opacity-95 transition-all gap-2.5"
              onClick={() => handleStartActivity(primary)}
              disabled={startMutation.isPending}
            >
              <Play className="h-4 w-4 fill-current" />
              {startMutation.isPending ? "INICIANDO..." : "COMEÇAR ESTUDO AGORA →"}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── 2. LISTA: PRÓXIMAS PRIORIDADES ────────────────────────────────────── */}
      {nextPriorities.length > 0 ? (
        <section className="space-y-3" id="next-priorities-section">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Próximas Prioridades Recomendadas ({nextPriorities.length})
            </h3>
            <span className="text-xs text-muted-foreground">Ordem estrita dos motores</span>
          </div>

          <div className="grid gap-3">
            {nextPriorities.map((item, index) => {
              const itemBadge = getStateBadgeConfig(item.diagnostic?.knowledgeState);
              const ItemIcon = itemBadge.icon;
              const itemIntervention = getInterventionLabel(item.activityType, item.source);

              return (
                <Card
                  key={item.id}
                  variant="outline"
                  className="p-3 sm:p-4 transition-all hover:border-primary/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold text-muted-foreground">
                      #{index + 2}
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-primary">
                          {item.subjectName}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <h4 className="font-semibold truncate text-foreground">{item.topicName}</h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 px-1.5 ${itemBadge.className}`}
                        >
                          <ItemIcon className="mr-1 h-3 w-3" />
                          {itemBadge.label}
                        </Badge>
                        <span className="text-muted-foreground">
                          Intervenção:{" "}
                          <strong className="text-foreground">{itemIntervention}</strong>
                        </span>
                        <span className="text-muted-foreground">
                          Duração:{" "}
                          <strong className="text-foreground">
                            {itemPlannedMinutesFormat(item.plannedMinutes)}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full sm:w-auto shrink-0 text-xs"
                    onClick={() => handleStartActivity(item)}
                  >
                    Iniciar # {index + 2}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Card>
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
