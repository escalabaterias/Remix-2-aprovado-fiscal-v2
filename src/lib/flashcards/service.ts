import { calculateSM2 } from "./spacedRepetitionEngine";
import type { Flashcard, ReviewLog, ReviewRating } from "./types";

const LOCAL_STORAGE_KEY = "aprovado_fiscal_flashcards_v1";
const LOGS_STORAGE_KEY = "aprovado_fiscal_flashcards_logs_v1";

const INITIAL_SEED_FLASHCARDS: Flashcard[] = [
  {
    id: "fc-seed-1",
    frontContent: "Qual a definição legal de Tributo segundo o Art. 3º do CTN?",
    backContent:
      "Tributo é toda prestação pecuniária compulsória, em moeda ou cujo valor nela se possa exprimir, que não constitua sanção de ato ilícito, instituída em lei e cobrada mediante atividade administrativa plenamente vinculada.",
    subject: "Direito Tributário",
    lawTagId: "ctn-art-3",
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date().toISOString().split("T")[0]!,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fc-seed-2",
    frontContent:
      "Em quais hipóteses o Art. 111 do CTN exige interpretação LITERAL da legislação tributária?",
    backContent:
      "Interpreta-se literalmente a legislação tributária que disponha sobre:\n1. Suspensão ou exclusão do crédito tributário;\n2. Outorga de isenção;\n3. Dispensa do cumprimento de obrigações tributárias acessórias.",
    subject: "Direito Tributário",
    lawTagId: "ctn-art-111",
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date().toISOString().split("T")[0]!,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fc-seed-3",
    frontContent: "Qual a diferença entre Lançamento por Homologação e Lançamento por Declaração?",
    backContent:
      "• Homologação (Art. 150 CTN): O sujeito passivo antecipa o pagamento sem prévio exame da autoridade fiscal (ex: ICMS, IR).\n• Declaração (Art. 147 CTN): Efetuado com base na declaração prestada pelo sujeito passivo ou por terceiro (ex: ITBI).",
    subject: "Direito Tributário",
    lawTagId: "ctn-art-147-150",
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date().toISOString().split("T")[0]!,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fc-seed-4",
    frontContent:
      "Quais são as vedações constitucionais ao poder de tributar (Princípios das Imunidades - Art. 150, VI da CF/88)?",
    backContent:
      "É vedado instituir impostos sobre:\na) Patrimônio, renda ou serviços uns dos outros (Imunidade Recíproca);\nb) Templos de qualquer culto;\nc) Patrimônio, renda ou serviços dos partidos políticos, sindicatos dos trabalhadores, entidades educacionais e de assistência social sem fins lucrativos;\nd) Livros, jornais, periódicos e o papel destinado a sua impressão.",
    subject: "Direito Constitucional",
    lawTagId: "cf88-art-150-vi",
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date().toISOString().split("T")[0]!,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "fc-seed-5",
    frontContent:
      "Em Contabilidade Geral, qual a definição de Ativo segundo a Estrutura Conceitual (CPC 00)?",
    backContent:
      "Ativo é um recurso econômico presente controlado pela entidade como resultado de eventos passados. Um recurso econômico é um direito que tem o potencial de produzir benefícios econômicos.",
    subject: "Contabilidade Geral",
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date().toISOString().split("T")[0]!,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Carrega todos os flashcards do armazenamento local (com fallbacks seed).
 */
export function getFlashcards(): Flashcard[] {
  if (typeof window === "undefined") return INITIAL_SEED_FLASHCARDS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(INITIAL_SEED_FLASHCARDS));
      return INITIAL_SEED_FLASHCARDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SEED_FLASHCARDS;
  } catch {
    return INITIAL_SEED_FLASHCARDS;
  }
}

/**
 * Salva a lista completa de flashcards.
 */
export function saveFlashcards(cards: Flashcard[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cards));
  } catch (err) {
    console.error("Erro ao salvar flashcards no localStorage:", err);
  }
}

/**
 * Registra o log de uma revisão efetuada.
 */
export function saveReviewLog(log: ReviewLog): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    const existing: ReviewLog[] = raw ? JSON.parse(raw) : [];
    existing.push(log);
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(existing));
  } catch (err) {
    console.error("Erro ao salvar log de revisão de flashcard:", err);
  }
}

/**
 * Processa a resposta do aluno para um flashcard e atualiza seus parâmetros SM-2.
 */
