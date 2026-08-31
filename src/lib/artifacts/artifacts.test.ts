import { describe, it, expect } from "vitest";
import { decideStudyArtifact, calculateArtifactDataConfidence } from "./index";
import type { ArtifactContext } from "./types";
import { decidePedagogicalAction } from "../decision/engine";

describe("Fase 7.6.1 — Adaptive Memory & Study Artifacts Engine", () => {
  const userId = "user-artifact-test";
  const topicId = "top-art-123";

  // 1. REMEDIATION + ERRO DE MEMORIZAÇÃO -> MNEMONIC
  it("seleciona MNEMONIC para REMEDIATION com erro de memorização", () => {
    const context: ArtifactContext = {
      userId,
      topicId,
      pedagogicalAction: "REMEDIATION",
      artifactSignals: {
        errorTypeCategory: "MEMORIZATION",
        memorizationDifficulty: true,
      },
    };

    const decision = decideStudyArtifact(context);

    expect(decision.primaryArtifact).toBe("MNEMONIC");
    expect(decision.alternativeArtifact).toBe("FLASHCARD");
    expect(decision.reasons[0].code).toBe("REMEDIATION_MEMORIZATION_MNEMONIC");
  });

  // 2. CONCEITOS CONFUNDÍVEIS -> COMPARISON_TABLE
  it("seleciona COMPARISON_TABLE quando houver conceitos confundíveis", () => {
    const context: ArtifactContext = {
      userId,
      topicId,
      pedagogicalAction: "REMEDIATION",
      artifactSignals: {
        errorTypeCategory: "CONCEPTUAL_CONFUSION",
        confusableConcepts: true,
      },
    };

    const decision = decideStudyArtifact(context);

    expect(decision.primaryArtifact).toBe("COMPARISON_TABLE");
    expect(decision.alternativeArtifact).toBe("MIND_MAP");
  });

  // 3. ERRO DE ORGANIZAÇÃO / HIERARQUIA -> MIND_MAP
  it("seleciona MIND_MAP para erros de organização ou estrutura complexa", () => {
    const context: ArtifactContext = {
      userId,
      topicId,
      pedagogicalAction: "REVIEW",
      artifactSignals: {
        errorTypeCategory: "ORGANIZATION",
        complexHierarchy: true,
      },
    };

    const decision = decideStudyArtifact(context);

    expect(decision.primaryArtifact).toBe("MIND_MAP");
    expect(decision.alternativeArtifact).toBe("SUMMARY");
  });

  // 4. RECUPERAÇÃO ATIVA -> FLASHCARD
  it("seleciona FLASHCARD para ação ACTIVE_RECALL ou baixa taxa de recuperação", () => {
    const context: ArtifactContext = {
      userId,
      topicId,
      pedagogicalAction: "ACTIVE_RECALL",
      artifactSignals: {
        lowActiveRecallRate: true,
      },
    };

    const decision = decideStudyArtifact(context);

    expect(decision.primaryArtifact).toBe("FLASHCARD");
    expect(decision.alternativeArtifact).toBe("ACTIVE_RECALL");
  });

  // 5. CONSOLIDAÇÃO / SÍNTESE -> SUMMARY
  it("seleciona SUMMARY para CONSOLIDATION ou necessidade de síntese", () => {
    const context: ArtifactContext = {
      userId,
      topicId,
      pedagogicalAction: "CONSOLIDATION",
      artifactSignals: {
        synthesisNeed: true,
      },
    };

    const decision = decideStudyArtifact(context);

    expect(decision.primaryArtifact).toBe("SUMMARY");
  });

  // 6. PRÁTICA -> ACTIVE_RECALL
  it("seleciona ACTIVE_RECALL para ação PRACTICE sem sinais específicos de erro", () => {
    const context: ArtifactContext = {
      userId,
      topicId,
      pedagogicalAction: "PRACTICE",
    };

    const decision = decideStudyArtifact(context);

    expect(decision.primaryArtifact).toBe("ACTIVE_RECALL");
  });

  // 7. INTEGRAÇÃO COM DECISION ENGINE 7.5
  it("integra perfeitamente com a saída do Decision Engine 7.5", () => {
    const decision75 = decidePedagogicalAction({
      userId,
      topicId,
      signals: {
        prerequisiteDeficit: 0.7,
      },
    });

    const artifactContext: ArtifactContext = {
      userId,
      topicId,
      decisionResult: decision75,
      artifactSignals: {
        errorTypeCategory: "MEMORIZATION",
      },
    };

    const artifactDecision = decideStudyArtifact(artifactContext);

    expect(artifactDecision.pedagogicalAction).toBe("REMEDIATION");
    expect(artifactDecision.primaryArtifact).toBe("MNEMONIC");
  });

  // 8. IDEMPOTÊNCIA E TRATAMENTO DE DADOS AUSENTES
  it("garante idempotência total e resiliência a dados ausentes", () => {
    const context: ArtifactContext = {
      userId,
      topicId,
    };

    const res1 = decideStudyArtifact(context);
    const res2 = decideStudyArtifact(context);

    expect(res1).toEqual(res2);
    expect(res1.primaryArtifact).toBe("ACTIVE_RECALL");
    expect(calculateArtifactDataConfidence(context)).toBe(0.0);
  });
});
