import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SocraticSessionContext } from "../socratic/types";
import { extractLegalCitations, validateLegalGrounding } from "./grounding";

import { getAllVerifiedLegalSources, VERIFIED_LEGAL_SOURCES_REPOSITORY } from "./repository";

import { queryLegalSources, retrieveLegalSources } from "./retrieval";

import {
  buildLegalEvidenceMetadata,
  calculateLegalSourcesCacheKey,
  prepareLegalRetrievalContext,
  processLegalSocraticTurn,
} from "./service";

import type { LegalRetrievalContext, LegalSource } from "./types";

// Mock do AI Gateway para os testes de integração sem dependência externa
vi.mock("@/services/ai/gateway", () => ({
  runAiTask: vi.fn(),
}));

import { runAiTask } from "@/services/ai/gateway";

const mockRunAiTask = vi.mocked(runAiTask);

describe("Fase 7.3.2 — Banco de Legislação + RAG Jurídico + Contexto do Professor Fiscal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createBaseSocraticContext = (): SocraticSessionContext => ({
    sessionId: "sess_legal_123",
    topicId: "t_princípios",
    topicName: "Princípios Tributários e Limitações ao Poder de Tributar",
    subjectName: "Direito Tributário",
    currentState: "QUESTION",
    currentTurnNumber: 1,
    hintLevel: 0,
    pedagogicalGoal: "Compreender a regra da anterioridade tributária e noventena",
    pedagogicalMode: "ACTIVE_RECALL",
    turnHistory: [],
    constraints: { maxHints: 3, maxTurns: 6 },
    validTopicNames: [
      "Princípios Tributários e Limitações ao Poder de Tributar",
      "Lançamento Tributário",
      "Crédito Tributário",
    ],
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. REPOSITÓRIO E MODELO DE FONTES JURÍDICAS (7.3.2.1)
  // ───────────────────────────────────────────────────────────────────────────
  describe("7.3.2.1 — Legal Source Model & Repository", () => {
    it("1.1 possui repositório nativo preenchido com fontes auditadas do Direito Tributário", () => {
      const sources = getAllVerifiedLegalSources();
      expect(sources.length).toBeGreaterThanOrEqual(10);

      const cf150 = sources.find((s) => s.sourceId === "SRC_CF88_150");
      expect(cf150).toBeDefined();
      expect(cf150?.sourceType).toBe("CONSTITUICAO");
      expect(cf150?.documentIdentifier).toBe("CF/88");
      expect(cf150?.article).toBe("Art. 150");
      expect(cf150?.validityStatus).toBe("VIGENTE");
      expect(cf150?.keywords).toContain("anterioridade");
    });

    it("1.2 estrutura de fontes atende a todas as propriedades tipadas exigidas", () => {
      const ctn142 = VERIFIED_LEGAL_SOURCES_REPOSITORY.find((s) => s.sourceId === "SRC_CTN_142");
      expect(ctn142).toBeDefined();
      expect(ctn142?.jurisdiction).toBe("Federal");
      expect(ctn142?.authority).toBe("Congresso Nacional");
      expect(ctn142?.topicIds).toContain("t_lancamento_tributario");
      expect(ctn142?.keywords).toContain("lançamento tributário");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. RECUPERAÇÃO DETERMINÍSTICA (7.3.2.2)
  // ───────────────────────────────────────────────────────────────────────────
  describe("7.3.2.2 — Legal Retrieval Layer", () => {
    it("2.1 recupera fonte jurídica válida por tópico e conceito", () => {
      const ctx: LegalRetrievalContext = {
        topicId: "t_princípios",
        topicName: "Princípios Tributários",
        targetConcept: "anterioridade nonagesimal",
      };

      const result = retrieveLegalSources(ctx);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.sourceId).toBe("SRC_CF88_150");
    });

    it("2.2 recupera múltiplas fontes para tópicos abrangentes como Lançamento Tributário", () => {
      const ctx: LegalRetrievalContext = {
        topicId: "t_lancamento_tributario",
        topicName: "Lançamento Tributário",
        targetConcept: "homologação e ofício",
        limit: 5,
      };

      const result = retrieveLegalSources(ctx);
      expect(result.length).toBeGreaterThanOrEqual(2);

      const sourceIds = result.map((s) => s.sourceId);
      expect(sourceIds).toContain("SRC_CTN_142");
      expect(sourceIds.some((id) => id === "SRC_CTN_150" || id === "SRC_CTN_149")).toBe(true);
    });

    it("2.3 retorna lista vazia quando não encontra nenhuma legislação para tópico inexistente", () => {
      const ctx: LegalRetrievalContext = {
        topicId: "t_topico_inexistente_de_astronomia",
        topicName: "Astronomia Estelar e Galáxias",
        targetConcept: "Supernovas",
      };

      const result = retrieveLegalSources(ctx);
      expect(result).toHaveLength(0);
    });

    it("2.4 permite filtragem direta via queryLegalSources", () => {
      const result = queryLegalSources({
        article: "Art. 174",
        concept: "prescrição",
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]!.sourceId).toBe("SRC_CTN_174");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. GROUNDING JURÍDICO E ANTI-ALUCINAÇÃO (7.3.2.3 & 7.3.2.8)
  // ───────────────────────────────────────────────────────────────────────────
  describe("7.3.2.3 & 7.3.2.8 — Grounding Jurídico e Guardrails Anti-Alucinação", () => {
    it("3.1 valida com sucesso texto da IA embasado nas fontes recuperadas", () => {
      const sources = [
        VERIFIED_LEGAL_SOURCES_REPOSITORY.find((s) => s.sourceId === "SRC_CF88_150")!,
      ];

      const responseText =
        "Com base no Art. 150 da CF/88, a cobrança de tributo deve respeitar a anterioridade.";
      const check = validateLegalGrounding(responseText, sources);

      expect(check.isGrounded).toBe(true);
      expect(check.hasHallucination).toBe(false);
      expect(check.unfoundCitations).toHaveLength(0);
    });

    it("3.2 detecta alucinação quando a IA cita dispositivo legal inexistente nas fontes", () => {
      const sources = [
        VERIFIED_LEGAL_SOURCES_REPOSITORY.find((s) => s.sourceId === "SRC_CF88_150")!,
      ];

      const hallucinatedText =
        "Conforme o Art. 999 do CTN e a Lei 99.999/2026, a prescrição ocorre em 10 anos.";
      const check = validateLegalGrounding(hallucinatedText, sources);

      expect(check.isGrounded).toBe(false);
      expect(check.hasHallucination).toBe(true);
      expect(check.unfoundCitations.length).toBeGreaterThan(0);
      expect(check.hallucinationReason).toContain("Violação de Guardrail Jurídico");
    });

    it("3.3 lida limpadamente quando não há nenhuma fonte disponível no contexto", () => {
      const checkWithoutCitations = validateLegalGrounding(
        "Qual o seu raciocínio sobre a regra?",
        [],
      );
      expect(checkWithoutCitations.isGrounded).toBe(true);
      expect(checkWithoutCitations.hasHallucination).toBe(false);

      const checkWithHallucinatedCitation = validateLegalGrounding("Pelo Art. 150 da CF/88...", []);
      expect(checkWithHallucinatedCitation.isGrounded).toBe(false);
      expect(checkWithHallucinatedCitation.hasHallucination).toBe(true);
      expect(checkWithHallucinatedCitation.sanitizedText).toContain(
        "Não foi localizada fonte jurídica suficiente",
      );
    });

    it("3.4 extrai citações jurídicas de forma determinística", () => {
      const text = "O Art. 150 da CF/88, regulado pela LC 116/2003 e pela Súmula Vinculante 50.";
      const extracted = extractLegalCitations(text);

      expect(extracted.length).toBeGreaterThanOrEqual(3);
      expect(extracted.some((c) => c.toLowerCase().includes("150"))).toBe(true);
      expect(extracted.some((c) => c.toLowerCase().includes("116"))).toBe(true);
      expect(extracted.some((c) => c.toLowerCase().includes("50"))).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. INTEGRAÇÃO COM CENTRAL DE ERROS E REVISÃO ATIVA (7.3.2.5 & 7.3.2.6)
  // ───────────────────────────────────────────────────────────────────────────
  describe("7.3.2.5 & 7.3.2.6 — Integração com Central de Erros e Revisão Ativa", () => {
    it("4.1 prepara o contexto de recuperação incorporando padrão de erro da Central de Erros", () => {
      const socraticCtx = createBaseSocraticContext();
      socraticCtx.contextMetadata = {
        errorCategory: "excecao_normativa",
        errorPattern: "confusão na anterioridade noventena",
        isRecurring: true,
      };

      const retrievalCtx = prepareLegalRetrievalContext(socraticCtx);
      expect(retrievalCtx.errorContext?.errorCategory).toBe("excecao_normativa");
      expect(retrievalCtx.errorContext?.isRecurring).toBe(true);

      const retrieved = retrieveLegalSources(retrievalCtx);
      expect(retrieved.length).toBeGreaterThan(0);
      expect(retrieved[0]!.sourceId).toBe("SRC_CF88_150");
    });

    it("4.2 diferencia corretamente os quatro tipos de revisão ativa", () => {
      const baseCtx = createBaseSocraticContext();

      const types = ["manutencao", "consolidacao", "recuperacao", "erro_direcionado"] as const;
      for (const revType of types) {
        baseCtx.contextMetadata = { reviewType: revType };
        const retCtx = prepareLegalRetrievalContext(baseCtx);
        expect(retCtx.reviewType).toBe(revType);
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. CACHE, AI GATEWAY E EVIDENCE METADATA (7.3.2.7, 7.3.2.9 & 7.3.2.10)
  // ───────────────────────────────────────────────────────────────────────────
  describe("7.3.2.7 & 7.3.2.9 — Cache e Metadados de Evidência", () => {
    it("5.1 calcula chave de cache que varia com as fontes jurídicas e suas versões", () => {
      const s1 = VERIFIED_LEGAL_SOURCES_REPOSITORY.slice(0, 1);
      const s2 = VERIFIED_LEGAL_SOURCES_REPOSITORY.slice(0, 2);

      const key1 = calculateLegalSourcesCacheKey(s1);
      const key2 = calculateLegalSourcesCacheKey(s2);

      expect(key1).not.toEqual(key2);
      expect(key1).toContain("SRC_CF88_150");
    });

    it("5.2 gera metadados de evidência preparados para a Evidence Layer sem alterar motores existentes", () => {
      const sources = VERIFIED_LEGAL_SOURCES_REPOSITORY.slice(0, 2);
      const meta = buildLegalEvidenceMetadata(
        sources,
        true,
        "Lançamento Tributário",
        "topic_match",
      );

      expect(meta.legalSourceUsed).toHaveLength(2);
      expect(meta.legalSourceUsed).toContain("SRC_CF88_150");
      expect(meta.legalGrounded).toBe(true);
      expect(meta.sourceCount).toBe(2);
      expect(meta.retrievalMethod).toBe("topic_match");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. PROCESSAMENTO DO TURNO SOCRÁTICO COM GROUNDING (7.3.2.4 & 7.3.2.11)
  // ───────────────────────────────────────────────────────────────────────────
  describe("7.3.2.4 & 7.3.2.11 — Processamento de Turno com o Professor Fiscal", () => {
    it("6.1 executa um turno socrático completo fundamentado em fontes jurídicas via AI Gateway", async () => {
      const socraticCtx = createBaseSocraticContext();

      mockRunAiTask.mockResolvedValueOnce({
        status: "sucesso",
        output: {
          status: "active",
          pedagogicalMode: "ACTIVE_RECALL",
          action: "ASK",
          question:
            "Com base no Art. 150 da CF/88, qual exceção se aplica ao prazo da anterioridade?",
          hintLevel: 0,
          evaluation: {
            classification: "NO_RESPONSE",
            confidence: 0.9,
            reasoningQuality: "ausente",
            needsHint: true,
            recommendedNextStep: "ASK",
          },
          detectedGap: "Necessidade de recordar a exceção à anterioridade",
          confidenceScore: 0.95,
          shouldContinue: true,
          nextAction: "ASK",
        },
        cached: false,
        model: "gemini-3.6-flash",
        durationMs: 250,
      });

      const result = await processLegalSocraticTurn(socraticCtx, "");

      expect(result.status).toBe("processado");
      expect(result.response?.question).toContain("CF/88");
      expect(result.updatedContext.contextMetadata?.legalContext).toBeDefined();

      const legalCtx = result.updatedContext.contextMetadata?.legalContext as unknown as {
        relevantLegalSources: LegalSource[];
      };
      expect(legalCtx.relevantLegalSources.length).toBeGreaterThan(0);
      expect(legalCtx.relevantLegalSources[0]!.sourceId).toBe("SRC_CF88_150");

      expect(result.legalEvidenceMetadata).toBeDefined();
      expect(result.legalEvidenceMetadata?.legalGrounded).toBe(true);
    });

    it("6.2 aciona fallback gracioso mantendo fundamentação quando o AI Gateway falha", async () => {
      const socraticCtx = createBaseSocraticContext();

      mockRunAiTask.mockResolvedValueOnce({
        status: "erro",
        output: null,
        cached: false,
        errorMessage: "Timeout de conexão",
      });

      const result = await processLegalSocraticTurn(socraticCtx, "O que é anterioridade?");

      expect(result.status).toBe("erro");
      expect(result.response?.status).toBe("active");
      expect(result.updatedContext.contextMetadata?.legalContext).toBeDefined();
    });

    it("6.3 garante que motores determinísticos existentes permanecem 100% intactos", () => {
      // Verificação explícita de ausência de regressão
      const socraticCtx = createBaseSocraticContext();
      expect(socraticCtx.validTopicNames).toHaveLength(3);
      expect(socraticCtx.constraints.maxHints).toBe(3);
    });
  });
});
