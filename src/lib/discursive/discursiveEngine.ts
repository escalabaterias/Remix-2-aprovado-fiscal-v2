import type {
  DiscursivePerformanceSummary,
  DiscursiveQuestion,
  DiscursiveSubmission,
  GradingCriterion,
} from "./types";

const DISCURSIVE_SUBMISSIONS_KEY = "aprovado_fiscal_discursive_submissions";

let memorySubmissions: DiscursiveSubmission[] = [];

export const SEED_DISCURSIVE_QUESTIONS: DiscursiveQuestion[] = [
  {
    id: "disc-01",
    title: "Lançamento por Homologação e Prazo Decadencial",
    subject: "Direito Tributário",
    banca: "FGV",
    contest: "SEFAZ-SP - Auditor Fiscal",
    suggestedTimeMinutes: 45,
    maxScore: 20.0,
    statement: `Determinada sociedade empresária realizou o pagamento parcial de ICMS no vencimento referente ao fato gerador ocorrido em janeiro de 2019. Em maio de 2024, o Fisco estadual lavrou auto de infração cobrando a diferença do imposto não recolhido, sem imputação de dolo, fraude ou simulação.

Com base na jurisprudência consolidada do Superior Tribunal de Justiça (STJ) e nas disposições do Código Tributário Nacional (CTN):
1. Esclareça qual é a modalidade de lançamento aplicável ao caso e a regra de contagem do prazo decadencial quando há pagamento antecipado parcial.
2. Identifique se operou-se a decadência do direito da Fazenda Pública de lançar o crédito tributário remanescente em maio de 2024.`,
    modelAnswer: `1. O ICMS é tributo sujeito ao lançamento por homologação (Art. 150, caput, do CTN). Havendo pagamento antecipado (ainda que parcial) e ausente dolo, fraude ou simulação, aplica-se a regra especifica do Art. 150, § 4º, do CTN, segundo a qual o prazo decadencial de 5 (cinco) anos conta-se a partir da ocorrência do fato gerador. De acordo com a Súmula 555 do STJ e o REsp 973.733/SC (Tema Repetitivo 104), o pagamento parcial antecipado é suficiente para atrair a incidência do § 4º do Art. 150 do CTN.

2. Fato gerador ocorrido em janeiro de 2019. O prazo de 5 anos contado do fato gerador expirou em janeiro de 2024. Como a constituição do crédito deu-se apenas em maio de 2024, operou-se a DECADÊNCIA do direito de a Fazenda Pública lançar a diferença do tributo.`,
    lawTags: ["tag-ctn-150-4", "tag-ctn-156-v"],
    gradingCriteria: [
      {
        id: "crit-1",
        description:
          "Enquadramento correto do ICMS como lançamento por homologação (Art. 150, CTN) e aplicação do Art. 150, § 4º ante o pagamento parcial.",
        weight: 7.0,
      },
      {
        id: "crit-2",
        description:
          "Citação da contagem do prazo quinquenal a partir do fato gerador na ausência de dolo/fraude (Tema 104 do STJ / Súmula 555).",
        weight: 6.0,
      },
      {
        id: "crit-3",
        description:
          "Conclusão correta pelo reconhecimento da decadência do crédito tributário em janeiro de 2024, tornando nulo o Auto de Infração de maio de 2024.",
        weight: 7.0,
      },
    ],
  },
  {
    id: "disc-02",
    title: "Princípio da Não-Cumulatividade e Crédito de ICMS na Energia Elétrica",
    subject: "Legislação Tributária",
    banca: "Cebraspe",
    contest: "SEFAZ-PR - Auditor Fiscal",
    suggestedTimeMinutes: 50,
    maxScore: 20.0,
    statement: `Indústria alimentícia estabelecida no Estado do Paraná contratou energia elétrica utilizada diretamente no processo de industrialização (fornos e máquinas de moagem) e, secundariamente, no setor administrativo. A empresa apropriou-se integralmente dos créditos de ICMS destacados nas contas de energia elétrica.

Aborde os seguintes tópicos à luz da Lei Complementar nº 87/96 (Lei Kandir) e do entendimento dos Tribunais Superiores:
a) Quais as hipóteses que autorizam o aproveitamento de créditos de ICMS na entrada de energia elétrica no estabelecimento?
b) A apropriação integral dos créditos pelo contribuinte no caso concreto foi correta? Fundamente.`,
    modelAnswer: `a) Nos termos do Art. 33, II, da LC 87/96, a entrada de energia elétrica no estabelecimento dá direito a crédito de ICMS quando:
1. For consumida no processo de industrialização;
2. Pura e simplesmente resultar em operação de saída de energia elétrica;
3. A saída para o exterior seja efetuada na proporção desta sobre as saídas totais.

b) Não. A apropriação integral foi incorreta. Apenas a parcela da energia efetivamente consumida no processo produtivo (industrialização) gera direito ao crédito. A energia consumida nos setores administrativos ou comerciais não integra o processo de transformação industrial direta e, portanto, tem seu creditamento vedado até que lei complementar disponha em contrário para uso e consumo. O contribuinte deveria ter realizado laudo técnico pericial para segregar o consumo industrial do administrativo.`,
    lawTags: ["tag-lc87-33"],
    gradingCriteria: [
      {
        id: "crit-1",
        description:
          "Mencionar o Art. 33, II, da LC 87/96 e a permissão de crédito de energia consumida na industrialização.",
        weight: 8.0,
      },
      {
        id: "crit-2",
        description:
          "Demonstrar a incorreção do creditamento integral e a vedação do crédito da parcela referente ao setor administrativo.",
        weight: 8.0,
      },
      {
        id: "crit-3",
        description: "Clareza técnica, coesão textual e fundamentação jurídica adequada.",
        weight: 4.0,
      },
    ],
  },
  {
    id: "disc-03",
    title: "Método da Equivalência Patrimonial (MEP) e Goodwill",
    subject: "Contabilidade Avançada",
    banca: "FGV",
    contest: "Receita Federal - Auditor Fiscal",
    suggestedTimeMinutes: 60,
    maxScore: 20.0,
    statement: `A Cia. Alfa adquiriu 80% das ações votantes da Cia. Beta por R$ 5.000.000,00 à vista. Na data da aquisição, o Patrimônio Líquido contábil da Cia. Beta era de R$ 4.000.000,00, e o valor justo dos seus ativos e passivos identificáveis líquida era de R$ 5.500.000,00.

Elabore uma memória de cálculo detalhada contendo:
1. O valor da mais-valia dos ativos identificáveis proporcional à participação da Cia. Alfa.
2. O valor do ágio por expectativa de rentabilidade futura (Goodwill) reconhecido na combinação de negócios.
3. Os lançamentos contábeis na investidora no momento da aquisição.`,
    modelAnswer: `1. Valor Justo do PL da investida = R$ 5.500.000,00
Participação da Cia. Alfa = 80% de R$ 5.500.000,00 = R$ 4.400.000,00
PL Contábil proporcional (80% de R$ 4.000.000,00) = R$ 3.200.000,00
Mais-valia dos Ativos (80% da diferença entre VJ e V. Contábil) = R$ 4.400.000 - R$ 3.200.000 = R$ 1.200.000,00.

2. Custo de Aquisição = R$ 5.000.000,00
Valor Justo dos Ativos Líquidos Adquiridos (80%) = R$ 4.400.000,00
Goodwill (Ágio por Rentabilidade Futura) = R$ 5.000.000 - R$ 4.400.000 = R$ 600.000,00.

3. Lançamentos Contábeis na Cia. Alfa:
D - Investimento em Coligada/Controlada (PL Contábil): R$ 3.200.000,00
D - Investimento em Coligada/Controlada (Mais-Valia): R$ 1.200.000,00
D - Investimento em Coligada/Controlada (Goodwill): R$ 600.000,00
C - Caixa / Bancos: R$ 5.000.000,00.`,
    gradingCriteria: [
      {
        id: "crit-1",
        description: "Cálculo exato da Mais-Valia dos ativos líquidos (R$ 1.200.000,00).",
        weight: 6.0,
      },
      {
        id: "crit-2",
        description: "Cálculo exato do Goodwill reconhecido no investimento (R$ 600.000,00).",
        weight: 7.0,
      },
      {
        id: "crit-3",
        description:
          "Lançamento contábil completo discriminando valor patrimonial, mais-valia e goodwill a débito contra disponibilidade a crédito.",
        weight: 7.0,
      },
    ],
  },
];

