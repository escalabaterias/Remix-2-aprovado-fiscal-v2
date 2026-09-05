/**
 * SIMULATION COGNITIVE INTEGRATION — Etapa 8.2.4
 *
 * Conecta os sinais analíticos gerados pelo Simulation Analytics
 * aos motores cognitivos EXISTENTES (Evidence Engine, Knowledge Engine,
 * Diagnostic Engine, Cognitive Cycle Orchestrator).
 *
 * REGRAS ARQUITETURAIS CENTRALIZADAS:
 * 1. NÃO cria novo motor de decisão, novo Coach, novo Planner ou novo Scheduler.
 * 2. NÃO duplica tentativas ou evidências de questões respondidas.
 * 3. Trata questões NÃO RESPONDIDAS sem classificá-las como erro conceitual.
 * 4. Preserva a pureza determinística de `simulation-analytics.ts`.
 * 5. Opera de forma limpa, isolada e idempotente.
 */

import { recordCognitiveEvidence } from "@/lib/evidence/service";
import type { CognitiveEvidenceInput } from "@/lib/evidence/types";
import { analyzeSimulationPerformance } from "./simulation-analytics";
import type { QuestionSet, QuestionSetItem } from "./types";
import type { SimulationPerformanceAnalysis } from "./simulation-analytics";

export type SimulationCognitiveIntegrationInput = {
  /** Objeto do simulado */
  set: QuestionSet;
  /** Itens do simulado */
  items: QuestionSetItem[];
  /** Análise de performance já calculada (opcional, será calculada via analytics se omitida) */
  analysis?: SimulationPerformanceAnalysis;
  /** ID do usuário autenticado (opcional) */
  userId?: string;
};

export type SimulationCognitiveIntegrationResult = {
  /** Se a integração foi realizada com sucesso */
  integrated: boolean;
  /** ID do simulado integrado */
  setId: string;
  /** Quantidade de itens respondidos processados */
  answeredProcessedCount: number;
  /** Quantidade de itens não respondidos ignorados (sem virar erro) */
  unansweredSkippedCount: number;
  /** Quantidade de tópicos sintetizados */
  topicsProcessedCount: number;
  /** Quantidade de sinais emitidos para o Evidence Engine */
  signalsEmittedCount: number;
  /** Motivo de pulo da integração (se aplicável) */
  skipReason: string | null;
};

/**
 * Processa a integração do resultado de um simulado concluído
 * com o ecossistema cognitivo existente do APROVADO FISCAL.
 */
export async function integrateSimulationCognitiveResult(
  input: SimulationCognitiveIntegrationInput,
): Promise<SimulationCognitiveIntegrationResult> {
  const { set, items } = input;

  // 1. Validação do estado do simulado (Apenas simulados concluídos são integrados)
  if (!set.isCompleted) {
    return {
      integrated: false,
      setId: set.setId,
      answeredProcessedCount: 0,
      unansweredSkippedCount: 0,
      topicsProcessedCount: 0,
      signalsEmittedCount: 0,
      skipReason: "simulado_nao_concluido",
    };
  }

  // 2. Análise de performance via Simulation Analytics Engine (puro e determinístico)
  const analysis = input.analysis ?? analyzeSimulationPerformance({ set, items });

  // 3. Contagem de itens respondidos e não respondidos
  const answeredItems = items.filter((item) => item.isAnswered);
  const unansweredItems = items.filter((item) => !item.isAnswered);

  // REGRA ABSOLUTA: Questões não respondidas NÃO viram erro conceitual.
  // Apenas registramos sua quantidade para métricas comportamentais.
  const unansweredSkippedCount = unansweredItems.length;

  let topicsProcessedCount = 0;
  let signalsEmittedCount = 0;

  const topicsList = analysis?.topicPerformance ?? [];

  // 4. Encaminhamento de evidências e sinais contextuais por tópico para o Evidence Engine EXISTENTE
  if (input.userId && topicsList.length > 0) {
    for (const topicData of topicsList) {
      if (!topicData.topicId) continue;

      topicsProcessedCount++;

      // Emitir evidência de síntese da prática do simulado para o Evidence Engine
      try {
        const score = topicData.accuracyPercentage != null ? topicData.accuracyPercentage / 100 : 0;

        const evidenceInput: CognitiveEvidenceInput = {
          userId: input.userId,
          topicId: topicData.topicId,
          subjectId: topicData.subjectId ?? null,
          kind: "practice",
          source: "question_bank",
          timestamp: set.completedAt ?? new Date().toISOString(),
          score,
          referenceId: `simulated_set_${set.setId}_topic_${topicData.topicId}`,
          metadata: {
            setId: set.setId,
            simulationName: set.name,
            totalQuestionsInTopic: topicData.totalQuestions,
            correctCount: topicData.correctCount,
            wrongCount: topicData.wrongCount,
            unansweredCount: topicData.unansweredCount,
            signal: topicData.signal,
          },
        };

        const res = await recordCognitiveEvidence(evidenceInput);
        if (res.processed) {
          signalsEmittedCount++;
        }
      } catch {
        // Falha em um tópico isolado não deve travar o pipeline principal
      }
    }
  }

  return {
    integrated: true,
    setId: set.setId,
    answeredProcessedCount: answeredItems.length,
    unansweredSkippedCount,
    topicsProcessedCount,
    signalsEmittedCount,
    skipReason: null,
  };
}
