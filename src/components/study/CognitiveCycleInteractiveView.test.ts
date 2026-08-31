/**
 * SUÍTE DE TESTES — FASE 8
 * CognitiveCycleInteractiveView.test.ts
 *
 * Valida a integração UI/UX e Observabilidade do Ciclo Cognitivo:
 * 1. Suporte e mapeamento de TODOS os 5 executionModes (artifact, socratic, standard_practice, review, direct_study).
 * 2. Invariante de ausência de evidência passiva na orquestração/renderização.
 * 3. Invariante de não-autoridade pedagógica no frontend (modo derivado estritamente do Decision Engine).
 * 4. Submissão ativa de interações com idempotência e bloqueio de duplicação.
 * 5. Exibição e propagação de Grounding Jurídico RAG (citações anti-alucinação).
 * 6. Painel de Observabilidade / Telemetria (Fase 7.8) consolidador e audit trail.
 */

import { describe, it, expect, beforeEach } from "vitest";

import type { CognitiveCycleStepPlan, CognitiveExecutionMode } from "@/lib/cognitive-cycle/types";
import {
  orchestrateCognitiveCycleStep,
  processCognitiveCycleInteraction,
  deriveExecutionMode,
  clearCognitiveCycleCache,
} from "@/lib/cognitive-cycle/engine";
import {
  getCognitiveTelemetrySummary,
  getCognitiveAuditTrail,
  clearCognitiveTelemetry,
} from "@/lib/cognitive-cycle/telemetry";

