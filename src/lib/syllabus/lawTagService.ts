import type { LawTag, LawTagImportance } from "./types";

const LOCAL_STORAGE_KEY = "aprovado_fiscal_law_tags_v1";

export const SEED_LAW_TAGS: LawTag[] = [
  // CONSTITUIÇÃO FEDERAL DE 1988 (SISTEMA TRIBUTÁRIO NACIONAL)
  {
    id: "cf88-art-145",
    lawName: "CF/88",
    articleNumber: "Art. 145",
    description:
      "Espécies Tributárias: Impostos, Taxas (pelo exercício do poder de polícia ou serviço específico e divisível) e Contribuição de Melhoria (decorrente de obra pública).",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "cf88-art-146",
    lawName: "CF/88",
    articleNumber: "Art. 146",
    description:
      "Reserva de Lei Complementar: Cabe à LC dispor sobre conflitos de competência, regular limitações constitucionais ao poder de tributar e estabelecer normas gerais em matéria tributária.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "cf88-art-148",
    lawName: "CF/88",
    articleNumber: "Art. 148",
    description:
      "Empréstimos Compulsórios: Instituídos exclusivamente pela União por Lei Complementar em caso de despesas extraordinárias (guerra/calamidade) ou investimento público urgente e relevante.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "cf88-art-150",
    lawName: "CF/88",
    articleNumber: "Art. 150",
    description:
      "Limitações ao Poder de Tributar — Princípios da Legalidade, Isonomia, Irretroatividade, Anterioridade Anual e Noventena.",
    importanceLevel: "high",
    subject: "Direito Constitucional",
  },
  {
    id: "cf88-art-150-vi",
    lawName: "CF/88",
    articleNumber: "Art. 150, VI",
    description:
      "Imunidades Tributárias Genéricas (Patrimônio, Renda e Serviços dos Entes, Templos de qualquer culto, Partidos/Sindicatos e Livros/Jornais/Música nacional).",
    importanceLevel: "high",
    subject: "Direito Constitucional",
  },
  {
    id: "cf88-art-153",
    lawName: "CF/88",
    articleNumber: "Art. 153",
    description:
      "Impostos da União: II, IE, IR, IPI, IOF, ITR e IGF. Destaque para caráter extrafiscal do II, IE, IPI e IOF.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "cf88-art-155",
    lawName: "CF/88",
    articleNumber: "Art. 155",
    description:
      "Impostos dos Estados e Distrito Federal: ITCMD (causa mortis e doação), ICMS (operações de circulação de mercadorias e transporte/comunicação) e IPVA.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "cf88-art-156",
    lawName: "CF/88",
    articleNumber: "Art. 156",
    description:
      "Impostos dos Municípios: IPTU (imposto predial e territorial urbano), ITBI (transmissão inter vivos de bens imóveis) e ISS (serviços de qualquer natureza).",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },

  // CÓDIGO TRIBUTÁRIO NACIONAL (CTN - LEI 5.172/1966)
  {
    id: "ctn-art-3",
    lawName: "CTN",
    articleNumber: "Art. 3º",
    description:
      "Conceito Legal de Tributo: Prestação pecuniária compulsória, em moeda ou cujo valor nela se possa exprimir, que não constitua sanção de ato ilícito, instituída em lei e cobrada mediante atividade administrativa plenamente vinculada.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "ctn-art-111",
    lawName: "CTN",
    articleNumber: "Art. 111",
    description:
      "Interpretação Literal do Código Tributário Nacional: Interpreta-se literalmente a legislação que disponha sobre suspensão ou exclusão do crédito tributário, outorga de isenção e dispensa do cumprimento de obrigações acessórias.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "ctn-art-121",
    lawName: "CTN",
    articleNumber: "Art. 121",
    description:
      "Sujeito Passivo da Obrigação Principal: Contribuinte (tem relação direta e pessoal com o fato gerador) e Responsável (obrigação decorre de disposição expressa de lei).",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "ctn-art-142",
    lawName: "CTN",
    articleNumber: "Art. 142",
    description:
      "Lançamento Tributário: Atendimento da autoridade administrativa de constituição do crédito tributário pelo lançamento, procedimento administrativo vinculado e obrigatório.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "ctn-art-150",
    lawName: "CTN",
    articleNumber: "Art. 150",
    description:
      "Lançamento por Homologação: Ocorre nos tributos em que a lei atribui ao sujeito passivo o dever de antecipar o pagamento sem prévio exame da autoridade. Prazo decadencial de 5 Anos a contar do fato gerador.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "ctn-art-151",
    lawName: "CTN",
    articleNumber: "Art. 151",
    description:
      "Suspensão da Exigibilidade do Crédito Tributário: Moratória, Depósito do montante integral, Impugnações/Recursos administrativos, Concessão de liminar/tutela e Parcelamento (MODERPA/LIMPAR).",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "ctn-art-156",
    lawName: "CTN",
    articleNumber: "Art. 156",
    description:
      "Extinção do Crédito Tributário: Pagamento, Compensação, Transação, Remissão, Decadência, Prescrição, Conversão de depósito em renda, Pagamento antecipado com homologação, Consignação em pagamento e Dação em pagamento de imóveis.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "ctn-art-173",
    lawName: "CTN",
    articleNumber: "Art. 173",
    description:
      "Decadência Tributária: Direito de a Fazenda Pública constituir o crédito tributário extingue-se após 5 anos contados do primeiro dia do exercício seguinte àquele em que o lançamento poderia ter sido efetuado.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "ctn-art-174",
    lawName: "CTN",
    articleNumber: "Art. 174",
    description:
      "Prescrição Tributária: A ação para a cobrança do crédito tributário prescreve em 5 anos contados da data da sua constituição definitiva. Interrompe-se pelo despacho do juiz que ordenar a citação em execução fiscal.",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },
  {
    id: "ctn-art-175",
    lawName: "CTN",
    articleNumber: "Art. 175",
    description:
      "Exclusão do Crédito Tributário: Isenção e Anistia (dispensa do pagamento de penalidades/multas pecuniárias).",
    importanceLevel: "high",
    subject: "Direito Tributário",
  },

  // LEGISLAÇÃO COMPLEMENTAR TRIBUTÁRIA (ICMS E ISS)
  {
    id: "lc-87-art-12",
    lawName: "LC 87/96",
    articleNumber: "Art. 12 (Lei Kandir)",
    description:
      "Fato Gerador do ICMS na saída de mercadoria de estabelecimento de contribuinte, início de prestação de serviços de transporte intermunicipal e de comunicação.",
    importanceLevel: "high",
    subject: "Legislação Tributária",
  },
  {
    id: "lc-87-art-13",
    lawName: "LC 87/96",
    articleNumber: "Art. 13",
    description:
      "Base de Cálculo do ICMS: Inclui o valor da operação, frete, seguro, demais despesas cobradas e o próprio valor do imposto (cálculo por dentro).",
    importanceLevel: "high",
    subject: "Legislação Tributária",
  },
  {
    id: "lc-116-art-1",
    lawName: "LC 116/03",
    articleNumber: "Art. 1º",
    description:
      "Fato Gerador do ISS: Prestação de serviços constantes da lista anexa, ainda que esses não se constituam como atividade preponderante do prestador.",
    importanceLevel: "high",
    subject: "Legislação Tributária",
  },
  {
    id: "lc-116-art-3",
    lawName: "LC 116/03",
    articleNumber: "Art. 3º",
    description:
      "Local da Prestação do ISS: Regra geral é o estabelecimento prestador ou, na falta deste, o domicílio do prestador (salvo exceções taxativas do art. 3º, como construção civil).",
    importanceLevel: "high",
    subject: "Legislação Tributária",
  },

  // NOVA LEI DE LICITAÇÕES E DIREITO ADMINISTRATIVO
  {
    id: "lei-14133-art-11",
    lawName: "Lei 14.133/21",
    articleNumber: "Art. 11",
    description:
      "Objetivos do Processo Licitatório: Seleção da proposta mais vantajosa, tratamento isonômico, justa competição, prevenção à sobrepreço/superfaturamento e inovação sustentável.",
    importanceLevel: "medium",
    subject: "Direito Administrativo",
  },
  {
    id: "lei-14133-art-74",
    lawName: "Lei 14.133/21",
    articleNumber: "Art. 74",
    description:
      "Inexigibilidade de Licitação: Ilícita inviabilidade de competição (fornecedor exclusivo, serviços técnicos especializados de natureza predominantemente intelectual, artista consagrado).",
    importanceLevel: "high",
    subject: "Direito Administrativo",
  },

  // LEI DAS S/A E CONTABILIDADE
  {
    id: "lei-6404-art-178",
    lawName: "Lei 6.404/76",
    articleNumber: "Art. 178",
    description:
      "Estrutura do Balanço Patrimonial: Ativo Circulante, Ativo Não Circulante (Realizável a Longo Prazo, Investimentos, Imobilizado e Intangível), Passivo e Patrimônio Líquido.",
    importanceLevel: "high",
    subject: "Contabilidade Geral",
  },
  {
    id: "lei-6404-art-183",
    lawName: "Lei 6.404/76",
    articleNumber: "Art. 183",
    description:
      "Critérios de Avaliação dos Ativos: Aplicações financeiras a valor justo ou custo amortizado; estoques ao custo ou valor líquido de realização, dos dois o menor.",
    importanceLevel: "high",
    subject: "Contabilidade Geral",
  },
];

