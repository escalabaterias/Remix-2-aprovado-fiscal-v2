import { describe, it, expect } from "vitest";
import {
  decidePedagogicalAction,
  getPedagogicalDecision,
  getBatchPedagogicalDecisions,
  calculateDataConfidence,
} from "./index";
import type { DecisionContext } from "./types";

describe("Fase 7.5 — Decision Engine / Motor Central de Decisão Pedagógica", () => {
  const userId = "user-decision-123";

  // 1. AÇÃO REMEDIATION POR BLOQUEIO CRÍTICO DE PRÉ-REQUISITOS
  it("determina REMEDIATION com prioridade CRITICAL quando houver déficit de pré-requisitos >= 0.5", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-direitos-fundamentais",
      signals: {
        prerequisiteDeficit: 0.8,
        mastery: 0.2,
      },
      allowNewContent: true,
    };

    const result = decidePedagogicalAction(context);

    expect(result.primaryAction).toBe("REMEDIATION");
    expect(result.priorityLevel).toBe("CRITICAL");
    expect(result.reasons[0].code).toBe("PREREQUISITE_DEFICIT_CRITICAL");
  });

  // 2. PRÉ-REQUISITO IMPEDINDO CONTEÚDO NOVO
  it("impede NEW_CONTENT quando pré-requisitos estão deficientes, mesmo com allowNewContent=true", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-tributario-avancado",
      signals: {
        prerequisiteDeficit: 0.6,
        knowledgeState: "SEM_EVIDENCIA",
      },
      allowNewContent: true,
    };

    const result = getPedagogicalDecision(context);

    expect(result.primaryAction).not.toBe("NEW_CONTENT");
    expect(result.primaryAction).toBe("REMEDIATION");
  });

  // 3. AÇÃO REMEDIATION / SOCRATIC POR ERROS RECORRENTES
  it("determina REMEDIATION para erros recorrentes não resolvidos", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-licitacoes-art89",
      signals: {
        recurringErrors: 2,
        unresolvedErrors: 3,
        knowledgeState: "PONTO_CRITICO",
      },
    };

    const result = decidePedagogicalAction(context);

    expect(result.primaryAction).toBe("REMEDIATION");
    expect(result.priorityLevel).toBe("CRITICAL");
  });

  it("determina SOCRATIC quando o conceito está profundamente comprometido ou erros recorrentes são altos", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-contabilidade-debito-credito",
      signals: {
        recurringErrors: 4,
        unresolvedErrors: 3,
        knowledgeState: "CONCEITO_COMPROMETIDO",
      },
    };

    const result = decidePedagogicalAction(context);

    expect(result.primaryAction).toBe("SOCRATIC");
    expect(result.priorityLevel).toBe("CRITICAL");
  });

  // 4. AÇÃO REVIEW POR REVISÃO URGENTE
  it("determina REVIEW com prioridade HIGH/CRITICAL para revisão urgente", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-constitucional-controle",
      signals: {
        reviewUrgency: 0.95,
        knowledgeState: "REVISAO_URGENTE",
      },
    };

    const result = decidePedagogicalAction(context);

    expect(result.primaryAction).toBe("REVIEW");
    expect(result.priorityLevel).toBe("CRITICAL");
  });

  // 5. AÇÃO REVIEW / ACTIVE_RECALL POR RISCO ELEVADO DE ESQUECIMENTO (DECAY)
  it("determina REVIEW/ACTIVE_RECALL quando houver elevado risco de esquecimento", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-portugues-crase",
      signals: {
        decayRisk: 0.75,
        daysSinceStudy: 25,
      },
    };

    const result = decidePedagogicalAction(context);

    expect(result.primaryAction).toBe("REVIEW");
    expect(result.alternativeAction).toBe("ACTIVE_RECALL");
    expect(result.priorityLevel).toBe("HIGH");
  });

  // 6. AÇÃO ACTIVE_RECALL PARA RETENÇÃO FRÁGIL
  it("determina ACTIVE_RECALL para tópicos de domínio intermediário-baixo com retenção frágil", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-rlm-probabilidade",
      signals: {
        mastery: 0.5,
        confidence: 0.4,
      },
      analyticsMatrix: {
        topicId: "top-rlm-probabilidade",
        category: "RETENÇÃO_FRÁGIL",
        retentionScore: 0.48,
        decayRisk: 0.3,
        errorRecurrence: 0.1,
        reason: "Test",
      },
    };

    const result = decidePedagogicalAction(context);

    expect(result.primaryAction).toBe("ACTIVE_RECALL");
    expect(result.priorityLevel).toBe("MEDIUM");
  });

  // 7. AÇÃO PRACTICE PARA APLICAÇÃO EM QUESTÕES
  it("determina PRACTICE para domínio intermediário sem erros pendentes", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-dir-admin-atos",
      signals: {
        mastery: 0.75,
        confidence: 0.8,
        unresolvedErrors: 0,
        decayRisk: 0.1,
      },
    };

    const result = decidePedagogicalAction(context);

    expect(result.primaryAction).toBe("PRACTICE");
    expect(result.priorityLevel).toBe("MEDIUM");
  });

  // 8. AÇÃO CONSOLIDATION PARA MAESTRIA ELEVADA
  it("determina CONSOLIDATION com prioridade LOW quando o domínio for alto e estável", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-adm-publica-principios",
      signals: {
        mastery: 0.92,
        confidence: 0.95,
        decayRisk: 0.05,
        unresolvedErrors: 0,
      },
    };

    const result = decidePedagogicalAction(context);

    expect(result.primaryAction).toBe("CONSOLIDATION");
    expect(result.priorityLevel).toBe("LOW");
  });

  // 9. AÇÃO NEW_CONTENT
  it("determina NEW_CONTENT quando permitido, sem pré-requisito deficiente e sem histórico de erros", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-novo-modulo",
      signals: {
        knowledgeState: "SEM_EVIDENCIA",
        prerequisiteDeficit: 0.1,
      },
      allowNewContent: true,
    };

    const result = decidePedagogicalAction(context);

    expect(result.primaryAction).toBe("NEW_CONTENT");
    expect(result.priorityLevel).toBe("MEDIUM");
  });

  // 10. RESOLUÇÃO DETERMINÍSTICA DE CONFLITOS ENTRE SINAIS
  it("resolve conflito entre revisão urgente e conteúdo novo favorecendo revisão", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-conflito-1",
      signals: {
        reviewUrgency: 0.85,
        knowledgeState: "REVISAO_URGENTE",
      },
      allowNewContent: true,
    };

    const result = getPedagogicalDecision(context);

    expect(result.primaryAction).toBe("REVIEW");
    expect(result.primaryAction).not.toBe("NEW_CONTENT");
  });

  // 11. DADOS INSUFICIENTES E CONFIAÇÃO
  it("calcula dataConfidence adequadamente com base nos sinais fornecidos", () => {
    const lowContext: DecisionContext = {
      userId,
      topicId: "top-vazio",
      signals: {},
    };

    const highContext: DecisionContext = {
      userId,
      topicId: "top-completo",
      signals: {
        mastery: 0.8,
        confidence: 0.8,
        decayRisk: 0.2,
        reviewUrgency: 0.1,
        unresolvedErrors: 0,
        prerequisiteDeficit: 0.0,
        knowledgeState: "DOMINADO",
      },
      analyticsProfile: {
        topicId: "top-completo",
        retentionScore: 0.85,
        masteryTrend: 0.1,
        confidenceTrend: 0.1,
        decayRisk: 0.2,
        errorRecurrence: 0,
        reviewEffectiveness: 0.9,
        socraticEffectiveness: null,
        lastEvidenceAt: "2026-08-30T10:00:00Z",
        evidenceCount: 15,
        currentKnowledgeState: "DOMINADO",
      },
    };

    expect(calculateDataConfidence(lowContext)).toBe(0.0);
    expect(calculateDataConfidence(highContext)).toBe(1.0);
  });

  // 12. ORDENAÇÃO DE DECISÕES EM LOTE (BATCH)
  it("ordena lote de decisões por score determinístico descendente", () => {
    const contexts: DecisionContext[] = [
      {
        userId,
        topicId: "top-low-prio",
        signals: { mastery: 0.95 },
      },
      {
        userId,
        topicId: "top-critical-prio",
        signals: { recurringErrors: 2, unresolvedErrors: 2 },
      },
      {
        userId,
        topicId: "top-high-prio",
        signals: { reviewUrgency: 0.8 },
      },
    ];

    const results = getBatchPedagogicalDecisions(contexts);

    expect(results[0].topicId).toBe("top-critical-prio");
    expect(results[0].primaryAction).toBe("REMEDIATION");
    expect(results[1].topicId).toBe("top-high-prio");
    expect(results[1].primaryAction).toBe("REVIEW");
    expect(results[2].topicId).toBe("top-low-prio");
  });

  // 13. IDEMPOTÊNCIA E VALORES NULOS/EXTREMOS
  it("garante idempotência total e tratamento seguro de valores extremos/nulos", () => {
    const context: DecisionContext = {
      userId,
      topicId: "top-edge-case",
      signals: {
        mastery: NaN as any,
        confidence: undefined,
        decayRisk: -5,
        unresolvedErrors: 0,
        prerequisiteDeficit: 0,
      },
    };

    const res1 = decidePedagogicalAction(context);
    const res2 = decidePedagogicalAction(context);

    expect(res1).toEqual(res2);
    expect(res1.decisionScore).toBeGreaterThanOrEqual(0);
    expect(res1.decisionScore).toBeLessThanOrEqual(1.0);
  });
});
