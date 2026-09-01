import { GapDiagnostic } from "../analytics/types";
import { CoachPersona, AdaptiveExplanation, CoachTone, ExplanationType } from "./types";

/**
 * Motor de Inteligência e Personalidade do Coach Fiscal Socrático
 */

/**
 * Determina a Persona ideal do Coach baseando-se no diagnóstico de rendimento do estudante
 */
export function determineCoachPersona(
  gapDiagnostics: GapDiagnostic[],
  recentWrongCount: number,
): CoachPersona {
  // Se o aluno está com dificuldades muito profundas (ex: mais de 2 lacunas de severidade alta ou muitos erros recentes)
  if (
    recentWrongCount >= 5 ||
    gapDiagnostics.some((g) => g.severity === "high" && g.accuracy < 0.4)
  ) {
    return {
      tone: "encouraging",
      resilienceLevel: 90,
      empathyScore: 95,
    };
  }

  // Se o aluno tem erros concentrados em falta de atenção, estratégia ou velocidade,
  // ou se ele já tem um bom rendimento, usamos o tom socrático-desafiador
  const hasAttentionGaps = gapDiagnostics.some(
    (g) => g.primaryErrorCategory === "atencao" || g.primaryErrorCategory === "estrategia",
  );
  if (hasAttentionGaps || gapDiagnostics.length === 0) {
    return {
      tone: "socratic",
      resilienceLevel: 80,
      empathyScore: 85,
    };
  }

  // Para outros cenários de rendimento regular, priorizamos a abordagem analítica
  return {
    tone: "analytical",
    resilienceLevel: 75,
    empathyScore: 70,
  };
}

/**
 * Mapeia e gera explicações adaptativas ricas de acordo com a matéria de estudo e seu diagnóstico associado
 */
