import { LawArticle, VadeMecumSearchFilters } from "./types";

/**
 * Base de Dados Inteligente de Legislação Focada na Área Fiscal (Vade Mecum)
 */
export const VADE_MECUM_DATABASE: LawArticle[] = [
  {
    id: "CF88-ART150",
    diploma: "CF/88",
    section: "Das Limitações do Poder de Tributar",
    articleNumber: "Art. 150",
    title:
      "Sem prejuízo de outras garantias, é vedado à União, aos Estados, ao Distrito Federal e aos Municípios...",
    text: "Sem prejuízo de outras garantias asseguradas ao contribuinte, é vedado à União, aos Estados, ao Distrito Federal e aos Municípios instituir impostos sobre o patrimônio, renda ou serviços, uns dos outros (Imunidade Recíproca).",
    paragraphs: [
      "§ 1º A vedação do inciso III, 'b' (Anterioridade Comum), não se aplica aos impostos previstos nos arts. 148, I (Empréstimo Compulsório - guerra ou calamidade), 153, I (II), II (IE), III (IPI), IV (IOF) e 154, II (Imposto Extraordinário de Guerra).",
      "§ 6º Qualquer subsídio ou isenção, redução de base de cálculo, concessão de crédito presumido, anistia ou remissão, relativos a impostos, taxas ou contribuições, só poderá ser concedido mediante lei específica, federal, estadual ou municipal, que regule exclusivamente as matérias enumeradas.",
    ],
    incises: [
      "I - exigir ou aumentar tributo sem lei que o estabeleça (Legalidade Tributária);",
      "II - instituir tratamento desigual entre contribuintes que se encontrem em situação equivalente (Isonomia);",
      "III - cobrar tributos: a) em relação a fatos geradores ocorridos antes do início da vigência da lei que os houver instituído ou aumentado (Irretroatividade); b) no mesmo exercício financeiro em que haja sido publicada a lei que os instituiu ou aumentou (Anterioridade do Exercício); c) antes de decorridos noventa dias da data em que tenha sido publicada a lei que os instituiu ou aumentou (Anterioridade Noventena);",
      "VI - instituir impostos sobre: a) patrimônio, renda ou serviços, uns dos outros; b) templos de qualquer culto; c) patrimônio, renda ou serviços dos partidos políticos, inclusive suas fundações, das entidades sindicais dos trabalhadores, das instituições de educação e de assistência social, sem fins lucrativos; d) livros, jornais, periódicos e o papel destinado a sua impressão (Imunidade de Imprensa).",
    ],
    intelligence: {
      recurrenceCount: 384,
      relevanceLevel: "high",
      bankStyles: [
        {
          bank: "FGV",
          styleDescription:
            "Excelente cobradora do § 6º. Exige do candidato saber que benefícios fiscais exigem lei específica municipal/estadual regulando exclusivamente a matéria, e que autorizações genéricas em leis de diretrizes orçamentárias invalidam a concessão.",
          typicalQuestionConcept:
            "Anulação de decreto municipal que reduziu base de cálculo do ISS sem previsão em lei complementar ou ordinária específica.",
        },
        {
          bank: "Cebraspe",
          styleDescription:
            "Foco massivo em Anterioridade Tributária (§ 1º). Adora montar casos práticos de majoração de alíquotas de IPI e IOF no meio do ano para perguntar se respeitam a noventena e a anterioridade de exercício.",
          typicalQuestionConcept:
            "Decreto do Executivo majorando alíquotas de IOF no mês de Outubro, com vigência e eficácia no dia seguinte ao da publicação (Válido, pois IOF é exceção a ambas anterioridades).",
        },
        {
          bank: "FCC",
          styleDescription:
            "Cobra a literalidade da Imunidade Recíproca das autarquias e fundações (Art. 150, § 2º). Adora tentar confundir o aluno estendendo a imunidade de impostos a taxas públicas.",
          typicalQuestionConcept:
            "Cobrança de taxa de coleta de lixo de um prédio pertencente à União Federal (Válido, pois a imunidade recíproca só proíbe impostos, e não taxas).",
        },
      ],
      commonTraps: [
        {
          title: "Pegadinha do Alcance das Imunidades",
          trapText:
            "A banca afirma que templos ou partidos políticos são imunes a 'Tributos' (o que incluiria Taxas e Contribuições de Melhoria).",
          keyTermsToWatch: ["imunes a tributos", "isento de taxas", "imunidade tributária ampla"],
          tipToAvoid:
            "A Constituição confere imunidade apenas contra IMPOSTOS (Art. 150, VI). Taxas de serviço e contribuições de melhoria continuam sendo devidas normalmente por templos e partidos.",
        },
        {
          title: "Pegadinha da Exclusão da Anterioridade",
          trapText: "Afirmar que o IPI é exceção absoluta a todas as regras de anterioridade.",
          keyTermsToWatch: [
            "IPI aplica-se imediatamente",
            "IPI não respeita nenhuma anterioridade",
          ],
          tipToAvoid:
            "O IPI é exceção à Anterioridade de Exercício, mas DEVE respeitar a Anterioridade Noventena (90 dias) conforme o Art. 150, § 1º.",
        },
      ],
      jurisprudences: [
        {
          court: "STF",
          reference: "Súmula Vinculante 19",
          summary:
            "A taxa cobrada exclusivamente em razão dos serviços públicos de coleta, remoção e tratamento ou destinação de lixo ou resíduos provenientes de imóveis, não viola o artigo 145, II, da Constituição Federal.",
          year: 2009,
        },
        {
          court: "STF",
          reference: "Súmula Vinculante 52",
          summary:
            "Ainda que alugado a terceiros, permanece imune ao IPTU o imóvel pertencente a qualquer das entidades referidas pelo art. 150, VI, 'c', da Constituição, desde que o valor dos aluguéis seja aplicado nas atividades essenciais de tais entidades.",
          year: 2015,
        },
      ],
    },
  },
  {
    id: "CTN-ART113",
    diploma: "CTN",
    section: "Da Obrigação Tributária",
    articleNumber: "Art. 113",
    title: "A obrigação tributária é principal ou acessória...",
    text: "A obrigação tributária é principal ou acessória. A obrigação principal surge com a ocorrência do fato gerador, tem por objeto o pagamento de tributo ou penalidade pecuniária e extingue-se juntamente com o crédito dela decorrente.",
    paragraphs: [
      "§ 2º A obrigação acessória decorre da legislação tributária e tem por objeto as prestações, positivas ou negativas, nela previstas no interesse da arrecadação ou da fiscalização dos tributos.",
      "§ 3º A obrigação acessória, pelo simples fato da inobservância, converte-se em obrigação principal relativamente à penalidade pecuniária.",
    ],
    intelligence: {
      recurrenceCount: 219,
      relevanceLevel: "high",
      bankStyles: [
        {
          bank: "FGV",
          styleDescription:
            "Foca muito no § 3º e na diferenciação estrita de obrigação acessória em relação à legislação tributária.",
          typicalQuestionConcept:
            "Empresa deixa de emitir nota fiscal (obrigação acessória) e recebe auto de infração cobrando multa pecuniária de R$ 5.000,00.",
        },
        {
          bank: "FCC",
          styleDescription:
            "Cobra o fato de que a obrigação principal surge do fato gerador por previsão em lei, enquanto a acessória decorre do termo mais amplo 'legislação tributária' (que inclui decretos, instruções normativas, portarias).",
          typicalQuestionConcept:
            "Questão comparando a fonte formal da obrigação principal (obrigatoriamente lei) vs obrigação acessória (decretos e atos administrativos).",
        },
      ],
      commonTraps: [
        {
          title: "Pegadinha da Conversão de Obrigações",
          trapText:
            "Afirmar que a obrigação acessória descumprida se converte em obrigação principal, mantendo seu caráter de fazer ou não fazer.",
          keyTermsToWatch: ["converte-se integralmente", "dever acessório vira dever principal"],
          tipToAvoid:
            "A obrigação acessória descumprida só se converte em obrigação principal RELATIVAMENTE à multa pecuniária (pagamento da multa, pois todo pagamento é obrigação principal).",
        },
      ],
      jurisprudences: [
        {
          court: "STF",
          reference: "RE 250.312",
          summary:
            "A exigência de obrigações acessórias por meio de ato do Poder Executivo (como portarias da Receita) é constitucional e não afronta o princípio da legalidade, desde que atue nos limites da arrecadação/fiscalização.",
          year: 2004,
        },
      ],
    },
  },
  {
    id: "CTN-ART111",
    diploma: "CTN",
    section: "Da Interpretação e Integração da Legislação Tributária",
    articleNumber: "Art. 111",
    title: "Interpreta-se literalmente a legislação tributária que disponha sobre...",
    text: "Interpreta-se literalmente a legislação tributária que disponha sobre outorga de isenção, exclusão do crédito tributário ou dispensa de obrigações tributárias acessórias.",
    intelligence: {
      recurrenceCount: 154,
      relevanceLevel: "medium",
      bankStyles: [
        {
          bank: "Cebraspe",
          styleDescription:
            "Cobra este artigo em conjunto com analogia e equidade. Adora dizer que a isenção de imposto pode ser estendida de forma analógica.",
          typicalQuestionConcept:
            "Contribuinte alega direito a isenção de IPVA com base em analogia com isenção outorgada a táxis.",
        },
      ],
      commonTraps: [
        {
          title: "Pegadinha da Interpretação Literal Ampla",
          trapText: "Afirmar que TODA a legislação tributária deve ser interpretada literalmente.",
          keyTermsToWatch: ["toda a legislação", "interpretação literal obrigatória de tributos"],
          tipToAvoid:
            "A interpretação literal é restrita às hipóteses taxativas do Art. 111 (suspensão/exclusão, isenção, dispensa de obrigações acessórias). O restante segue as regras gerais de interpretação jurídica.",
        },
      ],
      jurisprudences: [
        {
          court: "STJ",
          reference: "REsp 1.111.222",
          summary:
            "As regras de isenção tributária devem ser interpretadas de maneira literal e estritamente restrita, descabendo ao Poder Judiciário ampliar o rol de beneficiários sob pretexto de equidade.",
          year: 2012,
        },
      ],
    },
  },
];

