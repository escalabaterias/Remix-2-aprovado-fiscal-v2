/**
 * ADAPTIVE DELTA ENGINE — Fase 7.7.3 (Anti-Churn / Estabilidade de Agenda)
 *
 * Sistema puro e determinístico que protege a agenda do aluno contra churn,
 * evitando reagendamentos e reconstruções desnecessárias por pequenas
 * oscilações de prioridade/score.
 *
 * REGRAS:
 * 1. Mudança Pequena (Delta < 15% de score, mesma janela temporal) -> PRESERVA a tarefa agendada.
 * 2. Mudança Relevante (Delta >= 15%, nova data com desvio > 2 dias) -> PERMITE replanejamento.
 * 3. Exceção de Urgência Pedagógica Crítica:
 *    - Revisão urgente (urgency >= 0.8)
 *    - Ponto Crítico de conhecimento
 *    - Mudança expressiva de disponibilidade
 *    NUNCA são bloqueadas pela estabilidade — justificam a atualização imediata.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export type ScheduledTaskRecord = {
  id: string;
  planId: string;
  topicId?: string | null;
  subjectId?: string | null;
  activity: string;
  scheduledDate: string;
  plannedMinutes: number;
  priorityScore: number;
  status: string;
};

export type CandidateTaskRecord = {
  topicId?: string | null;
  subjectId?: string | null;
  activity: string;
  scheduledDate: string;
  plannedMinutes: number;
  priorityScore: number;
  isUrgent?: boolean;
  isCritical?: boolean;
};

export type DeltaActionKind = "preserve" | "replace" | "add" | "remove";

export type TaskDeltaDecision = {
  action: DeltaActionKind;
  existingTaskId?: string;
  candidateTask?: CandidateTaskRecord;
  scoreDeltaPct: number;
  dateDiffDays: number;
  reason: string;
};

export type ReconcilePlanInput = {
  existingPendingTasks: ScheduledTaskRecord[];
  newCandidateTasks: CandidateTaskRecord[];
  deltaThresholdPct?: number; // Padrão 0.15 (15%)
  maxDateDriftDays?: number; // Padrão 2 dias
};

export type ReconcilePlanResult = {
  tasksToKeep: ScheduledTaskRecord[];
  tasksToDelete: string[]; // IDs
  tasksToInsert: CandidateTaskRecord[];
  decisions: TaskDeltaDecision[];
  preservedCount: number;
  replacedCount: number;
  insertedCount: number;
  deletedCount: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_DELTA_SCORE_THRESHOLD = 0.15; // 15%
export const DEFAULT_MAX_DATE_DRIFT_DAYS = 2; // 2 dias

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS E MOTOR PURAS
// ─────────────────────────────────────────────────────────────────────────────

function daysBetweenDates(d1: string, d2: string): number {
  if (!d1 || !d2) return 0;
  const t1 = new Date(d1).getTime();
  const t2 = new Date(d2).getTime();
  if (isNaN(t1) || isNaN(t2)) return 0;
  return Math.abs(Math.round((t2 - t1) / (1000 * 60 * 60 * 24)));
}

/**
 * Avalia se uma alteração individual entre uma tarefa agendada e um novo candidato é relevante.
 */
export function evaluateTaskDelta(
  existing: ScheduledTaskRecord,
  candidate: CandidateTaskRecord,
  thresholdPct = DEFAULT_DELTA_SCORE_THRESHOLD,
  maxDriftDays = DEFAULT_MAX_DATE_DRIFT_DAYS,
): TaskDeltaDecision {
  const oldScore = Math.max(0.01, existing.priorityScore || 0);
  const newScore = Math.max(0.01, candidate.priorityScore || 0);

  const rawDelta = Math.abs(newScore - oldScore);
  const scoreDeltaPct = Number((rawDelta / oldScore).toFixed(4));

  const dateDiffDays = daysBetweenDates(existing.scheduledDate, candidate.scheduledDate);

  // Exceção de prioridade crítica pedagógica
  if (candidate.isUrgent || candidate.isCritical) {
    return {
      action: "replace",
      existingTaskId: existing.id,
      candidateTask: candidate,
      scoreDeltaPct,
      dateDiffDays,
      reason: "Prioridade pedagógica crítica/urgente força atualização imediata.",
    };
  }

  // Desvio de data superior ao limite de estabilidade (ex: > 2 dias)
  if (dateDiffDays > maxDriftDays) {
    return {
      action: "replace",
      existingTaskId: existing.id,
      candidateTask: candidate,
      scoreDeltaPct,
      dateDiffDays,
      reason: `Desvio de data (${dateDiffDays} dias) excede tolerância de estabilidade (${maxDriftDays} dias).`,
    };
  }

  // Variação de score superior ao limiar de relevância (ex: >= 15%)
  if (scoreDeltaPct >= thresholdPct) {
    return {
      action: "replace",
      existingTaskId: existing.id,
      candidateTask: candidate,
      scoreDeltaPct,
      dateDiffDays,
      reason: `Variação de prioridade/score (${(scoreDeltaPct * 100).toFixed(1)}%) excede limiar (${(thresholdPct * 100).toFixed(1)}%).`,
    };
  }

  // Caso contrário: Mudança pequena -> Preserva a tarefa existente para estabilidade
  return {
    action: "preserve",
    existingTaskId: existing.id,
    candidateTask: candidate,
    scoreDeltaPct,
    dateDiffDays,
    reason: `Variação irrelevante (${(scoreDeltaPct * 100).toFixed(1)}%, ${dateDiffDays}d desvio). Tarefa preservada contra churn.`,
  };
}

