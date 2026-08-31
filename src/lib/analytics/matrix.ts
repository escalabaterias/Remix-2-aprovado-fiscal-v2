/**
 * MATRIZ DE RETENÇÃO — Fase 7.4
 *
 * Classificação determinística de cada tópico nas 7 categorias da Matriz de Retenção.
 */

import type {
  RetentionCategory,
  RetentionMatrixEntry,
  RetentionProfile,
  CognitiveTrajectory,
} from "./types";

/**
 * Classifica um tópico na Matriz de Retenção com base no seu Perfil de Retenção e Trajetória.
 */
export function classifyRetentionMatrix(
  profile: RetentionProfile,
  trajectory: CognitiveTrajectory,
): RetentionMatrixEntry {
  const {
    topicId,
    retentionScore,
    decayRisk,
    errorRecurrence,
    evidenceCount,
    currentKnowledgeState,
  } = profile;

  // 1. DADOS INSUFICIENTES
  if (evidenceCount < 2 || currentKnowledgeState === "SEM_EVIDENCIA") {
    return {
      topicId,
      category: "DADOS_INSUFICIENTES",
      retentionScore,
      decayRisk,
      errorRecurrence,
      reason: "Quantidade de evidências abaixo do mínimo necessário para inferência de retenção.",
    };
  }

  // 2. REINCIDÊNCIA DE ERROS
  if (errorRecurrence >= 0.4 || currentKnowledgeState === "PONTO_CRITICO") {
    return {
      topicId,
      category: "REINCIDÊNCIA_DE_ERROS",
      retentionScore,
      decayRisk,
      errorRecurrence,
      reason: "Frequência elevada de erros recorrentes exige saneamento conceitual prioritário.",
    };
  }

  // 3. RECUPERAÇÃO EM ANDAMENTO
  if (trajectory.pattern === "RECUPERACAO_APOS_ERRO") {
    return {
      topicId,
      category: "RECUPERAÇÃO_EM_ANDAMENTO",
      retentionScore,
      decayRisk,
      errorRecurrence,
      reason: "Tópico em processo ativo de superação de dificuldades e consolidação pós-erro.",
    };
  }

  // 4. RISCO DE ESQUECIMENTO
  if (decayRisk >= 0.6 || currentKnowledgeState === "RISCO_ESQUECIMENTO") {
    return {
      topicId,
      category: "RISCO_DE_ESQUECIMENTO",
      retentionScore,
      decayRisk,
      errorRecurrence,
      reason:
        "Elevado intervalo sem prática ou revisão, indicando probabilidade de perda de memória.",
    };
  }

  // 5. RETENÇÃO FRÁGIL
  if (
    retentionScore < 0.52 ||
    trajectory.pattern === "DOMINIO_FALSO_INSTAVEL" ||
    trajectory.pattern === "REGRESSAO"
  ) {
    return {
      topicId,
      category: "RETENÇÃO_FRÁGIL",
      retentionScore,
      decayRisk,
      errorRecurrence,
      reason: "Retenção oscilante ou vulnerável a lapsos por inconsistência nos resultados.",
    };
  }

  // 6. RETENÇÃO FORTE
  if (
    retentionScore >= 0.76 &&
    decayRisk < 0.35 &&
    (trajectory.pattern === "DOMINIO_CONSISTENTE" || trajectory.pattern === "EVOLUCAO")
  ) {
    return {
      topicId,
      category: "RETENÇÃO_FORTE",
      retentionScore,
      decayRisk,
      errorRecurrence,
      reason:
        "Alto nível de retenção consolidada, com desempenho estável e baixo risco de esquecimento.",
    };
  }

  // 7. RETENÇÃO ESTÁVEL
  return {
    topicId,
    category: "RETENÇÃO_ESTÁVEL",
    retentionScore,
    decayRisk,
    errorRecurrence,
    reason: "Nível adequado e previsível de retenção dentro dos parâmetros operacionais de estudo.",
  };
}
