/**
 * SERVICE DE ORQUESTRAÇÃO SOCRÁTICA COM GROUNDING JURÍDICO (Fase 7.3.2)
 *
 * Integra a Camada de Recuperação Jurídica ao Socratic Engine 7.3.1, à Central de Erros,
 * ao Review Engine e ao AI Gateway 7.1, garantindo resposta socrática 100% fundamentada.
 */

import { runAiTask } from "@/services/ai/gateway";
import {
  calculateSocraticCachePayload,
  compactSessionContext,
  computeNextStateAndAction,
} from "../socratic/engine";
import type {
  SocraticResponse,
  SocraticServiceResult,
  SocraticSessionContext,
} from "../socratic/types";
import { validateSocraticResponse } from "../socratic/validators";
import { validateLegalGrounding } from "./grounding";
import { LEGAL_SOCRATIC_PROMPT_VERSION, LEGAL_SOCRATIC_SYSTEM_PROMPT } from "./prompts";
import { retrieveLegalSources } from "./retrieval";
import type {
  LegalEvidenceMetadata,
  LegalRetrievalContext,
  LegalSource,
  SocraticLegalContext,
} from "./types";

/**
 * Prepara o contexto de recuperação jurídica a partir dos dados da sessão socrática.
 */
export function prepareLegalRetrievalContext(
  socraticContext: SocraticSessionContext,
  extra?: Partial<LegalRetrievalContext>,
): LegalRetrievalContext {
  const meta = socraticContext.contextMetadata || {};

  const questionContext = socraticContext.currentQuestion
    ? {
        questionId: socraticContext.currentQuestion.id,
        statement: socraticContext.currentQuestion.statement,
        correctAnswer: socraticContext.currentQuestion.correctAnswer,
        explanation: socraticContext.currentQuestion.explanation,
      }
    : undefined;

  const errorContext =
    (meta.errorContext as LegalRetrievalContext["errorContext"]) ||
    (meta.errorCategory
      ? {
          errorCategory: String(meta.errorCategory),
          errorPattern: meta.errorPattern ? String(meta.errorPattern) : undefined,
          isRecurring: Boolean(meta.isRecurring),
        }
      : undefined);

  const reviewType = (meta.reviewType as string) || extra?.reviewType || undefined;

  return {
    topicId: socraticContext.topicId,
    topicName: socraticContext.topicName,
    subjectName: socraticContext.subjectName,
    targetConcept:
      socraticContext.currentQuestion?.targetConcept || socraticContext.pedagogicalGoal,
    questionContext,
    errorContext,
    reviewType,
    ...extra,
  };
}

/**
 * Calcula uma assinatura determinística das fontes jurídicas para inclusão na chave de cache.
 */
export function calculateLegalSourcesCacheKey(sources: LegalSource[]): string {
  if (sources.length === 0) return "no_legal_sources";
  return sources
    .map((s) => `${s.sourceId}:${s.version || "1.0"}:${s.validityStatus}`)
    .sort()
    .join("|");
}

/**
 * Prepara os metadados de evidência preparados para integração com a Evidence Layer.
 */
export function buildLegalEvidenceMetadata(
  sources: LegalSource[],
  isGrounded: boolean,
  targetConcept?: string,
  method = "topic_and_concept_match",
): LegalEvidenceMetadata {
  return {
    legalSourceUsed: sources.map((s) => s.sourceId),
    legalGrounded: isGrounded,
    sourceCount: sources.length,
    targetConcept: targetConcept || "Direito Tributário",
    retrievalMethod: method,
  };
}

/**
 * Processa um turno socrático completo com recuperação e grounding jurídico.
 */
