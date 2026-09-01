import { describe, it, expect, beforeEach } from "vitest";
import {
  generateAdaptiveSchedule,
  getLocalTasks,
  saveLocalTasks,
  toggleTaskCompleted,
  clearLocalTasks,
} from "./adaptiveScheduler";
import { ScheduleConfig } from "./types";
import { GapDiagnostic } from "../analytics/types";

describe("Motor de Agendamento Adaptativo & Revisão Espaçada (Etapa 4.2)", () => {
  beforeEach(() => {
    clearLocalTasks();
  });

  const mockConfig: ScheduleConfig = {
    dailyHoursAvailable: 3,
    targetExamBoard: "FGV",
    subjectWeights: {
      "DIR-TRIB": 3,
      "DIR-CONST": 1,
    },
  };

  it("deve gerar cronograma de manutenção de edital padrão quando não houver lacunas críticas de rendimento", () => {
    const tasks = generateAdaptiveSchedule([], mockConfig, "2026-09-01");

    expect(tasks.length).toBeGreaterThan(0);
    // Deve agendar tarefas para os próximos 7 dias
    const uniqueDates = Array.from(new Set(tasks.map((t) => t.scheduledDate)));
    expect(uniqueDates.length).toBe(7);

    // Deve alocar a carga horária diária limite configurada (3 horas = 3 tarefas por dia)
    const day1Tasks = tasks.filter((t) => t.scheduledDate === "2026-09-01");
    expect(day1Tasks.length).toBe(3);

    // Deve respeitar a prioridade de pesos (DIR-TRIB com peso 3 tem prioridade 'medium' vs DIR-CONST peso 1 com prioridade 'low')
    const tribTask = tasks.find((t) => t.subjectId === "DIR-TRIB");
    expect(tribTask).toBeDefined();
    expect(tribTask?.priority).toBe("medium");
  });

  it("deve alocar tarefas de revisão e questões prioritárias imediatamente quando houver lacuna crítica de rendimento", () => {
    const mockGaps: GapDiagnostic[] = [
      {
        id: "GAP-1",
        subjectId: "DIR-TRIB",
        subjectName: "Direito Tributário",
        topicId: "LIMIT",
        topicName: "Limitações Constitucionais",
        accuracy: 0.4,
        averageTimeSeconds: 110,
        primaryErrorCategory: "conhecimento",
        severity: "high",
        recommendation: "Estude o Art. 150 da CF/88",
        suggestedLawTags: ["CF/88 - Art. 150"],
      },
    ];

    const tasks = generateAdaptiveSchedule(mockGaps, mockConfig, "2026-09-01");

    // As primeiras tarefas no dia de início devem focar em sanar a lacuna 'LIMIT' do assunto 'DIR-TRIB'
    const day1Tasks = tasks.filter((t) => t.scheduledDate === "2026-09-01");

    const revisionTask = day1Tasks.find((t) => t.type === "revision" && t.topicId === "LIMIT");
    expect(revisionTask).toBeDefined();
    expect(revisionTask?.priority).toBe("high");
    expect(revisionTask?.associatedLaws).toContain("CF/88 - Art. 150");

    const questionsTask = day1Tasks.find((t) => t.type === "questions" && t.topicId === "LIMIT");
    expect(questionsTask).toBeDefined();
    expect(questionsTask?.priority).toBe("high");
  });

  it("deve gerenciar e persistir o status de conclusão de tarefas marcadas como concluídas", () => {
    // Gerar tarefas
    generateAdaptiveSchedule([], mockConfig, "2026-09-01");
    const initialTasks = getLocalTasks();
    expect(initialTasks.length).toBeGreaterThan(0);

    const firstTaskId = initialTasks[0].id;
    expect(initialTasks[0].completed).toBe(false);

    // Marcar como concluída
    const updated = toggleTaskCompleted(firstTaskId);
    expect(updated.find((t) => t.id === firstTaskId)?.completed).toBe(true);

    // Desmarcar / Toggle novamente
    const toggledBack = toggleTaskCompleted(firstTaskId);
    expect(toggledBack.find((t) => t.id === firstTaskId)?.completed).toBe(false);
  });
});
