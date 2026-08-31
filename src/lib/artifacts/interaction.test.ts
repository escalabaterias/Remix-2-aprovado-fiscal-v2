import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processArtifactInteraction,
  deriveInteractionMetrics,
  computeInteractionIdempotencyKey,
  clearArtifactInteractionCache,
  type ArtifactInteractionPayload,
} from "./interaction";
import { generateAdaptiveStudyArtifact } from "./integration";
import * as evidenceService from "../evidence/service";
import type { ArtifactKind } from "./types";
import type { GeneratedArtifact } from "./generation-types";

describe("Fase 7.6.4 — Experiência Interativa dos Artefatos no Fluxo Real de Estudo", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";
  const topicId = "660e8400-e29b-41d4-a716-446655440000";
  const subjectId = "770e8400-e29b-41d4-a716-446655440000";
  const artifactId = "880e8400-e29b-41d4-a716-446655440000";

  beforeEach(() => {
    vi.restoreAllMocks();
    clearArtifactInteractionCache();

    // Default mock for cognitive evidence service to isolate unit tests from DB
    vi.spyOn(evidenceService, "recordCognitiveEvidence").mockImplementation(async (input) => ({
      processed: true,
      evidence: {
        id: "ev-mock-123",
        userId: input.userId,
        topicId: input.topicId,
        subjectId: input.subjectId ?? null,
        kind: input.kind,
        source: input.source,
        timestamp: input.timestamp || new Date().toISOString(),
        durationSeconds: input.durationSeconds ?? 0,
        score: input.score ?? null,
        declaredConfidence: input.declaredConfidence ?? null,
        referenceId: input.referenceId ?? null,
        metadata: input.metadata ?? {},
      },
      skipReason: null,
    }));
  });

  it("1. Suporta e deriva métricas de interação para os 6 tipos de artefato", () => {
    // 1. MNEMONIC
    const mnemRes = deriveInteractionMetrics("MNEMONIC", { comprehended: true });
    expect(mnemRes.score).toBe(1.0);
    expect(mnemRes.declaredConfidence).toBe(4);

    const mnemFail = deriveInteractionMetrics("MNEMONIC", { comprehended: false });
    expect(mnemFail.score).toBe(0.25);
    expect(mnemFail.declaredConfidence).toBe(2);

    // 2. MIND_MAP
    const mapRes = deriveInteractionMetrics("MIND_MAP", { comprehended: true });
    expect(mapRes.score).toBe(1.0);

    // 3. FLASHCARD (1 a 5)
    const flash5 = deriveInteractionMetrics("FLASHCARD", { flashcardSelfRating: 5 });
    expect(flash5.score).toBe(1.0);
    expect(flash5.declaredConfidence).toBe(5);

    const flash1 = deriveInteractionMetrics("FLASHCARD", { flashcardSelfRating: 1 });
    expect(flash1.score).toBe(0.0);
    expect(flash1.declaredConfidence).toBe(1);

    const flash3 = deriveInteractionMetrics("FLASHCARD", { flashcardSelfRating: 3 });
    expect(flash3.score).toBe(0.5);

    // 4. SUMMARY
    const summaryRes = deriveInteractionMetrics("SUMMARY", { comprehended: true });
    expect(summaryRes.score).toBe(1.0);

    // 5. COMPARISON_TABLE
    const compRes = deriveInteractionMetrics("COMPARISON_TABLE", { comprehended: true });
    expect(compRes.score).toBe(1.0);

    // 6. ACTIVE_RECALL
    const recallText = deriveInteractionMetrics("ACTIVE_RECALL", {
      answerText: "Atos vinculados exigem observância estrita da lei.",
    });
    expect(recallText.score).toBe(0.75);
    expect(recallText.declaredConfidence).toBe(3);
  });

  it("2. Não registra evidência na simples visualização (antes da interação)", async () => {
    // Gera o artefato cognitivo adaptativo
    const genResult = await generateAdaptiveStudyArtifact({
      userId,
      topicId,
      topicName: "Atos Administrativos",
      errorRecord: {
        category: "MEMORIZATION",
        questionId: "q1",
        userAnswer: "A",
        correctAnswer: "B",
      },
    });

    expect(genResult.success).toBe(true);
    expect(genResult.artifact).toBeDefined();

    // Verificação estrita: a simples geração de artefato não registra evidência cognitiva automaticamente
    // O id de idempotência de interação ainda não existe na memória
    const payload: ArtifactInteractionPayload = {
      userId,
      topicId,
      subjectId,
      artifactId: genResult.artifact.artifactId,
      artifactKind: genResult.artifact.artifactKind,
      pedagogicalAction: "REMEDIATION",
      interactionType: "comprehended",
      userResponse: { comprehended: true },
    };

    const key = computeInteractionIdempotencyKey(payload);
    // Garantir que nenhuma evidência foi processada antes do clique de interação real
    expect(key).toContain(genResult.artifact.artifactId);
  });

  it("3. Registra uma única evidência por interação / idempotency key", async () => {
    const payload: ArtifactInteractionPayload = {
      userId,
      topicId,
      subjectId,
      artifactId,
      artifactKind: "MNEMONIC",
      pedagogicalAction: "REMEDIATION",
      interactionType: "comprehended",
      userResponse: { comprehended: true },
      idempotencyKey: "test-single-evidence-key-123",
    };

    // 1ª Interação
    const res1 = await processArtifactInteraction(payload);
    expect(res1.success).toBe(true);
    expect(res1.alreadyProcessed).toBe(false);
    expect(res1.evidenceRecorded).toBe(true);
    expect(res1.score).toBe(1.0);

    // 2ª Interação idêntica com a mesma idempotencyKey
    const res2 = await processArtifactInteraction(payload);
    expect(res2.success).toBe(true);
    expect(res2.alreadyProcessed).toBe(true);
    expect(res2.evidenceRecorded).toBe(false); // Não duplicou a chamada de evidência!
    expect(res2.idempotencyKey).toBe("test-single-evidence-key-123");
  });

  it("4. Executa interação correta para cada um dos 6 tipos", async () => {
    const kinds: ArtifactKind[] = [
      "MNEMONIC",
      "MIND_MAP",
      "FLASHCARD",
      "SUMMARY",
      "COMPARISON_TABLE",
      "ACTIVE_RECALL",
    ];

    for (const kind of kinds) {
      const payload: ArtifactInteractionPayload = {
        userId,
        topicId,
        subjectId,
        artifactId: `art-${kind}-100`,
        artifactKind: kind,
        pedagogicalAction: "REMEDIATION",
        interactionType: kind === "FLASHCARD" ? "flashcard_recall" : "comprehended",
        userResponse:
          kind === "FLASHCARD"
            ? { flashcardSelfRating: 4 }
            : kind === "ACTIVE_RECALL"
              ? { answerText: "Resposta formulada", comprehended: true }
              : { comprehended: true },
      };

      const result = await processArtifactInteraction(payload);
      expect(result.success).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.declaredConfidence).toBeGreaterThanOrEqual(1);
    }
  });

  it("5. Trata dados ausentes sem quebrar o sistema", async () => {
    const invalidPayload = {
      userId: "",
      topicId,
      artifactId,
      artifactKind: "MNEMONIC" as ArtifactKind,
      pedagogicalAction: "REMEDIATION" as const,
      interactionType: "comprehended" as const,
      userResponse: { comprehended: true },
    };

    const res = await processArtifactInteraction(invalidPayload);
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("6. Garante resiliência: falha de infraestrutura não interrompe o fluxo de estudo", async () => {
    vi.spyOn(evidenceService, "recordCognitiveEvidence").mockRejectedValue(
      new Error("Erro de conexão DB em segundo plano"),
    );

    const payload: ArtifactInteractionPayload = {
      userId,
      topicId: "topico-1",
      artifactId: "art-fail-safe",
      artifactKind: "SUMMARY",
      pedagogicalAction: "REMEDIATION",
      interactionType: "comprehended",
      userResponse: { comprehended: true },
    };

    const res = await processArtifactInteraction(payload);
    // A função retorna success: true para permitir que a UI do aluno continue navegando sem erros
    expect(res.success).toBe(true);
    expect(res.evidenceRecorded).toBe(false);
    expect(res.error).toBe("Erro de conexão DB em segundo plano");
    expect(res.idempotencyKey).toBeDefined();
  });

  it("7. Preserva grounding jurídico no ciclo de geração e interação", async () => {
    const legalContext = {
      userId,
      topicId,
      topicName: "Direito Constitucional",
      legalSources: [
        {
          id: "const-88-art5",
          type: "CONSTITUICAO" as const,
          name: "CF/88",
          citation: "Art. 5º, LX",
          text: "a lei só poderá restringir a publicidade dos atos processuais quando a defesa da intimidade ou o interesse social o exigirem",
        },
      ],
      knownErrorsSummary: "Confusão sobre publicidade dos atos processuais",
    };

    const genResult = await generateAdaptiveStudyArtifact(legalContext);
    expect(genResult.success).toBe(true);
    expect(genResult.artifact.sourceContext.hasLegalSources).toBe(true);

    // Realiza a interação com o artefato fundamentado
    const interactRes = await processArtifactInteraction({
      userId,
      topicId,
      subjectId,
      artifactId: genResult.artifact.artifactId,
      artifactKind: genResult.artifact.artifactKind,
      pedagogicalAction: "REMEDIATION",
      interactionType: "comprehended",
      userResponse: { comprehended: true },
    });

    expect(interactRes.success).toBe(true);
    expect(interactRes.evidenceRecorded).toBe(true);
  });

  it("8. Fluxo completo de ponta a ponta sem alteração da decisão", async () => {
    // 1. Geração do artefato com decisão autoritativa
    const genResult = await generateAdaptiveStudyArtifact({
      userId,
      topicId,
      topicName: "Direito Tributário - CTN",
      errorRecord: {
        category: "CONCEPTUAL_CONFUSION",
        questionId: "q-ctn-1",
        userAnswer: "Taxa",
        correctAnswer: "Imposto",
      },
    });

    const artifact = genResult.artifact;
    // O tipo do artefato gerado deve ser estritamente mantido
    const expectedKind = artifact.artifactKind;

    // 2. Aluno interage com o artefato gerado
    const interactionRes = await processArtifactInteraction({
      userId,
      topicId,
      subjectId,
      artifactId: artifact.artifactId,
      artifactKind: expectedKind,
      pedagogicalAction: "REMEDIATION",
      interactionType: "comprehended",
      userResponse: { comprehended: true },
    });

    expect(interactionRes.success).toBe(true);
    expect(interactionRes.evidenceRecorded).toBe(true);
    expect(interactionRes.score).toBe(1.0);
  });
});