export function generateAdaptiveExplanation(
  subjectId: string,
  topicName: string,
  persona: CoachPersona,
  gapDiagnostic?: GapDiagnostic,
): AdaptiveExplanation {
  const isExatas =
    ["RLM", "ESTAT", "FINANC", "EXATAS"].includes(subjectId.toUpperCase()) ||
    topicName.toLowerCase().includes("cálculo") ||
    topicName.toLowerCase().includes("matemática");

  const isDireitoOuContabilidade = [
    "DIR-TRIB",
    "DIR-CONST",
    "CONTAB",
    "DIR-ADM",
    "LEGISLACAO",
  ].includes(subjectId.toUpperCase());

  // 1. TRATAMENTO PARA DISCIPLINAS DE EXATAS: Passo a passo visual sem saltos conceituais
  if (isExatas) {
    const stepsMarkdown = `
### 📊 Resolução Visual Passo a Passo — ${topicName}

Não vamos queimar etapas. Vamos montar o raciocínio em uma tabela estruturada para visualizar a passagem das variáveis:

| Passo | Operação Lógica | Fórmula Aplicada | Resultado Parcial | Objetivo do Passo |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Mapeamento dos Dados | Coleta de Enunciado | $P = 1500$, $i = 2\\%$, $n = 3$ | Listar o ponto de partida |
| **2** | Conversão de Taxas | $i_{decimal} = i / 100$ | $i = 0,02$ ao mês | Compatibilizar unidades |
| **3** | Aplicação do Fator | $(1 + i)^n$ | $(1,02)^3 = 1,061208$ | Calcular os juros compostos acumulados |
| **4** | Montagem do Montante | $M = P \\times (1 + i)^n$| $1500 \\times 1,061208 = 1591,81$ | Chegar ao valor acumulado final |

**Visualização do Fluxo de Caixa:**
\`\`\`
[ M = 1.500,00 ] ───( Mês 1: +2% )───> [ 1.530,00 ] ───( Mês 2: +2% )───> [ 1.560,60 ] ───( Mês 3: +2% )───> [ M = 1.591,81 ]
\`\`\`
    `;

    return {
      type: "visual_step_by_step",
      title: `Como resolver visualmente: ${topicName}`,
      content: stepsMarkdown.trim(),
      interactivePrompt:
        persona.tone === "socratic"
          ? "Se a taxa de juros subisse para 3%, de quanto seria o efeito acumulado no mês 2? Pense de forma incremental."
          : "Tente resolver uma questão similar aplicando exatamente esta mesma tabela estruturada de variáveis.",
    };
  }

  // 2. TRATAMENTO PARA DIREITO E CONTABILIDADE: Ancoragem em Casos Práticos do Auditor
  if (isDireitoOuContabilidade) {
    let practicalCase = "";

    if (subjectId.toUpperCase() === "DIR-TRIB") {
      practicalCase = `
### 💼 Caso Prático do Auditor Fiscal: Auto de Infração no Mercado de Bebidas

Imagine que você, como **Auditor Fiscal da SEFAZ**, está realizando uma fiscalização de rotina em uma grande distribuidora de bebidas. Você se depara com a seguinte situação prática:
- A distribuidora adquiriu mercadoria sob o regime de **Substituição Tributária (ST)**.
- O imposto foi recolhido antecipadamente com base em uma Margem de Valor Agregado (MVA) presumida de 40%.
- Porém, na venda real aos supermercados locais, a distribuidora praticou um sobrepreço de 60%.

**A Lógica do Auditor:**
De acordo com o entendimento consolidado do STF (Recurso Extraordinário 593.849), o contribuinte tem direito à restituição do ICMS pago a maior sob o regime de ST, caso a base de cálculo real da operação seja inferior à presumida. Pelo princípio da simetria, se for superior (vendeu por 60% e recolheu por 40%), o Estado também pode fiscalizar e exigir a complementação?

> *Lembre-se do Art. 150, §7º da CF/88:* A lei poderá atribuir a sujeito passivo de obrigação tributária a condição de responsável pelo pagamento de imposto cujo fato gerador deva ocorrer posteriormente, assegurada a imediata e preferencial restituição da quantia paga, caso não se realize o fato gerador presumido.
      `;
    } else {
      practicalCase = `
### 💼 Caso Prático do Auditor Fiscal: Autuação de Inventário de Estoque

Você, como **Auditor Fiscal**, entra no galpão de logística de uma varejista de eletrônicos e confronta o Livro Registro de Inventário físico com o balancete contábil da conta Estoques de Mercadorias.
- Constatação: Diferença física inexplicada de 500 smartphones de última geração.
- Lógica de Auditoria Fiscal: Estoque a menor sem justificativa fiscal configura saída de mercadoria sem emissão de documento fiscal (sonegação de ICMS).
- Você deve lavrar o auto de infração cobrando o imposto correspondente mais a multa qualificada de 100%.
      `;
    }

    return {
      type: "practical_case",
      title: `Aplicação Prática no Cotidiano: ${topicName}`,
      content: practicalCase.trim(),
      interactivePrompt:
        persona.tone === "socratic"
          ? "Diante desse caso da distribuidora de bebidas, se ela comprovar que vendeu abaixo da margem presumida por perda de estoque, como você fundamentaria juridicamente a restituição?"
          : "Compreendeu como a teoria fiscal se transforma em autuação no dia a dia? Memorize esse caso para a prova discursiva!",
    };
  }

  // 3. TRATAMENTO DE RECORDAÇÃO ATIVA (Active Recall) PARA OUTROS CASOS
  return {
    type: "active_recall",
    title: `Flashcard Ativo: ${topicName}`,
    content: `
### 🧠 Desafio de Recordação Ativa — ${topicName}

Não leia apenas a teoria passivamente. Tente responder mentalmente ou em voz alta antes de revelar a resposta:

1. **Qual é o núcleo de validade deste tópico de estudo?**
2. **Quais são os 3 requisitos ou exceções mais cobrados pelas bancas de concurso?**
3. **De que maneira a banca costuma inverter o conceito para criar pegadinhas?**
    `.trim(),
    interactivePrompt:
      "Conseguiu responder aos 3 pontos sem olhar seus resumos? Esse esforço cognitivo dobra a taxa de fixação na sua memória de longo prazo!",
  };
}

/**
 * Recomenda a melhor técnica de estudos baseando-se no histórico de retenção/acertos por matéria
 */
export function getRecommendedMethod(
  subjectId: string,
  gapDiagnostics: GapDiagnostic[],
): ExplanationType {
  const isExatas = ["RLM", "ESTAT", "FINANC", "EXATAS"].includes(subjectId.toUpperCase());
  if (isExatas) return "visual_step_by_step";

  // Se o aluno tem muitas lacunas por esquecimento, recomendamos Recall Ativo
  const forgetfulnessCount = gapDiagnostics.filter(
    (g) => g.subjectId === subjectId && g.primaryErrorCategory === "esquecimento",
  ).length;

  if (forgetfulnessCount >= 2) {
    return "active_recall";
  }

  return "practical_case";
}
