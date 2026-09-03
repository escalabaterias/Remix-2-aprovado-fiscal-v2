import { describe, expect, it } from "vitest";
import {
  evaluateTaskDelta,
  reconcilePlanDelta,
  type CandidateTaskRecord,
  type ScheduledTaskRecord,
} from "./delta-engine";

describe("Adaptive Delta Engine (Fase 7.7.3 — Anti-Churn)", () => {
  const existingTask: ScheduledTaskRecord = {
    id: "task-1",
    planId: "plan-100",
    topicId: "top-1",
    subjectId: "sub-1",
    activity: "teoria",
    scheduledDate: "2026-09-04",
    plannedMinutes: 50,
    priorityScore: 5.0,
    status: "pendente",
  };

  it("PRESERVA tarefa existente em plano idêntico ou com pequenas variações (< 15%)", () => {
    const candidate: CandidateTaskRecord = {
      topicId: "top-1",
      subjectId: "sub-1",
      activity: "teoria",
      scheduledDate: "2026-09-04",
      plannedMinutes: 50,
      priorityScore: 5.2, // 4% de mudança (5.2 vs 5.0)
    };

    const decision = evaluateTaskDelta(existingTask, candidate);

    expect(decision.action).toBe("preserve");
    expect(decision.existingTaskId).toBe("task-1");
    expect(decision.scoreDeltaPct).toBeLessThan(0.15);
    expect(decision.reason).toContain("Variação irrelevante");
  });

  it("SUBSTITUI tarefa quando a mudança de score é significativa (>= 15%)", () => {
    const candidate: CandidateTaskRecord = {
      topicId: "top-1",
      subjectId: "sub-1",
      activity: "teoria",
      scheduledDate: "2026-09-04",
      plannedMinutes: 50,
      priorityScore: 6.5, // 30% de aumento (6.5 vs 5.0)
    };

    const decision = evaluateTaskDelta(existingTask, candidate);

    expect(decision.action).toBe("replace");
    expect(decision.scoreDeltaPct).toBeGreaterThanOrEqual(0.15);
    expect(decision.reason).toContain("excede limiar");
  });

  it("SUBSTITUI tarefa quando há grande desvio de data (> 2 dias)", () => {
    const candidate: CandidateTaskRecord = {
      topicId: "top-1",
      subjectId: "sub-1",
      activity: "teoria",
      scheduledDate: "2026-09-10", // 6 dias depois
      plannedMinutes: 50,
      priorityScore: 5.1, // score quase idêntico
    };

    const decision = evaluateTaskDelta(existingTask, candidate);

    expect(decision.action).toBe("replace");
    expect(decision.dateDiffDays).toBe(6);
    expect(decision.reason).toContain("Desvio de data");
  });

  it("SUBSTITUI tarefa em caso de emergência ou prioridade pedagógica crítica/urgente", () => {
    const candidate: CandidateTaskRecord = {
      topicId: "top-1",
      subjectId: "sub-1",
      activity: "teoria",
      scheduledDate: "2026-09-04",
      plannedMinutes: 50,
      priorityScore: 5.1, // score similar
      isCritical: true, // Ponto crítico emergencial
    };

    const decision = evaluateTaskDelta(existingTask, candidate);

    expect(decision.action).toBe("replace");
    expect(decision.reason).toContain("Prioridade pedagógica crítica");
  });

  it("reconcilia um plano completo preservando tarefas estáveis e substituindo instáveis", () => {
    const existingList: ScheduledTaskRecord[] = [
      {
        id: "t1",
        planId: "p1",
        topicId: "top-1",
        activity: "teoria",
        scheduledDate: "2026-09-04",
        plannedMinutes: 50,
        priorityScore: 5.0,
        status: "pendente",
      },
      {
        id: "t2",
        planId: "p1",
        topicId: "top-2",
        activity: "questoes",
        scheduledDate: "2026-09-04",
        plannedMinutes: 50,
        priorityScore: 4.0,
        status: "pendente",
      },
    ];

    const newCandidates: CandidateTaskRecord[] = [
      {
        topicId: "top-1",
        activity: "teoria",
        scheduledDate: "2026-09-04",
        plannedMinutes: 50,
        priorityScore: 5.1, // 2% delta -> Preserva t1
      },
      {
        topicId: "top-2",
        activity: "questoes",
        scheduledDate: "2026-09-04",
        plannedMinutes: 50,
        priorityScore: 7.0, // 75% delta -> Substitui t2
      },
      {
        topicId: "top-3", // Conteúdo novo -> Inserir
        activity: "flashcards",
        scheduledDate: "2026-09-05",
        plannedMinutes: 20,
        priorityScore: 3.5,
      },
    ];

    const result = reconcilePlanDelta({
      existingPendingTasks: existingList,
      newCandidateTasks: newCandidates,
    });

    expect(result.preservedCount).toBe(1); // t1 preservada
    expect(result.replacedCount).toBe(1); // t2 substituída
    expect(result.insertedCount).toBe(1); // top-3 inserido
    expect(result.deletedCount).toBe(0);

    expect(result.tasksToKeep.map((t) => t.id)).toEqual(["t1"]);
    expect(result.tasksToDelete).toEqual(["t2"]);
    expect(result.tasksToInsert.length).toBe(2); // nova t2 + top-3
  });

  it("comprova estabilidade estrita contra churn de reagendamentos consecutivos", () => {
    const currentTask = { ...existingTask };

    // 5 execuções consecutivas de replanejamento com flutuações pequenas (1%-3%)
    for (let i = 1; i <= 5; i++) {
      const candidate: CandidateTaskRecord = {
        topicId: currentTask.topicId ?? null,
        activity: currentTask.activity,
        scheduledDate: currentTask.scheduledDate,
        plannedMinutes: currentTask.plannedMinutes,
        priorityScore: currentTask.priorityScore + (i % 2 === 0 ? 0.1 : -0.1),
      };

      const decision = evaluateTaskDelta(currentTask, candidate);
      expect(decision.action).toBe("preserve"); // Todas as 5 rodadas preservam a ID da tarefa!
    }
  });

  it("é estritamente determinístico", () => {
    const candidate: CandidateTaskRecord = {
      topicId: "top-1",
      subjectId: "sub-1",
      activity: "teoria",
      scheduledDate: "2026-09-04",
      plannedMinutes: 50,
      priorityScore: 5.05,
    };

    const res1 = evaluateTaskDelta(existingTask, candidate);
    const res2 = evaluateTaskDelta(existingTask, candidate);

    expect(res1).toEqual(res2);
  });
});
