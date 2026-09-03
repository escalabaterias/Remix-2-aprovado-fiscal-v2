import { describe, expect, it } from "vitest";
import {
  CREDIBILITY_K,
  estimateTaskTime,
  MAX_EXECUTION_RATIO,
  MIN_EXECUTION_RATIO,
  type HistoricalExecutionObservation,
} from "./time-estimator";

describe("Intelligent Time Estimator (Fase 7.7.1)", () => {
  it("retorna o tempo baseline quando não há histórico (Level 6: Baseline)", () => {
    const result = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria",
      baselineMinutes: 50,
      history: [],
    });

    expect(result.estimatedMinutes).toBe(50);
    expect(result.confidence).toBe(0);
    expect(result.appliedLevel).toBe("baseline");
    expect(result.sampleSize).toBe(0);
    expect(result.executionRatio).toBe(1.0);
    expect(result.reason).toContain("Sem histórico disponível");
  });

  it("utiliza histórico no nível Tópico + Atividade quando disponível (Level 1)", () => {
    const history: HistoricalExecutionObservation[] = [
      {
        subjectId: "sub-1",
        topicId: "top-1",
        activityKind: "teoria",
        plannedMinutes: 50,
        actualMinutes: 65, // ratio 1.3
      },
      {
        subjectId: "sub-1",
        topicId: "top-1",
        activityKind: "teoria",
        plannedMinutes: 50,
        actualMinutes: 70, // ratio 1.4
      },
      {
        subjectId: "sub-1",
        topicId: "top-1",
        activityKind: "teoria",
        plannedMinutes: 50,
        actualMinutes: 60, // ratio 1.2
      },
    ];

    const result = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria",
      baselineMinutes: 50,
      history,
    });

    // Média = 1.3. N = 3. Credibility smoothing com K=3:
    // Blended = (3 * 1.3 + 3 * 1.0) / (3 + 3) = 6.9 / 6 = 1.15
    // 50 * 1.15 = 57.5 => 58 min
    expect(result.appliedLevel).toBe("topic_activity");
    expect(result.sampleSize).toBe(3);
    expect(result.estimatedMinutes).toBe(58);
    expect(result.executionRatio).toBe(1.15);
    expect(result.confidence).toBeGreaterThan(0.3);
  });

  it("utiliza o nível Tópico quando não há histórico da mesma atividade (Level 2)", () => {
    const history: HistoricalExecutionObservation[] = [
      {
        subjectId: "sub-1",
        topicId: "top-1",
        activityKind: "questoes",
        plannedMinutes: 50,
        actualMinutes: 65,
      },
    ];

    const result = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria", // atividade diferente
      baselineMinutes: 50,
      history,
    });

    expect(result.appliedLevel).toBe("topic");
    expect(result.sampleSize).toBe(1);
  });

  it("utiliza o nível Matéria + Atividade quando o tópico não tem histórico (Level 3)", () => {
    const history: HistoricalExecutionObservation[] = [
      {
        subjectId: "sub-1",
        topicId: "top-outros",
        activityKind: "teoria",
        plannedMinutes: 50,
        actualMinutes: 60,
      },
    ];

    const result = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-novo",
      activityKind: "teoria",
      baselineMinutes: 50,
      history,
    });

    expect(result.appliedLevel).toBe("subject_activity");
    expect(result.sampleSize).toBe(1);
  });

  it("utiliza o nível Matéria quando não há dados da atividade no tópico (Level 4)", () => {
    const history: HistoricalExecutionObservation[] = [
      {
        subjectId: "sub-1",
        topicId: "top-outros",
        activityKind: "questoes",
        plannedMinutes: 50,
        actualMinutes: 60,
      },
    ];

    const result = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-novo",
      activityKind: "teoria",
      baselineMinutes: 50,
      history,
    });

    expect(result.appliedLevel).toBe("subject");
    expect(result.sampleSize).toBe(1);
  });

  it("utiliza o perfil geral do usuário quando a matéria é nova (Level 5)", () => {
    const history: HistoricalExecutionObservation[] = [
      {
        subjectId: "sub-antiga",
        topicId: "top-1",
        activityKind: "questoes",
        plannedMinutes: 50,
        actualMinutes: 60,
      },
    ];

    const result = estimateTaskTime({
      subjectId: "sub-nova",
      topicId: "top-novo",
      activityKind: "teoria",
      baselineMinutes: 50,
      history,
    });

    expect(result.appliedLevel).toBe("user_overall");
    expect(result.sampleSize).toBe(1);
  });

  it("descarta outliers extremos (ex: cronômetro esquecido com ratio > 4.0)", () => {
    const history: HistoricalExecutionObservation[] = [
      {
        subjectId: "sub-1",
        topicId: "top-1",
        activityKind: "teoria",
        plannedMinutes: 50,
        actualMinutes: 500, // ratio = 10.0 (OUTLIER)
      },
      {
        subjectId: "sub-1",
        topicId: "top-1",
        activityKind: "teoria",
        plannedMinutes: 50,
        actualMinutes: 50, // ratio = 1.0 (VÁLIDO)
      },
    ];

    const result = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria",
      baselineMinutes: 50,
      history,
    });

    expect(result.sampleSize).toBe(1); // o outlier de 500min foi descartado
    expect(result.appliedLevel).toBe("topic_activity");
  });

  it("limita a variação da razão entre 0.5x e 2.0x (mínimo e máximo de aceleração/desaceleração)", () => {
    // Caso de usuário extremamente lento (ex: ratio 3.5 sem ser outlier absoluto)
    const slowHistory: HistoricalExecutionObservation[] = Array(10).fill({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria",
      plannedMinutes: 50,
      actualMinutes: 180, // ratio = 3.6 (válido < 4.0)
    });

    const slowResult = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria",
      baselineMinutes: 50,
      history: slowHistory,
    });

    expect(slowResult.executionRatio).toBe(MAX_EXECUTION_RATIO); // 2.0x
    expect(slowResult.estimatedMinutes).toBe(100); // 50 * 2.0

    // Caso de usuário extremamente rápido (ex: ratio 0.1)
    const fastHistory: HistoricalExecutionObservation[] = Array(10).fill({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria",
      plannedMinutes: 50,
      actualMinutes: 15, // ratio = 0.3
    });

    const fastResult = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria",
      baselineMinutes: 50,
      history: fastHistory,
    });

    expect(fastResult.executionRatio).toBe(MIN_EXECUTION_RATIO); // 0.5x
    expect(fastResult.estimatedMinutes).toBe(25); // 50 * 0.5
  });

  it("respeita limites mínimos e máximos absolutos de tempo", () => {
    const history: HistoricalExecutionObservation[] = Array(10).fill({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria",
      plannedMinutes: 10,
      actualMinutes: 5,
    });

    // Força estimativa de tempo baixo
    const resultLow = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria",
      baselineMinutes: 10,
      minMinutes: 15,
      history,
    });
    expect(resultLow.estimatedMinutes).toBe(15); // clamped pelo minMinutes 15

    // Força estimativa de tempo alto
    const resultHigh = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "teoria",
      baselineMinutes: 100,
      maxMinutes: 120,
      history: Array(10).fill({
        subjectId: "sub-1",
        topicId: "top-1",
        activityKind: "teoria",
        plannedMinutes: 100,
        actualMinutes: 200,
      }),
    });
    expect(resultHigh.estimatedMinutes).toBe(120); // clamped pelo maxMinutes 120
  });

  it("é estritamente determinístico (mesmo input -> exato mesmo output)", () => {
    const input = {
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "questoes" as const,
      baselineMinutes: 40,
      history: [
        {
          subjectId: "sub-1",
          topicId: "top-1",
          activityKind: "questoes" as const,
          plannedMinutes: 40,
          actualMinutes: 48,
        },
      ],
    };

    const res1 = estimateTaskTime(input);
    const res2 = estimateTaskTime(input);

    expect(res1).toEqual(res2);
  });

  it("considera estimativa por quantidade e ritmo de questões quando fornecido", () => {
    const history: HistoricalExecutionObservation[] = [
      {
        subjectId: "sub-1",
        topicId: "top-1",
        activityKind: "questoes",
        plannedMinutes: 30,
        actualMinutes: 30,
        questionCount: 10,
        totalTimeSpentSeconds: 1200, // 120 seg por questão
      },
    ];

    const result = estimateTaskTime({
      subjectId: "sub-1",
      topicId: "top-1",
      activityKind: "questoes",
      baselineMinutes: 30,
      questionCount: 15, // 15 questões a 120 seg = 1800 seg (30 min)
      history,
    });

    expect(result.estimatedMinutes).toBe(30);
    expect(result.sampleSize).toBe(1);
  });
});
