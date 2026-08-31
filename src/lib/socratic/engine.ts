/**
 * SOCRATIC ENGINE CORE — MÁQUINA DE ESTADOS E CONTROLADOR DETERMINÍSTICO (Fase 7.3.1)
 *
 * Controla os estados da sessão socrática, a progressão pedagógica de pistas,
 * a compactação do contexto para o LLM e a detecção de repetição.
 *
 * REGRA ARQUITETURAL:
 * O Socratic Engine NÃO descobre nem altera a verdade pedagógica (domínio, prioridade, erros).
 * Ele controla APENAS O FLUXO da conversa dentro das diretrizes determinísticas.
 */

import type {
  SocraticAction,
  SocraticQuestionContext,
  SocraticSessionConstraints,
  SocraticSessionContext,
  SocraticState,
  SocraticTurnSummary,
  StudentResponseEvaluation,
} from "./types";

export const DEFAULT_SOCRATIC_CONSTRAINTS: SocraticSessionConstraints = {
  maxHints: 3,
  maxTurns: 6,
  allowDirectExplanationAfterMaxHints: true,
};

/**
 * Inicializa um SocraticSessionContext válido com defaults seguros.
 */
export function createInitialSessionContext(params: {
  sessionId?: string;
  topicId: string;
  topicName: string;
  subjectName?: string;
  pedagogicalGoal: string;
  pedagogicalMode?: SocraticSessionContext["pedagogicalMode"];
  currentQuestion?: SocraticQuestionContext;
  validTopicNames?: string[];
  constraints?: Partial<SocraticSessionConstraints>;
}): SocraticSessionContext {
  const constraints: SocraticSessionConstraints = {
    ...DEFAULT_SOCRATIC_CONSTRAINTS,
    ...params.constraints,
  };

  const validTopicsSet = new Set<string>();
  validTopicsSet.add(params.topicName);
  if (params.subjectName) validTopicsSet.add(params.subjectName);
  if (params.validTopicNames) {
    for (const name of params.validTopicNames) {
      if (name.trim()) validTopicsSet.add(name.trim());
    }
  }

  return {
    sessionId:
      params.sessionId || `soc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    topicId: params.topicId,
    topicName: params.topicName,
    subjectName: params.subjectName,
    pedagogicalGoal: params.pedagogicalGoal,
    pedagogicalMode: params.pedagogicalMode || "ACTIVE_RECALL",
    currentState: "QUESTION",
    currentTurnNumber: 1,
    hintLevel: 0,
    currentQuestion: params.currentQuestion,
    turnHistory: [],
    constraints,
    validTopicNames: Array.from(validTopicsSet),
  };
}

/**
 * Computa deterministicamente a próxima transição de estado e ação socrática
 * baseando-se no estado atual, na resposta do aluno, na avaliação e nas restrições.
 */
export function computeNextStateAndAction(
  context: SocraticSessionContext,
  evaluation?: StudentResponseEvaluation,
): {
  nextState: SocraticState;
  nextAction: SocraticAction;
  nextHintLevel: number;
  shouldContinue: boolean;
} {
  const { currentState, hintLevel, constraints, currentTurnNumber } = context;
  const maxHints = constraints.maxHints ?? 3;
  const maxTurns = constraints.maxTurns ?? 6;

  // Se já excedeu o limite máximo de turnos, força encerramento/consolidação
  if (currentTurnNumber >= maxTurns) {
    return {
      nextState: "COMPLETED",
      nextAction: "COMPLETE",
      nextHintLevel: hintLevel,
      shouldContinue: false,
    };
  }

  // Estado inicial ou sem avaliação: perguntar
  if (currentState === "QUESTION" && !evaluation) {
    return {
      nextState: "WAITING_FOR_ANSWER",
      nextAction: "ASK",
      nextHintLevel: 0,
      shouldContinue: true,
    };
  }

  // Se não houver avaliação fornecida
  if (!evaluation) {
    return {
      nextState: "WAITING_FOR_ANSWER",
      nextAction: "ASK",
      nextHintLevel: hintLevel,
      shouldContinue: true,
    };
  }

  const { classification } = evaluation;

  // Se a resposta estiver correta -> consolidar e concluir
  if (classification === "CORRECT") {
    return {
      nextState: "CONSOLIDATING",
      nextAction: "CONSOLIDATE",
      nextHintLevel: hintLevel,
      shouldContinue: false,
    };
  }

  // Se a resposta for parcialmente correta ou incorreta
  if (classification === "PARTIALLY_CORRECT" || classification === "INCORRECT") {
    if (hintLevel < maxHints) {
      const nextHintLevel = hintLevel + 1;
      const nextState: SocraticState =
        nextHintLevel === 1 ? "HINT_1" : nextHintLevel === 2 ? "HINT_2" : "HINT_3";

      return {
        nextState,
        nextAction: "HINT",
        nextHintLevel,
        shouldContinue: true,
      };
    } else {
      // Excedeu o limite de pistas -> passar para explicação
      return {
        nextState: "CORRECTING",
        nextAction: "EXPLAIN",
        nextHintLevel: hintLevel,
        shouldContinue: true,
      };
    }
  }

  // Se a resposta for incerta ou ausente
  if (classification === "UNCERTAIN" || classification === "NO_RESPONSE") {
    if (hintLevel < maxHints) {
      const nextHintLevel = hintLevel + 1;
      return {
        nextState: "REFORMULATING",
        nextAction: "REFORMULATE",
        nextHintLevel,
        shouldContinue: true,
      };
    } else {
      return {
        nextState: "CORRECTING",
        nextAction: "EXPLAIN",
        nextHintLevel,
        shouldContinue: true,
      };
    }
  }

  return {
    nextState: "WAITING_FOR_ANSWER",
    nextAction: "ASK",
    nextHintLevel: hintLevel,
    shouldContinue: true,
  };
}

/**
 * Detecta se uma pergunta ou pista proposta já é semanticamente ou textualmente
 * muito semelhante a itens anteriores no histórico dos turnos (evita loops da IA).
 */
export function detectRepetition(history: SocraticTurnSummary[], proposedText: string): boolean {
  if (!proposedText || history.length === 0) return false;

  const normalizedProposed = proposedText.trim().toLowerCase();

  for (const turn of history) {
    if (turn.questionOrHintText) {
      const normalizedHistorical = turn.questionOrHintText.trim().toLowerCase();
      // Comparação direta ou sobreposição de subsequência significativa
      if (
        normalizedProposed === normalizedHistorical ||
        (normalizedProposed.length > 15 &&
          normalizedHistorical.length > 15 &&
          (normalizedProposed.includes(normalizedHistorical) ||
            normalizedHistorical.includes(normalizedProposed)))
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Compacta o histórico e contexto da sessão socrática para consumo eficiente pelo LLM.
 * Limita o histórico aos últimos 3 turnos para não estourar contexto nem poluir respostas.
 */
export function compactSessionContext(context: SocraticSessionContext): Record<string, unknown> {
  const recentHistory = context.turnHistory.slice(-3).map((t) => ({
    turnNumber: t.turnNumber,
    state: t.state,
    action: t.action,
    questionOrHint: t.questionOrHintText ? t.questionOrHintText.substring(0, 200) : undefined,
    studentAnswer: t.studentAnswerText ? t.studentAnswerText.substring(0, 200) : undefined,
    evaluation: t.evaluationClassification,
    hintLevel: t.hintLevel,
  }));

  return {
    sessionId: context.sessionId,
    topicId: context.topicId,
    topicName: context.topicName,
    subjectName: context.subjectName || "",
    pedagogicalGoal: context.pedagogicalGoal,
    pedagogicalMode: context.pedagogicalMode,
    currentState: context.currentState,
    currentTurnNumber: context.currentTurnNumber,
    hintLevel: context.hintLevel,
    currentQuestion: context.currentQuestion
      ? {
          statement: context.currentQuestion.statement,
          options: context.currentQuestion.options,
          targetConcept: context.currentQuestion.targetConcept,
          expectedReasoning: context.currentQuestion.expectedReasoning,
        }
      : undefined,
    latestStudentAnswer: context.studentAnswerText || "",
    history: recentHistory,
    constraints: {
      maxHints: context.constraints.maxHints,
      maxTurns: context.constraints.maxTurns,
    },
    validTopicNames: context.validTopicNames,
  };
}

/**
 * Calcula um payload determinístico para hash de cache no AI Gateway.
 * Garante que respostas diferentes do aluno ou níveis de pistas diferentes
 * gerem chaves de cache distintas!
 */
export function calculateSocraticCachePayload(
  context: SocraticSessionContext,
  studentAnswerText?: string,
): Record<string, unknown> {
  return {
    sessionId: context.sessionId,
    topicId: context.topicId,
    pedagogicalMode: context.pedagogicalMode,
    currentState: context.currentState,
    hintLevel: context.hintLevel,
    turnNumber: context.currentTurnNumber,
    targetConcept: context.currentQuestion?.targetConcept || "",
    questionStatement: context.currentQuestion?.statement || "",
    studentAnswerText: (studentAnswerText ?? context.studentAnswerText ?? "").trim(),
  };
}
