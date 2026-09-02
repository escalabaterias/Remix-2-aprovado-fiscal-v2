import { describe, expect, it } from "vitest";

import {
  addLawTag,
  filterLawTagsByImportance,
  getLawTagById,
  getLawTags,
  searchLawTags,
} from "./lawTagService";
import {
  calculateSyllabusProgress,
  getPendingTopicsForPlanner,
  getSubjectSummaries,
  getSyllabusItems,
  linkLawTagToSyllabusItem,
  updateSyllabusItemNotes,
  updateSyllabusItemStatus,
} from "./syllabusEngine";
import type { SyllabusItem } from "./types";

describe("Edital Verticalizado e LawTags do Vade Mecum (Módulo 8)", () => {
  describe("Motor de LawTags do Vade Mecum", () => {
    it("deve carregar a lista inicial de LawTags da legislação fiscal", () => {
      const tags = getLawTags();
      expect(tags.length).toBeGreaterThan(0);

      const ctnTag = tags.find((t) => t.lawName === "CTN");
      expect(ctnTag).toBeDefined();
      expect(ctnTag?.articleNumber).toContain("Art. 3º");
    });

    it("deve buscar LawTag específica por ID", () => {
      const tag = getLawTagById("cf88-art-150");
      expect(tag).toBeDefined();
      expect(tag?.lawName).toBe("CF/88");
      expect(tag?.articleNumber).toBe("Art. 150");
    });

    it("deve filtrar LawTags por palavra-chave e legislação", () => {
      const ctnResults = searchLawTags("CTN");
      expect(ctnResults.length).toBeGreaterThan(0);
      expect(ctnResults.every((t) => t.lawName === "CTN" || t.description.includes("CTN"))).toBe(
        true,
      );

      const icmsResults = searchLawTags("ICMS");
      expect(icmsResults.length).toBeGreaterThan(0);
    });

    it("deve permitir cadastrar nova LawTag personalizada com ID gerado", () => {
      const newTag = addLawTag({
        lawName: "RICMS/SP",
        articleNumber: "Art. 2º",
        description: "Fato Gerador do ICMS no Estado de São Paulo",
        importanceLevel: "high",
        subject: "Legislação Tributária",
      });

      expect(newTag.id).toBeDefined();
      expect(newTag.lawName).toBe("RICMS/SP");

      const fetched = getLawTagById(newTag.id);
      expect(fetched).toBeDefined();
    });

    it("deve filtrar LawTags por nível de importância", () => {
      const highPriority = filterLawTagsByImportance("high");
      expect(highPriority.length).toBeGreaterThan(0);
      expect(highPriority.every((t) => t.importanceLevel === "high")).toBe(true);
    });
  });

  describe("Motor de Progresso do Edital Verticalizado", () => {
    const mockSyllabus: SyllabusItem[] = [
      {
        id: "1",
        subject: "Direito Tributário",
        topic: "Impostos Estaduais",
        weight: 5,
        status: "mastered",
        lawTags: ["cf88-art-155"],
      },
      {
        id: "2",
        subject: "Direito Tributário",
        topic: "Crédito Tributário",
        weight: 5,
        status: "reviewed",
        lawTags: ["ctn-art-156"],
      },
      {
        id: "3",
        subject: "Direito Tributário",
        topic: "Lançamento",
        weight: 4,
        status: "studying",
        lawTags: [],
      },
      {
        id: "4",
        subject: "Contabilidade Geral",
        topic: "DRE e DFC",
        weight: 3,
        status: "not_started",
        lawTags: [],
      },
    ];

    it("deve calcular a porcentagem geral e a porcentagem ponderada por peso do edital", () => {
      const progress = calculateSyllabusProgress(mockSyllabus);

      expect(progress.totalItems).toBe(4);
      expect(progress.completedItems).toBe(2); // mastered + reviewed
      expect(progress.percentage).toBe(50); // 2/4 = 50%
      expect(progress.weightedPercentage).toBeGreaterThan(0);
      expect(progress.statusCounts.mastered).toBe(1);
      expect(progress.statusCounts.studying).toBe(1);
      expect(progress.statusCounts.not_started).toBe(1);
    });

    it("deve agrupar resumos de progresso por disciplina", () => {
      const summaries = getSubjectSummaries(mockSyllabus);
      expect(summaries).toHaveLength(2);

      const tributario = summaries.find((s) => s.subject === "Direito Tributário");
      expect(tributario).toBeDefined();
      expect(tributario?.totalTopics).toBe(3);
      expect(tributario?.completedTopics).toBe(2);
      expect(tributario?.lawTagsCount).toBe(2);

      const contabilidade = summaries.find((s) => s.subject === "Contabilidade Geral");
      expect(contabilidade?.percentage).toBe(0);
    });

    it("deve ordenar tópicos pendentes por peso para o Planner Adaptativo", () => {
      const pending = getPendingTopicsForPlanner(mockSyllabus);

      expect(pending).toHaveLength(2); // 'studying' e 'not_started'
      expect(pending[0]!.weight).toBeGreaterThanOrEqual(pending[1]!.weight);
      expect(pending[0]!.topic).toBe("Lançamento"); // peso 4 > peso 3
    });

    it("deve vincular LawTag a um item do edital", () => {
      const initialItems = getSyllabusItems();
      const firstItem = initialItems[0]!;

      const updated = linkLawTagToSyllabusItem(firstItem.id, "lei-14133-art-11");
      const updatedItem = updated.find((i) => i.id === firstItem.id);

      expect(updatedItem?.lawTags).toContain("lei-14133-art-11");
    });
  });
});
