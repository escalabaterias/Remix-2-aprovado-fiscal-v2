/**
 * ADAPTIVE STUDY ARTIFACT GENERATOR — Fase 7.6.2
 *
 * Motor responsável por gerar o conteúdo do artefato cognitivo decidido
 * pelo Artifacts Engine 7.6.1 via AI Gateway existente.
 */

import { runAiTask } from "@/services/ai/gateway";
import { decideStudyArtifact } from "./engine";
import { ARTIFACT_PROMPT_VERSION, ARTIFACT_SYSTEM_PROMPT } from "./prompts";
import type { ArtifactDecision, ArtifactKind } from "./types";
import type {
  ArtifactGenerationContext,
  ArtifactGenerationResult,
  GeneratedArtifact,
  GeneratedArtifactContent,
} from "./generation-types";
import { validateLegalGrounding } from "../legal/grounding";
import { deriveArtifactPresentationProfile } from "./personalization";

/**
 * Constrói o artefato determinístico seguro de fallback quando a IA falha ou contexto é insuficiente.
 */
export function buildDeterministicFallbackArtifact(
  context: ArtifactGenerationContext,
  artifactKind: ArtifactKind,
): GeneratedArtifact {
  const { topicId, topicName, availableMinutes = 15 } = context;
  const title = `Artefato de Fixação: ${topicName}`;

  let content: GeneratedArtifactContent = { title };

  switch (artifactKind) {
    case "MNEMONIC":
      content = {
        title,
        summaryOrOverview: `Mnemônico de emergência para ${topicName}`,
        mnemonic: {
          word: "CORE",
          expansion: [
            { letter: "C", meaning: "Conceito Chave do Tópico" },
            { letter: "O", meaning: "Obrigações e Regras Principais" },
            { letter: "R", meaning: "Requisitos de Aplicação" },
            { letter: "E", meaning: "Exceções e Casos Especiais" },
          ],
          explanation: `Estrutura de memorização direta para o tópico ${topicName}.`,
        },
      };
      break;

    case "MIND_MAP":
      content = {
        title,
        summaryOrOverview: `Mapa Mental do Tópico ${topicName}`,
        mindMap: {
          centralNode: topicName,
          nodes: [
            { id: "n1", label: "Fundamentos Legais", parent: topicName },
            { id: "n2", label: "Requisitos & Elementos", parent: topicName },
            { id: "n3", label: "Exceções de Prova", parent: topicName },
          ],
        },
      };
      break;

    case "FLASHCARD":
      content = {
        title,
        summaryOrOverview: `Flashcard de Estudo Direto: ${topicName}`,
        flashcard: {
          front: `Qual é o elemento essencial que define a aplicação de ${topicName}?`,
          back: `Requisitos legais e conceitos chave definidos nas normas do edital.`,
          keyConcept: topicName,
        },
      };
      break;

    case "SUMMARY":
      content = {
        title,
        summaryOrOverview: `Síntese Direta de Estudo: ${topicName}`,
        summary: {
          keyPoints: [
            `Definição essencial e aplicação prática de ${topicName}.`,
            `Pontos de maior incidência em questões do edital.`,
          ],
          coreRule: `Regra geral aplicável a ${topicName}.`,
          exceptions: ["Exceções previstas em regulamento."],
        },
      };
      break;

    case "COMPARISON_TABLE":
      content = {
        title,
        summaryOrOverview: `Quadro Comparativo: ${topicName}`,
        comparisonTable: {
          conceptA: `${topicName} (Regra Geral)`,
          conceptB: `${topicName} (Exceção/Especial)`,
          headers: ["Característica", "Regra Geral", "Exceção"],
          rows: [
            {
              feature: "Fundamento",
              valA: "Aplicação direta e ordinária",
              valB: "Aplicação condicional",
            },
            {
              feature: "Requisitos",
              valA: "Requisitos padrão do edital",
              valB: "Requisitos específicos adicionais",
            },
          ],
        },
      };
      break;

    case "ACTIVE_RECALL":
    default:
      content = {
        title,
        summaryOrOverview: `Sessão de Recuperação Ativa: ${topicName}`,
        activeRecall: {
          promptQuestions: [
            {
              id: 1,
              question: `Como você explicaria a regra principal de ${topicName} sem consultar o material?`,
              hint: "Pense na finalidade da norma.",
            },
            {
              id: 2,
              question: `Quais são as pegadinhas mais comuns da banca sobre ${topicName}?`,
              hint: "Lembre-se dos casos de exceção.",
            },
          ],
        },
      };
      break;
  }

  const presentationProfile =
    context.presentationProfile ??
    deriveArtifactPresentationProfile({
      userId: context.userId,
      topicId: context.topicId,
      artifactKind,
      legalSourcesCount: context.legalSources?.length ?? 0,
    });

  return {
    artifactId: `art-fallback-${topicId}-${Date.now()}`,
    artifactKind,
    topicId,
    title,
    content,
    sourceContext: {
      hasLegalSources: (context.legalSources?.length ?? 0) > 0,
      availableMinutes,
      errorCountUsed: context.knownErrorsSummary ? 1 : 0,
    },
    grounded: true,
    presentationProfile,
    dataConfidence: 0.5,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Valida a integridade da estrutura gerada para o tipo de artefato específico.
 */
export function validateGeneratedArtifactContent(
  content: any,
  artifactKind: ArtifactKind,
): boolean {
  if (!content || typeof content !== "object") return false;
  if (!content.title || typeof content.title !== "string") return false;

  switch (artifactKind) {
    case "MNEMONIC":
      return (
        !!content.mnemonic &&
        typeof content.mnemonic.word === "string" &&
        Array.isArray(content.mnemonic.expansion) &&
        content.mnemonic.expansion.length > 0
      );

    case "MIND_MAP":
      return (
        !!content.mindMap &&
        typeof content.mindMap.centralNode === "string" &&
        Array.isArray(content.mindMap.nodes)
      );

    case "FLASHCARD":
      return (
        !!content.flashcard &&
        typeof content.flashcard.front === "string" &&
        typeof content.flashcard.back === "string"
      );

    case "SUMMARY":
      return (
        !!content.summary &&
        Array.isArray(content.summary.keyPoints) &&
        typeof content.summary.coreRule === "string"
      );

    case "COMPARISON_TABLE":
      return (
        !!content.comparisonTable &&
        typeof content.comparisonTable.conceptA === "string" &&
        typeof content.comparisonTable.conceptB === "string" &&
        Array.isArray(content.comparisonTable.rows)
      );

    case "ACTIVE_RECALL":
      return (
        !!content.activeRecall &&
        Array.isArray(content.activeRecall.promptQuestions) &&
        content.activeRecall.promptQuestions.length > 0
      );

    default:
      return false;
  }
}

/**
 * Função principal para geração de artefato adaptativo.
 */
export async function generateStudyArtifact(
  context: ArtifactGenerationContext,
): Promise<ArtifactGenerationResult> {
  const { userId, topicId, topicName, legalSources = [], availableMinutes = 15 } = context;

  // 1. Decisão do tipo de artefato: AUTORIDADE DETERMINÍSTICA Absoluta (Fase 7.6.1)
  const artifactDecision: ArtifactDecision =
    context.artifactDecision ??
    decideStudyArtifact({
      userId,
      topicId,
      decisionResult: context.decisionResult,
    });

  const selectedKind: ArtifactKind = artifactDecision.primaryArtifact;

  const presentationProfile =
    context.presentationProfile ??
    deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: selectedKind,
      pedagogicalAction: artifactDecision.pedagogicalAction,
      legalSourcesCount: legalSources.length,
    });

  // 2. Montar prompt do usuário
  const userPromptPayload = {
    userId,
    topicId,
    topicName,
    requestedArtifactKind: selectedKind,
    availableMinutes,
    legalSourcesSummary: legalSources.map((s) => ({
      doc: s.documentIdentifier,
      art: s.article,
      text: s.text,
    })),
    knownErrorsSummary: context.knownErrorsSummary ?? "Nenhum erro reportado.",
    studyNotes: context.studyNotes ?? "",
    presentationProfile,
  };

  const userPrompt = `
Gere o artefato cognitivo de estudo para o tópico abaixo.

INSTRUÇÕES DE AUTORIDADE:
- Tipo de Artefato EXIGIDO: '${selectedKind}' (NÃO ALTERAR)
- Tópico: ${topicName}
- Tempo Disponível: ${availableMinutes} minutos

PERFIL DE APRESENTAÇÃO EXIGIDO (FORMATO E APRESENTAÇÃO):
- Complexidade: ${presentationProfile.complexity}
- Densidade: ${presentationProfile.density}
- Estrutura Visual: ${presentationProfile.visualStructure}
- Nível de Exemplos: ${presentationProfile.exampleLevel}
- Intensidade de Recall: ${presentationProfile.recallIntensity}
- Detalhamento Jurídico: ${presentationProfile.legalDetailLevel}

FONTES JURÍDICAS DISPONÍVEIS NO CONTEXTO:
${JSON.stringify(userPromptPayload.legalSourcesSummary, null, 2)}

RESUMO DE ERROS E DIFICULDADES DO ALUNO:
${userPromptPayload.knownErrorsSummary}

Crie a resposta estritamente no formato JSON estruturado com o campo 'title' e o objeto relativo a '${selectedKind}'.
`.trim();

  try {
    const aiResult = await runAiTask<any>({
      type: `artifact.generation.${selectedKind.toLowerCase()}`,
      tier: "inteligente",
      inputRef: {
        userId,
        topicId,
        selectedKind,
        promptVer: ARTIFACT_PROMPT_VERSION,
      },
      promptVersion: ARTIFACT_PROMPT_VERSION,
      systemPrompt: ARTIFACT_SYSTEM_PROMPT,
      userPrompt,
    });

    if (aiResult.status === "erro" || !aiResult.output) {
      const fallback = buildDeterministicFallbackArtifact(context, selectedKind);
      return {
        success: true,
        artifact: fallback,
        fallbackApplied: true,
        cached: false,
        statusMessage: "Fallback determinístico aplicado por indisponibilidade da IA.",
      };
    }

    const output = aiResult.output;
    const isValid = validateGeneratedArtifactContent(output, selectedKind);

    if (!isValid) {
      const fallback = buildDeterministicFallbackArtifact(context, selectedKind);
      return {
        success: true,
        artifact: fallback,
        fallbackApplied: true,
        cached: aiResult.cached,
        statusMessage: "Fallback determinístico aplicado por erro de estrutura na IA.",
      };
    }

    // 3. Validação de Grounding Jurídico
    let isGrounded = true;
    let groundingDetails: { unfoundCitations: string[]; groundingScore: number } | undefined;

    if (legalSources.length > 0) {
      const rawTextForGrounding = JSON.stringify(output);
      const groundingRes = validateLegalGrounding(rawTextForGrounding, legalSources);
      isGrounded = groundingRes.isGrounded;
      groundingDetails = {
        unfoundCitations: groundingRes.unfoundCitations,
        groundingScore: groundingRes.groundingScore,
      };

      if (!isGrounded) {
        // Se houver alucinação legal, aplicar fallback seguro e sem alucinações
        const fallback = buildDeterministicFallbackArtifact(context, selectedKind);
        return {
          success: true,
          artifact: fallback,
          fallbackApplied: true,
          cached: false,
          statusMessage: "Fallback determinístico aplicado para prevenir alucinação jurídica.",
        };
      }
    }

    const generatedArtifact: GeneratedArtifact = {
      artifactId: `art-${topicId}-${selectedKind.toLowerCase()}-${Date.now()}`,
      artifactKind: selectedKind,
      topicId,
      title: output.title || `Artefato: ${topicName}`,
      content: output,
      sourceContext: {
        hasLegalSources: legalSources.length > 0,
        availableMinutes,
        errorCountUsed: context.knownErrorsSummary ? 1 : 0,
      },
      grounded: isGrounded,
      presentationProfile,
      groundingDetails,
      dataConfidence: artifactDecision.dataConfidence,
      generatedAt: new Date().toISOString(),
    };

    return {
      success: true,
      artifact: generatedArtifact,
      fallbackApplied: false,
      cached: aiResult.cached,
    };
  } catch (err: unknown) {
    const fallback = buildDeterministicFallbackArtifact(context, selectedKind);
    return {
      success: true,
      artifact: fallback,
      fallbackApplied: true,
      cached: false,
      errorMessage: err instanceof Error ? err.message : "Erro desconhecido ao gerar artefato.",
    };
  }
}
