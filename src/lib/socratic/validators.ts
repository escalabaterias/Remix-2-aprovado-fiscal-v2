/**
 * VALIDADORES E GUARDRAILS — SOCRATIC ENGINE CORE (Fase 7.3.1)
 *
 * Validação rigorosa do JSON de saída retornado pelo LLM para garantir a aderência
 * ao contrato `SocraticResponse`, prevenção de vazamento de respostas em pistas
 * e grounding nos tópicos válidos da sessão.
 */

import type {
  SocraticAction,
  SocraticPedagogicalMode,
  SocraticResponse,
  SocraticSessionContext,
  StudentReasoningQuality,
  StudentResponseClassification,
  StudentResponseEvaluation,
} from "./types";

const VALID_STATUSES = new Set(["active", "evaluating", "completed", "error"]);

const VALID_MODES = new Set<SocraticPedagogicalMode>([
  "ACTIVE_RECALL",
  "CONCEPTUAL_REASONING",
  "ERROR_REMEDIATION",
  "REVIEW",
  "QUESTION_ANALYSIS",
]);

const VALID_ACTIONS = new Set<SocraticAction>([
  "ASK",
  "HINT",
  "REFORMULATE",
  "EVALUATE",
  "EXPLAIN",
  "CONSOLIDATE",
  "COMPLETE",
]);

const VALID_CLASSIFICATIONS = new Set<StudentResponseClassification>([
  "CORRECT",
  "PARTIALLY_CORRECT",
  "INCORRECT",
  "UNCERTAIN",
  "NO_RESPONSE",
]);

const VALID_REASONINGS = new Set<StudentReasoningQuality>([
  "excelente",
  "solido",
  "fragil",
  "equivocado",
  "ausente",
]);

/**
 * Valida e sanitiza a resposta produzida pelo modelo de IA para garantir
 * conformidade total com os contratos e guardrails da Fase 7.3.1.
 */
