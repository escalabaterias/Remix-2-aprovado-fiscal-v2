import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateAdaptiveStudyArtifact,
  recordArtifactInteractionEvidence,
  clearArtifactIntegrationCache,
  mapStringErrorCategoryToTypeCategory,
  type AdaptiveStudyInputContext,
} from "./integration";
import * as aiGateway from "@/services/ai/gateway";
import * as evidenceService from "../evidence/service";
import type { DecisionResult } from "../decision/types";
import type { ArtifactDecision } from "./types";

describe("Fase 7.6.3 — Integration of Artifacts into Real Cognitive Cycle", () => {
  const userId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const topicId = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";
  const topicName = "Atos Administrativos";

  beforeEach(() => {
    vi.restoreAllMocks();
    clearArtifactIntegrationCache();
  });

  // 1. FLUXO COMPLETO: Erro -> Decisão -> Artefato -> Geração
  it("executa o fluxo completo (erro -> decisão -> artefato -> geração) com sucesso", async () => {
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
          explanation: "Princípios expressos do art. 37 da CF.",
        },
      },
      cached: false,
      status: "processado",
    }));

    const inputContext: AdaptiveStudyInputContext = {
      userId,
      topicId,
      topicName,
      errorRecord: {
        id: "err-101",
        userId,
        topicId,
        subjectId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
        category: "MEMORIZATION",
        isResolved: false,
        resolvedAt: null,
        occurredAt: new Date().toISOString(),
        attemptId: "att-1",
        questionId: "q-1",
      },
      errorDetail: {
        errorId: "err-101",
        userId,
        topicId,
        topicName,
        subjectId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
        category: "MEMORIZATION",
        occurredAt: new Date().toISOString(),
        attemptsCount: 3,
        errorFrequency: 0.8,
        recommendedAction: "REMEDIATION",
        relatedQuestionsCount: 2,
      },
      knownErrorsSummary: "Confusão na memorização das siglas dos atributos dos atos.",
      mastery: 0.3,
      confidence: 0.2,
      daysSinceStudy: 5,
      availableMinutes: 20,
      existingDecisionResult: {
        userId,
        topicId,
        primaryAction: "REMEDIATION",
        alternativeAction: "REVIEW",
        priorityLevel: "HIGH",
        decisionScore: 0.9,
        reasons: [],
        signalsUsed: {},
        dataConfidence: 0.9,
        timestamp: new Date().toISOString(),
      },
    };

    const result = await generateAdaptiveStudyArtifact(inputContext);

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.pedagogicalAction).toBe("REMEDIATION");
    expect(result.selectedArtifactKind).toBe("MNEMONIC");
    expect(result.artifact).toBeDefined();
    expect(result.artifact?.artifactKind).toBe("MNEMONIC");
    expect(result.fallbackApplied).toBe(false);
    expect(result.signalsOrigin.hasErrorContext).toBe(true);
    expect(result.signalsOrigin.signalCount).toBeGreaterThan(0);
    expect(result.auditTrail.decisionResult.primaryAction).toBe("REMEDIATION");
    expect(result.auditTrail.artifactDecision.primaryArtifact).toBe("MNEMONIC");
  });

  // 2. CADA TIPO DE ARTEFATO
  describe("Geração de cada um dos 6 tipos de artefato adaptativo", () => {
    it("gera artefato MNEMONIC para erros de memorização em remediação", async () => {
      const input: AdaptiveStudyInputContext = {
        userId,
        topicId,
        topicName,
        errorCategory: "MEMORIZATION",
        mastery: 0.2,
        daysSinceStudy: 2,
        existingDecisionResult: {
          userId,
          topicId,
          primaryAction: "REMEDIATION",
          alternativeAction: "PRACTICE",
          priorityLevel: "HIGH",
          decisionScore: 0.9,
          reasons: [],
          signalsUsed: {},
          dataConfidence: 0.8,
          timestamp: new Date().toISOString(),
        },
      };

      const res = await generateAdaptiveStudyArtifact(input);
      expect(res.selectedArtifactKind).toBe("MNEMONIC");
    });

    it("gera artefato COMPARISON_TABLE para confusão conceitual", async () => {
      const input: AdaptiveStudyInputContext = {
        userId,
        topicId,
        topicName,
        errorCategory: "CONCEPTUAL_CONFUSION",
        knownErrorsSummary: "Confusão entre anulação e revogação do ato administrativo.",
        mastery: 0.5,
        daysSinceStudy: 1,
      };

      const res = await generateAdaptiveStudyArtifact(input);
      expect(res.selectedArtifactKind).toBe("COMPARISON_TABLE");
    });

    it("gera artefato MIND_MAP para erros de organização/hierarquia", async () => {
      const input: AdaptiveStudyInputContext = {
        userId,
        topicId,
        topicName,
        errorCategory: "ORGANIZATION",
        knownErrorsSummary: "Dificuldade de relacionar os elementos e requisitos do ato.",
        mastery: 0.6,
      };

      const res = await generateAdaptiveStudyArtifact(input);
      expect(res.selectedArtifactKind).toBe("MIND_MAP");
    });

    it("gera artefato FLASHCARD para fortalecimento de recuperação ativa", async () => {
      const input: AdaptiveStudyInputContext = {
        userId,
        topicId,
        topicName,
        mastery: 0.55,
        daysSinceStudy: 10,
        existingDecisionResult: {
          userId,
          topicId,
          primaryAction: "REVIEW",
          alternativeAction: "ACTIVE_RECALL",
          priorityLevel: "MEDIUM",
          decisionScore: 0.7,
          reasons: [],
          signalsUsed: {},
          dataConfidence: 0.8,
          timestamp: new Date().toISOString(),
        },
      };

      const res = await generateAdaptiveStudyArtifact(input);
      expect(res.selectedArtifactKind).toBe("FLASHCARD");
    });

    it("gera artefato SUMMARY para consolidação / síntese", async () => {
      const input: AdaptiveStudyInputContext = {
        userId,
        topicId,
        topicName,
        errorCategory: "SYNTHESIS",
        mastery: 0.8,
        existingDecisionResult: {
          userId,
          topicId,
          primaryAction: "CONSOLIDATION",
          alternativeAction: "PRACTICE",
          priorityLevel: "LOW",
          decisionScore: 0.4,
          reasons: [],
          signalsUsed: {},
          dataConfidence: 0.8,
          timestamp: new Date().toISOString(),
        },
      };

      const res = await generateAdaptiveStudyArtifact(input);
      expect(res.selectedArtifactKind).toBe("SUMMARY");
    });

    it("gera artefato ACTIVE_RECALL para prática / socrático", async () => {
      const input: AdaptiveStudyInputContext = {
        userId,
        topicId,
        topicName,
        mastery: 0.7,
        existingDecisionResult: {
          userId,
          topicId,
          primaryAction: "PRACTICE",
          alternativeAction: "ACTIVE_RECALL",
          priorityLevel: "MEDIUM",
          decisionScore: 0.6,
          reasons: [],
          signalsUsed: {},
          dataConfidence: 0.8,
          timestamp: new Date().toISOString(),
        },
      };

      const res = await generateAdaptiveStudyArtifact(input);
      expect(res.selectedArtifactKind).toBe("ACTIVE_RECALL");
    });
  });

  // 3. INTEGRAÇÃO COM DECISION ENGINE & ARTIFACTS ENGINE
  it("reutiliza a decisão pedagógica existente quando fornecida e autoriza a ação pedagógica", async () => {
    const existingDecision: DecisionResult = {
      userId,
      topicId,
      primaryAction: "SOCRATIC",
      alternativeAction: "PRACTICE",
      priorityLevel: "MEDIUM",
      decisionScore: 0.65,
      reasons: [{ code: "TEST", description: "Test decision", weight: 0.65 }],
      signalsUsed: {},
      dataConfidence: 0.9,
      timestamp: new Date().toISOString(),
    };

    const input: AdaptiveStudyInputContext = {
      userId,
      topicId,
      topicName,
      existingDecisionResult: existingDecision,
      mastery: 0.5,
    };

    const res = await generateAdaptiveStudyArtifact(input);

    expect(res.pedagogicalAction).toBe("SOCRATIC");
    expect(res.auditTrail.decisionSource).toBe("REUSED");
    expect(res.auditTrail.decisionResult).toBe(existingDecision);
  });

  it("reutiliza a decisão de artefato existente quando fornecida", async () => {
    const existingDecision: DecisionResult = {
      userId,
      topicId,
      primaryAction: "REMEDIATION",
      alternativeAction: "REVIEW",
      priorityLevel: "HIGH",
      decisionScore: 0.85,
      reasons: [],
      signalsUsed: {},
      dataConfidence: 0.9,
      timestamp: new Date().toISOString(),
    };

    const existingArtifactDecision: ArtifactDecision = {
      userId,
      topicId,
      primaryArtifact: "MIND_MAP",
      alternativeArtifact: "SUMMARY",
      pedagogicalAction: "REMEDIATION",
      suitabilityScore: 0.9,
      reasons: [],
      dataConfidence: 0.9,
      timestamp: new Date().toISOString(),
    };

    const input: AdaptiveStudyInputContext = {
      userId,
      topicId,
      topicName,
      existingDecisionResult: existingDecision,
      existingArtifactDecision,
    };

    const res = await generateAdaptiveStudyArtifact(input);

    expect(res.selectedArtifactKind).toBe("MIND_MAP");
    expect(res.auditTrail.artifactDecisionSource).toBe("REUSED");
    expect(res.auditTrail.artifactDecision).toBe(existingArtifactDecision);
  });

  // 4. GROUNDING JURÍDICO (FASE 7.3.2)
  it("mantém grounding jurídico e aciona fallback de emergência se a IA citar fonte não existente", async () => {
    vi.spyOn(aiGateway, "runAiTask").mockImplementation(async () => ({
      output: {
        title: "Resumo com Alucinação",
        summary: {
          keyPoints: ["Conceito do ato administrativo"],
          coreRule: "Segundo o Artigo 9876 da Lei 5555/99...",
        },
      },
      cached: false,
      status: "processado",
    }));

    const input: AdaptiveStudyInputContext = {
      userId,
      topicId,
      topicName,
      errorCategory: "SYNTHESIS",
      existingDecisionResult: {
        userId,
        topicId,
        primaryAction: "CONSOLIDATION",
        alternativeAction: "PRACTICE",
        priorityLevel: "LOW",
        decisionScore: 0.5,
        reasons: [],
        signalsUsed: {},
        dataConfidence: 0.8,
        timestamp: new Date().toISOString(),
      },
      legalSources: [
        {
          sourceId: "src-cf88",
          documentIdentifier: "CF/88",
          article: "Art. 37",
          text: "A administração pública direta e indireta...",
        },
      ],
      mastery: 0.8,
    };

    const res = await generateAdaptiveStudyArtifact(input);

    expect(res.success).toBe(true);
    expect(res.fallbackApplied).toBe(true);
    expect(res.statusMessage).toBe(
      "Fallback determinístico aplicado para prevenir alucinação jurídica.",
    );
  });

  // 5. FALLBACK
  it("aplica fallback determinístico gracioso em caso de erro no AI Gateway", async () => {
    vi.spyOn(aiGateway, "runAiTask").mockImplementation(async () => ({
      output: null,
      cached: false,
      status: "erro",
      errorMessage: "Conexão interrompida",
    }));

    const input: AdaptiveStudyInputContext = {
      userId,
      topicId,
      topicName,
      mastery: 0.5,
      confidence: 0.4,
    };

    const res = await generateAdaptiveStudyArtifact(input);

    expect(res.success).toBe(true);
    expect(res.fallbackApplied).toBe(true);
    expect(res.artifact).toBeDefined();
    expect(res.artifact?.artifactKind).toBeDefined();
  });

  // 6. DADOS INSUFICIENTES
  it("evita a geração de artefato quando a confiança dos dados for insuficiente", async () => {
    const input: AdaptiveStudyInputContext = {
      userId,
      topicId,
      topicName,
      // Sem signals, sem mastery, sem evidences, sem erros, sem analytics
      minConfidenceThreshold: 0.2,
    };

    const res = await generateAdaptiveStudyArtifact(input);

    expect(res.success).toBe(true);
    expect(res.skipped).toBe(true);
    expect(res.skipReason).toContain("Dados insuficientes");
    expect(res.artifact).toBeUndefined();
  });

  // 7. IDEMPOTÊNCIA
  it("garante comportamento idempotente ao reprocessar o mesmo contexto", async () => {
    const mockAi = vi.spyOn(aiGateway, "runAiTask").mockImplementation(async () => ({
      output: {
        title: "Flashcard Idempotente",
        flashcard: {
          front: "O que é ato administrativo?",
          back: "Declaração do Estado no exercício de prerrogativas públicas.",
          keyConcept: "Atos",
        },
      },
      cached: false,
      status: "processado",
    }));

    const input: AdaptiveStudyInputContext = {
      userId,
      topicId,
      topicName,
      mastery: 0.5,
      confidence: 0.5,
      referenceDate: "2026-08-31T10:00:00.000Z",
    };

    // Primeira chamada
    const res1 = await generateAdaptiveStudyArtifact(input);
    expect(res1.artifact?.title).toBe("Flashcard Idempotente");
    expect(mockAi).toHaveBeenCalledTimes(1);

    // Segunda chamada com mesmo contexto
    const res2 = await generateAdaptiveStudyArtifact(input);
    expect(res2.artifact?.title).toBe("Flashcard Idempotente");
    expect(res2.auditTrail.idempotencyKey).toBe(res1.auditTrail.idempotencyKey);
    // AI Gateway NÃO deve ter sido chamado novamente
    expect(mockAi).toHaveBeenCalledTimes(1);
  });

  // 8. AUSÊNCIA DE DUPLICAÇÃO DE EVIDÊNCIA
  it("não registra evidência cognitiva na criação do artefato, registrando apenas na interação pedagógica real", async () => {
    const recordSpy = vi.spyOn(evidenceService, "recordCognitiveEvidence").mockResolvedValue({
      processed: true,
      evidence: {
        id: "ev-1",
        userId,
        topicId,
        subjectId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
        kind: "recall",
        source: "manual",
        timestamp: new Date().toISOString(),
        durationSeconds: 120,
        score: 1.0,
        declaredConfidence: 4,
        referenceId: "art-123",
        metadata: {},
      },
      skipReason: null,
    });

    const input: AdaptiveStudyInputContext = {
      userId,
      topicId,
      topicName,
      mastery: 0.5,
    };

    // 1. Apenas gerar o artefato NÃO deve registrar evidência
    const res = await generateAdaptiveStudyArtifact(input);
    expect(res.success).toBe(true);
    expect(recordSpy).not.toHaveBeenCalled();

    // 2. Interação real do aluno com o artefato DEVE registrar a evidência
    if (res.artifact) {
      await recordArtifactInteractionEvidence({
        userId,
        topicId,
        subjectId: "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
        artifactId: res.artifact.artifactId,
        artifactKind: res.selectedArtifactKind,
        pedagogicalAction: res.pedagogicalAction,
        score: 1.0,
        declaredConfidence: 4,
        durationSeconds: 120,
      });

      expect(recordSpy).toHaveBeenCalledTimes(1);
      expect(recordSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          topicId,
          kind: "recall",
          score: 1.0,
          declaredConfidence: 4,
          referenceId: res.artifact.artifactId,
        }),
      );
    }
  });

  // 9. PRESERVAÇÃO DOS MOTORES ANTERIORES E HELPERS
  it("preserva contratos dos motores anteriores e mapeia categorias de erro corretamente", () => {
    expect(mapStringErrorCategoryToTypeCategory("MEMORIZACAO")).toBe("MEMORIZATION");
    expect(mapStringErrorCategoryToTypeCategory("Confusão Conceitual")).toBe(
      "CONCEPTUAL_CONFUSION",
    );
    expect(mapStringErrorCategoryToTypeCategory("Organização e Estrutura")).toBe("ORGANIZATION");
    expect(mapStringErrorCategoryToTypeCategory("Síntese")).toBe("SYNTHESIS");
    expect(mapStringErrorCategoryToTypeCategory("Aplicação")).toBe("APPLICATION");
    expect(mapStringErrorCategoryToTypeCategory("Falta de Atenção")).toBe("ATTENTION");
    expect(mapStringErrorCategoryToTypeCategory(null)).toBeUndefined();
  });
});
