/**
 * TRAJETÓRIA COGNITIVA — Fase 7.4
 *
 * Reconstrução determinística da evolução temporal do tópico a partir da sequência de evidências:
 * exposure → practice → recall → review → remediation → socratic → success
 */

import type {
  AnalyticsContextInput,
  CognitiveTrajectory,
  CognitiveTrajectoryPattern,
  TrajectoryPoint,
  TopicEvidenceItem,
} from "./types";
import { calculateMasteryTrend } from "./retention";

/**
 * Calcula o desvio padrão de um conjunto de valores numéricos.
 */
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Reconhece o padrão pedagógico temporal a partir dos pontos da linha do tempo.
 */
export function detectTrajectoryPattern(
  points: TrajectoryPoint[],
  masteryTrend: number,
  unresolvedErrorsCount?: number,
): { pattern: CognitiveTrajectoryPattern; summary: string } {
  if (points.length < 2) {
    return {
      pattern: "DADOS_INSUFICIENTES",
      summary: "Volume de evidências insuficiente para traçar um padrão temporal significativo.",
    };
  }

  const scoredPoints = points.filter((p) => typeof p.score === "number" && p.score !== null);
  const scores = scoredPoints.map((p) => p.score as number);

  // Detectar Recuperação após Erro:
  // Teve uma falha (score < 0.6 ou remediation/socratic) seguida de acertos recentes (scores >= 0.7)
  const hasRemediationOrSocratic = points.some(
    (p) =>
      p.kind === "remediation" ||
      p.kind === "socratic" ||
      p.source === "socratic_tutor" ||
      p.source === "error_central",
  );

  const hadFailure = scores.some((s) => s < 0.6);
  const recentScores = scores.slice(-2);
  const isRecovered =
    hadFailure &&
    recentScores.length > 0 &&
    recentScores.every((s) => s >= 0.7) &&
    (unresolvedErrorsCount === undefined || unresolvedErrorsCount === 0);

  if (isRecovered && hasRemediationOrSocratic) {
    return {
      pattern: "RECUPERACAO_APOS_ERRO",
      summary:
        "Recuperação cognitiva bem-sucedida: erro ou dificuldade prévia superada após intervenções orientadas.",
    };
  }

  // Estatísticas de pontuação
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const stdDev = calculateStdDev(scores);

  // Detectar Domínio Falso / Instável:
  // Média alta/intermediária mas alta variabilidade (stdDev >= 0.25) ou queda abrupta na revisão final
  if (scores.length >= 3 && avgScore >= 0.6 && stdDev >= 0.25) {
    return {
      pattern: "DOMINIO_FALSO_INSTAVEL",
      summary:
        "Domínio aparentemente elevado, porém instável: alto desvio padrão nos resultados e desempenho oscilante.",
    };
  }

  // Detectar Domínio Consistente:
  // Média >= 0.8, stdDev baixa (< 0.18), sem erros pendentes
  if (
    scores.length >= 3 &&
    avgScore >= 0.78 &&
    stdDev < 0.18 &&
    (unresolvedErrorsCount === undefined || unresolvedErrorsCount === 0)
  ) {
    return {
      pattern: "DOMINIO_CONSISTENTE",
      summary:
        "Domínio consistente e maduro: elevado alinhamento de acertos com baixa variância temporal.",
    };
  }

  // Detectar Regressão:
  // Tendência fortemente negativa ou queda nos scores mais recentes
  if (
    masteryTrend <= -0.15 ||
    (scores.length >= 3 && scores[scores.length - 1] < scores[0] - 0.25)
  ) {
    return {
      pattern: "REGRESSAO",
      summary:
        "Regressão cognitiva detectada: queda significativa de desempenho em relação a ciclos anteriores.",
    };
  }

  // Detectar Evolução:
  // Tendência positiva clara (masteryTrend >= 0.15)
  if (masteryTrend >= 0.15) {
    return {
      pattern: "EVOLUCAO",
      summary:
        "Evolução cognitiva consistente: trajetória ascendente de acerto e retenção ao longo do tempo.",
    };
  }

  // Detectar Estagnação:
  // Múltiplas tentativas com notas medianas sem crescimento (|masteryTrend| < 0.1)
  if (scores.length >= 3 && Math.abs(masteryTrend) < 0.1 && avgScore >= 0.35 && avgScore <= 0.68) {
    return {
      pattern: "ESTAGNACAO",
      summary:
        "Estagnação pedagógica: desempenho plano em nível intermediário sem avanço perceptível.",
    };
  }

  // Padrão genérico de acompanhamento
  return {
    pattern: masteryTrend >= 0 ? "EVOLUCAO" : "REGRESSAO",
    summary:
      masteryTrend >= 0
        ? "Trajetória em progresso gradual de aprendizagem."
        : "Trajetória com oscilação de rendimento sob observação.",
  };
}

/**
 * Reconstrói a Trajetória Cognitiva completa a partir das evidências do contexto.
 */
export function reconstructCognitiveTrajectory(input: AnalyticsContextInput): CognitiveTrajectory {
  const { topicId, evidences, unresolvedErrors } = input;

  const sortedEvidences = [...evidences].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const timeline: TrajectoryPoint[] = sortedEvidences.map((e) => ({
    timestamp: e.timestamp,
    kind: e.kind,
    source: e.source,
    score: typeof e.score === "number" && !isNaN(e.score) ? e.score : null,
    weight: e.cognitiveWeight ?? 1.0,
  }));

  const masteryTrend = calculateMasteryTrend(sortedEvidences);
  const { pattern, summary } = detectTrajectoryPattern(timeline, masteryTrend, unresolvedErrors);

  return {
    topicId,
    timeline,
    pattern,
    summary,
  };
}
