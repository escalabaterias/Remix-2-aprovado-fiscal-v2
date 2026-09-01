import type { DeckSummary, Flashcard, ReviewRating, SM2Result } from "./types";

/**
 * Algoritmo de Repetição Espaçada SM-2 (SuperMemo 2).
 * Recalcula intervalo (em dias), repetições consecutivas e fator de facilidade (Ease Factor)
 * com base na avaliação do estudante ('again', 'hard', 'good', 'easy').
 */
export function calculateSM2(
  card: Pick<Flashcard, "interval" | "repetitions" | "easeFactor">,
  rating: ReviewRating,
  currentDate: Date = new Date(),
): SM2Result {
  let { repetitions, interval, easeFactor } = card;

  // Garante valores válidos caso venham zerados/indefinidos
  if (easeFactor < 1.3) easeFactor = 2.5;
  if (repetitions < 0) repetitions = 0;
  if (interval < 0) interval = 0;

  switch (rating) {
    case "again": {
      repetitions = 0;
      interval = 1;
      easeFactor = Math.max(1.3, Number((easeFactor - 0.2).toFixed(2)));
      break;
    }
    case "hard": {
      repetitions += 1;
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 3;
      } else {
        interval = Math.max(interval + 1, Math.round(interval * 1.2));
      }
      easeFactor = Math.max(1.3, Number((easeFactor - 0.15).toFixed(2)));
      break;
    }
    case "good": {
      repetitions += 1;
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      break;
    }
    case "easy": {
      repetitions += 1;
      if (repetitions === 1) {
        interval = 4;
      } else if (repetitions === 2) {
        interval = 10;
      } else {
        interval = Math.round(interval * easeFactor * 1.3);
      }
      easeFactor = Number((easeFactor + 0.15).toFixed(2));
      break;
    }
  }

  // Calcula nova data de vencimento (dueDate) adicionando o intervalo em dias à data base
  const nextDate = new Date(currentDate);
  nextDate.setDate(nextDate.getDate() + interval);
  const dueDate = nextDate.toISOString().split("T")[0]!;

  return {
    interval,
    repetitions,
    easeFactor,
    dueDate,
  };
}

/**
 * Verifica se o flashcard está devido (vencido ou novo).
 */
export function isCardDue(card: Flashcard, referenceDate: Date = new Date()): boolean {
  if (card.repetitions === 0) return true;
  const todayStr = referenceDate.toISOString().split("T")[0]!;
  return card.dueDate <= todayStr;
}

/**
 * Filtra flashcards devidos para revisão no dia.
 */
export function filterDueCards(cards: Flashcard[], referenceDate: Date = new Date()): Flashcard[] {
  return cards.filter((c) => isCardDue(c, referenceDate));
}

/**
 * Agrupa flashcards por matéria e calcula resumo de estatísticas dos decks.
 */
export function getDeckSummaries(
  cards: Flashcard[],
  referenceDate: Date = new Date(),
): DeckSummary[] {
  const map = new Map<string, { total: number; due: number; newCards: number }>();

  for (const card of cards) {
    const subject = card.subject || "Geral";
    const current = map.get(subject) ?? { total: 0, due: 0, newCards: 0 };
    current.total += 1;

    if (isCardDue(card, referenceDate)) {
      current.due += 1;
    }
    if (card.repetitions === 0) {
      current.newCards += 1;
    }

    map.set(subject, current);
  }

  return Array.from(map.entries()).map(([subject, stats]) => ({
    subject,
    totalCards: stats.total,
    dueCards: stats.due,
    newCards: stats.newCards,
  }));
}

/**
 * Retorna o rótulo amigável em português para o intervalo em dias.
 */
export function formatIntervalLabel(days: number): string {
  if (days <= 0) return "Hoje";
  if (days === 1) return "1 dia";
  if (days < 30) return `${days} dias`;
  const months = Math.round((days / 30) * 10) / 10;
  if (months === 1) return "1 mês";
  return `${months} meses`;
}
