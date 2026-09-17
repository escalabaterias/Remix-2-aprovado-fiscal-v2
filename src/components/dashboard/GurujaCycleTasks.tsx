import { useState } from "react";
import {
  BookOpen,
  Target,
  RotateCcw,
  Compass,
  CheckCircle2,
  Clock,
  Play,
  HelpCircle,
  Brain,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ACTIVITY_LABELS, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/domain";
import { estimateQuestionBattery, getMinutesPerQuestion } from "@/lib/questions/timeEstimation";

export interface DayTask {
  id: string;
  title: string;
  subject_name?: string | null;
  topic_name?: string | null;
  activity?: string | null;
  activity_type?: string | null;
  planned_minutes?: number | null;
  actual_minutes?: number | null;
  status: TaskStatus;
  priority_reason?: string | null;
  questions_count?: number | null;
}

interface GurujaCycleTasksProps {
  tasks: DayTask[];
  onOpenComplete: (task: DayTask) => void;
  onStartTask?: (taskId: string) => void;
  completedCount: number;
  totalCount: number;
  realizedMinutes: number;
  plannedMinutes: number;
}

export type CycleCategory = "mapeamento" | "teoria" | "questoes" | "revisao";

export function categorizeTask(task: DayTask): CycleCategory {
  const act = (task.activity_type || task.activity || "").toLowerCase();
  if (
    act.includes("mapeamento") ||
    act.includes("estudo_dirigido") ||
    act.includes("diagnostico")
  ) {
    return "mapeamento";
  }
  if (act.includes("questoes") || act.includes("simulado") || act.includes("exercicios")) {
    return "questoes";
  }
  if (
    act.includes("revisao") ||
    act.includes("flashcards") ||
    act.includes("socratico") ||
    act.includes("discursiva")
  ) {
    return "revisao";
  }
  return "teoria"; // Default for teoria / leitura
}

export const CYCLE_CATEGORY_INFO: Record<
  CycleCategory,
  { label: string; icon: any; colorClass: string; bgLight: string; description: string }
> = {
  mapeamento: {
    label: "Mapeamento & Diagnóstico",
    icon: Compass,
    colorClass: "text-amber-600 dark:text-amber-400 border-amber-500/30",
    bgLight: "bg-amber-500/10",
    description: "Análise de edital, mapa de lacunas e nivelamento pedagógico.",
  },
  teoria: {
    label: "Teoria & Legislação",
    icon: BookOpen,
    colorClass: "text-blue-600 dark:text-blue-400 border-blue-500/30",
    bgLight: "bg-blue-500/10",
    description: "Estudo teórico, PDFs, Vade Mecum, jurisprudência e doutrina.",
  },
  questoes: {
    label: "Baterias de Testes",
    icon: Target,
    colorClass: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    bgLight: "bg-emerald-500/10",
    description: "Resolução de baterias com estimativa por tipo de matéria (2 vs 3 min/qst).",
  },
  revisao: {
    label: "Revisão Ativa",
    icon: RotateCcw,
    colorClass: "text-purple-600 dark:text-purple-400 border-purple-500/30",
    bgLight: "bg-purple-500/10",
    description: "Repetição espaçada, método socrático e resolução de erros.",
  },
};

export function GurujaCycleTasks({
  tasks,
  onOpenComplete,
  onStartTask,
  completedCount,
  totalCount,
  realizedMinutes,
  plannedMinutes,
}: GurujaCycleTasksProps) {
  const [selectedStep, setSelectedStep] = useState<"todas" | CycleCategory>("todas");

  // Agrupamento por ciclo
  const categorizedTasks = {
    mapeamento: tasks.filter((t) => categorizeTask(t) === "mapeamento"),
    teoria: tasks.filter((t) => categorizeTask(t) === "teoria"),
    questoes: tasks.filter((t) => categorizeTask(t) === "questoes"),
    revisao: tasks.filter((t) => categorizeTask(t) === "revisao"),
  };

  const stepsList: { key: CycleCategory; name: string; numberStr: string }[] = [
    { key: "mapeamento", name: "MAPEAR", numberStr: "①" },
    { key: "teoria", name: "ESTUDAR", numberStr: "②" },
    { key: "questoes", name: "QUESTÕES", numberStr: "③" },
    { key: "revisao", name: "REVISAR", numberStr: "④" },
  ];

  // Identificar qual etapa é o "Foco Atual" (primeira etapa com tarefa pendente/em andamento)
  const currentActiveStepKey =
    stepsList.find((step) =>
      categorizedTasks[step.key].some(
        (t) => t.status === "pendente" || t.status === "em_andamento",
      ),
    )?.key || null;

  const displayTasks =
    selectedStep === "todas" ? tasks : tasks.filter((t) => categorizeTask(t) === selectedStep);

  const completionPercent =
    plannedMinutes > 0 ? Math.min(100, Math.round((realizedMinutes / plannedMinutes) * 100)) : 0;

  return (
    <TooltipProvider>
      <section className="space-y-6 rounded-3xl bg-card border border-border/80 p-6 sm:p-7 shadow-sm">
        {/* Header da Jornada */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-display text-lg sm:text-xl font-black text-foreground tracking-tight">
                Jornada de Estudo de Hoje
              </h3>
              <Badge
                variant="outline"
                className="text-xs border-primary/30 text-primary font-bold px-2.5 py-0.5 rounded-xl"
              >
                Trilha do Dia
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
              Sua esteira de execução: Mapear → Estudar → Questões → Revisar
            </p>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold shadow-2xs">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <span className="font-mono">
                  {Math.round(realizedMinutes / 60)}h
                  {realizedMinutes % 60 > 0 ? `${realizedMinutes % 60}m` : ""} /{" "}
                  {Math.round(plannedMinutes / 60)}h
                  {plannedMinutes % 60 > 0 ? `${plannedMinutes % 60}m` : ""}
                </span>
                <Badge variant="secondary" className="text-[10px] font-mono px-2 py-0.5 font-bold">
                  {completionPercent}%
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="bottom"
              className="bg-popover border-border text-popover-foreground text-xs max-w-xs p-3"
            >
              <p className="font-semibold text-primary mb-1">Tempo Líquido Contabilizado:</p>
              <p>• Realizado: {realizedMinutes} minutos líquidos.</p>
              <p>• Planejado: {plannedMinutes} minutos alocados.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* TRILHA CONTINUA VISUAL (STEPPER / TIMELINE) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-muted-foreground font-mono">
              Sequência da Trilha Pedagógica
            </span>
            {selectedStep !== "todas" ? (
              <button
                type="button"
                onClick={() => setSelectedStep("todas")}
                className="text-xs text-primary font-bold hover:underline"
              >
                Ver todas as etapas ({tasks.length})
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
            {stepsList.map((step, idx) => {
              const catKey = step.key;
              const catInfo = CYCLE_CATEGORY_INFO[catKey];
              const StepIcon = catInfo.icon;
              const stepTasks = categorizedTasks[catKey];
              const totalInStep = stepTasks.length;
              const completedInStep = stepTasks.filter(
                (t) => t.status === "concluida" || t.status === "parcialmente_concluida",
              ).length;

              const isCompleted = totalInStep > 0 && completedInStep === totalInStep;
              const isCurrent = currentActiveStepKey === catKey;
              const isSelected = selectedStep === catKey;

              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedStep(selectedStep === catKey ? "todas" : catKey)}
                  className={cn(
                    "relative flex items-center justify-between p-4 rounded-2xl border text-left transition-all",
                    isCurrent
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                      : isCompleted
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : isSelected
                          ? "border-primary bg-card"
                          : "border-border/60 bg-background hover:bg-accent/40",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold font-mono text-xs",
                        isCompleted
                          ? "bg-emerald-500 text-white"
                          : isCurrent
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isCompleted ? "✓" : step.numberStr}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs tracking-tight text-foreground truncate">
                          {step.name}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-muted-foreground truncate">
                        {isCompleted
                          ? "Concluído"
                          : isCurrent
                            ? "Foco Atual"
                            : totalInStep === 0
                              ? "Sem tarefas"
                              : `${completedInStep}/${totalInStep} concluídas`}
                      </p>
                    </div>
                  </div>

                  <Badge
                    variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
                    className="text-[10px] font-mono shrink-0 ml-2"
                  >
                    {totalInStep}
                  </Badge>
                </button>
              );
            })}
          </div>
        </div>

        {/* LISTA DE TAREFAS NA TRILHA */}
        {displayTasks.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-border rounded-2xl bg-muted/20">
            <Brain className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm font-bold text-foreground">Nenhuma tarefa pendente nesta etapa</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {selectedStep !== "todas"
                ? `Não há tarefas alocadas para ${CYCLE_CATEGORY_INFO[selectedStep].label.toLowerCase()} hoje.`
                : "Sua jornada de estudo de hoje está 100% concluída!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayTasks.map((task) => {
              const catKey = categorizeTask(task);
              const catInfo = CYCLE_CATEGORY_INFO[catKey];
              const CatIcon = catInfo.icon;
              const plannedMins = task.planned_minutes ?? 50;

              const isQuestionsTask = catKey === "questoes";
              const batteryEst = isQuestionsTask
                ? estimateQuestionBattery(
                    task.questions_count ??
                      Math.floor(plannedMins / getMinutesPerQuestion(task.title)),
                    task.title,
                  )
                : null;

              return (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 transition-colors text-sm"
                >
                  <div className="min-w-0 max-w-xl space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CatIcon className={`h-4 w-4 shrink-0 ${catInfo.colorClass}`} />
                      <span className="font-bold text-foreground tracking-tight">{task.title}</span>

                      <Badge
                        variant="outline"
                        className={`text-[10px] py-0.5 px-2 rounded-lg font-semibold ${catInfo.colorClass} ${catInfo.bgLight}`}
                      >
                        {task.activity_type
                          ? (ACTIVITY_LABELS[task.activity_type as keyof typeof ACTIVITY_LABELS] ??
                            task.activity_type)
                          : catInfo.label}
                      </Badge>

                      {batteryEst && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-help rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                              <Target className="h-3 w-3" />
                              {batteryEst.questionsCount} qst ({batteryEst.rateMinutesPerQuestion}{" "}
                              min/qst)
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-popover border-border text-popover-foreground text-xs max-w-xs p-2.5">
                            <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                              Estimativa de Bateria:
                            </p>
                            <p>{batteryEst.explanationTooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {task.priority_reason ? (
                      <p className="text-xs text-muted-foreground truncate pl-6">
                        {task.priority_reason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted-foreground font-mono font-bold bg-muted/60 px-2.5 py-1 rounded-lg">
                      {task.actual_minutes !== null && task.actual_minutes !== undefined
                        ? `${task.actual_minutes}min / ${plannedMins}min`
                        : `${plannedMins}min`}
                    </span>

                    <Badge
                      variant={
                        task.status === "concluida"
                          ? "default"
                          : task.status === "em_andamento"
                            ? "secondary"
                            : "outline"
                      }
                      className="rounded-lg text-xs font-bold"
                    >
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>

                    {task.status !== "concluida" && (
                      <div className="flex items-center gap-1.5">
                        {task.status === "pendente" && onStartTask && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2.5 text-xs font-bold rounded-xl"
                            onClick={() => onStartTask(task.id)}
                          >
                            <Play className="mr-1 h-3 w-3 fill-current" />
                            Iniciar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          className="h-8 px-3 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => onOpenComplete(task)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Concluir
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </TooltipProvider>
  );
}
