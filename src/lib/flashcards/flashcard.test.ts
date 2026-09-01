import { describe, expect, it } from "vitest";

import {
  calculateSM2,
  filterDueCards,
  formatIntervalLabel,
  getDeckSummaries,
  isCardDue,
} from "./spacedRepetitionEngine";
import { createFlashcardFromError, createFlashcardFromLawTag } from "./service";
import type { Flashcard } from "./types";

describe("Spaced Repetition Engine (SM-2)", () => {
  const baseCard = {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
  };
  const mockDate = new Date("2026-09-01T12:00:00.000Z");

  describe("calculateSM2", () => {
    it("deve tratar o rating 'again' resetando repetições e reduzindo Ease Factor em 0.2", () => {
      const card = { interval: 6, repetitions: 2, easeFactor: 2.5 };
      const res = calculateSM2(card, "again", mockDate);

      expect(res.repetitions).toBe(0);
      expect(res.interval).toBe(1);
      expect(res.easeFactor).toBe(2.3);
      expect(res.dueDate).toBe("2026-09-02");
    });

    it("não deve permitir Ease Factor menor que 1.3", () => {
      const card = { interval: 1, repetitions: 0, easeFactor: 1.35 };
      const res = calculateSM2(card, "again", mockDate);

      expect(res.easeFactor).toBe(1.3);
    });

    it("deve calcular progressão de repetição para rating 'hard'", () => {
      // 1ª repetição
      const res1 = calculateSM2(baseCard, "hard", mockDate);
      expect(res1.repetitions).toBe(1);
      expect(res1.interval).toBe(1);
      expect(res1.easeFactor).toBe(2.35);

      // 2ª repetição
      const res2 = calculateSM2(res1, "hard", mockDate);
      expect(res2.repetitions).toBe(2);
      expect(res2.interval).toBe(3);
      expect(res2.easeFactor).toBe(2.2);

      // 3ª repetição
      const res3 = calculateSM2(res2, "hard", mockDate);
      expect(res3.repetitions).toBe(3);
      expect(res3.interval).toBe(4); // 3 * 1.2 = 3.6 => Math.round = 4
    });

    it("deve calcular a sequência padrão SM-2 para rating 'good' (1d, 6d, interval * EF)", () => {
      // 1ª repetição
      const res1 = calculateSM2(baseCard, "good", mockDate);
      expect(res1.repetitions).toBe(1);
      expect(res1.interval).toBe(1);
      expect(res1.easeFactor).toBe(2.5);

      // 2ª repetição
      const res2 = calculateSM2(res1, "good", mockDate);
      expect(res2.repetitions).toBe(2);
      expect(res2.interval).toBe(6);
      expect(res2.easeFactor).toBe(2.5);

      // 3ª repetição (6 * 2.5 = 15 dias)
      const res3 = calculateSM2(res2, "good", mockDate);
      expect(res3.repetitions).toBe(3);
      expect(res3.interval).toBe(15);
      expect(res3.easeFactor).toBe(2.5);
    });

    it("deve calcular bônus de intervalo e aumentar Ease Factor em +0.15 para rating 'easy'", () => {
      // 1ª repetição fácil
      const res1 = calculateSM2(baseCard, "easy", mockDate);
      expect(res1.repetitions).toBe(1);
      expect(res1.interval).toBe(4);
      expect(res1.easeFactor).toBe(2.65);

      // 2ª repetição fácil
      const res2 = calculateSM2(res1, "easy", mockDate);
      expect(res2.repetitions).toBe(2);
      expect(res2.interval).toBe(10);
      expect(res2.easeFactor).toBe(2.8);
    });
  });

  describe("Filtros de Data e Due Cards", () => {
    const today = new Date("2026-09-01T12:00:00.000Z");

    const sampleCard = (id: string, dueDate: string, repetitions = 1): Flashcard => ({
      id,
      frontContent: `Pergunta ${id}`,
      backContent: `Resposta ${id}`,
      subject: "Direito Tributário",
      interval: 1,
      repetitions,
      easeFactor: 2.5,
      dueDate,
      createdAt: "2026-08-30T10:00:00.000Z",
      updatedAt: "2026-08-30T10:00:00.000Z",
    });

    it("deve considerar cartão novo (repetitions = 0) como devido independente da data", () => {
      const newCard = sampleCard("c1", "2026-09-10", 0);
      expect(isCardDue(newCard, today)).toBe(true);
    });

    it("deve identificar cartões vencidos hoje ou no passado", () => {
      const pastCard = sampleCard("c2", "2026-08-31", 1);
      const todayCard = sampleCard("c3", "2026-09-01", 1);
      const futureCard = sampleCard("c4", "2026-09-05", 1);

      expect(isCardDue(pastCard, today)).toBe(true);
      expect(isCardDue(todayCard, today)).toBe(true);
      expect(isCardDue(futureCard, today)).toBe(false);
    });

    it("deve filtrar lista de flashcards devidos corretamente", () => {
      const cards = [
        sampleCard("1", "2026-08-30", 1),
        sampleCard("2", "2026-09-01", 1),
        sampleCard("3", "2026-09-05", 2),
      ];
      const due = filterDueCards(cards, today);
      expect(due.map((c) => c.id)).toEqual(["1", "2"]);
    });
  });

  describe("Resumo de Decks e Rótulos", () => {
    it("deve agrupar resumos de decks por matéria", () => {
      const cards: Flashcard[] = [
        {
          id: "1",
          frontContent: "F1",
          backContent: "B1",
          subject: "Direito Tributário",
          interval: 1,
          repetitions: 0,
          easeFactor: 2.5,
          dueDate: "2026-09-01",
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "2",
          frontContent: "F2",
          backContent: "B2",
          subject: "Direito Tributário",
          interval: 5,
          repetitions: 2,
          easeFactor: 2.5,
          dueDate: "2026-09-10",
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "3",
          frontContent: "F3",
          backContent: "B3",
          subject: "Contabilidade",
          interval: 1,
          repetitions: 1,
          dueDate: "2026-08-31",
          easeFactor: 2.5,
          createdAt: "",
          updatedAt: "",
        },
      ];

      const summaries = getDeckSummaries(cards, new Date("2026-09-01T12:00:00.000Z"));
      expect(summaries).toHaveLength(2);

      const tributario = summaries.find((s) => s.subject === "Direito Tributário");
      expect(tributario).toBeDefined();
      expect(tributario?.totalCards).toBe(2);
      expect(tributario?.dueCards).toBe(1);
      expect(tributario?.newCards).toBe(1);
    });

    it("deve formatar rótulos de intervalo amigavelmente em português", () => {
      expect(formatIntervalLabel(0)).toBe("Hoje");
      expect(formatIntervalLabel(1)).toBe("1 dia");
      expect(formatIntervalLabel(15)).toBe("15 dias");
      expect(formatIntervalLabel(30)).toBe("1 mês");
      expect(formatIntervalLabel(60)).toBe("2 meses");
    });
  });

  describe("Integração com Caderno de Erros e LawTags", () => {
    it("deve criar flashcard vinculado a um erro do Caderno de Erros", () => {
      const card = createFlashcardFromError({
        frontContent: "Por que errei a questão de ISS?",
        backContent:
          "Esqueci que o ISS incide no local do estabelecimento prestador (regra geral).",
        subject: "Legislação Tributária",
        errorEntryId: "err-123",
        questionId: "q-456",
      });

      expect(card.errorEntryId).toBe("err-123");
      expect(card.questionId).toBe("q-456");
      expect(card.repetitions).toBe(0);
      expect(card.easeFactor).toBe(2.5);
    });

    it("deve criar flashcard vinculado a uma LawTag do Vade Mecum", () => {
      const card = createFlashcardFromLawTag({
        frontContent: "O que diz o Art. 156, I da CF/88?",
        backContent:
          "Compete aos Municípios instituir impostos sobre propriedade predial e territorial urbana (IPTU).",
        subject: "Direito Constitucional",
        lawTagId: "cf88-art-156-i",
      });

      expect(card.lawTagId).toBe("cf88-art-156-i");
      expect(card.subject).toBe("Direito Constitucional");
      expect(card.repetitions).toBe(0);
    });
  });
});
