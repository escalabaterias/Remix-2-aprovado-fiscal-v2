import { Question, QuestionAttempt, ExamSession, ErrorCategory } from "./types";
import { FISCAL_QUESTIONS, registerAttempt as baseRegisterAttempt } from "./errorTracker";

/**
 * Banco estendido de questões incluindo RLM (Exatas) e Contabilidade para a Etapa 5.1
 */
export const EXTENDED_FISCAL_QUESTIONS: Question[] = [
  ...FISCAL_QUESTIONS,
  {
    id: "Q-05",
    subjectId: "RLM",
    subjectName: "Raciocínio Lógico",
    topicId: "PROP-LOG",
    topicName: "Proposições Lógicas e Equivalências",
    examBoard: "FGV",
    year: 2025,
    difficulty: "Médio",
    statement:
      "Se o Auditor Fiscal autua a empresa X, então a arrecadação aumenta. Uma proposição logicamente equivalente a essa é:",
    alternatives: [
      "A) Se a arrecadação não aumenta, então o Auditor Fiscal não autua a empresa X.",
      "B) Se o Auditor Fiscal não autua a empresa X, então a arrecadação não aumenta.",
      "C) O Auditor Fiscal autua a empresa X e a arrecadação não aumenta.",
      "D) Se a arrecadação aumenta, então o Auditor Fiscal autua a empresa X.",
      "E) O Auditor Fiscal não autua a empresa X ou a arrecadação não aumenta.",
    ],
    correctAnswer: "A",
    explanation:
      "Gabarito: Alternativa A. Trata-se da equivalência da condicional (Contrapositiva): p → q ≡ ~q → ~p. 'Se o Auditor Fiscal autua a empresa X (p), então a arrecadação aumenta (q)' equivale a 'Se a arrecadação não aumenta (~q), então o Auditor Fiscal não autua a empresa X (~p)'.",
    associatedLaws: ["Negação de Condicional", "Contrapositiva"],
    options: [
      "A) Se a arrecadação não aumenta, então o Auditor Fiscal não autua a empresa X.",
      "B) Se o Auditor Fiscal não autua a empresa X, então a arrecadação não aumenta.",
      "C) O Auditor Fiscal autua a empresa X e a arrecadação não aumenta.",
      "D) Se a arrecadação aumenta, então o Auditor Fiscal autua a empresa X.",
      "E) O Auditor Fiscal não autua a empresa X ou a arrecadação não aumenta.",
    ],
    board: "FGV",
    lawTags: ["Equivalência Logica", "Contrapositiva"],
  },
  {
    id: "Q-06",
    subjectId: "CONTAB",
    subjectName: "Contabilidade Geral",
    topicId: "DRE",
    topicName: "Demonstração do Resultado do Exercício",
    examBoard: "Cebraspe",
    year: 2024,
    difficulty: "Difícil",
    statement:
      "No regime de competência, as receitas e despesas são reconhecidas no período em que ocorrem, independentemente de recebimento ou pagamento. Em uma auditoria contábil, a constatação de receita recebida antecipadamente e já contabilizada no resultado do exercício atual viola o princípio da competência contábil.",
    alternatives: ["C", "E"],
    correctAnswer: "C",
    explanation:
      "Gabarito: Certo (C). Receitas recebidas antecipadamente devem ser registradas no Passivo (Receitas Diferidas) e reconhecidas no resultado apenas quando o fato gerador ocorrer. Contabilizar diretamente no resultado do exercício atual sem a respectiva prestação do serviço ou entrega do bem viola flagrantemente o regime de competência.",
    associatedLaws: ["Pronunciamento Técnico CPC 00", "Regime de Competência"],
    options: ["Certo (C)", "Errado (E)"],
    board: "CEBRASPE",
    lawTags: ["CPC 00", "Regime de Competência"],
  },
];

/**
 * Algoritmo de seleção adaptativa com base nas lacunas de conhecimento identificadas
 */
