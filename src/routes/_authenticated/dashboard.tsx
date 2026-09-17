import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Info,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cleanupLegacyMockContests } from "@/lib/concursos/dbCleanupService";
import { AppShell } from "@/components/layout/AppShell";
import { WhatToStudyNowCard } from "@/components/study/WhatToStudyNowCard";
import { CoachGuidanceCard } from "@/components/coach/CoachGuidanceCard";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import {
  GurujaCycleTasks,
  type DayTask as GurujaDayTask,
} from "@/components/dashboard/GurujaCycleTasks";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_LABELS, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/domain";
import {
  addDays,
  availableMinutesOn,
  daysBetween,
  formatDateShort,
  formatHours,
  todayISO,
  weekStartOf,
  weekTotalMinutes,
} from "@/lib/planner/availability";
import {
  completeTask,
  fetchAvailabilityWeeks,
  replanPlan,
  startTask,
  type CompleteTaskInput,
} from "@/lib/planner/service";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Centro de Comando — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "O que estudar hoje, quanto tempo dedicar e por quê: concurso ativo, tarefas do dia, meta semanal e progresso real.",
      },
      { property: "og:title", content: "Centro de Comando — Aprovado Fiscal" },
      {
        property: "og:description",
        content: "Painel diário de execução orientada a dados do plano de estudos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CommandCenterPage,
});

type DayTask = {
  id: string;
  title: string;
  status: TaskStatus;
  planned_minutes: number | null;
  actual_minutes: number | null;
  gross_minutes: number | null;
  activity_type: keyof typeof ACTIVITY_LABELS | null;
  priority_score: number | null;
  priority_reason: string | null;
  plan_id: string;
  position: number | null;
  scheduled_date: string | null;
  source: string | null;
};

type TaskFilter = "todas" | "pendentes" | "concluidas";

function CommandCenterPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = todayISO();
  const weekStart = weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);

  const [filter, setFilter] = useState<TaskFilter>("todas");
  const [taskToComplete, setTaskToComplete] = useState<DayTask | null>(null);
  const [completeStatus, setCompleteStatus] = useState<
    "concluida" | "parcialmente_concluida" | "cancelada"
  >("concluida");
  const [grossMinutes, setGrossMinutes] = useState(50);
  const [pauseMinutes, setPauseMinutes] = useState(0);
  const [questionsCount, setQuestionsCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [notes, setNotes] = useState("");

  const userFirstName =
    (user?.user_metadata?.["full_name"] as string | undefined)?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "Estudante";

  const currentHour = new Date().getHours();
  const greetingTime = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["command-center", today],
    queryFn: async () => {
      // Limpeza de mocks/dados legados da conta
      await cleanupLegacyMockContests();

      const [
        contestsRes,
        plansRes,
        todayTasksRes,
        overdueTasksRes,
        weekTasksRes,
        sessionsRes,
        attemptsRes,
        reviewsRes,
        errorsRes,
        weeksMapRes,
        subjectsRes,
      ] = await Promise.allSettled([
        supabase
          .from("contests")
          .select("id, name, role_title, exam_board, exam_date, status, organization")
          .order("exam_date", { ascending: true }),
        supabase
          .from("study_plans")
          .select("id, name, contest_id, start_date, end_date, is_active")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("plan_tasks")
          .select(
            "id, title, status, planned_minutes, actual_minutes, gross_minutes, activity_type, priority_score, priority_reason, plan_id, position, scheduled_date, source",
          )
          .eq("scheduled_date", today)
          .order("position", { ascending: true }),
        supabase
          .from("plan_tasks")
          .select(
            "id, title, status, planned_minutes, actual_minutes, gross_minutes, activity_type, priority_score, priority_reason, plan_id, position, scheduled_date, source",
          )
          .lt("scheduled_date", today)
          .in("status", ["pendente", "em_andamento", "reagendada"])
          .order("scheduled_date", { ascending: false }),
        supabase
          .from("plan_tasks")
          .select("id, planned_minutes, actual_minutes, status, scheduled_date")
          .gte("scheduled_date", weekStart)
          .lte("scheduled_date", weekEnd),
        supabase
          .from("study_sessions")
          .select("net_seconds, session_date, questions_count, correct_count"),
        supabase.from("question_attempts").select("is_correct"),
        supabase
          .from("review_events")
          .select("id", { count: "exact", head: true })
          .not("completed_at", "is", null),
        supabase
          .from("error_entries")
          .select("id", { count: "exact", head: true })
          .eq("is_resolved", false),
        fetchAvailabilityWeeks([weekStart]).catch(() => new Map()),
        supabase.from("subjects").select("id, name").limit(6),
      ]);

      const contestsData =
        contestsRes.status === "fulfilled" && !contestsRes.value.error
          ? (contestsRes.value.data ?? [])
          : [];
      const plansData =
        plansRes.status === "fulfilled" && !plansRes.value.error ? (plansRes.value.data ?? []) : [];
      const todayTasksData =
        todayTasksRes.status === "fulfilled" && !todayTasksRes.value.error
          ? (todayTasksRes.value.data ?? [])
          : [];
      const overdueTasksData =
        overdueTasksRes.status === "fulfilled" && !overdueTasksRes.value.error
          ? (overdueTasksRes.value.data ?? [])
          : [];
      const weekTasksData =
        weekTasksRes.status === "fulfilled" && !weekTasksRes.value.error
          ? (weekTasksRes.value.data ?? [])
          : [];
      const sessionsData =
        sessionsRes.status === "fulfilled" && !sessionsRes.value.error
          ? (sessionsRes.value.data ?? [])
          : [];
      const attemptsData =
        attemptsRes.status === "fulfilled" && !attemptsRes.value.error
          ? (attemptsRes.value.data ?? [])
          : [];
      const reviewsCount =
        reviewsRes.status === "fulfilled" && !reviewsRes.value.error
          ? (reviewsRes.value.count ?? 0)
          : 0;
      const errorsCount =
        errorsRes.status === "fulfilled" && !errorsRes.value.error
          ? (errorsRes.value.count ?? 0)
          : 0;
      const weeksMap = weeksMapRes.status === "fulfilled" ? weeksMapRes.value : new Map();
      const subjectsData =
        subjectsRes.status === "fulfilled" && !subjectsRes.value.error
          ? (subjectsRes.value.data ?? [])
          : [];

      const allSessions = sessionsData;
      const netSecondsTotal = allSessions.reduce((sum, s) => sum + (s.net_seconds ?? 0), 0);
      const netTodaySeconds = allSessions
        .filter((s) => s.session_date === today)
        .reduce((sum, s) => sum + (s.net_seconds ?? 0), 0);

      const netWeekSeconds = allSessions
        .filter((s) => s.session_date >= weekStart && s.session_date <= weekEnd)
        .reduce((sum, s) => sum + (s.net_seconds ?? 0), 0);

      const attemptRows = attemptsData;
      const attemptCorrect = attemptRows.filter((a) => a.is_correct === true).length;
      const sessionQuestions = allSessions.reduce((sum, s) => sum + (s.questions_count ?? 0), 0);
      const sessionCorrect = allSessions.reduce((sum, s) => sum + (s.correct_count ?? 0), 0);
      const questionsTotal = attemptRows.length + sessionQuestions;
      const correctTotal = attemptCorrect + sessionCorrect;

      const contestList = contestsData;
      const activeContest = contestList.find((c) => c.status === "ativo") ?? contestList[0] ?? null;
      const activePlan =
        plansData.find((p) => p.contest_id === activeContest?.id) ?? plansData[0] ?? null;

      const todayTasks = todayTasksData as DayTask[];
      const overdueTasks = overdueTasksData as DayTask[];
      const weekTasks = weekTasksData;

      const currentWeekAvail = weeksMap.get(weekStart);
      const weeklyAvailableMinutes = currentWeekAvail ? weekTotalMinutes(currentWeekAvail) : 0;
      const weeklyPlannedMinutes = weekTasks.reduce((sum, t) => sum + (t.planned_minutes ?? 0), 0);
      const weeklyRealizedMinutes = Math.round(netWeekSeconds / 60);

      const completedTasksToday = todayTasks.filter(
        (t) => t.status === "concluida" || t.status === "parcialmente_concluida",
      ).length;

      return {
        activeContest,
        allContests: contestList,
        activePlan,
        hasPlan: Boolean(plansData.length),
        todayTasks,
        overdueTasks,
        completedTasksToday,
        plannedMinutesToday: todayTasks.reduce((sum, t) => sum + (t.planned_minutes ?? 0), 0),
        realizedMinutesToday: Math.round(netTodaySeconds / 60),
        availableMinutesToday: availableMinutesOn(today, weeksMap),
        weeklyAvailableMinutes,
        weeklyPlannedMinutes,
        weeklyRealizedMinutes,
        netHoursTotal: netSecondsTotal / 3600,
        questionsTotal,
        accuracy: questionsTotal ? (correctTotal / questionsTotal) * 100 : null,
        reviewsCompleted: reviewsCount,
        unresolvedErrors: errorsCount,
        subjects: subjectsData,
      };
    },
  });

  const startTaskMutation = useMutation({
    mutationFn: (id: string) => startTask(id),
    onSuccess: () => {
      toast.success("Tarefa iniciada!");
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const replanMutation = useMutation({
    mutationFn: (planId: string) => replanPlan(planId),
    onSuccess: (result) => {
      toast.success(
        `Replanejamento concluído: ${result.moved} tarefa(s) redistribuída(s) na disponibilidade futura.`,
      );
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const completeTaskMutation = useMutation({
    mutationFn: (input: CompleteTaskInput) => completeTask(input),
    onSuccess: () => {
      toast.success("Execução registrada e sessão contabilizada com sucesso!");
      setTaskToComplete(null);
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleOpenComplete = (task: DayTask) => {
    setTaskToComplete(task);
    setCompleteStatus("concluida");
    setGrossMinutes(task.planned_minutes ?? 50);
    setPauseMinutes(0);
    setQuestionsCount(0);
    setCorrectCount(0);
    setNotes("");
  };

  const handleSaveComplete = () => {
    if (!taskToComplete) return;
    const completePayload: any = {
      taskId: taskToComplete.id,
      status: completeStatus,
      grossMinutes: Number(grossMinutes) || 0,
      pauseMinutes: Number(pauseMinutes) || 0,
      questionsCount: Number(questionsCount) || 0,
      correctCount: Number(correctCount) || 0,
      wrongCount: Math.max(0, (Number(questionsCount) || 0) - (Number(correctCount) || 0)),
    };
    if (notes.trim()) completePayload.notes = notes.trim();

    completeTaskMutation.mutate(completePayload);
  };

  if (isLoading) {
    return (
      <AppShell title="Início">
        <div className="flex min-h-[400px] items-center justify-center">
          <p className="text-sm font-semibold text-muted-foreground animate-pulse">
            Carregando plano de preparação…
          </p>
        </div>
      </AppShell>
    );
  }

  if (isError || !data) {
    return (
      <AppShell title="Início">
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-3 p-8">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-sm font-medium text-foreground">
            Não foi possível carregar os dados operacionais no momento.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      </AppShell>
    );
  }

  const daysToExam = data.activeContest?.exam_date
    ? daysBetween(today, data.activeContest.exam_date)
    : null;

  const weeklyTargetMinutes =
    data.weeklyPlannedMinutes > 0 ? data.weeklyPlannedMinutes : data.weeklyAvailableMinutes;
  const weeklyProgressPercent = weeklyTargetMinutes
    ? Math.min(100, Math.round((data.weeklyRealizedMinutes / weeklyTargetMinutes) * 100))
    : 0;

  return (
    <AppShell title="">
      <div className="space-y-8 -mt-4 sm:-mt-6">
        {/* ── 1. REGION 1: MISSÃO DE ESTUDO (HERO DOMINANTE: O QUE FAZER AGORA?) ── */}
        <section className="space-y-4" aria-label="Missão de Estudo Hero">
          {/* Top Context Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-card border border-border/80 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-foreground font-display tracking-tight">
                  {greetingTime}, {userFirstName}.
                </h1>
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-bold text-xs px-3 py-1 rounded-full"
                >
                  Ciclo Ativo
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-semibold">
                Vamos avançar mais um passo na sua aprovação fiscal.
              </p>
            </div>
          </div>

          {/* Alerta de Pendências Atrasadas / Replanejamento */}
          {data.overdueTasks.length > 0 && data.activePlan ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="text-sm font-bold">
                    {data.overdueTasks.length} tarefa(s) pendente(s) de dias anteriores
                  </p>
                  <p className="text-xs font-medium opacity-90">
                    O planejamento adaptativo redistribui os blocos pendentes na sua disponibilidade
                    futura sem sobrecarregar seu dia.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/40 text-amber-900 dark:text-amber-100 hover:bg-amber-500/20 rounded-xl font-bold text-xs"
                disabled={replanMutation.isPending}
                onClick={() => replanMutation.mutate(data.activePlan!.id)}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                {replanMutation.isPending ? "Replanejando…" : "Replanejar pendências"}
              </Button>
            </div>
          ) : null}

          {/* HERO DECISÓRIO PRINCIPAL */}
          <WhatToStudyNowCard
            activePlanId={data.activePlan?.id || null}
            contestId={data.activeContest?.id || null}
            onStartTask={(taskId) => startTaskMutation.mutate(taskId)}
          />
        </section>

        {/* ── 2. REGION 2: JORNADA DE HOJE (TRILHA VISUAL DE APRENDIZAGEM) ───────── */}
        <section aria-label="Trilha de Aprendizagem">
          <GurujaCycleTasks
            tasks={data.todayTasks}
            onOpenComplete={(task) => handleOpenComplete(task as unknown as DayTask)}
            onStartTask={(taskId) => startTaskMutation.mutate(taskId)}
            completedCount={data.completedTasksToday}
            totalCount={data.todayTasks.length}
            realizedMinutes={data.realizedMinutesToday}
            plannedMinutes={data.plannedMinutesToday}
          />
        </section>

        {/* ── 3. REGION 3: EVOLUÇÃO & COACH (MENTORIA E CONSISTÊNCIA INTEGRADA) ─── */}
        <section className="space-y-6" aria-label="Evolução e Mentoria">
          <TooltipProvider>
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              {/* Mentoria Proativa do Coach (7 colunas) */}
              <div className="lg:col-span-7">
                <CoachGuidanceCard />
              </div>

              {/* Progresso Semanal e Métricas (5 colunas) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Meta Semanal Progress Banner */}
                <div className="p-5 sm:p-6 space-y-4 rounded-3xl bg-card border border-border/80 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black text-foreground uppercase tracking-wider font-mono">
                        Progresso Semanal ({formatDateShort(weekStart)} a Dom)
                      </h3>
                      <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                        Horas líquidas executadas x meta planejada
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs font-mono font-bold border-primary/30 text-primary px-3 py-1 rounded-xl"
                    >
                      {weeklyProgressPercent}% Concluído
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-foreground">
                        {formatHours(data.weeklyRealizedMinutes)} líquidas
                      </span>
                      <span className="text-muted-foreground font-mono">
                        Meta: {formatHours(weeklyTargetMinutes)}
                      </span>
                    </div>
                    <Progress value={weeklyProgressPercent} className="h-3 rounded-full" />
                  </div>
                </div>

                {/* Grid com Indicadores Acumulados */}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {[
                    {
                      label: "Horas totais",
                      value: data.netHoursTotal ? `${data.netHoursTotal.toFixed(1)}h` : "0h",
                      tooltipTitle: "Horas Líquidas Totais",
                      tooltipText: "Soma do tempo líquido de estudo acumulado.",
                    },
                    {
                      label: "Questões resolvidas",
                      value: String(data.questionsTotal),
                      tooltipTitle: "Questões Resolvidas",
                      tooltipText: `Total de ${data.questionsTotal} questões respondidas.`,
                    },
                    {
                      label: "Taxa de acerto",
                      value: data.accuracy === null ? "—" : `${data.accuracy.toFixed(0)}%`,
                      tooltipTitle: "Taxa Global de Acerto",
                      tooltipText:
                        data.accuracy === null
                          ? "Sem dados gravados."
                          : `${data.accuracy.toFixed(1)}% de acerto nas questões.`,
                    },
                    {
                      label: "Erros pendentes",
                      value: String(data.unresolvedErrors),
                      tooltipTitle: "Central de Erros",
                      tooltipText: `${data.unresolvedErrors} questões a sanar.`,
                    },
                  ].map((metric) => (
                    <Tooltip key={metric.label}>
                      <TooltipTrigger asChild>
                        <div className="px-4 py-3 cursor-help hover:border-primary/40 transition-all rounded-2xl bg-card border border-border/80 shadow-2xs">
                          <p className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
                            <span>{metric.label}</span>
                            <HelpCircle className="h-3 w-3 text-muted-foreground/60" />
                          </p>
                          <p className="mt-1 font-display text-lg font-black text-foreground">
                            {metric.value}
                          </p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-popover border-border text-popover-foreground text-xs max-w-xs p-2.5">
                        <p className="font-semibold text-primary mb-1">{metric.tooltipTitle}</p>
                        <p>{metric.tooltipText}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </div>
          </TooltipProvider>
        </section>

        {/* ── 4. REGION 4: SEU MOMENTO (CONCURSO ALVO E EDITAL) ─────────────────── */}
        <section aria-label="Seu Momento e Edital">
          <TooltipProvider>
            <div className="grid gap-6 lg:grid-cols-2 items-start">
              {/* Concurso Alvo Ativo */}
              <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider font-mono">
                    Seu Momento · Concurso Alvo
                  </p>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl"
                  >
                    <Link to="/concursos">Gerenciar →</Link>
                  </Button>
                </div>

                {!data.activeContest ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground font-semibold">
                      Nenhum concurso fiscal selecionado como alvo ativo.
                    </p>
                    <Button
                      asChild
                      size="sm"
                      variant="default"
                      className="text-xs font-bold rounded-xl"
                    >
                      <Link to="/concursos">
                        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                        Importar Edital Fiscal
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-foreground">
                        {data.activeContest.name}
                      </h2>
                      {data.activeContest.role_title ? (
                        <span className="text-xs font-bold text-primary">
                          ({data.activeContest.role_title})
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {data.activeContest.exam_board ? (
                        <Badge
                          variant="outline"
                          className="border-border text-xs font-bold rounded-lg"
                        >
                          Banca: {data.activeContest.exam_board}
                        </Badge>
                      ) : null}

                      {data.activeContest.organization ? (
                        <Badge variant="secondary" className="text-xs font-bold rounded-lg">
                          {data.activeContest.organization}
                        </Badge>
                      ) : null}

                      {data.activeContest.exam_date ? (
                        <Badge
                          variant={
                            daysToExam !== null && daysToExam > 0 && daysToExam <= 45
                              ? "destructive"
                              : "default"
                          }
                          className="font-mono text-xs font-bold rounded-lg"
                        >
                          Prova em {data.activeContest.exam_date}
                          {daysToExam !== null
                            ? daysToExam > 0
                              ? ` · ${daysToExam}d`
                              : daysToExam === 0
                                ? " · Prova HOJE!"
                                : " · Prova realizada"
                            : ""}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground font-semibold">
                          Data da prova a definir
                        </span>
                      )}
                    </div>

                    {data.activePlan ? (
                      <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground font-semibold">
                        <span>
                          Plano:{" "}
                          <strong className="text-foreground font-bold">
                            {data.activePlan.name}
                          </strong>
                        </span>
                        <Link
                          to="/plano/$planId"
                          params={{ planId: data.activePlan.id }}
                          className="inline-flex items-center text-primary font-bold hover:underline"
                        >
                          Ver cronograma
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Disciplinas do Edital */}
              {data.subjects && data.subjects.length > 0 ? (
                <div className="p-6 rounded-3xl bg-card border border-border/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider font-mono">
                      Matérias no Edital Ativo
                    </p>
                    <Link to="/materias" className="text-xs font-bold text-primary hover:underline">
                      Árvore completa →
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {data.subjects.slice(0, 6).map((subj: any) => (
                      <div
                        key={subj.id}
                        className="p-3 rounded-2xl bg-background border border-border/60 text-xs shadow-2xs"
                      >
                        <span className="font-bold text-foreground truncate block">
                          {subj.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono font-semibold">
                          Edital Ativo
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </TooltipProvider>
        </section>

        {!data.activeContest && !data.hasPlan ? (
          <div className="pt-4">
            <OnboardingWizard onComplete={() => refetch()} />
          </div>
        ) : null}
      </div>

      {/* ── MODAL: REGISTRO RÁPIDO DE CONCLUSÃO DE TAREFA ────────────────────── */}
      <Dialog
        open={Boolean(taskToComplete)}
        onOpenChange={(open) => !open && setTaskToComplete(null)}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Registrar Execução</DialogTitle>
            <DialogDescription>
              {taskToComplete?.title} — Informe o tempo e questões para contabilizar na sessão de
              estudos real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Status da execução</Label>
              <Select
                value={completeStatus}
                onValueChange={(val) =>
                  setCompleteStatus(val as "concluida" | "parcialmente_concluida" | "cancelada")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="parcialmente_concluida">Parcialmente concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tempo Bruto (minutos)</Label>
                <Input
                  type="number"
                  min={0}
                  value={grossMinutes}
                  onChange={(e) => setGrossMinutes(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Pausas (minutos)</Label>
                <Input
                  type="number"
                  min={0}
                  value={pauseMinutes}
                  onChange={(e) => setPauseMinutes(Number(e.target.value))}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Tempo líquido resultante:{" "}
              <strong className="text-foreground">
                {Math.max(0, (grossMinutes || 0) - (pauseMinutes || 0))} min
              </strong>
            </p>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div className="space-y-1.5">
                <Label>Questões Feitas</Label>
                <Input
                  type="number"
                  min={0}
                  value={questionsCount}
                  onChange={(e) => setQuestionsCount(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Acertos</Label>
                <Input
                  type="number"
                  min={0}
                  value={correctCount}
                  onChange={(e) => setCorrectCount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Anotações (opcional)</Label>
              <Input
                placeholder="Ex: Tópico difícil, revisar pegadinhas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setTaskToComplete(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveComplete} disabled={completeTaskMutation.isPending}>
              {completeTaskMutation.isPending ? "Salvando…" : "Salvar execução"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