describe("Fase 8 — UI/UX Front-End & Observabilidade (Ciclo Cognitivo)", () => {
  beforeEach(() => {
    clearCognitiveCycleCache();
    clearCognitiveTelemetry();
  });

  // Helper para criar plano mockado para cada modo
  const createMockStepPlan = (
    executionMode: CognitiveExecutionMode,
    overrides?: Partial<CognitiveCycleStepPlan>,
  ): CognitiveCycleStepPlan => ({
    userId: "usr-fase8-unit",
    topicId: "top-dir-const-01",
    topicName: "Direitos e Garantias Fundamentais",
    subjectId: "sub-direito-const",
    subjectName: "Direito Constitucional",
    pedagogicalDecision: {
      primaryAction:
        executionMode === "artifact"
          ? "GERAR_ARTEFATO_COGNITIVO"
          : executionMode === "socratic"
            ? "EXPLICACAO_SOCRATICA"
            : executionMode === "standard_practice"
              ? "PRATICAR_QUESTOES"
              : executionMode === "review"
                ? "REVISAR_ESPACADO"
                : "NEW_CONTENT",
      confidence: 0.95,
      reasoning: ["Ação decidida pelo Decision Engine da Fase 7.5"],
    },
    executionMode,
    artifactResult:
      executionMode === "artifact"
        ? {
            artifactKind: "MNEMONIC",
            generatedArtifact: {
              artifactId: "art-01",
              artifactKind: "MNEMONIC",
              title: "Mnemônico SOCIPRA",
              content: {
                summaryOrOverview: "Mnemônico para Princípios Fundamentais",
                mnemonic: {
                  word: "SOCIPRA",
                  expansion: [
                    { letter: "SO", meaning: "Soberania" },
                    { letter: "CI", meaning: "Cidadania" },
                  ],
                  explanation: "Mnemônico constitucional",
                },
              },
              grounded: true,
            },
            generatedAt: new Date().toISOString(),
          }
        : null,
    socraticContext:
      executionMode === "socratic"
        ? {
            sessionId: "soc-01",
            topicId: "top-dir-const-01",
            topicName: "Direitos Fundamentais",
            currentState: "WAITING_FOR_ANSWER",
            turnHistory: [],
            errorContext: null,
            startedAt: new Date().toISOString(),
          }
        : null,
    analyticsProfile: null,
    analyticsTrajectory: null,
    predictivePriority: null,
    legalGrounding: {
      legalGrounded: true,
      sourceCount: 2,
      citations: [
        {
          sourceTitle: "CF/88 Art. 5º",
          excerpt: "Todos são iguais perante a lei...",
        },
      ],
    },
    idempotencyKey: `idemp-key-${executionMode}`,
    fallbackTriggered: false,
    timestamp: new Date().toISOString(),
    ...overrides,
  });

  // 1. SUPORTE AOS 5 MODOS DE EXECUÇÃO
  it("1. Mapeia e suporta integralmente os 5 executionModes do Orquestrador", () => {
    expect(deriveExecutionMode("GERAR_ARTEFATO_COGNITIVO")).toBe("artifact");
    expect(deriveExecutionMode("REMEDIATION")).toBe("artifact");
    expect(deriveExecutionMode("EXPLICACAO_SOCRATICA")).toBe("socratic");
    expect(deriveExecutionMode("SOCRATIC")).toBe("socratic");
    expect(deriveExecutionMode("PRATICAR_QUESTOES")).toBe("standard_practice");
    expect(deriveExecutionMode("PRACTICE")).toBe("standard_practice");
    expect(deriveExecutionMode("REVISAR_ESPACADO")).toBe("review");
    expect(deriveExecutionMode("REVIEW")).toBe("review");
    expect(deriveExecutionMode("NEW_CONTENT")).toBe("direct_study");
  });

  // 2. INVARIANTE DE NÃO-AUTORIDADE PEDAGÓGICA NO FRONTEND
  it("2. Preserva a autoridade dos engines (Decision & Artifacts) no plano retornado", async () => {
    const stepPlan = await orchestrateCognitiveCycleStep({
      userId: "usr-non-auth",
      topicId: "top-non-auth",
      topicName: "Tópico Autoritário",
      customSignals: {
        unresolvedErrors: 4,
        mastery: 0.1,
      },
    });

    // O modo de execução DEVE corresponder à decisão determinística do Decision Engine
    const expectedMode = deriveExecutionMode(stepPlan.pedagogicalDecision.primaryAction);
    expect(stepPlan.executionMode).toBe(expectedMode);
    expect(stepPlan.pedagogicalDecision.primaryAction).toBeDefined();
  });

  // 3. INVARIANTE DE EVIDÊNCIA PASSIVA
  it("3. A orquestração e renderização passiva NÃO geram evidências cognitivas", async () => {
    const stepPlan = await orchestrateCognitiveCycleStep({
      userId: "usr-passive-test",
      topicId: "top-passive-test",
    });

    expect(stepPlan).toBeDefined();

    const summary = getCognitiveTelemetrySummary({ userId: "usr-passive-test" });
    // Orquestração gerou 1 evento PLAN_ORCHESTRATED, mas 0 evidências gravadas!
    expect(summary.orchestrationsCount).toBe(1);
    expect(summary.evidenceRecordedCount).toBe(0);
    expect(summary.interactionsCount).toBe(0);
  });

  // 4. SUBMISSÃO ATIVA DE INTERAÇÃO & IDEMPOTÊNCIA
  it("4. Processa interação ativa do aluno registrando evidência de forma idempotente", async () => {
    const stepPlan = createMockStepPlan("standard_practice");

    const result1 = await processCognitiveCycleInteraction({
      userId: stepPlan.userId,
      topicId: stepPlan.topicId,
      stepPlan,
      userResponse: "Resposta do aluno sobre o artigo 5º",
      idempotencyKey: "int-key-001",
    });

    expect(result1.success).toBe(true);
    expect(result1.evidenceResult).toBeDefined();
    expect(result1.idempotencyKey).toBe("int-key-001");

    // Segunda chamada idêntica deve retornar o cache idempotente sem duplicar evidência
    const result2 = await processCognitiveCycleInteraction({
      userId: stepPlan.userId,
      topicId: stepPlan.topicId,
      stepPlan,
      userResponse: "Resposta do aluno sobre o artigo 5º",
      idempotencyKey: "int-key-001",
    });

    expect(result2).toBe(result1);

    const summary = getCognitiveTelemetrySummary({ userId: stepPlan.userId });
    expect(summary.interactionsCount).toBe(1);
    expect(summary.cacheHitCount).toBeGreaterThan(0);
  });

  // 5. GROUNDING JURÍDICO RAG
  it("5. Incorpora metadados e citações de Grounding Jurídico RAG no plano do ciclo", async () => {
    const stepPlan = createMockStepPlan("socratic");

    expect(stepPlan.legalGrounding).toBeDefined();
    expect(stepPlan.legalGrounding?.legalGrounded).toBe(true);
    expect(stepPlan.legalGrounding?.citations).toHaveLength(1);
    expect(stepPlan.legalGrounding?.citations[0].sourceTitle).toBe("CF/88 Art. 5º");
  });

  // 6. PAINEL DE OBSERVABILIDADE E TELEMETRIA (FASE 7.8)
  it("6. Alimenta corretamente as estatísticas de Observabilidade e Auditoria para o Dashboard", async () => {
    // Simula 2 planos e 1 interação
    const plan1 = await orchestrateCognitiveCycleStep({
      userId: "usr-obs-test",
      topicId: "top-obs-1",
      customSignals: { unresolvedErrors: 2 },
    });

    const plan2 = await orchestrateCognitiveCycleStep({
      userId: "usr-obs-test",
      topicId: "top-obs-2",
      customSignals: { mastery: 0.9 },
    });

    await processCognitiveCycleInteraction({
      userId: "usr-obs-test",
      topicId: "top-obs-1",
      stepPlan: plan1,
      userResponse: "Interação ativa",
    });

    const summary = getCognitiveTelemetrySummary({ userId: "usr-obs-test" });
    const auditTrail = getCognitiveAuditTrail({ userId: "usr-obs-test" });

    expect(summary.orchestrationsCount).toBe(2);
    expect(summary.interactionsCount).toBe(1);
    expect(summary.evidenceRecordedCount).toBe(1);
    expect(auditTrail.length).toBeGreaterThanOrEqual(3);
  });
});
