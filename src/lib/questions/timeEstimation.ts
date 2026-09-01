/**
 * MÓDULO DE ESTIMATIVA DE TEMPO POR TIPO DE QUESTÃO E MATÉRIA
 *
 * Regra de Negócio Aprovado Fiscal:
 *  - 2 min/questão: Matérias Jurídicas (Direito Tributário, Constitucional, Administrativo, Legislação Tributária) e conteúdos de leitura/legislação seca.
 *  - 3 min/questão: Língua Portuguesa, RLM, Estatística, Matemática Financeira e Contabilidade (Geral/Avançada/Custos) com resolução analítica/cálculos.
 */

export interface BatteryEstimate {
  questionsCount: number;
  rateMinutesPerQuestion: number; // 2 ou 3
  estimatedMinutes: number;
  formattedTime: string;
  categoryLabel: string;
  explanationTooltip: string;
  isCalculationSubject: boolean;
}

/**
 * Retorna a taxa de minutos por questão com base no nome da matéria.
 */
export function getMinutesPerQuestion(subjectName?: string | null): number {
  if (!subjectName) return 2;
  const s = subjectName.toLowerCase();

  // Matérias de Exatas, Cálculos, Contabilidade e Português -> 3 min/questão
  if (
    s.includes("portuguê") ||
    s.includes("portugues") ||
    s.includes("raciocínio") ||
    s.includes("raciocinio") ||
    s.includes("rlm") ||
    s.includes("matemática") ||
    s.includes("matematica") ||
    s.includes("estatística") ||
    s.includes("estatistica") ||
    s.includes("contabilidad") ||
    s.includes("custos") ||
    s.includes("finança") ||
    s.includes("financa")
  ) {
    return 3;
  }

  // Matérias Jurídicas, Legislação e Leitura -> 2 min/questão
  return 2;
}

/**
 * Calcula a estimativa detalhada para uma bateria de N questões de uma determinada matéria.
 */
export function estimateQuestionBattery(
  questionsCount: number,
  subjectName?: string | null,
): BatteryEstimate {
  const rate = getMinutesPerQuestion(subjectName);
  const estimatedMinutes = questionsCount * rate;
  const isCalculationSubject = rate === 3;

  const categoryLabel = isCalculationSubject
    ? "Exatas / Português / Contabilidade (3 min/qst)"
    : "Direito / Legislação / Leitura (2 min/qst)";

  const explanationTooltip = isCalculationSubject
    ? `Estimativa de ${estimatedMinutes} min para ${questionsCount} questões (${rate} min/qst) devido ao tempo de resolução de cálculos, interpretação e lançamentos em ${subjectName ?? "Contabilidade/Exatas"}.`
    : `Estimativa de ${estimatedMinutes} min para ${questionsCount} questões (${rate} min/qst) baseada no padrão de leitura e aplicação direta de legislação e doutrina jurídica.`;

  const hours = (estimatedMinutes / 60).toFixed(1);
  const formattedTime =
    estimatedMinutes >= 60 ? `${hours}h (${estimatedMinutes} min)` : `${estimatedMinutes} min`;

  return {
    questionsCount,
    rateMinutesPerQuestion: rate,
    estimatedMinutes,
    formattedTime,
    categoryLabel,
    explanationTooltip,
    isCalculationSubject,
  };
}

/**
 * Retorna quantas questões são recomendadas para um bloco de tempo disponível (ex: 50 min em Direito Tributário -> 25 questões).
 */
export function estimateQuestionsForTime(
  availableMinutes: number,
  subjectName?: string | null,
): { estimatedQuestions: number; rateMinutesPerQuestion: number; tooltip: string } {
  const rate = getMinutesPerQuestion(subjectName);
  const questions = Math.max(1, Math.floor(availableMinutes / rate));

  return {
    estimatedQuestions: questions,
    rateMinutesPerQuestion: rate,
    tooltip: `Bateria recomendada de ${questions} questões para um bloco de ${availableMinutes} min em ${subjectName ?? "estudo"} (${rate} min por questão).`,
  };
}
