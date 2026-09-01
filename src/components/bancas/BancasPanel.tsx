import { useState } from "react";
import {
  Award,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileCheck2,
  HelpCircle,
  Layers,
  PieChart,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface BoardStat {
  id: "fgv" | "cebraspe" | "fcc" | "vunesp";
  name: string;
  fullName: string;
  tagline: string;
  badge: string;
  style: string;
  overallDifficulty: "Alta" | "Muito Alta" | "Extrema";
  averageTimePerQuestion: string;
  penaltyForWrongAnswer: boolean;
  subjectIncidence: {
    subject: string;
    percentage: number;
    questionVolume: number;
    relevance: "Alta" | "Média" | "Base";
    keyTopics: string[];
  }[];
  complexityDistribution: {
    facil: number;
    media: number;
    dificil: number;
    pegadinha: number;
  };
  trapsAndTricks: {
    title: string;
    description: string;
    exampleScenario: string;
    coachProtectionTip: string;
  }[];
  coachRecommendations: {
    title: string;
    advice: string;
    icon: string;
  }[];
}

export const EXAM_BOARDS_DATA: Record<string, BoardStat> = {
  fgv: {
    id: "fgv",
    name: "FGV",
    fullName: "Fundação Getulio Vargas",
    tagline:
      "Textos longos, casuística complexa e exegese profunda em Contabilidade e Direito Tributário",
    badge: "Banca mais exigente",
    style:
      "Múltipla Escolha (5 alternativas). Estilo focado em cenários práticos, interpretação semântica e pegadinhas CPC.",
    overallDifficulty: "Extrema",
    averageTimePerQuestion: "3 min 45 seg",
    penaltyForWrongAnswer: false,
    subjectIncidence: [
      {
        subject: "Contabilidade Geral e Avançada",
        percentage: 24,
        questionVolume: 1250,
        relevance: "Alta",
        keyTopics: [
          "DFC (Método Indireto)",
          "CPC 00 / 01 (Impairment)",
          "MEP e Goodwill",
          "Consolidação de Balanços",
        ],
      },
      {
        subject: "Direito Tributário",
        percentage: 22,
        questionVolume: 1100,
        relevance: "Alta",
        keyTopics: [
          "Lançamento por Homologação (CTN 150)",
          "Imunidade de Livros/E-books",
          "Decadência x Prescrição",
          "Extinção do Crédito",
        ],
      },
      {
        subject: "Legislação Tributária Estadual/Federal",
        percentage: 18,
        questionVolume: 920,
        relevance: "Alta",
        keyTopics: [
          "LC 87/96 (Fato Gerador ICMS)",
          "Não-cumulatividade e Créditos",
          "Substituição Tributária",
          "Processo Consultivo",
        ],
      },
      {
        subject: "Língua Portuguesa",
        percentage: 15,
        questionVolume: 800,
        relevance: "Alta",
        keyTopics: [
          "Inferência Semântica",
          "Reescritura de Frases",
          "Coesão Referencial",
          "Tipologia Argumentativa",
        ],
      },
      {
        subject: "Auditoria Fiscal",
        percentage: 11,
        questionVolume: 550,
        relevance: "Média",
        keyTopics: [
          "Amostragem NBC TA 530",
          "Testes de Substantivos em SPED",
          "Parecer sem Ressalva x Abstenção",
        ],
      },
      {
        subject: "Raciocínio Lógico & Estatística",
        percentage: 10,
        questionVolume: 480,
        relevance: "Base",
        keyTopics: [
          "Probabilidade Condicional",
          "Inferência Normal",
          "Testes de Hipóteses",
          "Tabela Verdade Negação",
        ],
      },
    ],
    complexityDistribution: {
      facil: 15,
      media: 40,
      dificil: 30,
      pegadinha: 15,
    },
    trapsAndTricks: [
      {
        title: "A Armadilha do Enunciado Extenso em Contabilidade",
        description:
          "A FGV apresenta histórias hipotéticas longas com 10 dados financeiros, dos quais apenas 2 são necessários para responder o saldo da DFC.",
        exampleScenario:
          "A Cia. Aurora realizou venda de ativos imobilizados, integralização em dinheiro, emissão de debêntures e variação cambial. Pede-se o caixa operacional pelo método indireto.",
        coachProtectionTip:
          "Leia primeiramente o comando final da questão antes do texto base. Identifique o que é exigido para filtrar os dados poluentes instantaneamente.",
      },
      {
        title: "Pegadinha de Exceção da Exceção em Direito Tributário",
        description:
          "A banca traz a regra geral de Anterioridade Noventena e insere sutilmente um tributo que respeita apenas a Anterioridade Anual (ex: IPVA/IPTU fixação de base).",
        exampleScenario:
          "Lei estadual publicada em 20/12/2025 alterou a base de cálculo do IPVA para valer em 01/01/2026. A FGV afirma ser inconstitucional por violar a noventena.",
        coachProtectionTip:
          "Guarde o mnemônico de exceções às anterioridades do Art. 150, § 1º da CF/88. A alteração de base de cálculo do IPVA/IPTU só exige anterioridade anual!",
      },
      {
        title: "Distorção Semântica em Língua Portuguesa",
        description:
          "A FGV altera apenas um conectivo no meio do período (ex: 'embora' por 'desde que') mudando a relação de concessão para condição.",
        exampleScenario:
          "Substituir 'Conquanto houvesse fiscalização...' por 'Dado que houvesse fiscalização...' mantendo o sentido original.",
        coachProtectionTip:
          "Mapeie os conectivos de valor concessivo (conquanto, embora, posto que) x causais (dado que, visto que). A FGV testa rigorosamente esta matriz gramatical.",
      },
    ],
    coachRecommendations: [
      {
        title: "Gestão do Tempo e Ritmo de Prova",
        advice:
          "Com enunciados de 3 a 4 parágrafos, não gaste mais de 4 minutos em uma questão de cálculo extensivo. Deixe questões longas de DFC para o segundo bloco de resolução.",
        icon: "Clock",
      },
      {
        title: "Técnica de Eliminação de Alternativas",
        advice:
          "Nas alternativas de Direito Tributário, elimine de imediato as opções com termos radicais como 'em qualquer hipótese' ou 'sem ressalvas'. A FGV adora exceções de jurisprudência.",
        icon: "Filter",
      },
    ],
  },
  cebraspe: {
    id: "cebraspe",
    name: "Cebraspe",
    fullName: "Centro de Pesquisa em Avaliação e Seleção e de Promoção de Eventos",
    tagline:
      "Modelo Certo/Errado, cobrança literal de jurisprudência sumulada e risco de penalidade",
    badge: "Penalidade por erro",
    style:
      "Estilo Certo / Errado clássico (1 resposta errada anula 1 resposta certa). Elevado rigor jurisprudencial (STF/STJ).",
    overallDifficulty: "Muito Alta",
    averageTimePerQuestion: "1 min 40 seg",
    penaltyForWrongAnswer: true,
    subjectIncidence: [
      {
        subject: "Direito Tributário",
        percentage: 25,
        questionVolume: 1400,
        relevance: "Alta",
        keyTopics: [
          "Súmulas Vinculantes do STF",
          "Responsabilidade de Sucessores (CTN 130)",
          "Lançamento de Ofício",
          "Denúncia Spontânea (CTN 138)",
        ],
      },
      {
        subject: "Auditoria Fiscal",
        percentage: 20,
        questionVolume: 1050,
        relevance: "Alta",
        keyTopics: [
          "Normas Brasileiras de Auditoria (NBC TA)",
          "Testes de Conformidade",
          "Evidências e Papéis de Trabalho",
          "Risco de Auditoria",
        ],
      },
      {
        subject: "Direito Administrativo e Constitucional",
        percentage: 18,
        questionVolume: 980,
        relevance: "Alta",
        keyTopics: [
          "Licitações (Lei 14.133/21 Inexigibilidade)",
          "Responsabilidade Objetiva do Estado",
          "Atos Administrativos",
          "ADI e ADPF",
        ],
      },
      {
        subject: "Legislação Tributária",
        percentage: 15,
        questionVolume: 820,
        relevance: "Alta",
        keyTopics: [
          "LC 87/96 (Isenções e Convênios CONFAZ)",
          "Fato Gerador do ICMS",
          "CTN Fontes Secundárias",
        ],
      },
      {
        subject: "Contabilidade Geral",
        percentage: 12,
        questionVolume: 650,
        relevance: "Média",
        keyTopics: [
          "Critérios de Avaliação de Ativos (Lei 6.404)",
          "Provisões e Passivos Contingentes",
          "Princípio da Competência",
        ],
      },
      {
        subject: "Língua Portuguesa e RLM",
        percentage: 10,
        questionVolume: 500,
        relevance: "Base",
        keyTopics: ["Crase e Regência", "Lógica de Predicados", "Compreensão de Texto"],
      },
    ],
    complexityDistribution: {
      facil: 25,
      media: 45,
      dificil: 20,
      pegadinha: 10,
    },
    trapsAndTricks: [
      {
        title: "Generalizações Absolutas ('Sempre', 'Nunca', 'Incondicionalmente')",
        description:
          "O Cebraspe insere advérbios restritivos em itens conceituais corretos para torná-los falsos devido a exceções de lei ou jurisprudência.",
        exampleScenario:
          "Item: 'A denúncia espontânea apresentada pelo contribuinte acompanhada do pagamento do tributo e juros sempre exclui a aplicação de penalidades pecuniárias.'",
        coachProtectionTip:
          "Se a questão usar 'sempre' ou 'em qualquer situação', desconfie imediatamente. Lembre-se que tributos sujeitos a lançamento por homologação declarados e não pagos não atraem denúncia espontânea (Súmula 360 STJ).",
      },
      {
        title: "Apegamento a Jurisprudência Recente sem Alterar a Lei",
        description:
          "A banca cobra tese fixada em repercussão geral pelo STF que inverte o entendimento do texto literal da lei.",
        exampleScenario:
          "Item cobrando a não-incidência de ICMS no deslocamento de mercadorias entre estabelecimentos do mesmo titular (Súmula Vinculante e Tema STF).",
        coachProtectionTip:
          "No Cebraspe, a posição consolidada do STF prevalece sobre o texto desatualizado da lei. Revise as últimas teses tributárias na Central de Inteligência.",
      },
      {
        title: "Itens com Duas Assertivas Conectadas por 'Porquanto'",
        description:
          "A primeira parte da frase é verdadeira, mas a razão explicativa (após o conectivo) é incorreta.",
        exampleScenario:
          "Item: 'O imposto sobre a renda é informado pelo princípio da progressividade, porquanto é vedada a instituição de alíquotas diferenciadas baseadas na capacidade contributiva.'",
        coachProtectionTip:
          "Divida o item em duas frases. Valide a primeira e em seguida teste se a segunda é causa/razão real da primeira.",
      },
    ],
    coachRecommendations: [
      {
        title: "Estratégia de Respostas em Branco (Chute Consciente)",
        advice:
          "Como 1 erro anula 1 acerto, nunca chute um item com dúvida superior a 50%. Deixe cerca de 10% a 15% dos itens em branco se não tiver convicção.",
        icon: "ShieldAlert",
      },
      {
        title: "Conferência de Gabarito por Blocos",
        advice:
          "O Cebraspe tende a manter um equilíbrio próximo de 50% de itens Certos e 50% Errados no cômputo geral da prova. Use isso para auditoria final.",
        icon: "CheckCircle2",
      },
    ],
  },
  fcc: {
    id: "fcc",
    name: "FCC",
    fullName: "Fundação Carlos Chagas",
    tagline:
      "Precisão matemática, texto legal literal atualizado e rapidez de cálculo em Contabilidade",
    badge: "Cobrança literal & técnica",
    style:
      "Múltipla escolha (5 alternativas). Cobra exatidão do texto da lei e cálculos precisos em Contabilidade Geral/Avançada.",
    overallDifficulty: "Alta",
    averageTimePerQuestion: "2 min 45 seg",
    penaltyForWrongAnswer: false,
    subjectIncidence: [
      {
        subject: "Legislação Tributária Estadual (ICMS/IPVA)",
        percentage: 26,
        questionVolume: 1300,
        relevance: "Alta",
        keyTopics: [
          "LC 87/96 na Íntegra",
          "Regulamento Estadual do ICMS",
          "Substituição Tributária para Frente",
          "Benefícios Fiscais CONFAZ",
        ],
      },
      {
        subject: "Contabilidade Geral e Avançada",
        percentage: 24,
        questionVolume: 1180,
        relevance: "Alta",
        keyTopics: [
          "Lançamentos de Ajustes de Avaliação Patrimonial",
          "Demonstração de Resultados (DRE)",
          "Lucro Real x Presumido",
          "Depreciação Acelerada",
        ],
      },
      {
        subject: "Direito Tributário",
        percentage: 20,
        questionVolume: 990,
        relevance: "Alta",
        keyTopics: [
          "CTN Arts. 96 a 112 (Legislação Tributária)",
          "Suspensão do Crédito (Art. 151)",
          "Crédito Tributário",
          "Garantias do Crédito",
        ],
      },
      {
        subject: "Raciocínio Lógico & Matemática Financeira",
        percentage: 12,
        questionVolume: 600,
        relevance: "Média",
        keyTopics: [
          "Juros Compostos e Desconto Racional/Bancário",
          "Anuidades e Taxa Interna de Retorno (TIR)",
          "Equivalência de Capitais",
        ],
      },
      {
        subject: "Direito Administrativo & Constitucional",
        percentage: 10,
        questionVolume: 520,
        relevance: "Base",
        keyTopics: [
          "Lei 14.133/21 (Fases da Licitação)",
          "Bens Públicos",
          "Controle da Administração",
        ],
      },
      {
        subject: "Auditoria Fiscal",
        percentage: 8,
        questionVolume: 400,
        relevance: "Base",
        keyTopics: [
          "Procedimentos de Contagem Física",
          "Circularização de Saldos",
          "Confirmacões Externas",
        ],
      },
    ],
    complexityDistribution: {
      facil: 30,
      media: 50,
      dificil: 15,
      pegadinha: 5,
    },
    trapsAndTricks: [
      {
        title: "Substituição de 'Poderá' por 'Deverá' no Texto de Lei",
        description:
          "A FCC é famosa pela precisão cirúrgica na cobrança do texto da lei seco, trocando faculdades por obrigações vinculadas.",
        exampleScenario:
          "Questão sobre CTN Art. 156 ou LC 87/96 trocando a faculdade da autoridade fiscal de conceder moratória em caráter individual por dever sumário.",
        coachProtectionTip:
          "Ao estudar Vade Mecum, atente-se às palavras de comando ('poderá', 'deverá', 'vedado', 'indispensável'). Memorize as distinções com as LawTags.",
      },
      {
        title: "Contabilidade com Números Extensos sem Arredondamento",
        description:
          "Questões de equivalência patrimonial com porcentagens fracionárias para testar sua velocidade e calma nos cálculos manuais.",
        exampleScenario:
          "Cálculo de mais-valia de ativos em aquisição de 37,5% de participação sociológica.",
        coachProtectionTip:
          "Simplifique as frações antes de multiplicar e mantenha rascunhos organizados por etapas para não errar a vírgula.",
      },
      {
        title: "Alternativas Parecidas com Apenas uma Palavra Diferente",
        description:
          "Duas opções parecem idênticas, mas uma utiliza 'crédito presumido' e a outra 'crédito outorgado'.",
        exampleScenario: "Diferenciação do tratamento tributário de benefício fiscal na LC 87/96.",
        coachProtectionTip:
          "Sublinhe os substantivos jurídicos específicos nas opções antes de marcar a alternativa na folha de respostas.",
      },
    ],
    coachRecommendations: [
      {
        title: "Rapidez nas Primeiras Questões de Direito",
        advice:
          "As questões de Direito na FCC são diretas e objetivas. Garanta pontos rápidos nelas para guardar tempo precioso para as questões numéricas de Contabilidade e Matemática Financeira.",
        icon: "Zap",
      },
      {
        title: "Dominador de Legislação Seca",
        advice:
          "A leitura atenta e frequente dos artigos do Vade Mecum (CTN, CF, LC 87, LC 116) garante até 80% de acerto na prova de Legislação da FCC.",
        icon: "BookOpen",
      },
    ],
  },
  vunesp: {
    id: "vunesp",
    name: "Vunesp",
    fullName: "Fundação para o Vestibular da Universidade Estadual Paulista",
    tagline:
      "Clareza nos enunciados, cobrança direta da legislação e perfil tradicional em Fiscos Municipais",
    badge: "Fiscos Municipais & SP",
    style:
      "Múltipla escolha (5 alternativas). Questões bem estruturadas, diretas, focadas no texto legal e doutrina clássica.",
    overallDifficulty: "Alta",
    averageTimePerQuestion: "2 min 30 seg",
    penaltyForWrongAnswer: false,
    subjectIncidence: [
      {
        subject: "Legislação Tributária Municipal (ISS/IPTU/ITBI)",
        percentage: 28,
        questionVolume: 950,
        relevance: "Alta",
        keyTopics: [
          "LC 116/03 na Íntegra",
          "Local da Prestação do ISS",
          "Base de Cálculo IPTU/ITBI",
          "Código Tributário Municipal",
        ],
      },
      {
        subject: "Direito Tributário",
        percentage: 22,
        questionVolume: 800,
        relevance: "Alta",
        keyTopics: [
          "CTN Conceito de Tributo",
          "Sujeição Passiva e Responsabilidade",
          "Crédito Tributário e Lançamento",
        ],
      },
      {
        subject: "Contabilidade Geral",
        percentage: 20,
        questionVolume: 720,
        relevance: "Alta",
        keyTopics: [
          "Estrutura de Balanço Patrimonial",
          "DRE e Apuração do Resultado",
          "Demonstrações Obrigatórias",
        ],
      },
      {
        subject: "Direito Constitucional e Administrativo",
        percentage: 15,
        questionVolume: 550,
        relevance: "Média",
        keyTopics: ["Art. 5º CF", "Princípios LIMPE", "Atos Administrativos", "Licitações básicas"],
      },
      {
        subject: "Língua Portuguesa & RLM",
        percentage: 15,
        questionVolume: 550,
        relevance: "Média",
        keyTopics: ["Concordância e Regência", "Crase", "Porcentagem e Regra de Três"],
      },
    ],
    complexityDistribution: {
      facil: 35,
      media: 45,
      dificil: 15,
      pegadinha: 5,
    },
    trapsAndTricks: [
      {
        title: "Pegadinha de Exceção do Local da Prestação do ISS (LC 116/03)",
        description:
          "A Vunesp testa exaustivamente as exceções ao artigo 3º da LC 116/03, onde o ISS deixa de ser devido no estabelecimento prestador para ser devido no local da execução do serviço.",
        exampleScenario:
          "Empresa sediada no município X presta serviço de varrição e limpeza de vias no município Y. Onde é devido o ISS?",
        coachProtectionTip:
          "Memorize as exceções do Art. 3º da LC 116/03 (limpeza, construção civil, vigilância, feiras). Nesses casos específicos, o imposto pertence ao município onde o serviço é prestado!",
      },
      {
        title: "Interpretação Literal dos Artigos da CF/88",
        description:
          "A Vunesp costuma copiar parágrafos inteiros da CF/88 alterando apenas uma palavra para testar o conhecimento do candidato.",
        exampleScenario:
          "Art. 156, § 1º sobre a progressividade do IPTU em razão do valor do imóvel ou da localização/uso.",
        coachProtectionTip:
          "Revise as LawTags do Sistema Tributário Nacional para fixar os incisos exatos dos artigos 145 a 156 da Carta Magna.",
      },
    ],
    coachRecommendations: [
      {
        title: "Foco na Resolução de Provas Anteriores",
        advice:
          "A Vunesp possui um padrão de cobrança muito estável e previsível. Resolver as últimas provas de fiscos municipais garante um desempenho acima de 85%.",
        icon: "Layers",
      },
    ],
  },
};

export function BancasPanel() {
  const [selectedBoardId, setSelectedBoardId] = useState<"fgv" | "cebraspe" | "fcc" | "vunesp">(
    "fgv",
  );
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");

  const board = EXAM_BOARDS_DATA[selectedBoardId];

  // Subjects for filter
  const availableSubjects = [
    "all",
    ...Array.from(new Set(board.subjectIncidence.map((s) => s.subject))),
  ];

  const filteredIncidence =
    selectedSubjectFilter === "all"
      ? board.subjectIncidence
      : board.subjectIncidence.filter((s) => s.subject === selectedSubjectFilter);

  return (
    <div className="space-y-6">
      {/* Banner Superior de Inteligência */}
      <div className="panel p-6 bg-gradient-to-r from-emerald-950/40 via-background to-background border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              >
                <BrainCircuit className="h-3.5 w-3.5 mr-1" />
                Motor de Análise de Bancas v2.4
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Base Atualizada 2026
              </Badge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-display">
              Raio-X Analítico de Bancas Examinadoras
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Mapeamento estatístico de incidência por matéria, distribuição de complexidade e o
              perfil comportamental de pegadinhas das maiores bancas da Carreira Fiscal (FGV,
              Cebraspe, FCC e Vunesp).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Card className="bg-background/80 backdrop-blur border-border/60 px-4 py-3 text-center min-w-[120px]">
              <p className="text-xs text-muted-foreground font-medium">Questões Mapeadas</p>
              <p className="text-xl font-bold text-emerald-400 font-mono">14.850+</p>
            </Card>
            <Card className="bg-background/80 backdrop-blur border-border/60 px-4 py-3 text-center min-w-[120px]">
              <p className="text-xs text-muted-foreground font-medium">Bancas Analisadas</p>
              <p className="text-xl font-bold text-foreground font-mono">4 Bancas</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Seleção da Banca Examinadora */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.values(EXAM_BOARDS_DATA).map((b) => {
          const isSelected = b.id === selectedBoardId;
          return (
            <button
              key={b.id}
              onClick={() => {
                setSelectedBoardId(b.id);
                setSelectedSubjectFilter("all");
              }}
              className={`panel p-4 text-left transition-all duration-200 cursor-pointer relative overflow-hidden flex flex-col justify-between space-y-3 ${
                isSelected
                  ? "border-emerald-500/60 bg-emerald-950/20 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30"
                  : "hover:border-border/80 hover:bg-muted/30 opacity-80 hover:opacity-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg font-display tracking-tight text-foreground">
                  {b.name}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    isSelected
                      ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {b.badge}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                {b.fullName}
              </p>
              <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-mono">Dificuldade:</span>
                <span
                  className={`font-semibold ${
                    b.overallDifficulty === "Extrema"
                      ? "text-red-400"
                      : b.overallDifficulty === "Muito Alta"
                        ? "text-orange-400"
                        : "text-amber-400"
                  }`}
                >
                  {b.overallDifficulty}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalhamento da Banca Selecionada */}
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                  {board.name}
                </Badge>
                <span className="text-sm font-medium text-muted-foreground">{board.fullName}</span>
              </div>
              <CardTitle className="text-xl font-bold font-display text-foreground mt-1">
                {board.tagline}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {board.style}
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs border border-border/40">
                <span className="text-muted-foreground">Tempo médio/questão: </span>
                <span className="font-mono font-bold text-foreground">
                  {board.averageTimePerQuestion}
                </span>
              </div>
              {board.penaltyForWrongAnswer && (
                <Badge variant="destructive" className="text-xs">
                  <ShieldAlert className="h-3 w-3 mr-1" />
                  Errada anula Certa
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="incidencia" className="w-full space-y-6">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="incidencia" className="text-xs">
                <PieChart className="h-3.5 w-3.5 mr-1.5" />
                Incidência por Matéria
              </TabsTrigger>
              <TabsTrigger value="armadilhas" className="text-xs">
                <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                Raio-X Pegadinhas
              </TabsTrigger>
              <TabsTrigger value="estrategia" className="text-xs">
                <Compass className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                Dicas do Coach
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: INCIDÊNCIA E COMPLEXIDADE */}
            <TabsContent value="incidencia" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna 1 e 2: Gráficos de Incidência por Matéria */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Layers className="h-4 w-4 text-emerald-400" />
                        Histórico de Incidência Estatística nas Provas
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Distribuição do volume de questões por matéria no perfil histórico da{" "}
                        {board.name}.
                      </p>
                    </div>

                    <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
                      <SelectTrigger className="w-[180px] text-xs h-8">
                        <SelectValue placeholder="Filtrar Matéria" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSubjects.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {s === "all" ? "Todas as Matérias" : s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4 pt-2">
                    {filteredIncidence.map((item) => (
                      <div
                        key={item.subject}
                        className="panel p-4 space-y-3 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {item.subject}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                item.relevance === "Alta"
                                  ? "border-red-500/30 text-red-400 bg-red-500/10"
                                  : item.relevance === "Média"
                                    ? "border-amber-500/30 text-amber-400 bg-amber-500/10"
                                    : "border-blue-500/30 text-blue-400 bg-blue-500/10"
                              }`}
                            >
                              Peso {item.relevance}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 font-mono text-xs">
                            <span className="text-muted-foreground">
                              {item.questionVolume} qst.
                            </span>
                            <span className="font-bold text-emerald-400 text-sm">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>

                        <Progress value={item.percentage * 3.5} className="h-2 bg-muted" />

                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="text-[11px] text-muted-foreground mr-1">
                            Tópicos Quentes:
                          </span>
                          {item.keyTopics.map((topic) => (
                            <Badge
                              key={topic}
                              variant="secondary"
                              className="text-[10px] font-normal bg-background/80"
                            >
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coluna 3: Distribuição de Dificuldade / Complexidade */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Target className="h-4 w-4 text-emerald-400" />
                      Distribuição de Dificuldade
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Proporção de questões por nível de complexidade.
                    </p>
                  </div>

                  <Card className="bg-muted/30 border-border/50">
                    <CardContent className="pt-6 space-y-4">
                      {/* Gauge / Cards */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Fácil (Questões Diretas)</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {board.complexityDistribution.facil}%
                            </span>
                          </div>
                          <Progress
                            value={board.complexityDistribution.facil}
                            className="h-2 bg-muted"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              Média (Conceito + Aplicação)
                            </span>
                            <span className="font-mono font-bold text-blue-400">
                              {board.complexityDistribution.media}%
                            </span>
                          </div>
                          <Progress
                            value={board.complexityDistribution.media}
                            className="h-2 bg-muted"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              Difícil (Casuística Extensa)
                            </span>
                            <span className="font-mono font-bold text-amber-400">
                              {board.complexityDistribution.dificil}%
                            </span>
                          </div>
                          <Progress
                            value={board.complexityDistribution.dificil}
                            className="h-2 bg-muted"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3 text-red-400" />
                              Pegadinha / Armadilha
                            </span>
                            <span className="font-mono font-bold text-red-400">
                              {board.complexityDistribution.pegadinha}%
                            </span>
                          </div>
                          <Progress
                            value={board.complexityDistribution.pegadinha}
                            className="h-2 bg-muted"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border/40 space-y-2">
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          Diagnóstico do Motor Aprovado Fiscal
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Para obter índice de aprovação na <strong>{board.name}</strong>, é
                          necessário dominar integralmente as questões de nível <em>Médio</em> e
                          gabaritar no mínimo 60% das questões de nível <em>Difícil / Pegadinha</em>
                          .
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Card Resumo de Desempenho do Aluno */}
                  <Card className="bg-emerald-950/20 border-emerald-500/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <FileCheck2 className="h-4 w-4" />
                        Seu Histórico na Banca {board.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Questões Resolvidas:</span>
                        <span className="font-mono font-bold text-foreground">142 questões</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Taxa de Acerto:</span>
                        <span className="font-mono font-bold text-emerald-400">76,8%</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground pt-1">
                        Seu desempenho está 12% acima da média da comunidade nesta banca.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: RAIO-X DE PEGADINHAS */}
            <TabsContent value="armadilhas" className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  Perfil Comportamental de Armadilhas da {board.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Análise qualitativa dos padrões de pegadinhas mais frequentes e como o Aprovado
                  Fiscal protege você.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {board.trapsAndTricks.map((trap, idx) => (
                  <Card
                    key={trap.title}
                    className="border-amber-500/20 bg-amber-950/10 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10"
                        >
                          Padrão #0{idx + 1}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold text-foreground leading-snug">
                        {trap.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground mt-1">
                        {trap.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                      <div className="bg-background/80 p-3 rounded-md text-xs border border-border/50 space-y-1">
                        <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                          Exemplo de Cenário da Banca:
                        </p>
                        <p className="text-muted-foreground italic leading-relaxed">
                          "{trap.exampleScenario}"
                        </p>
                      </div>

                      <div className="bg-emerald-950/30 p-3 rounded-md text-xs border border-emerald-500/20 space-y-1">
                        <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Dica de Blindagem Aprovado Fiscal:
                        </p>
                        <p className="text-foreground leading-relaxed">{trap.coachProtectionTip}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ABA 3: RECOMENDAÇÕES DO COACH */}
            <TabsContent value="estrategia" className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Compass className="h-4 w-4 text-emerald-400" />
                  Estratégia de Prova & Dicas do Coach IA
                </h3>
                <p className="text-xs text-muted-foreground">
                  Diretrizes táticas personalizadas para encarar o dia da prova da {board.name}.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {board.coachRecommendations.map((rec) => (
                  <Card key={rec.title} className="border-emerald-500/20 bg-muted/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4 text-emerald-400" />
                        {rec.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground leading-relaxed">{rec.advice}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
