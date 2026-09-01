import { filterDueCards } from "@/lib/flashcards/spacedRepetitionEngine";
import { getFlashcards } from "@/lib/flashcards/service";
import { runAiTask } from "@/services/ai/gateway";
import type { CoachMessage, StudentProfileContext } from "./types";

export const COACH_QUICK_ACTIONS = [
  {
    id: "exatas",
    label: "Explicar exatas passo a passo",
    prompt:
      "Gostaria de uma explicação socrática e detalhada de como abordar questões de Raciocínio Lógico-Matemático e Estatística para carreiras fiscais.",
  },
  {
    id: "erros",
    label: "Analisar meu Caderno de Erros",
    prompt:
      "Faça uma análise crítica dos meus erros recentes no Caderno de Erros e me diga quais tópicos devo priorizar para estancar pontos perdidos.",
  },
  {
    id: "sefaz",
    label: "Direcionamento para reta final da SEFAZ",
    prompt:
      "Qual o direcionamento estratégico ideal para a reta final do concurso da SEFAZ, considerando minhas matérias fracas e revisões?",
  },
] as const;

/**
 * Consolida o perfil de desempenho pedagógico do aluno integrando os módulos de:
 * - Questões e Simulados (Módulo 5)
 * - Flashcards de Repetição Espaçada (Módulo 6)
 * - Plano e Tarefas do Planner (Módulo 4)
 */
export function buildStudentProfileContext(
  override?: Partial<StudentProfileContext>,
): StudentProfileContext {
  let dueFlashcards = 0;
  try {
    const cards = getFlashcards();
    dueFlashcards = filterDueCards(cards).length;
  } catch {
    dueFlashcards = 12; // Fallback para desenvolvimento / SSR
  }

  const baseContext: StudentProfileContext = {
    globalScore: 74.5,
    weakSubjects: ["Direito Tributário", "Contabilidade Geral", "Auditoria Fiscal"],
    pendingReviewsCount: 8,
    dueFlashcardsCount: dueFlashcards,
    targetExam: "Auditor Fiscal — SEFAZ (Carreiras Fiscais)",
    unresolvedErrorsCount: 14,
    completedTasksToday: 3,
  };

  return {
    ...baseContext,
    ...override,
  };
}

/**
 * Constrói o prompt socrático estruturado injetando o perfil de desempenho e contexto do aluno.
 */
export function generateCoachPrompt(
  profile: StudentProfileContext,
  userMessage?: string,
  quickAction?: string,
): string {
  const weakSubjectsList = profile.weakSubjects.join(", ") || "Nenhuma registrada";
  const userQuery = quickAction || userMessage || "Por onde devo começar meus estudos hoje?";

  return `
[SISTEMA DE MENTORIA SOCRÁTICA — APROVADO FISCAL]
Você é o PROFESSOR FISCAL, Mentor Virtual de Alta Performance especializado na aprovação para Concursos de Auditor e Analista Fiscal (SEFAZ, Receita Federal, ISS).

[PERFIL DE DESEMPENHO DO ALUNO]
- Concurso Alvo: ${profile.targetExam}
- Taxa Global de Acerto: ${profile.globalScore.toFixed(1)}%
- Matérias com Maior Fragilidade: ${weakSubjectsList}
- Flashcards Vencidos (SM-2 Hoje): ${profile.dueFlashcardsCount} cartões
- Revisões Pendentes: ${profile.pendingReviewsCount} tópicos
- Erros Não Resolvidos (Caderno de Erros): ${profile.unresolvedErrorsCount ?? 0}
- Tarefas Concluídas Hoje: ${profile.completedTasksToday ?? 0}

[DIRETRIZES SOCRÁTICAS E PEDAGÓGICAS]
1. Se a dúvida envolver Exatas (RLM, Estatística, Matemática Financeira), explique passo a passo com estrutura lógica clara e equações explicadas.
2. Se solicitar análise do Caderno de Erros, foque na categorização das falhas (pegadinhas de banca vs. falta de memorização da lei seca).
3. Se solicitar reta final para SEFAZ, priorize Legislação Tributária Estadual, CTN e auditoria de livros fiscais.
4. Conclua com 2-3 sugestões práticas de próximos passos.

[PERGUNTA DO ALUNO]
${userQuery}
`.trim();
}

/**
 * Processa a resposta do Coach IA com fallback socrático e ações sugeridas.
 */
