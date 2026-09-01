import { Question, ErrorCategory } from "../questions/types";
import { EXTENDED_FISCAL_QUESTIONS } from "../questions/questionEngine";
import { SimulationConfig, SimulationResult, SubjectPerformance, ErrorBreakdown } from "./types";

/**
 * Banco completo de disciplinas do projeto
 */
export const FISCAL_SUBJECTS: Record<string, string> = {
  "DIR-TRIB": "Direito Tributário",
  CONTAB: "Contabilidade Geral",
  RLM: "Raciocínio Lógico-Matemático",
  "DIR-CONST": "Direito Constitucional",
  "AUD-FISCAL": "Auditoria Fiscal",
};

/**
 * Cria questões sob demanda caso o banco estático não tenha volume suficiente para satisfazer a proporção do edital
 */
export function generateQuestionOnDemand(
  id: string,
  subjectId: string,
  board: "FGV" | "CEBRASPE" | "FCC",
  difficulty: "Fácil" | "Médio" | "Difícil" = "Médio",
): Question {
  const subjectName = FISCAL_SUBJECTS[subjectId] || "Conhecimentos Fiscais";
  const isCebraspe = board === "CEBRASPE";

  return {
    id,
    subjectId,
    subjectName,
    topicId: `${subjectId}-GENERIC`,
    topicName: `Tópico Avançado de ${subjectName}`,
    examBoard: board,
    year: 2025,
    difficulty,
    statement: `[Questão Gerada - ${board} - ${subjectName}] Considere as regras aplicáveis às finanças públicas e o ordenamento jurídico do cargo de Auditor Fiscal. O descumprimento de deveres instrumentais acarreta penalidades. Assinale a opção correta de acordo com a jurisprudência dominante:`,
    alternatives: isCebraspe
      ? ["C", "E"]
      : [
          "A) A obrigação acessória surge independentemente da obrigação principal.",
          "B) A obrigação acessória, pelo descumprimento, converte-se em obrigação principal de multa pecuniária.",
          "C) A imunidade tributária alcança as taxas e as contribuições de melhoria.",
          "D) O fato gerador da obrigação acessória deve ser previsto exclusivamente em decreto regulamentar.",
          "E) Nenhuma das alternativas anteriores está em conformidade com o CTN.",
        ],
    correctAnswer: isCebraspe ? "C" : "B",
    explanation: `Gabarito comentado detalhado para a questão ${id}. A inobservância da obrigação acessória a converte em obrigação principal relativamente à penalidade pecuniária cabível, conforme Art. 113, § 3º do Código Tributário Nacional (CTN).`,
    associatedLaws: ["CTN - Art. 113"],
    options: isCebraspe
      ? ["Certo (C)", "Errado (E)"]
      : [
          "A) A obrigação acessória surge independentemente da obrigação principal.",
          "B) A obrigação acessória, pelo descumprimento, converte-se em obrigação principal de multa pecuniária.",
          "C) A imunidade tributária alcança as taxas e as contribuições de melhoria.",
          "D) O fato gerador da obrigação acessória deve ser previsto exclusivamente em decreto regulamentar.",
          "E) Nenhuma das alternativas anteriores está em conformidade com o CTN.",
        ],
    board,
    lawTags: ["CTN - Art. 113", "Obrigações Tributárias"],
  };
}

/**
 * Algoritmo de montagem proporcional de prova respeitando os pesos do edital-alvo e regras de banca
 */
