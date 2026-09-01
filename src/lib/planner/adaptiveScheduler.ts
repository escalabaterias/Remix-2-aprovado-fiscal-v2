import { GapDiagnostic } from "../analytics/types";
import { StudyTask, ScheduleConfig, TaskPriority, TaskType } from "./types";

/**
 * Motor de Agendamento Adaptativo
 * Gera tarefas personalizadas com foco em sanar lacunas de conhecimento e aplicar repetição espaçada
 */
export function generateAdaptiveSchedule(
  gapDiagnostics: GapDiagnostic[],
  config: ScheduleConfig,
  startDateStr: string = new Date().toISOString().split("T")[0],
): StudyTask[] {
  const tasks: StudyTask[] = [];
  const daysToSchedule = 7; // Sempre planeja os próximos 7 dias

  // 1. Agrupar lacunas por severidade
  const highGaps = gapDiagnostics.filter((g) => g.severity === "high");
  const mediumGaps = gapDiagnostics.filter((g) => g.severity === "medium");
  const lowGaps = gapDiagnostics.filter((g) => g.severity === "low");

  // Preparar lista ordenada de lacunas para tratamento prioritário
  const orderedGaps = [...highGaps, ...mediumGaps, ...lowGaps];

  // Helper para formatar a data adicionando dias
  const addDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr + "T12:00:00"); // Evitar problemas de fuso horário local
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  let currentGapIndex = 0;

  // 2. Loop dia a dia para preencher a carga horária disponível
  for (let day = 0; day < daysToSchedule; day++) {
    const currentDate = addDays(startDateStr, day);
    const hoursNeededForDay = config.dailyHoursAvailable;
    let hoursAllocatedForDay = 0;

    // A. Prioridade máxima: Sanar as lacunas críticas ativamente
    while (hoursAllocatedForDay < hoursNeededForDay && currentGapIndex < orderedGaps.length) {
      const gap = orderedGaps[currentGapIndex];
      const priority: TaskPriority = gap.severity === "high" ? "high" : "medium";

      // Para cada lacuna séria, criamos um bloco de Revisão Espaçada (1 hora) e um de Exercícios Clínicos (1 hora)
      // Bloco 1: Revisão Teórica Direcionada
      tasks.push({
        id: `TSK-${gap.subjectId}-${gap.topicId}-REV-${day}`,
        subjectId: gap.subjectId,
        subjectName: gap.subjectName,
        topicId: gap.topicId,
        topicName: gap.topicName,
        type: "revision",
        priority,
        scheduledDate: currentDate,
        completed: false,
        notes: `Revisão clínica ativa focada no diagnóstico de erros. ${gap.recommendation}`,
        associatedLaws: gap.suggestedLawTags,
      });
      hoursAllocatedForDay += 1;

      // Se ainda houver horas no dia, aloca o Bloco 2 de Exercícios no mesmo assunto
      if (hoursAllocatedForDay < hoursNeededForDay) {
        tasks.push({
          id: `TSK-${gap.subjectId}-${gap.topicId}-QUE-${day}`,
          subjectId: gap.subjectId,
          subjectName: gap.subjectName,
          topicId: gap.topicId,
          topicName: gap.topicName,
          type: "questions",
          priority,
          scheduledDate: currentDate,
          completed: false,
          notes: `Bateria de fortalecimento clínico sobre ${gap.topicName} focando na banca ${config.targetExamBoard}. Objetivo: atingir mais de 80% de acerto.`,
          associatedLaws: gap.suggestedLawTags,
        });
        hoursAllocatedForDay += 1;
      }

      currentGapIndex++;
    }

    // B. Preenchimento de manutenção regular com base nos pesos das matérias do edital
    // Se o aluno não tiver mais lacunas graves mas ainda tiver carga horária no dia,
    // escalamos matérias gerais de acordo com os pesos configurados no plano.
    if (hoursAllocatedForDay < hoursNeededForDay) {
      const sortedSubjects = Object.entries(config.subjectWeights).sort((a, b) => b[1] - a[1]);
      let subjectIndex = 0;

      while (hoursAllocatedForDay < hoursNeededForDay && sortedSubjects.length > 0) {
        const [subjId, weight] = sortedSubjects[subjectIndex % sortedSubjects.length];

        // Determinar o nome do assunto padrão
        let subjectName = "Matéria Geral";
        let topicId = "GENERIC";
        let topicName = "Estudo de Manutenção de Edital";
        let laws: string[] = [];

        if (subjId === "DIR-TRIB") {
          subjectName = "Direito Tributário";
          topicId = "LIMIT-TRIB";
          topicName = "Limitações ao Poder de Tributar (Lei Seca)";
          laws = ["CF/88 - Art. 150"];
        } else if (subjId === "DIR-CONST") {
          subjectName = "Direito Constitucional";
          topicId = "LIMIT-TRIB";
          topicName = "Princípios Constitucionais Gerais";
          laws = ["CF/88 - Art. 150"];
        }

        const taskType: TaskType = hoursAllocatedForDay % 2 === 0 ? "theory" : "questions";

        tasks.push({
          id: `TSK-MNT-${subjId}-${day}-${hoursAllocatedForDay}`,
          subjectId: subjId,
          subjectName,
          topicId: `${topicId}-${hoursAllocatedForDay}`, // Unique topicId per task in day
          topicName,
          type: taskType,
          priority: weight >= 3 ? "medium" : "low",
          scheduledDate: currentDate,
          completed: false,
          notes: `Estudo de manutenção regular de acordo com peso ${weight} no edital da área fiscal.`,
          associatedLaws: laws,
        });

        hoursAllocatedForDay += 1;
        subjectIndex++;
      }
    }
  }

  // Persistir as tarefas geradas localmente para permitir que o aluno as gerencie (marque como concluidas)
  const existingTasks = getLocalTasks();
  if (existingTasks.length === 0) {
    saveLocalTasks(tasks);
    return tasks;
  }

  // Mesclar tarefas preservando o status de conclusão das tarefas existentes na mesma data
  const mergedTasks = [...existingTasks];
  tasks.forEach((newTask) => {
    const alreadyExists = mergedTasks.some(
      (oldTask) =>
        oldTask.scheduledDate === newTask.scheduledDate &&
        oldTask.topicId === newTask.topicId &&
        oldTask.type === newTask.type,
    );
    if (!alreadyExists) {
      mergedTasks.push(newTask);
    }
  });

  saveLocalTasks(mergedTasks);
  return mergedTasks;
}

let memoryTasks: StudyTask[] = [];

/**
 * Carrega tarefas salvas no localStorage
 */
export function getLocalTasks(): StudyTask[] {
  if (typeof window === "undefined") return memoryTasks;
  const stored = localStorage.getItem("aprovado_fiscal_tasks");
  return stored ? JSON.parse(stored) : [];
}

/**
 * Salva tarefas no localStorage
 */
export function saveLocalTasks(tasks: StudyTask[]) {
  if (typeof window === "undefined") {
    memoryTasks = tasks;
    return;
  }
  localStorage.setItem("aprovado_fiscal_tasks", JSON.stringify(tasks));
}

/**
 * Atualiza o status de conclusão de uma tarefa
 */
export function toggleTaskCompleted(taskId: string): StudyTask[] {
  const tasks = getLocalTasks();
  const updated = tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
  saveLocalTasks(updated);
  return updated;
}

/**
 * Limpa o histórico de tarefas
 */
export function clearLocalTasks() {
  if (typeof window === "undefined") {
    memoryTasks = [];
    return;
  }
  localStorage.removeItem("aprovado_fiscal_tasks");
}
