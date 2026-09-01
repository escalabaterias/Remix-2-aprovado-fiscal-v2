import { getDiscursivePerformanceSummary } from "../discursive/discursiveEngine";
import { getFlashcardsSummary } from "../flashcards/service";
import { getSyllabusItems } from "../syllabus/syllabusEngine";
import type {
  CutoffSimulation,
  LastMinuteActionTopic,
  ReadinessScore,
  TargetExamCutoff,
} from "./readinessTypes";

export const TARGET_EXAMS_BENCHMARKS: TargetExamCutoff[] = [
  {
    id: "sefaz-sp-af",
    name: "SEFAZ-SP - Auditor Fiscal da Receita Estadual",
    banca: "FGV",
    totalObjectivePoints: 100,
    totalDiscursivePoints: 30,
    historicalCutoffPercentage: 83.5,
    historicalCutoffPoints: 108.55,
    totalVacancies: 60,
  },
  {
    id: "rfb-afrfb",
    name: "Receita Federal - Auditor Fiscal (AFRFB)",
    banca: "FGV",
    totalObjectivePoints: 140,
    totalDiscursivePoints: 40,
    historicalCutoffPercentage: 79.0,
    historicalCutoffPoints: 142.2,
    totalVacancies: 230,
  },
  {
    id: "sefaz-pr-af",
    name: "SEFAZ-PR - Auditor Fiscal",
    banca: "Cebraspe",
    totalObjectivePoints: 120,
    totalDiscursivePoints: 30,
    historicalCutoffPercentage: 81.5,
    historicalCutoffPoints: 122.25,
    totalVacancies: 40,
  },
];

export function calculateReadinessScore(): ReadinessScore {
  // 1. Obter progresso no edital verticalizado
  const syllabusTopics = getSyllabusItems();
  let syllabusContribution = 60; // default baseline se sem dados
  if (syllabusTopics.length > 0) {
    const totalWeight = syllabusTopics.reduce((acc, t) => acc + t.weight, 0);
    const completedWeight = syllabusTopics
      .filter((t) => t.status === "mastered" || t.status === "reviewed")
      .reduce((acc, t) => acc + t.weight, 0);
    const reviewingWeight = syllabusTopics
      .filter((t) => t.status === "studying")
      .reduce((acc, t) => acc + t.weight, 0);

    const weightedProgress = (completedWeight * 1.0 + reviewingWeight * 0.5) / (totalWeight || 1);
    syllabusContribution = Math.round(weightedProgress * 100);
  }

  // 2. Obter desempenho em discursivas
  const discursiveSummary = getDiscursivePerformanceSummary();
  let discursiveContribution = 70; // baseline
  if (discursiveSummary.totalSubmissions > 0) {
    discursiveContribution = discursiveSummary.averageScorePercentage;
  }

  // 3. Obter retencao / em dia nos flashcards
  let memoryContribution = 80; // baseline
  try {
    const flashSummary = getFlashcardsSummary();
    if (flashSummary.totalCards > 0) {
      const dueRatio = flashSummary.dueCards / flashSummary.totalCards;
      // Quanto menor o dueRatio em relacao ao total, melhor a memoria
      memoryContribution = Math.max(30, Math.min(100, Math.round((1 - dueRatio * 0.7) * 100)));
    }
  } catch {
    // fallback
  }

  // 4. Objetivas / simulados (cruzando progresso do edital e questoes)
  let objectiveContribution = Math.round(syllabusContribution * 0.6 + memoryContribution * 0.4);
  if (discursiveSummary.totalSubmissions > 0) {
    objectiveContribution = Math.round(objectiveContribution * 0.7 + discursiveContribution * 0.3);
  }

  // Calculo ponderado do Indice de Prontidao Fiscal (IPF)
  // Pesos: Objetivas 40%, Discursivas 25%, Edital 20%, Memoria/Cards 15%
  const overallIndex = Math.round(
    objectiveContribution * 0.4 +
      discursiveContribution * 0.25 +
      syllabusContribution * 0.2 +
      memoryContribution * 0.15,
  );

  let diagnosticLevel: ReadinessScore["diagnosticLevel"] = "critical";
  if (overallIndex >= 85) {
    diagnosticLevel = "competitive";
  } else if (overallIndex >= 72) {
    diagnosticLevel = "solid";
  } else if (overallIndex >= 58) {
    diagnosticLevel = "moderate";
  }

  return {
    overallIndex,
    objectiveContribution,
    discursiveContribution,
    memoryContribution,
    syllabusContribution,
    diagnosticLevel,
  };
}

