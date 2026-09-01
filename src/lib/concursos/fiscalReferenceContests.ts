export interface ReferenceFiscalContest {
  id: string;
  name: string;
  organization: string; // Ex: SEFAZ-SP, Receita Federal
  roleTitle: string; // Ex: Auditor Fiscal da Receita Estadual
  examBoard: "FGV" | "Cebraspe" | "FCC" | "Vunesp";
  status: "ativo" | "futuro" | "concluido";
  area: "Fiscal Estadual" | "Fiscal Federal" | "Fiscal Municipal";
  expectedVagas: number;
  salaryInitial: string;
  editalUrl?: string;
  highlights: string[];
  subjectsWeightBreakdown: {
    subject: string;
    weight: number;
    questionsCount: number;
    incidence: string;
  }[];
}

export const REFERENCE_FISCAL_CONTESTS: ReferenceFiscalContest[] = [
  {
    id: "sefaz-sp-afre",
    name: "SEFAZ-SP — Auditor Fiscal da Receita Estadual",
    organization: "Secretaria da Fazenda de São Paulo",
    roleTitle: "Auditor Fiscal da Receita Estadual (AFRE-SP)",
    examBoard: "FGV",
    status: "futuro",
    area: "Fiscal Estadual",
    expectedVagas: 500,
    salaryInitial: "R$ 24.500,00",
    highlights: [
      "Edital de referência para fiscos estaduais",
      "Forte peso em Contabilidade Avançada, TI e ICMS-SP",
      "Provas discursivas com casos práticos tributários",
    ],
    subjectsWeightBreakdown: [
      {
        subject: "Legislação Tributária Estadual (ICMS/IPVA/ITCMD)",
        weight: 5,
        questionsCount: 30,
        incidence: "Alta (25%)",
      },
      { subject: "Direito Tributário", weight: 5, questionsCount: 25, incidence: "Alta (20%)" },
      {
        subject: "Contabilidade Geral e Avançada",
        weight: 5,
        questionsCount: 25,
        incidence: "Alta (20%)",
      },
      {
        subject: "Auditoria Fiscal e SPED",
        weight: 4,
        questionsCount: 15,
        incidence: "Média (12%)",
      },
      {
        subject: "Língua Portuguesa (FGV)",
        weight: 4,
        questionsCount: 15,
        incidence: "Média (12%)",
      },
      {
        subject: "Direito Constitucional e Administrativo",
        weight: 3,
        questionsCount: 10,
        incidence: "Base (8%)",
      },
      {
        subject: "Raciocínio Lógico e Estatística Inferencial",
        weight: 3,
        questionsCount: 10,
        incidence: "Base (8%)",
      },
    ],
  },
  {
    id: "sefaz-al-afre",
    name: "SEFAZ-AL — Auditor Fiscal da Receita Estadual",
    organization: "Secretaria da Fazenda de Alagoas",
    roleTitle: "Auditor Fiscal da Receita Estadual",
    examBoard: "Cebraspe",
    status: "ativo",
    area: "Fiscal Estadual",
    expectedVagas: 60,
    salaryInitial: "R$ 19.800,00",
    highlights: [
      "Modelo Certo/Errado Cebraspe (1 errada anula 1 certa)",
      "Exige jurisprudência atualizada do STF/STJ em Direito Tributário",
      "Foco em Auditoria e Legislação do ICMS Alagoas",
    ],
    subjectsWeightBreakdown: [
      {
        subject: "Direito Tributário e Legislação Estadual",
        weight: 5,
        questionsCount: 40,
        incidence: "Alta (30%)",
      },
      { subject: "Auditoria Fiscal", weight: 5, questionsCount: 25, incidence: "Alta (20%)" },
      {
        subject: "Contabilidade Geral e Custos",
        weight: 4,
        questionsCount: 25,
        incidence: "Alta (20%)",
      },
      {
        subject: "Direito Constitucional e Administrativo",
        weight: 3,
        questionsCount: 20,
        incidence: "Média (15%)",
      },
      {
        subject: "Língua Portuguesa e RLM",
        weight: 3,
        questionsCount: 20,
        incidence: "Média (15%)",
      },
    ],
  },
  {
    id: "sef-sc-afre",
    name: "SEF-SC — Auditor Fiscal da Receita Estadual",
    organization: "Secretaria de Estado da Fazenda de Santa Catarina",
    roleTitle: "Auditor Fiscal da Receita Estadual",
    examBoard: "FCC",
    status: "ativo",
    area: "Fiscal Estadual",
    expectedVagas: 90,
    salaryInitial: "R$ 23.800,00",
    highlights: [
      "Banca FCC com questões analíticas objetivas",
      "Elevada exigência em TI aplicada à Auditoria e Estatística",
      "Estudo detalhado da Lei Regulamento do ICMS-SC",
    ],
    subjectsWeightBreakdown: [
      {
        subject: "Legislação Tributária de SC",
        weight: 5,
        questionsCount: 30,
        incidence: "Alta (25%)",
      },
      {
        subject: "Contabilidade Avançada e Auditoria",
        weight: 5,
        questionsCount: 30,
        incidence: "Alta (25%)",
      },
      { subject: "Direito Tributário", weight: 4, questionsCount: 20, incidence: "Alta (18%)" },
      {
        subject: "Tecnologia da Informação & Banco de Dados",
        weight: 4,
        questionsCount: 20,
        incidence: "Média (16%)",
      },
      { subject: "Português e RLM", weight: 3, questionsCount: 15, incidence: "Base (16%)" },
    ],
  },
  {
    id: "rfb-auditor",
    name: "Receita Federal (RFB) — Auditor-Fiscal",
    organization: "Receita Federal do Brasil",
    roleTitle: "Auditor-Fiscal da Receita Federal do Brasil",
    examBoard: "FGV",
    status: "futuro",
    area: "Fiscal Federal",
    expectedVagas: 230,
    salaryInitial: "R$ 22.921,71",
    highlights: [
      "Maior concurso da área fiscal nacional",
      "Matérias exclusivas: Comércio Internacional e Legislação Aduaneira",
      "Exige fluência em Contabilidade Geral/Avançada e Legislação Tributária Federal",
    ],
    subjectsWeightBreakdown: [
      {
        subject: "Direito Tributário e Legislação Tributária Federal",
        weight: 5,
        questionsCount: 30,
        incidence: "Alta (22%)",
      },
      {
        subject: "Contabilidade Geral e Avançada",
        weight: 5,
        questionsCount: 20,
        incidence: "Alta (18%)",
      },
      {
        subject: "Comércio Internacional e Legislação Aduaneira",
        weight: 4,
        questionsCount: 15,
        incidence: "Média (14%)",
      },
      { subject: "Auditoria Fiscal", weight: 4, questionsCount: 15, incidence: "Média (14%)" },
      {
        subject: "Língua Portuguesa e Fluência em Dados",
        weight: 4,
        questionsCount: 20,
        incidence: "Média (16%)",
      },
      {
        subject: "Direito Constitucional, Administrativo e RLM",
        weight: 3,
        questionsCount: 20,
        incidence: "Base (16%)",
      },
    ],
  },
  {
    id: "iss-sp-aftm",
    name: "ISS-SP — Auditor Fiscal Tributário Municipal",
    organization: "Prefeitura de São Paulo / SF-SP",
    roleTitle: "Auditor Fiscal Tributário Municipal",
    examBoard: "Vunesp",
    status: "futuro",
    area: "Fiscal Municipal",
    expectedVagas: 150,
    salaryInitial: "R$ 26.000,00",
    highlights: [
      "Maior fisco municipal do país",
      "Foco em ISS, IPTU, ITBI e Legislação Tributária Paulistana",
      "Excelente relação de vagas e remuneração no teto de SP",
    ],
    subjectsWeightBreakdown: [
      {
        subject: "Legislação Tributária Municipal (ISS/IPTU/ITBI)",
        weight: 5,
        questionsCount: 35,
        incidence: "Alta (28%)",
      },
      { subject: "Direito Tributário", weight: 5, questionsCount: 25, incidence: "Alta (20%)" },
      {
        subject: "Contabilidade e Finanças Públicas",
        weight: 4,
        questionsCount: 20,
        incidence: "Média (18%)",
      },
      {
        subject: "Português e Matemática Financeira",
        weight: 3,
        questionsCount: 20,
        incidence: "Média (18%)",
      },
      {
        subject: "Direito Constitucional e Administrativo",
        weight: 3,
        questionsCount: 15,
        incidence: "Base (16%)",
      },
    ],
  },
];