export function answerFlashcard(
  cardId: string,
  rating: ReviewRating,
  currentDate: Date = new Date(),
): { updatedCard: Flashcard; log: ReviewLog } {
  const cards = getFlashcards();
  const index = cards.findIndex((c) => c.id === cardId);

  if (index === -1) {
    throw new Error(`Flashcard ${cardId} não encontrado.`);
  }

  const card = cards[index]!;
  const sm2 = calculateSM2(card, rating, currentDate);

  const updatedCard: Flashcard = {
    ...card,
    interval: sm2.interval,
    repetitions: sm2.repetitions,
    easeFactor: sm2.easeFactor,
    dueDate: sm2.dueDate,
    updatedAt: currentDate.toISOString(),
  };

  cards[index] = updatedCard;
  saveFlashcards(cards);

  const log: ReviewLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    cardId: card.id,
    rating,
    previousInterval: card.interval,
    nextInterval: sm2.interval,
    previousEaseFactor: card.easeFactor,
    nextEaseFactor: sm2.easeFactor,
    timestamp: currentDate.toISOString(),
  };

  saveReviewLog(log);

  return { updatedCard, log };
}

/**
 * Cria um novo flashcard manual ou vinculado.
 */
export function createFlashcard(data: {
  frontContent: string;
  backContent: string;
  subject: string;
  lawTagId?: string;
  questionId?: string;
  errorEntryId?: string;
}): Flashcard {
  const cards = getFlashcards();
  const now = new Date().toISOString();
  const today = now.split("T")[0]!;

  const newCard: Flashcard = {
    id: `fc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    frontContent: data.frontContent.trim(),
    backContent: data.backContent.trim(),
    subject: data.subject.trim() || "Geral",
    lawTagId: data.lawTagId,
    questionId: data.questionId,
    errorEntryId: data.errorEntryId,
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: today,
    createdAt: now,
    updatedAt: now,
  };

  cards.unshift(newCard);
  saveFlashcards(cards);
  return newCard;
}

/**
 * Cria um flashcard a partir de um erro registrado no Caderno de Erros.
 */
export function createFlashcardFromError(params: {
  frontContent: string;
  backContent: string;
  subject: string;
  errorEntryId: string;
  questionId?: string;
}): Flashcard {
  return createFlashcard({
    frontContent: params.frontContent,
    backContent: params.backContent,
    subject: params.subject,
    errorEntryId: params.errorEntryId,
    questionId: params.questionId,
  });
}

/**
 * Cria um flashcard a partir de uma LawTag do Vade Mecum / Lei Seca.
 */
export function createFlashcardFromLawTag(params: {
  frontContent: string;
  backContent: string;
  subject: string;
  lawTagId: string;
}): Flashcard {
  return createFlashcard({
    frontContent: params.frontContent,
    backContent: params.backContent,
    subject: params.subject,
    lawTagId: params.lawTagId,
  });
}

/**
 * Exclui um flashcard pelo ID.
 */
export function deleteFlashcard(cardId: string): void {
  const cards = getFlashcards().filter((c) => c.id !== cardId);
  saveFlashcards(cards);
}

/**
 * Reseta o progresso de um flashcard de volta ao estado inicial SM-2.
 */
export function resetFlashcardProgress(cardId: string): Flashcard {
  const cards = getFlashcards();
  const index = cards.findIndex((c) => c.id === cardId);
  if (index === -1) throw new Error("Flashcard não encontrado.");

  const now = new Date().toISOString();
  const updatedCard: Flashcard = {
    ...cards[index]!,
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: now.split("T")[0]!,
    updatedAt: now,
  };

  cards[index] = updatedCard;
  saveFlashcards(cards);
  return updatedCard;
}

/**
 * Retorna o resumo estatístico dos flashcards (total, vencidos, dominados e em aprendizado).
 */
export function getFlashcardsSummary(
  currentDateStr: string = new Date().toISOString().split("T")[0]!,
) {
  const cards = getFlashcards();
  const totalCards = cards.length;
  const dueCards = cards.filter((c) => c.dueDate <= currentDateStr).length;
  const masteredCards = cards.filter((c) => c.interval >= 21).length;
  const learningCards = cards.filter((c) => c.interval < 21).length;

  return {
    totalCards,
    dueCards,
    masteredCards,
    learningCards,
  };
}