export function simulateCutoff(
  examId: string,
  expectedObjectiveScore: number,
  expectedDiscursiveScore: number,
): CutoffSimulation {
  const exam = TARGET_EXAMS_BENCHMARKS.find((e) => e.id === examId) || TARGET_EXAMS_BENCHMARKS[0];

  const obj = Math.min(Math.max(0, expectedObjectiveScore), exam.totalObjectivePoints);
  const disc = Math.min(Math.max(0, expectedDiscursiveScore), exam.totalDiscursivePoints);

  const totalSimulatedPoints = Math.round((obj + disc) * 100) / 100;
  const maxPoints = exam.totalObjectivePoints + exam.totalDiscursivePoints;
  const simulatedPercentage = Math.round((totalSimulatedPoints / maxPoints) * 1000) / 10;

  const isWithinVacancies = totalSimulatedPoints >= exam.historicalCutoffPoints;

  let estimatedRankingRange = "";
  if (isWithinVacancies) {
    const margin = totalSimulatedPoints - exam.historicalCutoffPoints;
    if (margin > 8) {
      estimatedRankingRange = ` Top 5% das Vagas (Aproximadamente 1º ao 10º lugar)`;
    } else if (margin > 3) {
      estimatedRankingRange = ` Vagas Diretas (Aproximadamente 11º ao ${Math.round(exam.totalVacancies * 0.5)}º lugar)`;
    } else {
      estimatedRankingRange = ` Faixa de Corte (Aproximadamente ${Math.round(exam.totalVacancies * 0.6)}º ao ${exam.totalVacancies}º lugar)`;
    }
  } else {
    const diff = Math.round((exam.historicalCutoffPoints - totalSimulatedPoints) * 10) / 10;
    estimatedRankingRange = `Fora das vagas por ${diff} pts (Cadastro de Reserva / Excedente)`;
  }

  return {
    targetExamId: exam.id,
    targetExamName: exam.name,
    expectedObjectiveScore: obj,
    expectedDiscursiveScore: disc,
    totalSimulatedPoints,
    simulatedPercentage,
    historicalCutoffPoints: exam.historicalCutoffPoints,
    isWithinVacancies,
    estimatedRankingRange,
  };
}

export function generateLastMinuteActionPlan(): LastMinuteActionTopic[] {
  const topics = getSyllabusItems();

  // Filtrar topicos pendentes ou em estudo de alto peso
  const critical = topics
    .filter((t) => t.weight >= 4 && t.status !== "mastered")
    .sort((a, b) => b.weight - a.weight);

  const result: LastMinuteActionTopic[] = [];

  // Se nao houver no edital, montar recomendacoes estrategicas padrao da area fiscal
  if (critical.length === 0) {
    return [
      {
        subject: "Direito Tributário",
        topic: "Lançamento por Homologação e Decadência (Art. 150 § 4º x 173 I CTN)",
        weight: 5,
        reason: "Tópico de altíssima cobrança em provas de Auditor Fiscal da FGV e Cebraspe.",
        urgency: "high",
        actionType: "lawtags",
      },
      {
        subject: "Legislação Tributária",
        topic: "Não-Cumulatividade do ICMS e Substituição Tributária (LC 87/96)",
        weight: 5,
        reason: "Tema central para prova discursiva e objetiva da SEFAZ.",
        urgency: "high",
        actionType: "discursive",
      },
      {
        subject: "Contabilidade Avançada",
        topic: "Demonstração dos Fluxos de Caixa (DFC) e Métodos Direto/Indireto",
        weight: 4,
        reason: "Constante causa de erros em questões de cálculo de contabilidade.",
        urgency: "medium",
        actionType: "questions",
      },
      {
        subject: "Auditoria Fiscal",
        topic: "Procedimentos de Amostragem e Testes de Substantivos",
        weight: 4,
        reason: "Fácil memorização com alto retorno de pontos em poucas horas.",
        urgency: "medium",
        actionType: "flashcards",
      },
    ];
  }

  critical.slice(0, 5).forEach((item) => {
    let actionType: LastMinuteActionTopic["actionType"] = "questions";
    if (
      item.subject.toLowerCase().includes("tributário") ||
      item.subject.toLowerCase().includes("legislação")
    ) {
      actionType = item.weight >= 5 ? "discursive" : "lawtags";
    } else if (item.subject.toLowerCase().includes("auditoria")) {
      actionType = "flashcards";
    }

    result.push({
      subject: item.subject,
      topic: item.topic,
      weight: item.weight,
      reason: `Matéria de peso ${item.weight} com status "${item.status === "reviewing" ? "Em Revisão" : "Não Iniciado"}".`,
      urgency: item.weight >= 5 ? "high" : "medium",
      actionType,
    });
  });

  return result;
}
