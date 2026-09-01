import type {
  SubjectSyllabusSummary,
  SyllabusItem,
  SyllabusProgress,
  SyllabusStatus,
} from "./types";

const SYLLABUS_LOCAL_STORAGE_KEY = "aprovado_fiscal_syllabus_v1";

export const SEED_SYLLABUS_ITEMS: SyllabusItem[] = [
  // 1. DIREITO TRIBUTÁRIO
  {
    id: "syl-trib-1",
    subject: "Direito Tributário",
    topic: "Sistema Tributário Nacional",
    subtopic: "Conceito de Tributo e Espécies Tributárias (CTN Art. 3º e CF Art. 145)",
    weight: 5,
    historicalIncidencePercent: 18.5,
    status: "mastered",
    lawTags: ["ctn-art-3", "cf88-art-145"],
    notes:
      "Aprofundar teoria quinquipartida do STF e distinção entre imposto, taxa e contribuição de melhoria.",
  },
  {
    id: "syl-trib-2",
    subject: "Direito Tributário",
    topic: "Limitações ao Poder de Tributar",
    subtopic:
      "Princípios da Legalidade, Anterioridade Geral e Noventena, Irretroatividade e Isonomia",
    weight: 5,
    historicalIncidencePercent: 24.0,
    status: "reviewed",
    lawTags: ["cf88-art-150"],
    notes: "Exceções à anterioridade noventena (IPI, II, IE, IOF, fixação de base do IPTU/IPVA).",
  },
  {
    id: "syl-trib-3",
    subject: "Direito Tributário",
    topic: "Imunidades Tributárias",
    subtopic: "Imunidade Recíproca, Religiosa, Partidária/Sindical e de Livros/E-books",
    weight: 5,
    historicalIncidencePercent: 20.0,
    status: "studying",
    lawTags: ["cf88-art-150-vi"],
    notes:
      "Atenção para súmulas vinculantes do STF sobre e-readers, extensões e entidades beneficentes.",
  },
  {
    id: "syl-trib-4",
    subject: "Direito Tributário",
    topic: "Crédito Tributário e Lançamento",
    subtopic:
      "Modalidades de Lançamento (Direto, Misto e Homologação) e Extinção (CTN Art. 150 e 156)",
    weight: 5,
    historicalIncidencePercent: 22.0,
    status: "not_started",
    lawTags: ["ctn-art-150", "ctn-art-156"],
  },
  {
    id: "syl-trib-5",
    subject: "Direito Tributário",
    topic: "Decadência e Prescrição Tributária",
    subtopic: "Contagem de prazos no CTN Art. 173, I e Art. 150, § 4º x Prescrição Art. 174",
    weight: 5,
    historicalIncidencePercent: 19.5,
    status: "reviewed",
    lawTags: ["ctn-art-173", "ctn-art-174"],
  },
  {
    id: "syl-trib-6",
    subject: "Direito Tributário",
    topic: "Suspensão e Exclusão do Crédito Tributário",
    subtopic:
      "Hipóteses do CTN Art. 151 (Depósito, Moratória, Parcelamento) e Isenção/Anistia (Art. 175)",
    weight: 4,
    historicalIncidencePercent: 16.0,
    status: "not_started",
    lawTags: ["ctn-art-151", "ctn-art-175"],
  },

  // 2. LEGISLAÇÃO TRIBUTÁRIA ESTADUAL E FEDERAL
  {
    id: "syl-leg-1",
    subject: "Legislação Tributária",
    topic: "Impostos Estaduais — ICMS",
    subtopic: "Fato Gerador, Imunidades, Alíquotas e Não-Incidência (LC 87/96 — Lei Kandir)",
    weight: 5,
    historicalIncidencePercent: 28.0,
    status: "studying",
    lawTags: ["cf88-art-155", "lc-87-art-12", "lc-87-art-13"],
  },
  {
    id: "syl-leg-2",
    subject: "Legislação Tributária",
    topic: "Impostos Estaduais — ITCMD e IPVA",
    subtopic: "Alíquotas Máximas (Res. Senado 9/92), Fato Gerador e Sujeição Passiva",
    weight: 4,
    historicalIncidencePercent: 14.5,
    status: "not_started",
    lawTags: ["cf88-art-155"],
  },
  {
    id: "syl-leg-3",
    subject: "Legislação Tributária",
    topic: "Impostos Municipais — ISS",
    subtopic: "Fato Gerador, Local da Prestação e Alíquotas Mínima/Máxima (LC 116/03)",
    weight: 5,
    historicalIncidencePercent: 21.0,
    status: "reviewed",
    lawTags: ["cf88-art-156", "lc-116-art-1", "lc-116-art-3"],
  },
  {
    id: "syl-leg-4",
    subject: "Legislação Tributária",
    topic: "Processo Administrativo Fiscal (PAF)",
    subtopic: "Impugnação, Recursos, Efeitos da Consulta Tributária e Auto de Infração",
    weight: 4,
    historicalIncidencePercent: 15.0,
    status: "not_started",
    lawTags: ["ctn-art-151"],
  },

  // 3. CONTABILIDADE GERAL E AVANÇADA
  {
    id: "syl-cont-1",
    subject: "Contabilidade Geral e Avançada",
    topic: "Demonstrações Financeiras",
    subtopic: "Balanço Patrimonial e Estrutura CPC 00 (R2) / Lei 6.404/76 Art. 178",
    weight: 5,
    historicalIncidencePercent: 25.0,
    status: "reviewed",
    lawTags: ["lei-6404-art-178"],
  },
  {
    id: "syl-cont-2",
    subject: "Contabilidade Geral e Avançada",
    topic: "Demonstração do Fluxo de Caixa (DFC)",
    subtopic:
      "Métodos Direto e Indireto — Atividades Operacionais, de Investimento e Financiamento",
    weight: 5,
    historicalIncidencePercent: 22.0,
    status: "studying",
    lawTags: ["lei-6404-art-178"],
  },
  {
    id: "syl-cont-3",
    subject: "Contabilidade Geral e Avançada",
    topic: "Método de Equivalência Patrimonial (MEP)",
    subtopic: "Avaliação de Investimentos em Coligadas e Controladas e Cálculo de Goodwill",
    weight: 4,
    historicalIncidencePercent: 17.5,
    status: "not_started",
    lawTags: ["lei-6404-art-183"],
  },
  {
    id: "syl-cont-4",
    subject: "Contabilidade Geral e Avançada",
    topic: "Redução ao Valor Recuperável (Impairment — CPC 01)",
    subtopic: "Teste de Recuperabilidade de Ativos e Unidade Geradora de Caixa",
    weight: 4,
    historicalIncidencePercent: 14.0,
    status: "not_started",
    lawTags: [],
  },

  // 4. AUDITORIA FISCAL
  {
    id: "syl-aud-1",
    subject: "Auditoria Fiscal",
    topic: "Procedimentos de Auditoria",
    subtopic: "Testes de Observância e Substantivos em Livros Fiscais / SPED / EFD",
    weight: 5,
    historicalIncidencePercent: 26.0,
    status: "studying",
    lawTags: [],
  },
  {
    id: "syl-aud-2",
    subject: "Auditoria Fiscal",
    topic: "Amostragem em Auditoria (NBC TA 530)",
    subtopic: "Amostragem Estatística x Não Estatística, Risco de Amostragem e Tamanho da Amostra",
    weight: 4,
    historicalIncidencePercent: 18.0,
    status: "not_started",
    lawTags: [],
  },
  {
    id: "syl-aud-3",
    subject: "Auditoria Fiscal",
    topic: "Relatório do Auditor Independente e Evidências",
    subtopic: "Opinião sem Ressalva, com Ressalva, Adversa e Abstenção de Opinião",
    weight: 4,
    historicalIncidencePercent: 16.5,
    status: "mastered",
    lawTags: [],
  },

  // 5. DIREITO CONSTITUCIONAL
  {
    id: "syl-const-1",
    subject: "Direito Constitucional",
    topic: "Direitos e Garantias Fundamentais",
    subtopic: "Direitos Individuais e Coletivos (CF Art. 5º)",
    weight: 4,
    historicalIncidencePercent: 20.0,
    status: "mastered",
    lawTags: ["cf88-art-150"],
  },
  {
    id: "syl-const-2",
    subject: "Direito Constitucional",
    topic: "Repartição de Competências Tributárias e Receitas",
    subtopic:
      "Competência Exclusiva, Privativa e Fundo de Participação dos Estados/Municípios (FPE/FPM)",
    weight: 5,
    historicalIncidencePercent: 23.5,
    status: "reviewed",
    lawTags: ["cf88-art-155"],
  },
  {
    id: "syl-const-3",
    subject: "Direito Constitucional",
    topic: "Controle de Constitucionalidade",
    subtopic: "ADI, ADC, ADPF e Efeitos das Decisões do STF no Direito Tributário",
    weight: 4,
    historicalIncidencePercent: 15.0,
    status: "not_started",
    lawTags: [],
  },

  // 6. DIREITO ADMINISTRATIVO
  {
    id: "syl-adm-1",
    subject: "Direito Administrativo",
    topic: "Atos Administrativos",
    subtopic: "Atributos, Elementos, Anulação, Revogação e Convalidação",
    weight: 4,
    historicalIncidencePercent: 19.0,
    status: "reviewed",
    lawTags: [],
  },
  {
    id: "syl-adm-2",
    subject: "Direito Administrativo",
    topic: "Licitações e Contratos (Nova Lei 14.133/21)",
    subtopic: "Modalidades, Princípios, Inexigibilidade e Dispensa de Licitação",
    weight: 5,
    historicalIncidencePercent: 24.5,
    status: "studying",
    lawTags: ["lei-14133-art-11", "lei-14133-art-74"],
  },
  {
    id: "syl-adm-3",
    subject: "Direito Administrativo",
    topic: "Agentes Públicos e Responsabilidade Civil do Estado",
    subtopic: "Regime Jurídico Único e Responsabilidade Objetiva Estatal (Art. 37, § 6º)",
    weight: 4,
    historicalIncidencePercent: 17.0,
    status: "not_started",
    lawTags: [],
  },

  // 7. RACIOCÍNIO LÓGICO E ESTATÍSTICA
  {
    id: "syl-rlm-1",
    subject: "Raciocínio Lógico & Estatística",
    topic: "Lógica de Proposições",
    subtopic: "Tabela-Verdade, Equivalências e Negações de Condicional",
    weight: 4,
    historicalIncidencePercent: 22.0,
    status: "mastered",
    lawTags: [],
  },
  {
    id: "syl-rlm-2",
    subject: "Raciocínio Lógico & Estatística",
    topic: "Análise Combinatória e Probabilidade",
    subtopic: "Arranjos, Combinações, Permutações e Probabilidade Condicional",
    weight: 4,
    historicalIncidencePercent: 21.0,
    status: "studying",
    lawTags: [],
  },
  {
    id: "syl-rlm-3",
    subject: "Raciocínio Lógico & Estatística",
    topic: "Estatística Descritiva e Inferencial",
    subtopic: "Média, Mediana, Variância, Desvio Padrão e Distribuição Normal",
    weight: 5,
    historicalIncidencePercent: 25.0,
    status: "not_started",
    lawTags: [],
  },

  // 8. LÍNGUA PORTUGUESA
  {
    id: "syl-port-1",
    subject: "Língua Portuguesa",
    topic: "Interpretação e Compreensão de Textos",
    subtopic: "Tipologia Textual, Coesão, Coerência e Inferências Semânticas",
    weight: 5,
    historicalIncidencePercent: 30.0,
    status: "mastered",
    lawTags: [],
  },
  {
    id: "syl-port-2",
    subject: "Língua Portuguesa",
    topic: "Sintaxe da Oração e do Período",
    subtopic: "Concordância Verbal e Nominal, Regência e Emprego do Sinal Indicativo de Crase",
    weight: 5,
    historicalIncidencePercent: 26.0,
    status: "reviewed",
    lawTags: [],
  },
  {
    id: "syl-port-3",
    subject: "Língua Portuguesa",
    topic: "Pontuação e Redação Oficial",
    subtopic: "Emprego da Vírgula e Normas do Manual de Redação da Presidência da República",
    weight: 4,
    historicalIncidencePercent: 18.0,
    status: "studying",
    lawTags: [],
  },
];