/**
 * Reconcilia a lista de tarefas pendentes existentes contra o novo candidato gerado pelo Planner.
 *
 * @param input Tarefas existentes e novos candidatos
 * @returns ReconcilePlanResult com ações claras (preservar, substituir, inserir, deletar)
 */
export function reconcilePlanDelta(input: ReconcilePlanInput): ReconcilePlanResult {
  const {
    existingPendingTasks,
    newCandidateTasks,
    deltaThresholdPct = DEFAULT_DELTA_SCORE_THRESHOLD,
    maxDateDriftDays = DEFAULT_MAX_DATE_DRIFT_DAYS,
  } = input;

  const tasksToKeep: ScheduledTaskRecord[] = [];
  const tasksToDelete: string[] = [];
  const tasksToInsert: CandidateTaskRecord[] = [];
  const decisions: TaskDeltaDecision[] = [];

  let preservedCount = 0;
  let replacedCount = 0;
  let insertedCount = 0;
  let deletedCount = 0;

  // Mapa de tarefas existentes por chave única (topicId_activity)
  const existingMap = new Map<string, ScheduledTaskRecord[]>();
  for (const task of existingPendingTasks) {
    const key = `${task.topicId || task.subjectId || "gen"}_${task.activity}`;
    const list = existingMap.get(key) ?? [];
    list.push(task);
    existingMap.set(key, list);
  }

  const matchedExistingIds = new Set<string>();

  // Processa cada novo candidato
  for (const candidate of newCandidateTasks) {
    const key = `${candidate.topicId || candidate.subjectId || "gen"}_${candidate.activity}`;
    const availableExisting = existingMap.get(key) ?? [];

    // Tenta encontrar uma tarefa existente idêntica ainda não pareada
    const match = availableExisting.find((e) => !matchedExistingIds.has(e.id));

    if (match) {
      matchedExistingIds.add(match.id);
      const decision = evaluateTaskDelta(match, candidate, deltaThresholdPct, maxDateDriftDays);
      decisions.push(decision);

      if (decision.action === "preserve") {
        tasksToKeep.push(match);
        preservedCount++;
      } else {
        // Replace
        tasksToDelete.push(match.id);
        tasksToInsert.push(candidate);
        replacedCount++;
      }
    } else {
      // Sem correspondência -> Nova tarefa a inserir
      tasksToInsert.push(candidate);
      insertedCount++;
      decisions.push({
        action: "add",
        candidateTask: candidate,
        scoreDeltaPct: 0,
        dateDiffDays: 0,
        reason: "Conteúdo novo adicionado ao plano.",
      });
    }
  }

  // Quaisquer tarefas existentes que não foram correspondidas no novo plano devem ser deletadas
  for (const existing of existingPendingTasks) {
    if (!matchedExistingIds.has(existing.id)) {
      tasksToDelete.push(existing.id);
      deletedCount++;
      decisions.push({
        action: "remove",
        existingTaskId: existing.id,
        scoreDeltaPct: 0,
        dateDiffDays: 0,
        reason: "Conteúdo removido no novo planejamento.",
      });
    }
  }

  return {
    tasksToKeep,
    tasksToDelete,
    tasksToInsert,
    decisions,
    preservedCount,
    replacedCount,
    insertedCount,
    deletedCount,
  };
}