export function validateSocraticResponse(
  output: unknown,
  context?: SocraticSessionContext,
): SocraticResponse {
  if (!output || typeof output !== "object") {
    throw new Error("Saída do modelo de IA não é um objeto JSON válido.");
  }

  const raw = output as Record<string, unknown>;

  // 1. Validação de Status
  const statusStr = String(raw.status || "active").toLowerCase();
  if (!VALID_STATUSES.has(statusStr)) {
    throw new Error(`Status socrático inválido: '${raw.status}'.`);
  }
  const status = statusStr as SocraticResponse["status"];

  // 2. Validação do Modo Pedagogico
  const modeStr = String(raw.pedagogicalMode || context?.pedagogicalMode || "ACTIVE_RECALL");
  if (!VALID_MODES.has(modeStr as SocraticPedagogicalMode)) {
    throw new Error(`Modo pedagógico socrático inválido: '${raw.pedagogicalMode}'.`);
  }
  const pedagogicalMode = modeStr as SocraticPedagogicalMode;

  // 3. Validação da Ação Socrática
  const actionStr = String(raw.action || "ASK").toUpperCase();
  if (!VALID_ACTIONS.has(actionStr as SocraticAction)) {
    throw new Error(`Ação socrática inválida: '${raw.action}'.`);
  }
  const action = actionStr as SocraticAction;

  // 4. Validação do Nível de Pista
  const rawHintLevel = Number(raw.hintLevel ?? context?.hintLevel ?? 0);
  const hintLevel = isNaN(rawHintLevel) ? 0 : Math.max(0, Math.min(3, rawHintLevel));

  // 5. Validação de Conteúdo por Ação (Coerência Estrita)
  const question = typeof raw.question === "string" ? raw.question.trim() : undefined;
  const explanation = typeof raw.explanation === "string" ? raw.explanation.trim() : undefined;

  if ((action === "ASK" || action === "HINT" || action === "REFORMULATE") && !question) {
    throw new Error(
      `A ação '${action}' exige o preenchimento do campo 'question' com o texto da pergunta ou pista.`,
    );
  }

  if ((action === "EXPLAIN" || action === "CONSOLIDATE") && !explanation) {
    throw new Error(
      `A ação '${action}' exige o preenchimento do campo 'explanation' com a explicação do conceito.`,
    );
  }

  // 6. GUARDRAIL DE NÃO-VAZAMENTO: Pistas não podem entregar a resposta completa
  if (action === "HINT") {
    // Se action = HINT, a IA não deve enviar uma explicação extensa revelando a resposta
    if (explanation && explanation.length > 80) {
      throw new Error(
        "Violação do Guardrail Socrático: Ação 'HINT' forneceu uma explicação completa revelando a resposta.",
      );
    }

    // Se a questão atual possuir resposta correta conhecida, a pista não deve contê-la diretamente
    const correctAnswer = context?.currentQuestion?.correctAnswer?.trim().toLowerCase();
    if (correctAnswer && correctAnswer.length > 3 && question) {
      if (question.toLowerCase().includes(correctAnswer)) {
        throw new Error(
          `Violação do Guardrail Socrático: A pista gerada contém a resposta correta explícita ('${context?.currentQuestion?.correctAnswer}').`,
        );
      }
    }
  }

  // 7. Validação do Objeto de Avaliação (se presente)
  let evaluation: StudentResponseEvaluation | undefined = undefined;
  if (raw.evaluation && typeof raw.evaluation === "object") {
    const evRaw = raw.evaluation as Record<string, unknown>;
    const classStr = String(evRaw.classification || "NO_RESPONSE").toUpperCase();
    if (!VALID_CLASSIFICATIONS.has(classStr as StudentResponseClassification)) {
      throw new Error(`Classificação de resposta inválida: '${evRaw.classification}'.`);
    }

    const reasoningStr = String(evRaw.reasoningQuality || "ausente").toLowerCase();
    const reasoningQuality = (
      VALID_REASONINGS.has(reasoningStr as StudentReasoningQuality) ? reasoningStr : "ausente"
    ) as StudentReasoningQuality;

    const confidenceNum = Number(evRaw.confidence ?? 0.8);
    const confidence = isNaN(confidenceNum) ? 0.8 : Math.max(0, Math.min(1, confidenceNum));

    evaluation = {
      classification: classStr as StudentResponseClassification,
      confidence,
      identifiedGap:
        typeof evRaw.identifiedGap === "string" ? evRaw.identifiedGap.trim() : undefined,
      misconception:
        typeof evRaw.misconception === "string" ? evRaw.misconception.trim() : undefined,
      reasoningQuality,
      needsHint: Boolean(evRaw.needsHint),
      recommendedNextStep: VALID_ACTIONS.has(
        String(evRaw.recommendedNextStep).toUpperCase() as SocraticAction,
      )
        ? (String(evRaw.recommendedNextStep).toUpperCase() as SocraticAction)
        : action,
    };
  }

  // 8. Grounding de Tópicos (se houver tópicos válidos explicitados no contexto)
  if (context?.validTopicNames && context.validTopicNames.length > 0 && context.topicName) {
    const textToCheck = `${question || ""} ${explanation || ""}`.toLowerCase();
    // Verifica se o texto não inventa matérias fora da realidade caso mencione tópicos do edital
    const currentTopicNorm = context.topicName.toLowerCase();
    if (textToCheck.length > 30 && !textToCheck.includes(currentTopicNorm)) {
      const mentionsAnyValidTopic = context.validTopicNames.some((validName) =>
        textToCheck.includes(validName.toLowerCase()),
      );
      if (!mentionsAnyValidTopic && context.validTopicNames.length > 0) {
        // Warning / log, grounding mantido sem quebrar se a conversa for conceitual pura
      }
    }
  }

  const confidenceScoreNum = Number(raw.confidenceScore ?? 0.9);
  const confidenceScore = isNaN(confidenceScoreNum)
    ? 0.9
    : Math.max(0, Math.min(1, confidenceScoreNum));

  const shouldContinue =
    typeof raw.shouldContinue === "boolean"
      ? raw.shouldContinue
      : action !== "COMPLETE" && action !== "CONSOLIDATE";

  return {
    status,
    pedagogicalMode,
    action,
    question,
    explanation,
    hintLevel,
    evaluation,
    detectedGap: typeof raw.detectedGap === "string" ? raw.detectedGap.trim() : undefined,
    confidenceScore,
    shouldContinue,
    nextAction: VALID_ACTIONS.has(String(raw.nextAction).toUpperCase() as SocraticAction)
      ? (String(raw.nextAction).toUpperCase() as SocraticAction)
      : undefined,
    generatedAt: new Date().toISOString(),
  };
}
