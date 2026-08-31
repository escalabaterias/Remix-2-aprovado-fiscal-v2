import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateStudyArtifact,
  buildDeterministicFallbackArtifact,
  validateGeneratedArtifactContent,
} from "./generator";
import type { ArtifactGenerationContext } from "./generation-types";
import * as aiGateway from "@/services/ai/gateway";

describe("Fase 7.6.2 — Adaptive Study Artifact Generation", () => {
  const userId = "user-gen-test";
  const topicId = "top-admin-acts";
  const topicName = "Atos Administrativos";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. FALLBACK DETERMINÍSTICO SEGURO PARA TODOS OS 6 TIPOS DE ARTEFATO
  it("gera fallback determinístico válido para os 6 tipos de artefato", () => {
    const kinds = [
      "MNEMONIC",
      "MIND_MAP",
      "FLASHCARD",
      "SUMMARY",
      "COMPARISON_TABLE",
      "ACTIVE_RECALL",
    ] as const;

    for (const kind of kinds) {
      const context: ArtifactGenerationContext = {
        userId,
        topicId,
        topicName,
      };

      const fallback = buildDeterministicFallbackArtifact(context, kind);

      expect(fallback.artifactKind).toBe(kind);
      expect(fallback.grounded).toBe(true);
      expect(validateGeneratedArtifactContent(fallback.content, kind)).toBe(true);
    }
  });

  // 2. GERAÇÃO DE MNEMONIC COM SUCESSO VIA IA
  it("gera artefato MNEMONIC com sucesso quando a IA responde adequadamente", async () => {
    vi.spyOn(aiGateway, "runAiTask").mockImplementation(async () => ({
      output: {
        title: "Mnemônico LIMPE - Atos Administrativos",
        mnemonic: {
          word: "LIMPE",
          expansion: [
            { letter: "L", meaning: "Legalidade" },
            { letter: "I", meaning: "Impessoalidade" },
            { letter: "M", meaning: "Moralidade" },
            { letter: "P", meaning: "Publicidade" },
            { letter: "E", meaning: "Eficiência" },
          ],
          explanation: "Princípios expressos no art. 37 da Constituição Federal.",
        },
      },
      cached: false,
      status: "processado",
    }));

    const context: ArtifactGenerationContext = {
      userId,
      topicId,
      topicName,
      artifactDecision: {
        userId,
        topicId,
        primaryArtifact: "MNEMONIC",
        alternativeArtifact: "FLASHCARD",
        pedagogicalAction: "REMEDIATION",
        suitabilityScore: 0.95,
        reasons: [],
        dataConfidence: 0.9,
        timestamp: new Date().toISOString(),
      },
    };

    const result = await generateStudyArtifact(context);

    expect(result.success).toBe(true);
    expect(result.fallbackApplied).toBe(false);
    expect(result.artifact.artifactKind).toBe("MNEMONIC");
    expect(result.artifact.content.mnemonic?.word).toBe("LIMPE");
  });

  // 3. RESPOSTA ESTRUTURALMENTE INVÁLIDA ACIONA FALLBACK
  it("aplica fallback quando a resposta da IA for estruturalmente inválida", async () => {
    vi.spyOn(aiGateway, "runAiTask").mockImplementation(async () => ({
      output: {
        title: "Mnemônico Inválido",
        mnemonic: null, // Estrutura corrompida
      },
      cached: false,
      status: "processado",
    }));

    const context: ArtifactGenerationContext = {
      userId,
      topicId,
      topicName,
      artifactDecision: {
        userId,
        topicId,
        primaryArtifact: "MNEMONIC",
        alternativeArtifact: "FLASHCARD",
        pedagogicalAction: "REMEDIATION",
        suitabilityScore: 0.95,
        reasons: [],
        dataConfidence: 0.9,
        timestamp: new Date().toISOString(),
      },
    };

    const result = await generateStudyArtifact(context);

    expect(result.success).toBe(true);
    expect(result.fallbackApplied).toBe(true);
    expect(result.artifact.artifactKind).toBe("MNEMONIC");
  });

  // 4. PREVENÇÃO DE ALUCINAÇÃO JURÍDICA COM FALLBACK
  it("aplica fallback se a IA citar dispositivo legal não fornecido no contexto de grounding", async () => {
    vi.spyOn(aiGateway, "runAiTask").mockImplementation(async () => ({
      output: {
        title: "Flashcard de Atos",
        flashcard: {
          front: "Qual o artigo do CTN?",
          back: "Segundo o Artigo 999 da Lei 99999", // Citação contendo "Artigo 999" (extraível por regex)
          keyConcept: "Atos",
        },
      },
      cached: false,
      status: "processado",
    }));

    const context: ArtifactGenerationContext = {
      userId,
      topicId,
      topicName,
      legalSources: [
        {
          sourceId: "src-1",
          documentIdentifier: "CF/88",
          article: "Art. 37",
          text: "A administração pública direta e indireta...",
        },
      ],
      artifactDecision: {
        userId,
        topicId,
        primaryArtifact: "FLASHCARD",
        alternativeArtifact: "ACTIVE_RECALL",
        pedagogicalAction: "REVIEW",
        suitabilityScore: 0.8,
        reasons: [],
        dataConfidence: 0.8,
        timestamp: new Date().toISOString(),
      },
    };

    const result = await generateStudyArtifact(context);

    expect(result.success).toBe(true);
    expect(result.fallbackApplied).toBe(true);
    expect(result.statusMessage).toBe(
      "Fallback determinístico aplicado para prevenir alucinação jurídica.",
    );
  });

  // 5. TRATAMENTO DE FALHA NA INFRAESTRUTURA DA IA
  it("trata erro na chamada de IA aplicando fallback determinístico gracioso", async () => {
    vi.spyOn(aiGateway, "runAiTask").mockImplementation(async () => ({
      output: null,
      cached: false,
      status: "erro",
      errorMessage: "Timeout no AI Gateway",
    }));

    const context: ArtifactGenerationContext = {
      userId,
      topicId,
      topicName,
    };

    const result = await generateStudyArtifact(context);

    expect(result.success).toBe(true);
    expect(result.fallbackApplied).toBe(true);
    expect(result.artifact.artifactId).toBeDefined();
  });
});
