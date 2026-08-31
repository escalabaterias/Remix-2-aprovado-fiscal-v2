/**
 * SOCRATIC SERVICE — ORQUESTRADOR DO PROFESSOR FISCAL (Fase 7.3.1)
 *
 * Despacha os turnos da sessão socrática para o AI Gateway (task `socratic_tutor`),
 * valida a resposta via `validateSocraticResponse`, previne repetições e loops
 * e atualiza deterministicamente o estado da conversa socrática.
 *
 * SEGURANÇA:
 *  - AI Gateway totalmente server-side com GEMINI_API_KEY protegida.
 *  - Zero alteração em diagnósticos ou métricas de conhecimento persistentes nesta fase.
 */

import { runAiTask } from "@/services/ai/gateway";
import {
  calculateSocraticCachePayload,
  compactSessionContext,
  computeNextStateAndAction,
  detectRepetition,
} from "./engine";
import { SOCRATIC_PROMPT_VERSION, SOCRATIC_SYSTEM_PROMPT } from "./prompts";
import type {
  SocraticResponse,
  SocraticServiceResult,
  SocraticSessionContext,
  SocraticTurnSummary,
} from "./types";
import { validateSocraticResponse } from "./validators";

/**
 * Processa um turno completo na sessão socrática do PROFESSOR FISCAL.
 */
