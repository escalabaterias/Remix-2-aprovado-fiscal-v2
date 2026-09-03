import { describe, expect, it } from "vitest";
import {
  computeDeficitBoost,
  computeDeficitSummaries,
  MAX_DEFICIT_BOOST,
  type OverdueTaskInfo,
} from "./deficit-engine";

describe("Adaptive Deficit Engine (Fase 7.7.2)", () => {
  const TODAY = "2026-09-03";

  it("retorna resumo vazio quando não há tarefas atrasadas", () => {
    const summaries = computeDeficitSummaries([], TODAY);
    expect(summaries.size).toBe(0);
  });

  it("ignora tarefas concluídas, canceladas, puladas ou futuras", () => {
    const tasks: OverdueTaskInfo[] = [
      {
        id: "t1",
        subjectId: "sub-1",
        scheduledDate: "2026-09-01",
        plannedMinutes: 50,
        status: "concluida",
      },
      {
        id: "t2",
        subjectId: "sub-1",
        scheduledDate: "2026-09-01",
        plannedMinutes: 50,
        status: "cancelada",
      },
      {
        id: "t3",
        subjectId: "sub-1",
        scheduledDate: "2026-09-01",
        plannedMinutes: 50,
        status: "pulada",
      },
      {
        id: "t4",
        subjectId: "sub-1",
        scheduledDate: "2026-09-05", // Futura
        plannedMinutes: 50,
        status: "pendente",
      },
    ];

    const summaries = computeDeficitSummaries(tasks, TODAY);
    expect(summaries.size).toBe(0);
  });

  it("calcula corretamente o déficit de tarefas atrasadas pendentes", () => {
    const tasks: OverdueTaskInfo[] = [
      {
        id: "t1",
        subjectId: "sub-1",
        topicId: "top-1",
        scheduledDate: "2026-09-01",
        plannedMinutes: 50,
        actualMinutes: 0,
        status: "pendente",
      },
      {
        id: "t2",
        subjectId: "sub-1",
        topicId: "top-1",
        scheduledDate: "2026-09-02",
        plannedMinutes: 50,
        actualMinutes: 20, // 30 min devidos
        status: "pendente",
      },
    ];

    const summaries = computeDeficitSummaries(tasks, TODAY);
    expect(summaries.has("sub-1")).toBe(true);

    const sub1 = summaries.get("sub-1")!;
    expect(sub1.totalDeficitMinutes).toBe(80); // 50 + 30
    expect(sub1.overdueTaskCount).toBe(2);
    expect(sub1.topicDeficits.get("top-1")).toBe(80);
  });

  it("calcula boost zero para matéria sem déficit", () => {
    const summaries = computeDeficitSummaries([], TODAY);
    const boost = computeDeficitBoost({
      subjectId: "sub-1",
      subjectDeficits: summaries,
      weeklyCapacityMinutes: 600,
    });

    expect(boost.deficitBoost).toBe(0);
    expect(boost.deficitMinutes).toBe(0);
    expect(boost.reason).toBeNull();
  });

  it("calcula boost pequeno para pequeno déficit", () => {
    const tasks: OverdueTaskInfo[] = [
      {
        id: "t1",
        subjectId: "sub-1",
        scheduledDate: "2026-09-01",
        plannedMinutes: 30,
        status: "pendente",
      },
    ];

    const summaries = computeDeficitSummaries(tasks, TODAY);
    const boost = computeDeficitBoost({
      subjectId: "sub-1",
      subjectDeficits: summaries,
      weeklyCapacityMinutes: 600, // 30% da semana = 180 min recovery cap. 30 / (180 * 2) = 30 / 360 ~ 0.083 -> raw boost = 0.083 * 1.5 = 0.125 -> 0.13
    });

    expect(boost.deficitBoost).toBeGreaterThan(0);
    expect(boost.deficitBoost).toBeLessThan(0.5);
    expect(boost.reason).toContain("Déficit acumulado");
  });

  it("limita o boost ao máximo (MAX_DEFICIT_BOOST = 1.5) em caso de grande déficit acumulado", () => {
    const tasks: OverdueTaskInfo[] = Array(20).fill({
      id: "t1",
      subjectId: "sub-1",
      scheduledDate: "2026-08-01",
      plannedMinutes: 100,
      status: "pendente",
    }); // 2000 minutos devidos

    const summaries = computeDeficitSummaries(tasks, TODAY);
    const boost = computeDeficitBoost({
      subjectId: "sub-1",
      subjectDeficits: summaries,
      weeklyCapacityMinutes: 600,
    });

    expect(boost.deficitBoost).toBe(MAX_DEFICIT_BOOST);
    expect(boost.deficitMinutes).toBe(2000);
  });

  it("diferencia déficit concentrado em um tópico vs distribuído entre matérias", () => {
    const tasks: OverdueTaskInfo[] = [
      {
        id: "t1",
        subjectId: "sub-1",
        topicId: "top-1",
        scheduledDate: "2026-09-01",
        plannedMinutes: 100,
        status: "pendente",
      },
      {
        id: "t2",
        subjectId: "sub-2",
        topicId: "top-2",
        scheduledDate: "2026-09-01",
        plannedMinutes: 100,
        status: "pendente",
      },
    ];

    const summaries = computeDeficitSummaries(tasks, TODAY);

    const boost1 = computeDeficitBoost({
      subjectId: "sub-1",
      topicId: "top-1",
      subjectDeficits: summaries,
      weeklyCapacityMinutes: 600,
    });

    const boost3 = computeDeficitBoost({
      subjectId: "sub-3", // sem dívida
      topicId: "top-3",
      subjectDeficits: summaries,
      weeklyCapacityMinutes: 600,
    });

    expect(boost1.deficitBoost).toBeGreaterThan(0);
    expect(boost3.deficitBoost).toBe(0);
  });

  it("é estritamente determinístico", () => {
    const tasks: OverdueTaskInfo[] = [
      {
        id: "t1",
        subjectId: "sub-1",
        scheduledDate: "2026-09-01",
        plannedMinutes: 60,
        status: "pendente",
      },
    ];

    const sum1 = computeDeficitSummaries(tasks, TODAY);
    const sum2 = computeDeficitSummaries(tasks, TODAY);

    expect(sum1).toEqual(sum2);

    const b1 = computeDeficitBoost({
      subjectId: "sub-1",
      subjectDeficits: sum1,
      weeklyCapacityMinutes: 500,
    });

    const b2 = computeDeficitBoost({
      subjectId: "sub-1",
      subjectDeficits: sum2,
      weeklyCapacityMinutes: 500,
    });

    expect(b1).toEqual(b2);
  });
});