/**
 * Motor de busca inteligente sobre a base de dados de Legislação Seca
 */
export function searchVadeMecum(filters: VadeMecumSearchFilters): LawArticle[] {
  const { query, diploma, relevance, minRecurrence } = filters;

  return VADE_MECUM_DATABASE.filter((art) => {
    // 1. Filtrar por diploma legal se especificado
    if (diploma && art.diploma !== diploma) {
      return false;
    }

    // 2. Filtrar por relevância
    if (relevance && art.intelligence?.relevanceLevel !== relevance) {
      return false;
    }

    // 3. Filtrar por recorrência mínima
    if (minRecurrence && (art.intelligence?.recurrenceCount || 0) < minRecurrence) {
      return false;
    }

    // 4. Filtrar por busca textual livre (query)
    if (query && query.trim() !== "") {
      const lowerQuery = query.toLowerCase();
      const matchText = art.text.toLowerCase().includes(lowerQuery);
      const matchNum = art.articleNumber.toLowerCase().includes(lowerQuery);
      const matchTitle = art.title?.toLowerCase().includes(lowerQuery) || false;
      const matchSection = art.section?.toLowerCase().includes(lowerQuery) || false;
      const matchTraps =
        art.intelligence?.commonTraps.some(
          (t) =>
            t.title.toLowerCase().includes(lowerQuery) ||
            t.trapText.toLowerCase().includes(lowerQuery),
        ) || false;

      return matchText || matchNum || matchTitle || matchSection || matchTraps;
    }

    return true;
  });
}