export async function processSocraticTurn(
  context: SocraticSessionContext,
  studentAnswerText?: string,
  options?: { forceRefresh?: boolean },
): Promise<SocraticServiceResult> {
  const currentTurnNumber = context.currentTurnNumber;
  const answer = studentAnswerText !== undefined ? studentAnswerText : context.studentAnswerText;

  // 1. Atualizar context temporário com a resposta atual do aluno
  const currentContext: SocraticSessionContext = {
    ...context,
    studentAnswerText: answer,
  };

  // 2. Prever a próxima transição determinística
  const deterministicPrediction = computeNextStateAndAction(
    currentContext,
    currentContext.turnHistory.length > 0
      ? undefined // Deixar a IA avaliar primeiro se houver resposta nova
      : undefined,
  );

  // 3. Compactar o contexto pedagógico para envio ao AI Gateway
  const compactContext = compactSessionContext(currentContext);

  // 4. Montar a requisição para o AI Gateway com hash de cache determinístico
  const cacheRefPayload = calculateSocraticCachePayload(currentContext, answer);

  const userPrompt = `
CONTEXTO DA SESSÃO SOCRÁTICA:
${JSON.stringify(compactContext, null, 2)}

PREVISÃO DETERMINÍSTICA DA TRANSITION:
- Próximo Estado Recomendado: ${deterministicPrediction.nextState}
- Próxima Ação Recomendada: ${deterministicPrediction.nextAction}
- Nível de Pista Atual: ${deterministicPrediction.nextHintLevel}

RESPOSTA ATUAL DO ALUNO:
"${answer || "(Nenhuma resposta fornecida ainda - iniciar diálogo)"}"

INSTRUÇÕES DO TURNO:
Avalie a resposta do aluno (se presente), identifique a qualidade do raciocínio e lacunas conceituais. Em seguida, produza a resposta no formato JSON estrito especificando a ação ('${deterministicPrediction.nextAction}'), pergunta/pista instigante e nível de pista ('${deterministicPrediction.nextHintLevel}').
`.trim();

  const aiResult = await runAiTask<Record<string, unknown>>({
    type: "socratic_tutor",
    tier: "inteligente",
    inputRef: cacheRefPayload,
    promptVersion: SOCRATIC_PROMPT_VERSION,
    systemPrompt: SOCRATIC_SYSTEM_PROMPT,
    userPrompt,
    forceRefresh: options?.forceRefresh,
  });

  // 5. Tratamento gracioso caso a IA apresente falha de infraestrutura
  if (aiResult.status === "erro" || !aiResult.output) {
    // Fallback gracioso baseado na máquina de estados determinística
    const fallbackResponse: SocraticResponse = {
      status: "active",
      pedagogicalMode: currentContext.pedagogicalMode,
      action: deterministicPrediction.nextAction,
      question:
        deterministicPrediction.nextAction === "ASK" ||
        deterministicPrediction.nextAction === "HINT"
          ? `Vamos analisar o conceito de ${currentContext.topicName}. O que você recorda sobre as regras principais deste tópico?`
          : undefined,
      explanation:
        deterministicPrediction.nextAction === "EXPLAIN"
          ? `O tópico ${currentContext.topicName} envolve fundamentos essenciais do edital. Vamos revisar seus pontos principais.`
          : undefined,
      hintLevel: deterministicPrediction.nextHintLevel,
      confidenceScore: 0.5,
      shouldContinue: deterministicPrediction.shouldContinue,
      generatedAt: new Date().toISOString(),
    };

    const newTurn: SocraticTurnSummary = {
      turnNumber: currentTurnNumber,
      state: deterministicPrediction.nextState,
      action: deterministicPrediction.nextAction,
      questionOrHintText: fallbackResponse.question,
      explanationText: fallbackResponse.explanation,
      studentAnswerText: answer,
      hintLevel: deterministicPrediction.nextHintLevel,
      timestamp: new Date().toISOString(),
    };

    const updatedContext: SocraticSessionContext = {
      ...currentContext,
      currentState: deterministicPrediction.nextState,
      currentTurnNumber: currentTurnNumber + 1,
      hintLevel: deterministicPrediction.nextHintLevel,
      turnHistory: [...currentContext.turnHistory, newTurn],
      studentAnswerText: undefined,
    };

    return {
      response: fallbackResponse,
      updatedContext,
      cached: false,
      status: "erro",
      errorMessage: aiResult.errorMessage || "Falha ao obter orientação socrática da IA.",
    };
  }

  // 6. Validar rigorosamente a saída do modelo contra contratos e guardrails
  let validatedResponse: SocraticResponse;
  try {
    validatedResponse = validateSocraticResponse(aiResult.output, currentContext);
  } catch (valErr: unknown) {
    const errorMsg = valErr instanceof Error ? valErr.message : "Resposta socrática inválida.";

    // Se falhar na validação, aplicar fallback gracioso
    const fallbackResponse: SocraticResponse = {
      status: "active",
      pedagogicalMode: currentContext.pedagogicalMode,
      action: deterministicPrediction.nextAction,
      question: `Como você explicaria com suas próprias palavras o conceito central de ${currentContext.topicName}?`,
      hintLevel: deterministicPrediction.nextHintLevel,
      confidenceScore: 0.6,
      shouldContinue: true,
      generatedAt: new Date().toISOString(),
    };

    const newTurn: SocraticTurnSummary = {
      turnNumber: currentTurnNumber,
      state: deterministicPrediction.nextState,
      action: deterministicPrediction.nextAction,
      questionOrHintText: fallbackResponse.question,
      studentAnswerText: answer,
      hintLevel: deterministicPrediction.nextHintLevel,
      timestamp: new Date().toISOString(),
    };

    const updatedContext: SocraticSessionContext = {
      ...currentContext,
      currentState: deterministicPrediction.nextState,
      currentTurnNumber: currentTurnNumber + 1,
      hintLevel: deterministicPrediction.nextHintLevel,
      turnHistory: [...currentContext.turnHistory, newTurn],
      studentAnswerText: undefined,
    };

    return {
      response: fallbackResponse,
      updatedContext,
      cached: aiResult.cached,
      status: "erro",
      errorMessage: `Erro de Validação Socrática: ${errorMsg}`,
    };
  }

  // 7. Checar repetição para evitar loops
  const textToCheck = validatedResponse.question || validatedResponse.explanation || "";
  const isRepeated = detectRepetition(currentContext.turnHistory, textToCheck);

  if (isRepeated && (validatedResponse.action === "ASK" || validatedResponse.action === "HINT")) {
    validatedResponse.question = `Abordando por outro ângulo: considerando ${currentContext.topicName}, como essa regra se aplica no caso concreto?`;
  }

  // 8. Determinar novo estado socrático
  let finalNextState: SocraticSessionContext["currentState"] = deterministicPrediction.nextState;
  if (validatedResponse.action === "COMPLETE" || validatedResponse.action === "CONSOLIDATE") {
    finalNextState = "COMPLETED";
  } else if (validatedResponse.action === "EXPLAIN") {
    finalNextState = "CORRECTING";
  } else if (validatedResponse.action === "HINT") {
    finalNextState =
      validatedResponse.hintLevel === 1
        ? "HINT_1"
        : validatedResponse.hintLevel === 2
          ? "HINT_2"
          : "HINT_3";
  }

  // 9. Registrar o novo turno
  const turnRecord: SocraticTurnSummary = {
    turnNumber: currentTurnNumber,
    state: finalNextState,
    action: validatedResponse.action,
    questionOrHintText: validatedResponse.question,
    explanationText: validatedResponse.explanation,
    studentAnswerText: answer,
    evaluationClassification: validatedResponse.evaluation?.classification,
    hintLevel: validatedResponse.hintLevel,
    timestamp: new Date().toISOString(),
  };

  const updatedContext: SocraticSessionContext = {
    ...currentContext,
    currentState: finalNextState,
    currentTurnNumber: currentTurnNumber + 1,
    hintLevel: validatedResponse.hintLevel,
    turnHistory: [...currentContext.turnHistory, turnRecord],
    studentAnswerText: undefined, // Limpa para a próxima interação
  };

  return {
    response: validatedResponse,
    updatedContext,
    cached: aiResult.cached,
    status: finalNextState === "COMPLETED" ? "concluido" : "processado",
    model: aiResult.model,
    durationMs: aiResult.durationMs,
  };
}