let inMemoryLawTags: LawTag[] = [...SEED_LAW_TAGS];

/**
 * Obtém todas as LawTags (combinando seed com persistência local / memória).
 */
export function getLawTags(): LawTag[] {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as LawTag[];
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_LAW_TAGS));
    } catch {
      // usa inMemoryLawTags se falhar
    }
  }

  return inMemoryLawTags;
}

/**
 * Obtém LawTag por ID.
 */
export function getLawTagById(id: string): LawTag | undefined {
  const tags = getLawTags();
  return tags.find((t) => t.id === id);
}

/**
 * Pesquisa LawTags por texto (nome da lei, artigo, matéria ou descrição).
 */
export function searchLawTags(query: string): LawTag[] {
  const tags = getLawTags();
  const q = query.trim().toLowerCase();
  if (!q) return tags;

  return tags.filter(
    (t) =>
      t.lawName.toLowerCase().includes(q) ||
      t.articleNumber.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.subject && t.subject.toLowerCase().includes(q)),
  );
}

/**
 * Adiciona uma nova LawTag personalizada.
 */
export function addLawTag(newTag: Omit<LawTag, "id">): LawTag {
  const tags = getLawTags();

  const generatedId = `${newTag.lawName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")}-${newTag.articleNumber
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")}-${Math.random().toString(36).substring(2, 6)}`;

  const tag: LawTag = {
    ...newTag,
    id: generatedId,
  };

  const updated = [tag, ...tags];
  inMemoryLawTags = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignora erro em quota
    }
  }

  return tag;
}

/**
 * Filtra LawTags por grau de importância ('high' | 'medium' | 'low').
 */
export function filterLawTagsByImportance(importance: LawTagImportance): LawTag[] {
  return getLawTags().filter((t) => t.importanceLevel === importance);
}