let inMemorySyllabusItems: SyllabusItem[] = [...SEED_SYLLABUS_ITEMS];

/**
 * Obtém todos os itens do Edital Verticalizado.
 */
export function getSyllabusItems(): SyllabusItem[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(SYLLABUS_LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as SyllabusItem[];
      }
      localStorage.setItem(SYLLABUS_LOCAL_STORAGE_KEY, JSON.stringify(SEED_SYLLABUS_ITEMS));
    } catch {
      // usa inMemorySyllabusItems
    }
  }

  return inMemorySyllabusItems;
}

/**
 * Atualiza o status de um tópico do edital.
 */
export function updateSyllabusItemStatus(id: string, newStatus: SyllabusStatus): SyllabusItem[] {
  const items = getSyllabusItems();
  const updated = items.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        status: newStatus,
        lastStudiedAt: new Date().toISOString(),
      };
    }
    return item;
  });

  inMemorySyllabusItems = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SYLLABUS_LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignora erro em quota
    }
  }

  return updated;
}

/**
 * Atualiza anotações do item do edital.
 */
export function updateSyllabusItemNotes(id: string, notes: string): SyllabusItem[] {
  const items = getSyllabusItems();
  const updated = items.map((item) => {
    if (item.id === id) {
      return {
        ...item,
        notes,
      };
    }
    return item;
  });

  inMemorySyllabusItems = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SYLLABUS_LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignora erro em quota
    }
  }

  return updated;
}

