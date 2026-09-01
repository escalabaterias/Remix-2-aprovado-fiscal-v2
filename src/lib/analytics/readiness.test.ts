import { describe, expect, it } from "vitest";
import {
  calculateReadinessScore,
  generateLastMinuteActionPlan,
  simulateCutoff,
  TARGET_EXAMS_BENCHMARKS,
} from "./readinessEngine";

describe("Readiness Engine & Cutoff Simulator Tests", () => {
  it("deve calcular o Índice de Prontidão Fiscal (IPF) dentro do intervalo 0-100%", () => {
    const score = calculateReadinessScore();

    expect(score.overallIndex).toBeGreaterThanOrEqual(0);
    expect(score.overallIndex).toBeLessThanOrEqual(100);
    expect(score.objectiveContribution).toBeGreaterThanOrEqual(0);
    expect(score.discursiveContribution).toBeGreaterThanOrEqual(0);
    expect(score.memoryContribution).toBeGreaterThanOrEqual(0);
    expect(score.syllabusContribution).toBeGreaterThanOrEqual(0);
    expect(["critical", "moderate", "solid", "competitive"]).toContain(score.diagnosticLevel);
  });

  it("deve simular nota de corte para a SEFAZ-SP corretamente", () => {
    const exam = TARGET_EXAMS_BENCHMARKS[0]; // SEFAZ-SP
    // Simulando nota acima da nota de corte histórica (108.55)
    const simulation = simulateCutoff(exam.id, 90, 25); // Total = 115

    expect(simulation.targetExamId).toBe("sefaz-sp-af");
    expect(simulation.totalSimulatedPoints).toBe(115);
    expect(simulation.isWithinVacancies).toBe(true);
    expect(simulation.estimatedRankingRange).toContain("Vagas");
  });

  it("deve identificar quando a nota simulada está fora da zona de corte", () => {
    const exam = TARGET_EXAMS_BENCHMARKS[0]; // SEFAZ-SP (Corte = 108.55)
    const simulation = simulateCutoff(exam.id, 70, 15); // Total = 85

    expect(simulation.totalSimulatedPoints).toBe(85);
    expect(simulation.isWithinVacancies).toBe(false);
    expect(simulation.estimatedRankingRange).toContain("Fora das vagas por");
  });

  it("deve gerar recomendações de última hora (Plano de Ação 72h)", () => {
    const plan = generateLastMinuteActionPlan();

    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0].subject).toBeDefined();
    expect(plan[0].topic).toBeDefined();
    expect(plan[0].reason).toBeDefined();
    expect(["high", "medium"]).toContain(plan[0].urgency);
    expect(["flashcards", "discursive", "questions", "lawtags"]).toContain(plan[0].actionType);
  });
});
