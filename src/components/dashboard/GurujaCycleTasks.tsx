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
  const [activeTab, setActiveTab] = useState<"todas" | CycleCategory>("todas");
  const [statusFilter, setStatusFilter] = useState<"todas" | "pendentes" | "concluidas">("todas");

  // Agrupamento por ciclo
  const categorizedTasks = {
    mapeamento: tasks.filter((t) => categorizeTask(t) === "mapeamento"),
    teoria: tasks.filter((t) => categorizeTask(t) === "teoria"),
    questoes: tasks.filter((t) => categorizeTask(t) === "questoes"),
    revisao: tasks.filter((t) => categorizeTask(t) === "revisao"),
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeTab !== "todas" && categorizeTask(task) !== activeTab) return false;
    if (statusFilter === "pendentes")
      return task.status === "pendente" || task.status === "em_andamento";
    if (statusFilter === "concluidas")
      return task.status === "concluida" || task.status === "parcialmente_concluida";
    return true;
  });

  const completionPercent =
    plannedMinutes > 0 ? Math.min(100, Math.round((realizedMinutes / plannedMinutes) * 100)) : 0;

  return (
    <TooltipProvider>
      <section className="panel p-5 space-y-4">
        {/* Cabeçalho do Bloco Guruja */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-bold text-foreground">
                Ciclo Cognitivo de Estudo
              </h3>
              <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                Estilo Guruja Executivo
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Metas do dia segregadas por etapa de aprendizagem: Mapeamento, Teoria, Testes e
              Revisão.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>
                    {Math.round(realizedMinutes / 60)}h
                    {realizedMinutes % 60 > 0 ? `${realizedMinutes % 60}m` : ""} /{" "}
                    {Math.round(plannedMinutes / 60)}h
                    {plannedMinutes % 60 > 0 ? `${plannedMinutes % 60}m` : ""}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {completionPercent}%
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="bg-popover border-border text-popover-foreground text-xs max-w-xs p-3"
              >
                <p className="font-semibold text-primary mb-1">
                  Memória de Cálculo do Tempo Líquido:
                </p>
                <p>
                  • Horas Realizadas: {realizedMinutes} minutos líquidos contabilizados em sessões
                  ativas.
                </p>
                <p>
                  • Horas Planejadas: {plannedMinutes} minutos alocados pelo planejador para o dia.
                </p>
                <p>
                  • Porcentagem = ({realizedMinutes} / {plannedMinutes}) × 100 = {completionPercent}
                  %.
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Filtro de Status */}
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5 text-xs bg-background">
              {(["todas", "pendentes", "concluidas"] as const).map((sf) => (
                <button
                  key={sf}
                  type="button"
                  onClick={() => setStatusFilter(sf)}
                  className={`rounded px-2.5 py-1 font-medium transition-colors ${
                    statusFilter === sf
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {sf === "todas" ? "Todas" : sf === "pendentes" ? "Pendentes" : "Concluídas"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Abas por Categoria do Ciclo Cognitivo (Estilo Guruja) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("todas")}
            className={`flex items-center justify-between rounded-lg border p-2.5 text-xs font-medium transition-all ${
              activeTab === "todas"
                ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Todas as Metas</span>
            </div>
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {tasks.length}
            </Badge>
          </button>

          {(Object.keys(CYCLE_CATEGORY_INFO) as CycleCategory[]).map((catKey) => {
            const cat = CYCLE_CATEGORY_INFO[catKey];
            const Icon = cat.icon;
            const count = categorizedTasks[catKey].length;
            const isSelected = activeTab === catKey;

            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setActiveTab(catKey)}
                className={`flex items-center justify-between rounded-lg border p-2.5 text-xs transition-all ${
                  isSelected
                    ? `${cat.colorClass} ${cat.bgLight} font-semibold shadow-xs`
                    : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{cat.label.split(" ")[0]}</span>
                </div>
                <Badge
                  variant={count > 0 ? "default" : "outline"}
                  className="text-[10px] px-1.5 shrink-0"
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Lista de Tarefas Filtrada */}
        {filteredTasks.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-border rounded-lg bg-muted/20">
            <Brain className="h-8 w-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">
              Nenhuma meta nesta etapa do ciclo hoje
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {activeTab !== "todas"
                ? `Você não possui tarefas alocadas para ${CYCLE_CATEGORY_INFO[activeTab].label.toLowerCase()} nesta data.`
                : "Seu cronograma de hoje está sem pendências ativas."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filteredTasks.map((task) => {
              const catKey = categorizeTask(task);
              const catInfo = CYCLE_CATEGORY_INFO[catKey];
              const CatIcon = catInfo.icon;
              const plannedMins = task.planned_minutes ?? 50;

              // Para tarefas do tipo Questões/Testes, calculamos a estimativa de bateria
              const isQuestionsTask = catKey === "questoes";
              const batteryEst = isQuestionsTask
                ? estimateQuestionBattery(
                    task.questions_count ??
                      Math.floor(plannedMins / getMinutesPerQuestion(task.title)),
                    task.title,
                  )
                : null;

              return (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5 text-sm first:pt-1 last:pb-1 hover:bg-accent/30 rounded-md px-2 transition-colors"
                >
                  <div className="min-w-0 max-w-xl space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CatIcon className={`h-4 w-4 shrink-0 ${catInfo.colorClass}`} />
                      <span className="font-semibold text-foreground tracking-tight">
                        {task.title}
                      </span>

                      <Badge
                        variant="outline"
                        className={`text-[10px] ${catInfo.colorClass} ${catInfo.bgLight}`}
                      >
                        {task.activity_type
                          ? (ACTIVITY_LABELS[task.activity_type as keyof typeof ACTIVITY_LABELS] ??
                            task.activity_type)
                          : catInfo.label}
                      </Badge>

                      {/* Badge de Estimativa de Bateria para Questões */}
                      {batteryEst && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-help rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                              <Target className="h-3 w-3" />
                              {batteryEst.questionsCount} qst ({batteryEst.rateMinutesPerQuestion}{" "}
                              min/qst)
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="bg-popover border-border text-popover-foreground text-xs max-w-xs p-2.5">
                            <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                              Motor de Estimativa de Baterias:
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

                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground tabular-nums font-mono cursor-help bg-muted/50 px-2 py-1 rounded">
                          {task.actual_minutes !== null && task.actual_minutes !== undefined
                            ? `${task.actual_minutes}min de ${plannedMins}min`
                            : `${plannedMins}min`}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="bg-popover border-border text-popover-foreground text-xs p-2">
                        Tempo de estudo planejado vs líquido realizado neste bloco.
                      </TooltipContent>
                    </Tooltip>

                    <Badge
                      variant={
                        task.status === "concluida"
                          ? "default"
                          : task.status === "em_andamento"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {TASK_STATUS_LABELS[task.status]}
                    </Badge>

                    {task.status !== "concluida" && (
                      <div className="flex items-center gap-1">
                        {task.status === "pendente" && onStartTask && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => onStartTask(task.id)}
                          >
                            <Play className="mr-1 h-3 w-3 fill-current" />
                            Iniciar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 px-2.5 text-xs"
                          onClick={() => onOpenComplete(task)}
                        >
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Concluir
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </TooltipProvider>
  );
}