export function buildCustomSimulation(config: SimulationConfig): Question[] {
  const { board, totalQuestions, weightsBySubject } = config;

  // 1. Calcula o peso total informado
  const totalWeight = Object.values(weightsBySubject).reduce((acc, w) => acc + w, 0);
  if (totalWeight <= 0) {
    throw new Error("A soma dos pesos das disciplinas deve ser maior do que zero.");
  }

  // 2. Calcula a quantidade proporcional de questões para cada disciplina
  const proportionalCounts: Record<string, number> = {};
  let distributedCount = 0;

  const subjects = Object.keys(weightsBySubject);
  subjects.forEach((sub, idx) => {
    if (idx === subjects.length - 1) {
      // Ajusta arredondamento na última disciplina do array
      proportionalCounts[sub] = Math.max(0, totalQuestions - distributedCount);
    } else {
      const count = Math.round((weightsBySubject[sub] / totalWeight) * totalQuestions);
      proportionalCounts[sub] = count;
      distributedCount += count;
    }
  });

  // 3. Seleciona e gera questões para atingir a proporção ideal
  const selectedQuestions: Question[] = [];

  subjects.forEach((subjectId) => {
    const needed = proportionalCounts[subjectId];
    if (needed <= 0) return;

    // Filtra questões existentes compatíveis com a disciplina e a banca
    const matchingStatic = EXTENDED_FISCAL_QUESTIONS.filter(
      (q) => q.subjectId === subjectId && q.board === board,
    );

    let addedFromStatic = 0;
    matchingStatic.forEach((q) => {
      if (addedFromStatic < needed) {
        selectedQuestions.push(q);
        addedFromStatic++;
      }
    });

    // Se faltarem questões, gera dinamicamente para completar o edital
    for (let i = addedFromStatic; i < needed; i++) {
      const uniqueId = `SIM-${subjectId}-${board}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const generated = generateQuestionOnDemand(uniqueId, subjectId, board);
      selectedQuestions.push(generated);
    }
  });

  // Embaralha levemente o simulado para melhor UX real de prova
  return selectedQuestions.sort(() => Math.random() - 0.5);
}

/**
 * Processador de resultados de simulados que calcula nota líquida, desvio cognitivo e gera inputs para o Planejador Mnemônico
 */
export function evaluateSimulation(
  id: string,
  config: SimulationConfig,
  attempts: Record<
    string,
    {
      questionId: string;
      selectedOption: string;
      isCorrect: boolean;
      timeSpentSeconds: number;
      errorCategory?: ErrorCategory;
      notes?: string;
    }
  >,
  timeSpentSeconds: number,
  startedAt: string,
): SimulationResult {
  const completedAt = new Date().toISOString();

  // 1. Inicializa agregadores de desempenho por disciplina
  const subjectPerformance: Record<string, SubjectPerformance> = {};
  Object.keys(config.weightsBySubject).forEach((subId) => {
    subjectPerformance[subId] = {
      subjectId: subId,
      subjectName: FISCAL_SUBJECTS[subId] || subId,
      total: 0,
      correct: 0,
      wrong: 0,
      accuracy: 0,
    };
  });

  // 2. Inicializa contador de erros cognitivos
  const errorBreakdown: Record<string, ErrorBreakdown> = {};
  const allCategories: ErrorCategory[] = [
    "atencao",
    "conhecimento",
    "interpretacao",
    "esquecimento",
    "calculo",
    "estrategia",
    "outros",
  ];
  allCategories.forEach((cat) => {
    errorBreakdown[cat] = {
      category: cat,
      count: 0,
      percentage: 0,
    };
  });

  let correctCount = 0;
  let wrongCount = 0;
  let totalAttempted = 0;

  // Processa as tentativas realizadas
  Object.values(attempts).forEach((att) => {
    // Busca a disciplina da questão pelo prefixo do ID ou pelo banco estático
    let subjectId = "DIR-TRIB";
    const foundQuestion = EXTENDED_FISCAL_QUESTIONS.find((q) => q.id === att.questionId);
    if (foundQuestion) {
      subjectId = foundQuestion.subjectId;
    } else if (att.questionId.startsWith("SIM-")) {
      const parts = att.questionId.split("-");
      if (parts[1]) subjectId = parts[1];
    }

    if (!subjectPerformance[subjectId]) {
      subjectPerformance[subjectId] = {
        subjectId,
        subjectName: FISCAL_SUBJECTS[subjectId] || subjectId,
        total: 0,
        correct: 0,
        wrong: 0,
        accuracy: 0,
      };
    }

    const perf = subjectPerformance[subjectId];
    perf.total++;
    totalAttempted++;

    if (att.isCorrect) {
      perf.correct++;
      correctCount++;
    } else {
      perf.wrong++;
      wrongCount++;

      const category = att.errorCategory || "outros";
      if (!errorBreakdown[category]) {
        errorBreakdown[category] = { category, count: 0, percentage: 0 };
      }
      errorBreakdown[category].count++;
    }
  });

  // Calcula acurácia das disciplinas
  Object.values(subjectPerformance).forEach((perf) => {
    perf.accuracy = perf.total > 0 ? perf.correct / perf.total : 0;
  });

  // Calcula percentual das categorias de erros cognitivos
  const totalErrors = Object.values(errorBreakdown).reduce((sum, item) => sum + item.count, 0);
  Object.values(errorBreakdown).forEach((item) => {
    item.percentage = totalErrors > 0 ? Math.round((item.count / totalErrors) * 100) : 0;
  });

  // 3. Calcula score bruto e líquido (com penalização real Cebraspe se aplicável)
  const score =
    config.totalQuestions > 0 ? Math.round((correctCount / config.totalQuestions) * 100) : 0;
  let netScore = score;

  if (config.board === "CEBRASPE") {
    // 1 errada anula 1 certa
    const netPoints = Math.max(0, correctCount - wrongCount);
    netScore =
      config.totalQuestions > 0 ? Math.round((netPoints / config.totalQuestions) * 100) : 0;
  }

  // 4. Salva histórico do simulado e os inputs de re-planejamento no localStorage para o Módulo 4.2
  const result: SimulationResult = {
    id,
    config,
    score,
    netScore,
    timeSpentSeconds,
    startedAt,
    completedAt,
    subjectPerformance,
    errorBreakdown,
    attempts,
  };

  try {
    const previousResultsRaw = localStorage.getItem("fiscal_simulation_results");
    const previousResults = previousResultsRaw ? JSON.parse(previousResultsRaw) : [];
    previousResults.push(result);
    localStorage.setItem("fiscal_simulation_results", JSON.stringify(previousResults));

    // Alimentação das prioridades de re-agendamento de revisão para o Módulo 4.2
    // Se o aproveitamento da matéria for < 70%, gera um input crítico para o Planner
    const plannerInputs: Array<{ subjectId: string; accuracy: number; nextRevisionDays: number }> =
      [];
    Object.values(subjectPerformance).forEach((perf) => {
      if (perf.total > 0 && perf.accuracy < 0.7) {
        plannerInputs.push({
          subjectId: perf.subjectId,
          accuracy: perf.accuracy,
          // Se errou por esquecimento, sugere revisão mais curta (ex: 2 dias), senão 5 dias
          nextRevisionDays: errorBreakdown["esquecimento"].count > 0 ? 2 : 5,
        });
      }
    });

    localStorage.setItem("fiscal_planner_critical_inputs", JSON.stringify(plannerInputs));
  } catch (err) {
    console.warn("Storage local indisponível no ambiente de execução do motor.", err);
  }

  return result;
}
