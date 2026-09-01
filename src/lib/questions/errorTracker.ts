import {
  Question,
  QuestionAttempt,
  ErrorNotebook,
  ErrorNotebookEntry,
  ErrorCategory,
} from "./types";

/**
 * Banco de Questões Pré-Cadastradas para Área Fiscal (Foco: Direito Tributário e Constitucional)
 */
export const FISCAL_QUESTIONS: Question[] = [
  {
    id: "Q-01",
    subjectId: "DIR-TRIB",
    subjectName: "Direito Tributário",
    topicId: "LIMIT-TRIB",
    topicName: "Limitações Constitucionais ao Poder de Tributar",
    examBoard: "FGV",
    year: 2025,
    difficulty: "Difícil",
    statement:
      "Determinado Município editou decreto de lavra do Chefe do Executivo reduzindo a base de cálculo do Imposto sobre Serviços de Qualquer Natureza (ISSQN) para atrair novas empresas do setor de tecnologia. Com base nas disposições da Constituição Federal de 1988 sobre as limitações ao poder de tributar, assinale a opção correta:",
    alternatives: [
      "A) O decreto é plenamente válido, uma vez que a redução de base de cálculo não se confunde com isenção ou anistia, prescindindo de lei específica.",
      "B) O decreto é inconstitucional, pois qualquer subsídio ou isenção, redução de base de cálculo ou concessão de crédito presumido relativos a impostos só poderá ser concedido mediante lei específica.",
      "C) O decreto é válido desde que autorizado de forma genérica na Lei de Diretrizes Orçamentárias (LDO) municipal do respectivo exercício financeiro.",
      "D) O decreto é inconstitucional apenas se o benefício fiscal importar em tratamento desigual entre contribuintes em situação de concorrência direta.",
      "E) O decreto é válido provisoriamente, devendo ser convertido em lei complementar de iniciativa do prefeito no prazo de até 90 dias após a publicação.",
    ],
    correctAnswer: "B",
    explanation:
      "Gabarito: Alternativa B. Conforme rege expressamente o Art. 150, § 6º da CF/88, qualquer subsídio ou isenção, redução de base de cálculo, concessão de crédito presumido, anistia ou remissão, relativos a impostos, taxas ou contribuições, só poderá ser concedido mediante lei específica, federal, estadual ou municipal, que regule exclusivamente as matérias enumeradas. Portanto, ato unilateral do Poder Executivo (como um decreto autônomo) sem amparo em lei específica padece de vício de inconstitucionalidade formal.",
    associatedLaws: ["CF/88 - Art. 150"],
  },
  {
    id: "Q-02",
    subjectId: "DIR-TRIB",
    subjectName: "Direito Tributário",
    topicId: "OBRIG-TRIB",
    topicName: "Obrigação Tributária",
    examBoard: "FCC",
    year: 2024,
    difficulty: "Médio",
    statement:
      "No que se refere às obrigações tributárias principais e acessórias de acordo com as normas gerais dispostas pelo Código Tributário Nacional (CTN), assinale a afirmativa correta:",
    alternatives: [
      "A) A obrigação tributária acessória tem por objeto o pagamento do tributo ou da multa e surge sempre com a ocorrência do fato gerador.",
      "B) A obrigação principal, pelo simples fato do descumprimento, converte-se em obrigação acessória relativamente à penalidade instrumental.",
      "C) A obrigação acessória, pelo simples fato da inobservância, converte-se em obrigação principal relativamente à penalidade pecuniária.",
      "D) A obrigação acessória decorre exclusivamente de lei complementar federal de diretrizes nacionais de arrecadação.",
      "E) A obrigação tributária principal decorre da legislação tributária em sentido amplo, incluindo atos administrativos normativos e decretos.",
    ],
    correctAnswer: "C",
    explanation:
      "Gabarito: Alternativa C. Segundo as diretrizes do Art. 113, § 3º do CTN, a obrigação acessória, pelo simples fato da inobservância, converte-se em obrigação principal relativamente à penalidade pecuniária. Isso ocorre porque o não pagamento de multa (obrigação de dar valor pecuniário) possui natureza de obrigação principal, muito embora tenha se originado do descumprimento de um dever instrumental de fazer ou não fazer (obrigação acessória).",
    associatedLaws: ["CTN - Art. 113"],
  },
  {
    id: "Q-03",
    subjectId: "DIR-TRIB",
    subjectName: "Direito Tributário",
    topicId: "INTERP-TRIB",
    topicName: "Interpretação e Integração da Legislação",
    examBoard: "Cebraspe",
    year: 2024,
    difficulty: "Médio",
    statement:
      "Uma lei estadual que dispõe sobre a outorga de isenção de IPVA para veículos movidos a eletricidade deve ser interpretada de que forma, à luz das diretrizes de hermenêutica jurídica contidas no Código Tributário Nacional?",
    alternatives: [
      "A) De forma analógica, permitindo-se estender o benefício a veículos híbridos com baixa emissão de gases.",
      "B) De forma literal e restrita, vedando-se qualquer ampliação interpretativa ou analogia.",
      "C) De forma equitativa, suavizando-se o rigor fiscal no caso de adquirentes com baixa capacidade contributiva.",
      "D) De forma histórica e teleológica, priorizando-se o fomento estatal e a proteção ambiental.",
      "E) De forma sistemática com o Código Civil, adotando-se o conceito mais amplo possível de propriedade veicular.",
    ],
    correctAnswer: "B",
    explanation:
      "Gabarito: Alternativa B. O Art. 111, inciso II do CTN dita com rigor que interpreta-se literalmente a legislação tributária que disponha sobre a outorga de isenção. Logo, o aplicador ou juiz não possui autoridade para alargar os termos da isenção sob fundamentos equitativos ou de analogia.",
    associatedLaws: ["CTN - Art. 111"],
  },
  {
    id: "Q-04",
    subjectId: "DIR-CONST",
    subjectName: "Direito Constitucional",
    topicId: "LIMIT-TRIB",
    topicName: "Limitações Constitucionais ao Poder de Tributar",
    examBoard: "FGV",
    year: 2025,
    difficulty: "Médio",
    statement:
      "Uma lei publicada em 15 de Dezembro de 2025 instituiu uma taxa municipal cobrada exclusivamente para o custeio dos serviços públicos de coleta de lixo e resíduos residenciais provenientes de imóveis urbanos. Com relação aos princípios da anterioridade de exercício e da anterioridade noventena, assinale a opção correta:",
    alternatives: [
      "A) A referida taxa é inconstitucional por possuir base de cálculo idêntica à do IPTU, violando a imunidade tributária de imóveis residenciais.",
      "B) A cobrança da taxa poderá iniciar-se legalmente em 1º de Janeiro de 2026, respeitando-se apenas o princípio da anterioridade de exercício.",
      "C) A taxa poderá ser cobrada apenas após decorridos noventa dias da data em que tenha sido publicada a lei, respeitados tanto a anterioridade comum quanto a noventena.",
      "D) Taxas de serviço público não se submetem a nenhuma das regras de anterioridade tributária, podendo ser exigidas imediatamente.",
      "E) A anterioridade noventena deve ser respeitada, dispensando-se contudo o respeito ao exercício subsequente para taxas de limpeza urbana.",
    ],
    correctAnswer: "C",
    explanation:
      "Gabarito: Alternativa C. Por se tratar de instituição de taxa de serviço público (tributo não-excepcionado no Art. 150, § 1º da CF), devem ser rigorosamente atendidas ambas anterioridades cumulativamente: a de exercício (a partir de 1º de janeiro do ano seguinte, 2026) e a noventena (90 dias contados da publicação, o que recairá em meados de março de 2026). Súmula Vinculante 19 do STF confirma a constitucionalidade da taxa de lixo.",
    associatedLaws: ["CF/88 - Art. 150"],
  },
];