export async function processLegalSocraticTurn(
  context: SocraticSessionContext,
  studentAnswerText?: string,
  options?: {
    forceRefresh?: boolean;
    customSources?: LegalSource[];
    retrievalOverride?: Partial<LegalRetrievalContext>;
  },
): Promise<SocraticServiceResult & { legalEvidenceMetadata?: LegalEvidenceMetadata }> {
  const answer = studentAnswerText !== undefined ? studentAnswerText : context.studentAnswerText;

  // 1. Atualizar contexto temporário com a resposta atual do aluno
  const currentContext: SocraticSessionContext = {
    ...context,
    studentAnswerText: answer,
  };

  // 2. Preparar o contexto de recuperação e recuperar fontes jurídicas auditadas
  const retrievalCtx = prepareLegalRetrievalContext(currentContext, options?.retrievalOverride);
  const retrievedSources = retrieveLegalSources(retrievalCtx, options?.customSources);

  // 3. Montar a estrutura de contexto jurídico socrático
  const legalContext: SocraticLegalContext = {
    relevantLegalSources: retrievedSources,
    targetLegalConcept:
      currentContext.currentQuestion?.targetConcept || currentContext.pedagogicalGoal,
    reviewType: retrievalCtx.reviewType,
    errorCategory: retrievalCtx.errorContext?.errorCategory,
    legalRetrievalMethod: retrievedSources.length > 0 ? "topic_match" : "fallback",
  };

  // Anexar o contexto jurídico aos metadados do contexto de sessão sem alterar o contrato base
  const enrichedContext: SocraticSessionContext = {
    ...currentContext,
    contextMetadata: {
      ...(currentContext.contextMetadata || {}),
      legalContext,
    },
  };

  // 4. Prever a próxima transição determinística da máquina de estados
  const deterministicPrediction = computeNextStateAndAction(enrichedContext, undefined);

  // 5. Compactar o contexto pedagógico para envio ao AI Gateway
  const compactContext = compactSessionContext(enrichedContext);

  // 6. Montar a requisição com assinatura do contexto jurídico no payload de cache
  const baseCachePayload = calculateSocraticCachePayload(enrichedContext, answer);
  const legalCacheKey = calculateLegalSourcesCacheKey(retrievedSources);
  const cacheRefPayload = `${baseCachePayload}::legal[${legalCacheKey}]`;

  const userPrompt = `
CONTEXTO DA SESSÃO SOCRÁTICA COM GROUNDING JURÍDICO:
${JSON.stringify(compactContext, null, 2)}

FONTES JURÍDICAS DISPONÍVEIS NO CONTEXTO:
${
  retrievedSources.length > 0
    ? JSON.stringify(
        retrievedSources.map((s) => ({
          sourceId: s.sourceId,
          documentIdentifier: s.documentIdentifier,
          article: s.article,
          text: s.text,
          validityStatus: s.validityStatus,
        })),
        null,
        2,
      )
    : "NENHUMA FONTE JURÍDICA LOCALIZADA PARA ESTE TÓPICO/CONCEITO NO MOMENTO."
}

ORIENTAÇÕES PEDAGÓGICAS E REGRAS DE REVISÃO/ERRO:
- Tipo de Revisão Ativa: ${retrievalCtx.reviewType || "Padrão"}
- Categoria de Erro (se houver): ${retrievalCtx.errorContext?.errorCategory || "Nenhuma"}
- Previsão Determinística de Estado: ${deterministicPrediction.nextState}
- Ação Recomendada: ${deterministicPrediction.nextAction}
- Nível de Pista Atual: ${deterministicPrediction.nextHintLevel}

RESPOSTA ATUAL DO ALUNO:
"${answer || "(Nenhuma resposta fornecida ainda - iniciar diálogo)"}"

INSTRUÇÕES DO TURNO:
Avalie a resposta do aluno e produza o JSON estrito. Se utilizar fundamentos jurídicos, baseie-se EXCLUSIVAMENTE nas fontes listadas acima.
`.trim();

  // 7. Chamada ao AI Gateway via task socratic_tutor
  const aiResult = await runAiTask<Record<string, unknown>>({
    type: "socratic_tutor",
    tier: "inteligente",
    inputRef: cacheRefPayload,
    promptVersion: LEGAL_SOCRATIC_PROMPT_VERSION,
    systemPrompt: LEGAL_SOCRATIC_SYSTEM_PROMPT,
    userPrompt,
    forceRefresh: options?.forceRefresh,
  });

  // 8. Tratamento gracioso para falha na IA
  if (aiResult.status === "erro" || !aiResult.output) {
    const fallbackResponse: SocraticResponse = {
      status: "active",
      pedagogicalMode: currentContext.pedagogicalMode,
      action: deterministicPrediction.nextAction,
      question:
        deterministicPrediction.nextAction === "ASK" ||
        deterministicPrediction.nextAction === "HINT"
          ? `Vamos analisar os aspectos legais do tópico ${currentContext.topicName}. Qual princípio ou dispositivo tributário se aplica?`
          : undefined,
      explanation:
        deterministicPrediction.nextAction === "EXPLAIN"
          ? retrievedSources.length > 0
            ? `De acordo com a norma [${retrievedSources[0]!.documentIdentifier} - ${retrievedSources[0]!.article || ""}]: ${retrievedSources[0]!.text}`
            : `O tópico ${currentContext.topicName} possui regras específicas do edital. Vamos revisar seus princípios.`
          : undefined,
      hintLevel: deterministicPrediction.nextHintLevel,
      confidenceScore: 0.8,
      shouldContinue: true,
      nextAction: deterministicPrediction.nextAction,
    };

    const evidenceMetadata = buildLegalEvidenceMetadata(
      retrievedSources,
      retrievedSources.length > 0,
      retrievalCtx.targetConcept,
      "fallback_deterministic",
    );

    return {
      response: fallbackResponse,
      updatedContext: enrichedContext,
      cached: false,
      status: "erro",
      errorMessage: aiResult.errorMessage || "Falha ao processar pelo AI Gateway.",
      legalEvidenceMetadata: evidenceMetadata,
    };
  }

  // 9. Validação de formato e sanidade do JSON retornado pela IA
  const validatedResponse = validateSocraticResponse(aiResult.output, enrichedContext);

  // 10. Validação de Grounding Jurídico e Prevenção de Alucinação Normativa
  const textToVerify =
    (validatedResponse.question || "") + " " + (validatedResponse.explanation || "");
  const groundingCheck = validateLegalGrounding(textToVerify, retrievedSources);

  // Se a IA gerou citação ungrounded (alucinação), sanitizamos o texto para garantir taxa zero de alucinação
  if (groundingCheck.hasHallucination && groundingCheck.sanitizedText) {
    if (validatedResponse.explanation) {
      validatedResponse.explanation = groundingCheck.sanitizedText;
    } else if (validatedResponse.question) {
      validatedResponse.question = `Qual é o princípio aplicável a este caso? (${groundingCheck.sanitizedText})`;
    }
  }

  // Anexar o resultado de grounding ao contexto atualizado
  const finalLegalContext: SocraticLegalContext = {
    ...legalContext,
    legalGrounding: groundingCheck,
  };

  const finalEnrichedContext: SocraticSessionContext = {
    ...enrichedContext,
    contextMetadata: {
      ...(enrichedContext.contextMetadata || {}),
      legalContext: finalLegalContext,
    },
  };

  const evidenceMetadata = buildLegalEvidenceMetadata(
    groundingCheck.sourcesUsed,
    groundingCheck.isGrounded,
    retrievalCtx.targetConcept,
    legalContext.legalRetrievalMethod,
  );

  return {
    response: validatedResponse,
    updatedContext: finalEnrichedContext,
    cached: aiResult.cached || false,
    status: "processado",
    model: aiResult.model,
    durationMs: aiResult.durationMs,
    legalEvidenceMetadata: evidenceMetadata,
  };
}