export function getDiscursiveQuestions(): DiscursiveQuestion[] {
  return SEED_DISCURSIVE_QUESTIONS;
}

export function getDiscursiveQuestionById(id: string): DiscursiveQuestion | undefined {
  return SEED_DISCURSIVE_QUESTIONS.find((q) => q.id === id);
}

export function calculateSelfScore(
  criteria: GradingCriterion[],
  criteriaScores: Record<string, number>,
): number {
  let total = 0;
  criteria.forEach((c) => {
    const score = criteriaScores[c.id] ?? 0;
    const clamped = Math.min(Math.max(0, score), c.weight);
    total += clamped;
  });
  return Math.round(total * 100) / 100;
}

export function getDiscursiveSubmissions(): DiscursiveSubmission[] {
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    return memorySubmissions;
  }
  try {
    const raw = localStorage.getItem(DISCURSIVE_SUBMISSIONS_KEY);
    if (!raw) return memorySubmissions;
    const parsed = JSON.parse(raw) as DiscursiveSubmission[];
    if (parsed.length > 0) {
      memorySubmissions = parsed;
    }
    return memorySubmissions;
  } catch {
    return memorySubmissions;
  }
}

export function saveDiscursiveSubmission(
  submission: Omit<DiscursiveSubmission, "id" | "submittedAt">,
): DiscursiveSubmission {
  const current = getDiscursiveSubmissions();
  const newSub: DiscursiveSubmission = {
    ...submission,
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    submittedAt: new Date().toISOString(),
  };

  const updated = [newSub, ...current];
  memorySubmissions = updated;

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(DISCURSIVE_SUBMISSIONS_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  return newSub;
}

export function clearDiscursiveSubmissionsInMemory(): void {
  memorySubmissions = [];
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(DISCURSIVE_SUBMISSIONS_KEY);
    } catch {
      // ignore
    }
  }
}