export function getAdaptiveQuestions(
  gaps: { subjectId: string; topicId: string; accuracy: number }[],
  limit = 5,
): Question[] {
  // Ordena as lacunas por pior rendimento (maior prioridade de estudo)
  const sortedGaps = [...gaps].sort((a, b) => a.accuracy - b.accuracy);

  const selectedQuestions: Question[] = [];
  const selectedIds = new Set<string>();

  // Primeiro passo: Adicionar questões relacionadas às lacunas do estudante
  for (const gap of sortedGaps) {
    const matchingQuestions = EXTENDED_FISCAL_QUESTIONS.filter(
      (q) => (q.subjectId === gap.subjectId || q.topicId === gap.topicId) && !selectedIds.has(q.id),
    );

    for (const q of matchingQuestions) {
      if (selectedQuestions.length < limit) {
        selectedQuestions.push(q);
        selectedIds.add(q.id);
      }
    }
  }

  // Segundo passo: Fallback/Preenchimento com as demais questões do banco fiscal se faltarem questões
  if (selectedQuestions.length < limit) {
    const remaining = EXTENDED_FISCAL_QUESTIONS.filter((q) => !selectedIds.has(q.id));
    for (const q of remaining) {
      if (selectedQuestions.length < limit) {
        selectedQuestions.push(q);
        selectedIds.add(q.id);
      }
    }
  }

  return selectedQuestions;
}

/**
 * Inicia uma nova sessão de estudos/simulado
 */
export function createExamSession(
  mode: "practice" | "simulation" | "targeted_review",
  gaps: { subjectId: string; topicId: string; accuracy: number }[] = [],
  limit = 5,
  timeLimitMinutes = 15,
): ExamSession {
  const questions = getAdaptiveQuestions(gaps, limit);

  return {
    id: `SESSION-${Date.now()}`,
    mode,
    questions,
    timeLimitSeconds: timeLimitMinutes * 60,
    timeSpentSeconds: 0,
    isCompleted: false,
    accuracy: 0,
    score: 0,
    attempts: {},
  };
}

/**
 * Registra a tentativa de resolução de uma questão específica com lógica de penalização (estilo Cebraspe)
 */
export function processQuestionAttempt(
  session: ExamSession,
  questionId: string,
  selectedOption: string,
  timeSpentSeconds: number,
  errorCategory?: ErrorCategory,
  notes?: string,
  applyCebraspePenalty = false,
): ExamSession {
  const question =
    session.questions.find((q) => q.id === questionId) ||
    EXTENDED_FISCAL_QUESTIONS.find((q) => q.id === questionId);
  if (!question) {
    throw new Error(`Questão com id ${questionId} não cadastrada no banco.`);
  }

  // Normaliza alternativas/options para validação correta do gabarito
  let normalizedSelected = selectedOption.trim().toUpperCase();
  if (normalizedSelected.startsWith("CERTO")) normalizedSelected = "C";
  if (normalizedSelected.startsWith("ERRADO")) normalizedSelected = "E";

  const normalizedCorrect = question.correctAnswer.trim().toUpperCase();
  const isCorrect = normalizedSelected === normalizedCorrect;

  // Criamos o objeto de tentativa com aliases unificados para a Etapa 5.1
  const attempt: QuestionAttempt = {
    id: `ATT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: "aluno_demo_fiscal",
    questionId,
    selectedAlternative: normalizedSelected,
    selectedOption: normalizedSelected, // Alias para compatibilidade
    isCorrect,
    timeSpentSeconds,
    errorCategory: isCorrect ? undefined : errorCategory || "outros",
    notes: isCorrect ? undefined : notes,
    occurredAt: new Date().toISOString(),
    timestamp: new Date().toISOString(), // Alias para compatibilidade
  };

  // Salva no localStorage se a questão existir na lista global do errorTracker para consistência do analytics
  const isGlobalQuestion = FISCAL_QUESTIONS.some((q) => q.id === questionId);
  if (isGlobalQuestion) {
    baseRegisterAttempt(
      "aluno_demo_fiscal",
      questionId,
      normalizedSelected,
      timeSpentSeconds,
      errorCategory,
      notes,
    );
  }

  const updatedAttempts = {
    ...session.attempts,
    [questionId]: attempt,
  };

  // Cálculo das métricas da sessão
  const attemptsArray = Object.values(updatedAttempts);
  const correctCount = attemptsArray.filter((a) => a.isCorrect).length;
  const totalAttempted = attemptsArray.length;

  let score = 0;
  if (applyCebraspePenalty) {
    // Sistema de penalização do Cebraspe: Uma errada anula uma certa
    const wrongCount = totalAttempted - correctCount;
    const netPoints = Math.max(0, correctCount - wrongCount);
    score = totalAttempted > 0 ? (netPoints / session.questions.length) * 100 : 0;
  } else {
    score = totalAttempted > 0 ? (correctCount / totalAttempted) * 100 : 0;
  }

  const accuracy = totalAttempted > 0 ? correctCount / totalAttempted : 0;

  return {
    ...session,
    timeSpentSeconds: session.timeSpentSeconds + timeSpentSeconds,
    attempts: updatedAttempts,
    accuracy: accuracy,
    score: Math.round(score),
  };
}