/**
 * Associa uma LawTag a um item do edital.
 */
export function linkLawTagToSyllabusItem(syllabusId: string, lawTagId: string): SyllabusItem[] {
  const items = getSyllabusItems();
  const updated = items.map((item) => {
    if (item.id === syllabusId && !item.lawTags.includes(lawTagId)) {
      return {
        ...item,
        lawTags: [...item.lawTags, lawTagId],
      };
    }
    return item;
  });

  inMemorySyllabusItems = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SYLLABUS_LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignora erro em quota
    }
  }

  return updated;
}

/**
 * Calcula o progresso percentual geral e ponderado do edital.
 */
export function calculateSyllabusProgress(
  items: SyllabusItem[] = getSyllabusItems(),
): SyllabusProgress {
  const totalItems = items.length;
  if (totalItems === 0) {
    return {
      totalItems: 0,
      completedItems: 0,
      masteredItems: 0,
      studyingItems: 0,
      notStartedItems: 0,
      percentage: 0,
      weightedPercentage: 0,
      statusCounts: {
        not_started: 0,
        studying: 0,
        reviewed: 0,
        mastered: 0,
      },
    };
  }

  let completedItems = 0;
  let masteredItems = 0;
  let studyingItems = 0;
  let notStartedItems = 0;

  let totalWeight = 0;
  let completedWeight = 0;

  items.forEach((item) => {
    totalWeight += item.weight;

    if (item.status === "mastered") {
      masteredItems++;
      completedItems++;
      completedWeight += item.weight;
    } else if (item.status === "reviewed") {
      completedItems++;
      completedWeight += item.weight * 0.85; // 85% do peso por estar revisado
    } else if (item.status === "studying") {
      studyingItems++;
      completedWeight += item.weight * 0.4; // 40% do peso por estar em estudo
    } else {
      notStartedItems++;
    }
  });

  const percentage = Math.round((completedItems / totalItems) * 100);
  const weightedPercentage =
    totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

  return {
    totalItems,
    completedItems,
    masteredItems,
    studyingItems,
    notStartedItems,
    percentage,
    weightedPercentage,
    statusCounts: {
      not_started: notStartedItems,
      studying: studyingItems,
      reviewed: completedItems - masteredItems,
      mastered: masteredItems,
    },
  };
}

