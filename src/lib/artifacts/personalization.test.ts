import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  deriveArtifactPresentationProfile,
  type ArtifactPersonalizationContext,
  type ArtifactPresentationProfile,
} from "./personalization";
import { generateAdaptiveStudyArtifact } from "./integration";
import { generateStudyArtifact } from "./generator";
import * as evidenceService from "../evidence/service";
import type { ErrorTypeCategory, ArtifactKind } from "./types";

describe("Fase 7.6.5 — Personalização Adaptativa dos Artefatos", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const topicId = "660e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Suporta cada padrão de erro com derivação apropriada do perfil", () => {
    const categories: ErrorTypeCategory[] = [
      "MEMORIZATION",
      "CONCEPTUAL_CONFUSION",
      "ORGANIZATION",
      "SYNTHESIS",
      "APPLICATION",
      "ATTENTION",
    ];

    for (const cat of categories) {
      const profile = deriveArtifactPresentationProfile({
        userId,
        topicId,
        artifactKind: "SUMMARY",
        errorTypeCategory: cat,
      });

      expect(profile).toBeDefined();
      expect(["SIMPLE", "STANDARD", "ADVANCED"]).toContain(profile.complexity);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(profile.density);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(profile.visualStructure);
      expect(["NONE", "BASIC", "APPLIED"]).toContain(profile.exampleLevel);
      expect(["LOW", "MEDIUM", "HIGH"]).toContain(profile.recallIntensity);

      if (cat === "MEMORIZATION") {
        expect(profile.density).toBe("LOW");
        expect(profile.recallIntensity).toBe("HIGH");
        expect(profile.complexity).toBe("SIMPLE");
      }
      if (cat === "CONCEPTUAL_CONFUSION") {
        expect(profile.visualStructure).toBe("HIGH");
      }
      if (cat === "ORGANIZATION") {
        expect(profile.visualStructure).toBe("HIGH");
        expect(profile.density).toBe("HIGH");
      }
      if (cat === "APPLICATION") {
        expect(profile.exampleLevel).toBe("APPLIED");
      }
    }
  });

  it("2. Trata níveis de retenção baixa, média e alta de forma determinística", () => {
    // Retenção Baixa (0.2)
    const lowRet = deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: "FLASHCARD",
      retentionScore: 0.2,
    });
    expect(lowRet.complexity).toBe("SIMPLE");
    expect(lowRet.recallIntensity).toBe("HIGH");

    // Retenção Média (0.6)
    const medRet = deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: "FLASHCARD",
      retentionScore: 0.6,
      mastery: 0.6,
    });
    expect(medRet.complexity).toBe("STANDARD");

    // Retenção Alta (0.9) com alto domínio
    const highRet = deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: "SUMMARY",
      retentionScore: 0.9,
      mastery: 0.9,
    });
    expect(highRet.complexity).toBe("ADVANCED");
    expect(highRet.recallIntensity).toBe("HIGH"); // por causa do mastery >= 0.8
    expect(highRet.density).toBe("LOW");
  });

  it("3. Trata níveis de domínio baixo e alto", () => {
    // Domínio Baixo (0.2)
    const lowMastery = deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: "SUMMARY",
      mastery: 0.2,
    });
    expect(lowMastery.complexity).toBe("SIMPLE");

    // Domínio Alto (0.9)
    const highMastery = deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: "SUMMARY",
      mastery: 0.9,
      retentionScore: 0.8,
    });
    expect(highMastery.complexity).toBe("ADVANCED");
    expect(highMastery.exampleLevel).toBe("APPLIED");
  });

  it("4. Aumenta a intensidade de remediação para erros recorrentes", () => {
    const recurrentProfile = deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: "SUMMARY",
      isRecurrentError: true,
    });

    expect(recurrentProfile.recallIntensity).toBe("HIGH");
    expect(recurrentProfile.exampleLevel).toBe("APPLIED");
    expect(recurrentProfile.density).toBe("HIGH");
  });

  it("5. Ajusta detalhamento jurídico com base no contexto de fontes disponíveis", () => {
    // Sem fontes
    const noLegal = deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: "SUMMARY",
      legalSourcesCount: 0,
    });
    expect(noLegal.legalDetailLevel).toBe("NONE");

    // 1 fonte
    const singleLegal = deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: "SUMMARY",
      legalSourcesCount: 1,
    });
    expect(singleLegal.legalDetailLevel).toBe("BASIC");

    // Múltiplas fontes ou erro de confusão conceitual
    const multiLegal = deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: "SUMMARY",
      legalSourcesCount: 3,
    });
    expect(multiLegal.legalDetailLevel).toBe("FULL");
  });

  it("6. Suporta dados insuficientes com fallback padrão seguro", () => {
    const minimalCtx: ArtifactPersonalizationContext = {
      userId,
      topicId,
      artifactKind: "ACTIVE_RECALL",
    };

    const profile = deriveArtifactPresentationProfile(minimalCtx);

    expect(profile).toEqual({
      complexity: "STANDARD",
      density: "MEDIUM",
      visualStructure: "MEDIUM",
      exampleLevel: "BASIC",
      recallIntensity: "HIGH", // por causa de ACTIVE_RECALL
      legalDetailLevel: "NONE",
    });
  });

  it("7. É estritamente determinístico e idempotente", () => {
    const ctx: ArtifactPersonalizationContext = {
      userId,
      topicId,
      artifactKind: "MIND_MAP",
      errorTypeCategory: "ORGANIZATION",
      isRecurrentError: true,
      mastery: 0.4,
      retentionScore: 0.3,
      legalSourcesCount: 2,
    };

    const run1 = deriveArtifactPresentationProfile(ctx);
    const run2 = deriveArtifactPresentationProfile(ctx);
    const run3 = deriveArtifactPresentationProfile(ctx);

    expect(run1).toEqual(run2);
    expect(run2).toEqual(run3);
  });

  it("8. Integra-se ao Generator e repassa o perfil ao resultado e ao prompt", async () => {
    const customProfile: ArtifactPresentationProfile = {
      complexity: "ADVANCED",
      density: "LOW",
      visualStructure: "HIGH",
      exampleLevel: "APPLIED",
      recallIntensity: "HIGH",
      legalDetailLevel: "FULL",
    };

    const genResult = await generateStudyArtifact({
      userId,
      topicId,
      topicName: "Direito Administrativo",
      presentationProfile: customProfile,
    });

    expect(genResult.success).toBe(true);
    expect(genResult.artifact.presentationProfile).toEqual(customProfile);
  });

  it("9. NUNCA altera o tipo de artefato escolhido pelo Artifacts Engine", async () => {
    const result = await generateAdaptiveStudyArtifact({
      userId,
      topicId,
      topicName: "Controle de Constitucionalidade",
      errorRecord: {
        category: "CONCEPTUAL_CONFUSION",
        questionId: "q99",
        userAnswer: "A",
        correctAnswer: "B",
      },
    });

    expect(result.success).toBe(true);
    // A decisão do tipo de artefato deve vir de Artifacts Engine (e.g. COMPARISON_TABLE ou MIND_MAP)
    expect(result.selectedArtifactKind).toBe(result.auditTrail.artifactDecision.primaryArtifact);
    expect(result.artifact?.artifactKind).toBe(result.selectedArtifactKind);
    expect(result.auditTrail.presentationProfile).toBeDefined();
  });

  it("10. NUNCA registra evidência passiva durante a personalização ou geração", async () => {
    const spy = vi.spyOn(evidenceService, "recordCognitiveEvidence");

    const profile = deriveArtifactPresentationProfile({
      userId,
      topicId,
      artifactKind: "MNEMONIC",
      errorTypeCategory: "MEMORIZATION",
    });

    expect(profile).toBeDefined();

    await generateAdaptiveStudyArtifact({
      userId,
      topicId,
      topicName: "Direito Tributário",
      errorRecord: {
        category: "MEMORIZATION",
        questionId: "q100",
        userAnswer: "X",
        correctAnswer: "Y",
      },
    });

    // Garantir que a simples derivação e geração NÃO chamaram a gravação de evidência no banco
    expect(spy).not.toHaveBeenCalled();
  });
});
