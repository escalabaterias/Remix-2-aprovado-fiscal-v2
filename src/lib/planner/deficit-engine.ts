/**
 * ADAPTIVE DEFICIT ENGINE — Fase 7.7.2
 *
 * Sistema puro e determinístico de gestão adaptativa de dívida de estudo.
 *
 * PRINCÍPIOS:
 * 1. O déficit atua como um FATOR DE PRESSÃO / RECUPERAÇÃO GRADUAL, nunca
 *    reagendando todas as tarefas atrasadas em massa para o próximo dia.
 * 2. Elegibilidade de Dívida:
 *    - Concluída / Cancelada / Pulada / Futura -> Dívida = 0 min.
 *    - Atrasada Pendente (scheduled_date < today e status === 'pendente') -> Dívida = plannedMinutes - (actualMinutes || 0).
 * 3. Recuperação Gradual Pacer:
 *    - O déficit acumulado por matéria/tópico gera um deficitBoost (0..1.5) no score do candidato.
 *    - O boost de déficit eleva a prioridade relativa no Planner/Scheduler, garantindo que o tópico
 *      seja sorteado com prioridade nos slots dos dias seguintes, respeitando a capacidade diária.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type OverdueTaskInfo = {
  id: string;
  subjectId: string;
  topicId?: string | null;
  scheduledDate: string;
  plannedMinutes: number;
  actualMinutes?: number | null;
  status: "pendente" | "concluida" | "cancelada" | "pulada";
};

export type SubjectDeficitSummary = {
  subjectId: string;
  totalDeficitMinutes: number;
  topicDeficits: Map<string, number>;
  overdueTaskCount: number;
};

export type DeficitBoostInput = {
  subjectId: string;
  topicId?: string | null;
  subjectDeficits: Map<string, SubjectDeficitSummary>;
  weeklyCapacityMinutes: number;
};

export type DeficitBoostResult = {
  deficitBoost: number;
  deficitMinutes: number;
  reason: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

/** Boost máximo de déficit aplicável a um candidato (1.5) */
export const MAX_DEFICIT_BOOST = 1.5;

/** Fator de amortecimento semanal (ex: recuperar a dívida ao longo de ~2 semanas / 14 dias) */
export const RECOVERY_PACING_WEEKS = 2;

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES PURAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Agrupa tarefas atrasadas elegíveis e calcula o déficit em minutos por matéria e tópico.
 *
 * @param tasks Lista de tarefas de histórico
 * @param todayDate Data de referência YYYY-MM-DD
 */
export function computeDeficitSummaries(
  tasks: OverdueTaskInfo[],
  todayDate: string,
): Map<string, SubjectDeficitSummary> {
  const summaries = new Map<string, SubjectDeficitSummary>();

  if (!tasks || tasks.length === 0) return summaries;

  for (const t of tasks) {
    if (!t || !t.subjectId) continue;

    // Apenas tarefas do passado que permaneceram pendentes são dívida real
    const isOverdue = t.scheduledDate < todayDate;
    const isRealPending = t.status === "pendente";

    if (!isOverdue || !isRealPending) continue;

    const planned = Math.max(0, t.plannedMinutes || 0);
    const actual = Math.max(0, t.actualMinutes || 0);
    const remainingDeficit = Math.max(0, planned - actual);

    if (remainingDeficit <= 0) continue;

    let summary = summaries.get(t.subjectId);
    if (!summary) {
      summary = {
        subjectId: t.subjectId,
        totalDeficitMinutes: 0,
        topicDeficits: new Map<string, number>(),
        overdueTaskCount: 0,
      };
      summaries.set(t.subjectId, summary);
    }

    summary.totalDeficitMinutes += remainingDeficit;
    summary.overdueTaskCount += 1;

    if (t.topicId) {
      const currentTopicDeficit = summary.topicDeficits.get(t.topicId) ?? 0;
      summary.topicDeficits.set(t.topicId, currentTopicDeficit + remainingDeficit);
    }
  }

  return summaries;
}

/**
 * Calcula o boost suave de prioridade (0..1.5) baseado no déficit acumulado.
 *
 * @param input Dados da matéria/tópico e capacidade semanal
 */
export function computeDeficitBoost(input: DeficitBoostInput): DeficitBoostResult {
  const { subjectId, topicId, subjectDeficits, weeklyCapacityMinutes } = input;

  const summary = subjectDeficits.get(subjectId);
  if (!summary || summary.totalDeficitMinutes <= 0) {
    return {
      deficitBoost: 0,
      deficitMinutes: 0,
      reason: null,
    };
  }

  // Determina minutos de déficit do tópico específico ou da matéria
  let deficitMinutes = summary.totalDeficitMinutes;
  let isTopicLevel = false;

  if (topicId && summary.topicDeficits.has(topicId)) {
    deficitMinutes = summary.topicDeficits.get(topicId)!;
    isTopicLevel = true;
  }

  if (deficitMinutes <= 0) {
    return {
      deficitBoost: 0,
      deficitMinutes: 0,
      reason: null,
    };
  }

  // Pacing: compara o déficit com a capacidade semanal disponível
  const safeCapacity = Math.max(120, weeklyCapacityMinutes || 600);
  const targetWeeklyRecoveryCapacity = safeCapacity * 0.3; // No máximo ~30% da semana para recuperação de déficit

  // Razão de pressão de déficit
  const pressureRatio = deficitMinutes / (targetWeeklyRecoveryCapacity * RECOVERY_PACING_WEEKS);

  // Boost suave proporcional limitado ao teto MAX_DEFICIT_BOOST (1.5)
  const rawBoost = pressureRatio * MAX_DEFICIT_BOOST;
  const deficitBoost = Number(Math.min(MAX_DEFICIT_BOOST, Math.max(0, rawBoost)).toFixed(2));

  const levelStr = isTopicLevel ? "tópico" : "matéria";
  const reason = `Déficit acumulado no ${levelStr} (${deficitMinutes} min atrasados) -> boost de recuperação de +${deficitBoost}.`;

  return {
    deficitBoost,
    deficitMinutes,
    reason,
  };
}