/**
 * Agrupa o progresso por disciplina.
 */
export function getSubjectSummaries(
  items: SyllabusItem[] = getSyllabusItems(),
): SubjectSyllabusSummary[] {
  const map = new Map<
    string,
    {
      total: number;
      completed: number;
      totalWeight: number;
      completedWeight: number;
      lawTagsCount: number;
    }
  >();

  items.forEach((item) => {
    const existing = map.get(item.subject) || {
      total: 0,
      completed: 0,
      totalWeight: 0,
      completedWeight: 0,
      lawTagsCount: 0,
    };

    const isCompleted = item.status === "reviewed" || item.status === "mastered";

    map.set(item.subject, {
      total: existing.total + 1,
      completed: existing.completed + (isCompleted ? 1 : 0),
      totalWeight: existing.totalWeight + item.weight,
      completedWeight:
        existing.completedWeight +
        (item.status === "mastered"
          ? item.weight
          : item.status === "reviewed"
            ? item.weight * 0.85
            : item.status === "studying"
              ? item.weight * 0.4
              : 0),
      lawTagsCount: existing.lawTagsCount + item.lawTags.length,
    });
  });

  return Array.from(map.entries()).map(([subject, data]) => ({
    subject,
    totalTopics: data.total,
    completedTopics: data.completed,
    percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    weightedProgress:
      data.totalWeight > 0 ? Math.round((data.completedWeight / data.totalWeight) * 100) : 0,
    lawTagsCount: data.lawTagsCount,
  }));
}

/**
 * Agrega tópicos pendentes do edital para o Planner Adaptativo (Módulo 4.2).
 */
export function getPendingTopicsForPlanner(
  items: SyllabusItem[] = getSyllabusItems(),
): SyllabusItem[] {
  return items
    .filter((item) => item.status === "not_started" || item.status === "studying")
    .sort((a, b) => b.weight - a.weight);
}
