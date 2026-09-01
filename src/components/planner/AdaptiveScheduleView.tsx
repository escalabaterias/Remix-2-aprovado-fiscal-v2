import React, { useState, useEffect, useCallback } from "react";
import { StudyTask, ScheduleConfig } from "@/lib/planner/types";
import {
  generateAdaptiveSchedule,
  getLocalTasks,
  toggleTaskCompleted,
  saveLocalTasks,
  clearLocalTasks,
} from "@/lib/planner/adaptiveScheduler";
import { getLocalAttempts, FISCAL_QUESTIONS } from "@/lib/questions/errorTracker";
import { generatePerformanceReport } from "@/lib/analytics/performanceEngine";
import { GapDiagnostic } from "@/lib/analytics/types";
import {
  Calendar,
  CheckCircle,
  Circle,
  Flame,
  Sliders,
  RotateCw,
  BookOpen,
  HelpCircle,
  Brain,
  Settings,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const TYPE_BADGES = {
  theory: {
    label: "Teoria",
    bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: BookOpen,
  },
  revision: {
    label: "Revisão",
    bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: Brain,
  },
  questions: {
    label: "Exercícios",
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: HelpCircle,
  },
};

const PRIORITY_BADGES = {
  high: { label: "Urgente", bg: "bg-red-500/10 text-red-400 border-red-500/20" },
  medium: { label: "Importante", bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  low: { label: "Manutenção", bg: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

export const AdaptiveScheduleView: React.FC = () => {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [datesList, setDatesList] = useState<string[]>([]);
  const [config, setConfig] = useState<ScheduleConfig>({
    dailyHoursAvailable: 4,
    targetExamBoard: "FGV",
    subjectWeights: {
      "DIR-TRIB": 3,
      "DIR-CONST": 2,
    },
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [gapsCount, setGapsCount] = useState(0);

  // Helper para formatar datas para exibição legível (ex: "Seg, 01/09")
  const formatFriendlyDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
      const daysOfWeek = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      return `${daysOfWeek[d.getDay()]}, ${parts[2]}/${parts[1]}`;
    } catch {
      return dateStr;
    }
  };

  const loadPlanner = useCallback(() => {
    // 1. Obter tentativas de questões do localStorage
    const attempts = getLocalAttempts();
    let gapDiagnostics: GapDiagnostic[] = [];

    // Fallback didático se o estudante estiver zerado ("Show the working application instantly")
    if (attempts.length === 0) {
      gapDiagnostics = [
        {
          id: "GAP-DIR-TRIB-LIMIT",
          subjectId: "DIR-TRIB",
          subjectName: "Direito Tributário",
          topicId: "LIMIT",
          topicName: "Limitações Constitucionais ao Poder de Tributar",
          accuracy: 0.45,
          averageTimeSeconds: 145,
          primaryErrorCategory: "interpretacao",
          severity: "high",
          recommendation:
            "Estude o Art. 150 da CF/88. Preste atenção especial na diferença entre decretos e leis estritas na redução de bases de cálculo.",
          suggestedLawTags: ["CF/88 - Art. 150"],
        },
      ];
    } else {
      const report = generatePerformanceReport(attempts, FISCAL_QUESTIONS);
      gapDiagnostics = report.gapDiagnostics;
    }

    setGapsCount(gapDiagnostics.length);

    // 2. Gerar ou mesclar cronograma
    const generated = generateAdaptiveSchedule(gapDiagnostics, config);
    setTasks(generated);

    // Extrair as próximas 7 datas únicas e ordenar cronologicamente
    const uniqueDates = Array.from(new Set(generated.map((t) => t.scheduledDate))).sort();
    setDatesList(uniqueDates);

    // Selecionar por padrão a primeira data do cronograma (hoje)
    if (uniqueDates.length > 0 && !selectedDate) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [config, selectedDate]);

  useEffect(() => {
    loadPlanner();
  }, [loadPlanner]);

  const handleToggleTask = (taskId: string) => {
    const updated = toggleTaskCompleted(taskId);
    setTasks(updated);
  };

  const handleRegenerate = () => {
    clearLocalTasks();
    // Limpar data selecionada para que reavalie do zero
    setSelectedDate("");
    loadPlanner();
  };

  const handleSaveConfig = () => {
    setIsConfigOpen(false);
    handleRegenerate();
  };

  // Filtrar tarefas para o dia selecionado
  const dailyTasks = tasks.filter((t) => t.scheduledDate === selectedDate);
  const completedCount = dailyTasks.filter((t) => t.completed).length;
  const progressPercent = dailyTasks.length > 0 ? (completedCount / dailyTasks.length) * 100 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" id="adaptive-planner-panel">
      {/* Cabeçalho do Cronograma */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5 bg-card/40 p-4 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-[#ff79c6]/10 text-[#ff79c6]">
              <Calendar className="h-4 w-4" />
            </span>
            <h2 className="text-xl font-black text-foreground tracking-tight">
              Cronograma Adaptativo & Revisão Espaçada
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Sua agenda de estudos dinâmica. Algoritmos matemáticos alocam revisões ativas com base
            nas suas lacunas de rendimento.
          </p>
        </div>

        <div className="flex gap-2">
          {gapsCount > 0 && (
            <Badge
              variant="outline"
              className="bg-red-500/[0.04] text-red-400 border-red-500/15 text-[10px] uppercase font-bold py-1"
            >
              {gapsCount} Lacuna{gapsCount > 1 ? "s" : ""} Crítica{gapsCount > 1 ? "s" : ""} Ativa
              {gapsCount > 1 ? "s" : ""}
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="text-xs font-semibold h-8 cursor-pointer border-border hover:bg-muted"
            id="planner-settings-btn"
          >
            <Sliders className="h-3.5 w-3.5 mr-1" /> Configurar
          </Button>
          <Button
            size="sm"
            onClick={handleRegenerate}
            className="text-xs font-semibold h-8 cursor-pointer"
            id="planner-regenerate-btn"
          >
            <RotateCw className="h-3.5 w-3.5 mr-1" /> Regerar Plano
          </Button>
        </div>
      </div>

      {/* Painel de Configurações do Planner */}
      {isConfigOpen && (
        <div
          className="bg-[#1e1f29] border border-border rounded-xl p-5 md:p-6 space-y-4 animate-fade-in"
          id="planner-config-panel"
        >
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Settings className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">
              Ajustes da Carga Horária e Diretrizes de Estudo
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Carga Horária Diária (Horas Úteis)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={config.dailyHoursAvailable}
                onChange={(e) =>
                  setConfig({ ...config, dailyHoursAvailable: parseInt(e.target.value) || 4 })
                }
                className="w-full bg-card border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                id="daily-hours-input"
              />
              <span className="text-[10px] text-muted-foreground">
                Quantas horas líquidas você possui para estudar por dia.
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Banca de Preparação Alvo
              </label>
              <select
                value={config.targetExamBoard}
                onChange={(e) => setConfig({ ...config, targetExamBoard: e.target.value })}
                className="w-full bg-card border border-border rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                id="target-board-select"
              >
                <option value="FGV">FGV (Área Fiscal Geral)</option>
                <option value="FCC">FCC (Foco em SEFAZ Estaduais)</option>
                <option value="Cebraspe">Cebraspe (Foco em Receita Federal/PF)</option>
              </select>
              <span className="text-[10px] text-muted-foreground">
                O motor alinha os exercícios e resumos ao perfil da banca.
              </span>
            </div>

            <div className="space-y-2 flex flex-col justify-end pb-1">
              <Button
                onClick={handleSaveConfig}
                className="w-full text-xs font-bold h-10 cursor-pointer"
                id="save-config-btn"
              >
                Salvar e Aplicar Cronograma
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Seletor de Dias (Abas Horizontais Dinâmicas) */}
      <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none" id="planner-tabs">
        {datesList.map((dateStr) => {
          const isSelected = selectedDate === dateStr;
          const dayTasks = tasks.filter((t) => t.scheduledDate === dateStr);
          const isDone = dayTasks.length > 0 && dayTasks.every((t) => t.completed);

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`px-4 py-3 rounded-xl border text-center transition-all cursor-pointer shrink-0 space-y-1 ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/10"
                  : "bg-card border-border hover:bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
              id={`tab-${dateStr}`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block">
                {formatFriendlyDate(dateStr)}
              </span>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[10px] font-mono font-bold">
                  {dayTasks.length} {dayTasks.length === 1 ? "tarefa" : "tarefas"}
                </span>
                {isDone && (
                  <CheckCircle
                    className={`h-3.5 w-3.5 ${isSelected ? "text-primary-foreground" : "text-[#50fa7b]"}`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Resumo do Dia de Estudos */}
      {selectedDate && (
        <div
          className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5"
          id="daily-summary"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Metas para o Dia
              </span>
              <h3 className="text-base font-black text-foreground">
                Cronograma de {formatFriendlyDate(selectedDate)}
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono font-medium">
                Progresso: {completedCount}/{dailyTasks.length} ({Math.round(progressPercent)}%)
              </span>
              <div className="w-24 h-2 bg-[#1a1b24] border border-border/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Lista de Tarefas do Dia Selecionado */}
          <div className="space-y-3">
            {dailyTasks.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <CheckCircle className="h-8 w-8 text-[#50fa7b] mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">
                  Dia livre de estudos! Aproveite para descansar ou revisar anotações.
                </p>
              </div>
            ) : (
              dailyTasks.map((task) => {
                const BadgeType = TYPE_BADGES[task.type];
                const BadgePriority = PRIORITY_BADGES[task.priority];
                const Icon = BadgeType.icon;

                return (
                  <div
                    key={task.id}
                    className={`border rounded-xl p-4 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      task.completed
                        ? "bg-[#13141c]/40 border-border/50 opacity-70"
                        : "bg-[#1e1f29]/30 border-border hover:border-primary/30"
                    }`}
                    id={`task-card-${task.id}`}
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      {/* Botão de Marcar Completo */}
                      <button
                        onClick={() => handleToggleTask(task.id)}
                        className="mt-0.5 text-muted-foreground hover:text-primary shrink-0 cursor-pointer"
                        id={`complete-btn-${task.id}`}
                        title={task.completed ? "Reabrir tarefa" : "Marcar como concluída"}
                      >
                        {task.completed ? (
                          <CheckCircle className="h-5 w-5 text-[#50fa7b] fill-[#50fa7b]/10" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {task.subjectName}
                          </span>
                          <span className="text-[10px] text-muted-foreground">&bull;</span>
                          <span className="text-xs font-bold text-foreground">
                            {task.topicName}
                          </span>
                        </div>

                        {task.notes && (
                          <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                            {task.notes}
                          </p>
                        )}

                        {task.associatedLaws && task.associatedLaws.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {task.associatedLaws.map((law, idx) => (
                              <span
                                key={idx}
                                className="bg-[#ff79c6]/10 text-[#ff79c6] border border-[#ff79c6]/15 px-1.5 py-0.2 rounded font-mono text-[9px] font-semibold"
                              >
                                § {law}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badges de Metadados da Tarefa */}
                    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 justify-end shrink-0 pl-8 md:pl-0">
                      <Badge
                        className={`text-[9px] font-extrabold h-6 flex items-center gap-1.5 ${BadgeType.bg}`}
                      >
                        <Icon className="h-3 w-3" />
                        {BadgeType.label}
                      </Badge>

                      <Badge className={`text-[9px] font-extrabold h-6 ${BadgePriority.bg}`}>
                        {BadgePriority.label}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