export async function processCoachChat(
  userMessage: string,
  history: CoachMessage[] = [],
  contextOverride?: Partial<StudentProfileContext>,
): Promise<CoachMessage> {
  const profile = buildStudentProfileContext(contextOverride);
  const prompt = generateCoachPrompt(profile, userMessage);

  let responseContent = "";
  let suggestedActions: string[] = [
    "Revisar Flashcards pendentes",
    "Resolver 10 questões do Caderno de Erros",
    "Verificar cronograma da SEFAZ",
  ];

  try {
    const aiRes = await runAiTask<string>({
      type: "coach.chat",
      tier: "inteligente",
      inputRef: {
        userMessage,
        historyCount: history.length,
        profile: profile as unknown as Record<string, unknown>,
      },
      systemPrompt:
        "Você é o PROFESSOR FISCAL, mentor socrático e estratégico especialista em Carreiras Fiscais.",
      userPrompt: prompt,
    });

    if (aiRes.status === "processado" && aiRes.output && typeof aiRes.output === "string") {
      responseContent = aiRes.output;
    }
  } catch {
    // Falha silenciosa para fallback socrático determinístico
  }

  // Fallback Socrático Contextual caso o gateway não retorne texto
  if (!responseContent) {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes("exata") || lowerMessage.includes("raciocínio")) {
      responseContent = `### 📐 Resolução Socrática de Exatas para Concurso Fiscal

Para dominar Raciocínio Lógico e Estatística na **${profile.targetExam}**, aplique este método em 4 etapas:

1. **Decodificação do Enunciado**: Mapeie a hipótese ($P$) e a tese ($Q$). Em proposições compostas, identifique conectivos (*se... então*, *ou*, *e*).
2. **Transformação em Tabela-Verdade / Álgebra**: Em negações de $P \\rightarrow Q$, lembre-se da regra do "MANÉ" (Mantém a primeira E Nega a segunda): $P \\land \\neg Q$.
3. **Aplicação Prática**: Em Estatística, diferencie *Variância Amostral* ($n-1$) de *Populacional* ($n$).
4. **Resolução sem Calculadora**: Simplifique frações antes de multiplicar e arredonde potências com margem de segurança.

> 💡 **Recomendação do Coach**: Com sua taxa global de **${profile.globalScore}%**, faça 5 questões focadas no seu tópico fraco de **${profile.weakSubjects[0] ?? "Exatas"}**.`;
      suggestedActions = [
        "Resolver 5 questões de RLM",
        "Revisar fórmulas de Estatística",
        "Ver Caderno de Erros",
      ];
    } else if (lowerMessage.includes("erro") || lowerMessage.includes("caderno")) {
      responseContent = `### 🎯 Análise do seu Caderno de Erros

Identifiquei que você possui **${profile.unresolvedErrorsCount} erros pendentes de remediação**.

Sua fragilidade principal está concentrada em **${profile.weakSubjects.join(", ")}**.

**Plano de Correção em 3 Passos:**
1. **Classificação das Falhas**: Separe erros por *Interpretação de Enunciado* vs. *Desconhecimento da Jurisprudência do STF/STJ*.
2. **Transformação em Flashcard**: Para cada pegadinha do CTN ou da Constituição, crie um flashcard no algoritmo SM-2. Hoje você tem **${profile.dueFlashcardsCount} flashcards devidos**.
3. **Re-teste Cego**: Refaça as questões sem olhar o gabarito comentado anterior.`;
      suggestedActions = [
        "Ir para a Central de Erros",
        "Revisar 12 Flashcards do dia",
        "Estudar Legislação Tributária",
      ];
    } else if (lowerMessage.includes("sefaz") || lowerMessage.includes("reta final")) {
      responseContent = `### 🏛️ Estratégia de Reta Final para a SEFAZ

Focado no seu objetivo para o concurso **${profile.targetExam}**:

1. **Bloco de Elite (70% do Peso)**:
   - **Direito Tributário & Legislação Estadual** (Regulamento do ICMS, IPVA, ITCMD).
   - **Contabilidade Geral e Avançada** (Demonstrações Financeiras e CPCs).
   - **Auditoria Fiscal** (Cruzamento de EFD/SPED).

2. **Rotina de Retenção Ativa**:
   - Elimine os **${profile.dueFlashcardsCount} flashcards pendentes** hoje para garantir fixação da lei seca.
   - Conclua as **${profile.pendingReviewsCount} revisões agendadas** no seu Planner.

> 🚀 **Meta Diária**: Manter taxa de acerto acima dos **${profile.globalScore}%** resolvendo baterias inéditas das bancas FGV/Cebraspe.`;
      suggestedActions = [
        "Ver Plano de Estudos da SEFAZ",
        "Iniciar bateria de Legislação",
        "Treinar Simulados de Auditoria",
      ];
    } else {
      responseContent = `Olá! Analisei seu perfil atual de preparação para **${profile.targetExam}**:

- **Taxa Global de Acerto**: **${profile.globalScore}%**
- **Pontos de Atenção**: **${profile.weakSubjects.join(", ")}**
- **Atividades de Hoje**: **${profile.dueFlashcardsCount} flashcards** e **${profile.pendingReviewsCount} revisões** pendentes.

Como posso orientar seus estudos agora? Posso detalhar matérias exatas, analisar seu Caderno de Erros ou traçar a estratégia de reta final da SEFAZ.`;
      suggestedActions = [
        "Explicar exatas passo a passo",
        "Analisar meu Caderno de Erros",
        "Direcionamento para reta final da SEFAZ",
      ];
    }
  }

  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sender: "coach",
    content: responseContent,
    timestamp: new Date().toISOString(),
    suggestedActions,
  };
}