export function getSubmissionsForQuestion(questionId: string): DiscursiveSubmission[] {
  const all = getDiscursiveSubmissions();
  return all.filter((s) => s.questionId === questionId);
}

export function getDiscursivePerformanceSummary(): DiscursivePerformanceSummary {
  const submissions = getDiscursiveSubmissions();
  const questions = getDiscursiveQuestions();

  if (submissions.length === 0) {
    return {
      totalSubmissions: 0,
      averageScorePercentage: 0,
      totalQuestionsAttempted: 0,
      completedBySubject: {},
    };
  }

  const attemptedQuestionIds = new Set(submissions.map((s) => s.questionId));
  const completedBySubject: Record<string, number> = {};

  let sumPercentage = 0;

  submissions.forEach((sub) => {
    const q = questions.find((item) => item.id === sub.questionId);
    if (q && q.maxScore > 0) {
      const pct = (sub.selfScore / q.maxScore) * 100;
      sumPercentage += pct;

      completedBySubject[q.subject] = (completedBySubject[q.subject] || 0) + 1;
    }
  });

  return {
    totalSubmissions: submissions.length,
    averageScorePercentage: Math.round(sumPercentage / submissions.length),
    totalQuestionsAttempted: attemptedQuestionIds.size,
    completedBySubject,
  };
}
