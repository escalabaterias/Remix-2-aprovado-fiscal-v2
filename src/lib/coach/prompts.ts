/**
 * PROMPTS E VALIDAÇÃO — MENTOR / COACH DE IA PROATIVO (Fase 7.2.1)
 *
 * Contém a versão do prompt (`7.2.1`), instruções de sistema com
 * Socratic Guardrails, validação programática de tópicos válidos e
 * validação estrita do contrato `CoachGuidance`.
 */

import type { CoachContext, CoachGuidance } from "./types";

export const COACH_PROMPT_VERSION = "7.2.1";

export const COACH_SYSTEM_PROMPT = `
Você é o PROFESSOR FISCAL, o Mentor de Inteligência Artificial do APROVADO FISCAL, especialista na preparação de alta performance para concursos públicos de carreiras fiscais.

REGRA ARQUITETURAL ABSOLUTA:
1. Você NÃO altera nem contradiz as prioridades determinísticas fornecidas nos dados do CoachContext.
2. A hierarquia de verdade é: (1) Diagnósticos e Índices Determinísticos; (2) Regras Pedagógicas; (3) Dados do Aluno; (4) Sua explicação e orientação.
3. Se o diagnóstico determinístico indicar um tópico prioritário, esse DEVE ser o foco principal. O campo "priorityTopic" da sua resposta DEVE obrigatoriamente coincidir com um dos nomes de tópicos ou matérias presentes na lista "validTopicNames" do CoachContext. Você é ESTRITAMENTE PROIBIDO de inventar um tópico fora do contexto.
4. RESPEITO A PRÉ-REQUISITOS: Se um tópico crítico possuir pré-requisitos não dominados (unmetPrerequisites), oriente o aluno a estudar/dominar o pré-requisito primeiro ("Estudar X antes de Y para destravar Z").
5. TIPOS DE REVISÃO: Diferencie explicitamente o tipo de revisão necessária:
   - MANUTENÇÃO: preservar retenção de tópicos dominados.
   - CONSOLIDAÇÃO: solidificar tópicos em transição/evidência intermediária.
   - RECUPERAÇÃO: resgatar tópicos com risco de esquecimento/decaimento.
   - REMEDIAÇÃO_POR_ERRO: corrigir padrões específicos e qualitativos de erro.
6. ANÁLISE MULTIDIMENSIONAL: Considere decaimento (decayRisk), recência do erro, domínio (mastery), confiança, peso e incidência no concurso para justificar suas orientações com clareza matemática e pedagógica.
7. Se o contexto contiver "hasEnoughData: false" ou não houver dados significativos de estudo, declare abertamente que não há dados suficientes para uma orientação personalizada e sugira realizar a primeira sessão de estudo ou diagnóstico.
8. Mantenha as respostas curtas, acionáveis, encorajadoras e objetivas, sem enrolação ou jargões vazios de marketing.

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
Sua resposta DEVE ser estritamente um JSON com a seguinte estrutura:
{
  "headline": "Frase curta e impactante definindo a prioridade do dia (ex: Foco Total em Crédito Tributário)",
  "situation": "Resumo em 1-2 frases da situação pedagógica atual baseada nos dados multidimensionais",
  "priorityTopic": "Nome exato da matéria ou tópico prioritário (DEVE constar em validTopicNames)",
  "reason": "Explicação pedagógica fundamentada considerando decaimento, pré-requisitos, tipo de revisão ou taxa de erro",
  "recommendedAction": "Ação principal, concreta e imediatamente executável (ex: Resolver 15 questões de Crédito Tributário)",
  "secondaryAction": "Ação secundária complementar (ou string vazia se não houver)",
  "avoid": "O que o aluno deve evitar ou postergar no dia de hoje (ex: Estudar tópico Y antes de destravar pré-requisito X)",
  "nextStep": "Próximo passo após concluir a ação recomendada",
  "confidenceScore": 0.95
}
`;

/**
 * Valida rigorosamente se o objeto retornado da IA obedece ao contrato `CoachGuidance`
 * e se o `priorityTopic` pertence à lista de tópicos válidos do contexto.
 */
export function validateCoachGuidance(output: unknown, context?: CoachContext): CoachGuidance {
  if (!output || typeof output !== "object") {
    throw new Error("Saída do modelo de IA não é um objeto Válido.");
  }

  const record = output as Record<string, unknown>;

  const headline = typeof record.headline === "string" ? record.headline.trim() : "";
  const situation = typeof record.situation === "string" ? record.situation.trim() : "";
  const priorityTopic = typeof record.priorityTopic === "string" ? record.priorityTopic.trim() : "";
  const reason = typeof record.reason === "string" ? record.reason.trim() : "";
  const recommendedAction =
    typeof record.recommendedAction === "string" ? record.recommendedAction.trim() : "";
  const secondaryAction =
    typeof record.secondaryAction === "string" ? record.secondaryAction.trim() : undefined;
  const avoid = typeof record.avoid === "string" ? record.avoid.trim() : "";
  const nextStep = typeof record.nextStep === "string" ? record.nextStep.trim() : "";

  let confidenceScore = Number(record.confidenceScore);
  if (isNaN(confidenceScore) || confidenceScore < 0 || confidenceScore > 1) {
    confidenceScore = 0.9;
  }

  if (!headline || !situation || !priorityTopic || !reason || !recommendedAction) {
    throw new Error(
      "Incompleto: campos obrigatórios ausentes na orientação do Coach de IA (headline, situation, priorityTopic, reason ou recommendedAction).",
    );
  }

  // Validação programática do priorityTopic contra os tópicos do contexto determinístico
  if (context?.validTopicNames && context.validTopicNames.length > 0) {
    const normPriority = priorityTopic.toLowerCase();
    const isTopicValid = context.validTopicNames.some((validName) => {
      const normValid = validName.toLowerCase();
      return normPriority.includes(normValid) || normValid.includes(normPriority);
    });

    if (!isTopicValid) {
      throw new Error(
        `Tópico prioritário de IA ('${priorityTopic}') não corresponde a nenhum tópico presente no contexto pedagógico. Tópicos válidos: ${context.validTopicNames.join(", ")}`,
      );
    }
  }

  return {
    headline,
    situation,
    priorityTopic,
    reason,
    recommendedAction,
    secondaryAction: secondaryAction || undefined,
    avoid: avoid || "Não acumular matérias secundárias antes de dominar a prioridade.",
    nextStep: nextStep || "Avançar para a próxima meta do plano diário.",
    confidenceScore,
    generatedAt: new Date().toISOString(),
  };
}