/**
 * Função para registrar uma tentativa do aluno.
 * Salva localmente as tentativas para permitir uma experiência persistente e offline-first excelente.
 */
export function registerAttempt(
  userId: string,
  questionId: string,
  selectedAlternative: string,
  timeSpentSeconds: number,
  errorCategory?: ErrorCategory,
  notes?: string,
): { attempt: QuestionAttempt; wasCorrect: boolean } {
  const question = FISCAL_QUESTIONS.find((q) => q.id === questionId);
  if (!question) {
    throw new Error(`Questão com ID ${questionId} não localizada.`);
  }

  const wasCorrect =
    selectedAlternative.trim().toUpperCase() === question.correctAnswer.trim().toUpperCase();

  const attempt: QuestionAttempt = {
    id: `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    userId,
    questionId,
    selectedAlternative,
    isCorrect: wasCorrect,
    timeSpentSeconds,
    errorCategory: wasCorrect ? undefined : errorCategory || "outros",
    notes: wasCorrect ? undefined : notes,
    occurredAt: new Date().toISOString(),
  };

  // Carregar e persistir tentativas no LocalStorage para que o aluno mantenha o seu progresso ativo
  const existingAttempts = getLocalAttempts();
  existingAttempts.push(attempt);
  saveLocalAttempts(existingAttempts);

  return { attempt, wasCorrect };
}

/**
 * Carrega as tentativas do localStorage
 */
export function getLocalAttempts(): QuestionAttempt[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("aprovado_fiscal_attempts");
  return stored ? JSON.parse(stored) : [];
}

/**
 * Salva as tentativas no localStorage
 */
export function saveLocalAttempts(attempts: QuestionAttempt[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("aprovado_fiscal_attempts", JSON.stringify(attempts));
}

/**
 * Limpa o histórico de tentativas local
 */
export function clearLocalAttempts() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("aprovado_fiscal_attempts");
}

/**
 * Retorna as estatísticas agregadas e detalhadas do desempenho do aluno
 */
export function calculatePerformanceMetrics(attempts: QuestionAttempt[]) {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.isCorrect).length;
  const wrong = total - correct;
  const globalAccuracy = total > 0 ? correct / total : 0;

  // 1. Estatísticas por Banca (FGV, FCC, Cebraspe)
  const byBoard: Record<string, { total: number; correct: number; accuracy: number }> = {};

  // 2. Estatísticas por Disciplina
  const bySubject: Record<
    string,
    { name: string; total: number; correct: number; accuracy: number }
  > = {};

  // 3. Distribuição de Erros por Categoria (Desvio de Erros)
  const errorDistribution: Record<ErrorCategory, number> = {
    conhecimento: 0,
    esquecimento: 0,
    interpretacao: 0,
    calculo: 0,
    atencao: 0,
    estrategia: 0,
    velocidade: 0,
    outros: 0,
  };

  attempts.forEach((att) => {
    const q = FISCAL_QUESTIONS.find((question) => question.id === att.questionId);
    if (!q) return;

    // Métricas por Banca
    if (!byBoard[q.examBoard]) {
      byBoard[q.examBoard] = { total: 0, correct: 0, accuracy: 0 };
    }
    byBoard[q.examBoard].total += 1;
    if (att.isCorrect) {
      byBoard[q.examBoard].correct += 1;
    }
    byBoard[q.examBoard].accuracy = byBoard[q.examBoard].correct / byBoard[q.examBoard].total;

    // Métricas por Disciplina
    if (!bySubject[q.subjectId]) {
      bySubject[q.subjectId] = { name: q.subjectName, total: 0, correct: 0, accuracy: 0 };
    }
    bySubject[q.subjectId].total += 1;
    if (att.isCorrect) {
      bySubject[q.subjectId].correct += 1;
    }
    bySubject[q.subjectId].accuracy = bySubject[q.subjectId].correct / bySubject[q.subjectId].total;

    // Distribuição de Categorias de Erro
    if (!att.isCorrect && att.errorCategory) {
      errorDistribution[att.errorCategory] = (errorDistribution[att.errorCategory] || 0) + 1;
    }
  });

  return {
    total,
    correct,
    wrong,
    globalAccuracy,
    byBoard,
    bySubject,
    errorDistribution,
  };
}

/**
 * Gera os Cadernos de Erros do Usuário agregados por Disciplina
 */
export function getErrorNotebook(
  attempts: QuestionAttempt[],
  questions: Question[] = FISCAL_QUESTIONS,
): ErrorNotebook[] {
  const wrongAttempts = attempts.filter((a) => !a.isCorrect);

  const subjectsMap: Record<string, { subjectName: string; entries: ErrorNotebookEntry[] }> = {};

  wrongAttempts.forEach((att) => {
    const q = questions.find((x) => x.id === att.questionId);
    if (!q) return;

    if (!subjectsMap[q.subjectId]) {
      subjectsMap[q.subjectId] = {
        subjectName: q.subjectName,
        entries: [],
      };
    }

    const entry: ErrorNotebookEntry = {
      id: `ERR-${att.id}`,
      questionId: att.questionId,
      attemptId: att.id,
      subjectId: q.subjectId,
      topicId: q.topicId,
      category: att.errorCategory || "outros",
      notes: att.notes,
      isResolved: false, // Por padrão, entra como pendente
      occurredAt: att.occurredAt,
      question: q,
    };

    subjectsMap[q.subjectId].entries.push(entry);
  });

  return Object.entries(subjectsMap).map(([subjectId, data]) => {
    const distribution: Record<ErrorCategory, number> = {
      conhecimento: 0,
      esquecimento: 0,
      interpretacao: 0,
      calculo: 0,
      atencao: 0,
      estrategia: 0,
      velocidade: 0,
      outros: 0,
    };

    data.entries.forEach((ent) => {
      distribution[ent.category] += 1;
    });

    return {
      subjectId,
      subjectName: data.subjectName,
      entries: data.entries,
      errorDistribution: distribution,
      totalErrors: data.entries.length,
      resolvedCount: data.entries.filter((e) => e.isResolved).length,
    };
  });
}
