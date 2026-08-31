/**
 * CONTEXT BUILDER — Coach de IA Proativo (Fase 7.2.1)
 *
 * Transforma dados brutos dos motores determinísticos (Diagnosis, Review,
 * Error Central, Scheduler/Planner, Prerequisites, Contest Topics) em um
 * `CoachContext` compacto, sanitizado e multidimensional.
 *
 * REGRA: Não inclui tokens, chaves, dados pessoais desnecessários nem
 * bancos de dados extensos.
 */

import type { DiagnosisWithMeta } from "@/lib/diagnosis/service";
import type { ReviewQueueItem } from "@/lib/review/service";
import type { TopicErrorSummaryWithMeta } from "@/lib/error-central/service";
import type { CoachContext, PrerequisiteDependencySummary, UrgentReviewSummary } from "./types";

export type RawPrerequisite = {
  topic_id: string;
  prerequisite_topic_id: string;
  topic_name?: string;
  prerequisite_topic_name?: string;
  prerequisite_mastery?: number | null;
};

export type RawContestTopic = {
  topic_id: string;
  topic_name: string;
  subject_name: string;
  weight: number | null;
  incidence_score: number | null;
  relevance_score: number | null;
  in_edital: boolean | null;
};

export type RawPedagogicalData = {
  diagnoses?: DiagnosisWithMeta[];
  reviewQueue?: ReviewQueueItem[];
  errorSummaries?: TopicErrorSummaryWithMeta[];
  prerequisites?: RawPrerequisite[];
  contestTopics?: RawContestTopic[];
  todayTasks?: Array<{
    title: string;
    activity_type: string | null;
    planned_minutes: number | null;
    actual_minutes: number | null;
    status: string;
    topic_name?: string;
  }>;
  activeContest?: {
    name: string;
    examDate?: string | null;
  } | null;
};

/**
 * Constrói um CoachContext otimizado e multidimensional a partir dos dados pedagógicos.
 */
export function buildCoachContext(data: RawPedagogicalData): CoachContext {
  const diagnoses = data.diagnoses ?? [];
  const reviewQueue = data.reviewQueue ?? [];
  const errorSummaries = data.errorSummaries ?? [];
  const rawPrereqs = data.prerequisites ?? [];
  const rawContestTopics = data.contestTopics ?? [];
  const todayTasks = data.todayTasks ?? [];

  // Indexar dados de concurso por topic_id
  const contestTopicsMap = new Map<string, RawContestTopic>();
  for (const ct of rawContestTopics) {
    if (ct.topic_id) {
      contestTopicsMap.set(ct.topic_id, ct);
    }
  }

  // 1. Processar Pré-requisitos e Dependências entre Tópicos
  const unmetPrereqsMap = new Map<string, string[]>();
  const unmetPrereqSummaries: PrerequisiteDependencySummary[] = [];
  const blockedTopicNamesSet = new Set<string>();

  for (const p of rawPrereqs) {
    const mastery = p.prerequisite_mastery != null ? Math.round(p.prerequisite_mastery * 100) : 0;
    const isMastered = (p.prerequisite_mastery ?? 0) >= 0.5;

    if (!isMastered) {
      const topicName = p.topic_name || p.topic_id;
      const prereqName = p.prerequisite_topic_name || p.prerequisite_topic_id;

      const list = unmetPrereqsMap.get(p.topic_id) ?? [];
      list.push(prereqName);
      unmetPrereqsMap.set(p.topic_id, list);

      blockedTopicNamesSet.add(topicName);

      unmetPrereqSummaries.push({
        topicId: p.topic_id,
        topicName,
        prerequisiteTopicId: p.prerequisite_topic_id,
        prerequisiteTopicName: prereqName,
        prerequisiteMasteryPercent: mastery,
        isPrerequisiteMastered: false,
      });
    }
  }

  // 2. Processar Diagnósticos (Tópicos Críticos e em Alerta) com Sinais Multidimensionais
  const criticalTopics = diagnoses.filter(
    (d) => d.state === "CRITICO" || d.priority === "URGENCIA_MAXIMA",
  );
  const alertTopics = diagnoses.filter(
    (d) => d.state === "EM_ALERTA" || d.priority === "REVISAO_PRIORITARIA",
  );

  const topCriticalTopics = criticalTopics.slice(0, 5).map((d) => {
    const unmetPrereqs = unmetPrereqsMap.get(d.topicId);
    const contestData = contestTopicsMap.get(d.topicId);

    return {
      topicId: d.topicId,
      topicName: d.topicName,
      subjectName: d.subjectName,
      state: d.state,
      priority: d.priority,
      intervention: d.recommendedIntervention,
      masteryPercent: Math.round(d.scores.mastery * 100),
      confidencePercent: Math.round(d.scores.confidence * 100),
      decayRiskPercent:
        d.scores.decayRisk != null ? Math.round(d.scores.decayRisk * 100) : undefined,
      errorRecencyDays:
        d.scores.errorRecency != null ? Math.round(d.scores.errorRecency * 30) : null,
      accuracyPercent:
        d.signals?.accuracy != null ? Math.round(d.signals.accuracy * 100) : undefined,
      unresolvedErrorsCount: d.signals?.unresolvedErrors ?? 0,
      hasUnmetPrerequisites: Boolean(unmetPrereqs && unmetPrereqs.length > 0),
      unmetPrerequisitesCount: unmetPrereqs ? unmetPrereqs.length : 0,
      unmetPrerequisiteNames: unmetPrereqs || undefined,
      contestWeight: contestData?.weight ?? null,
      incidenceScore: contestData?.incidence_score ?? null,
      relevanceScore: contestData?.relevance_score ?? null,
      inEdital: contestData?.in_edital ?? undefined,
    };
  });

  // 3. Processar Fila de Revisões com Tipologia Estrita
  const urgentReviews = reviewQueue.filter(
    (r) => r.urgencyCategory === "CRITICA" || r.urgencyCategory === "ALTA",
  );

  let manutencaoCount = 0;
  let consolidacaoCount = 0;
  let recuperacaoCount = 0;
  let remediacaoErroCount = 0;

  for (const r of reviewQueue) {
    const type = r.reviewType;
    if (type === "manutencao") manutencaoCount++;
    else if (type === "consolidacao") consolidacaoCount++;
    else if (type === "recuperacao") recuperacaoCount++;
    else if (type === "erro_direcionado") remediacaoErroCount++;
  }

  const mapReviewTypeStr = (
    type: string,
  ): "MANUTENÇÃO" | "CONSOLIDAÇÃO" | "RECUPERAÇÃO" | "REMEDIAÇÃO_POR_ERRO" => {
    switch (type) {
      case "manutencao":
        return "MANUTENÇÃO";
      case "consolidacao":
        return "CONSOLIDAÇÃO";
      case "recuperacao":
        return "RECUPERAÇÃO";
      case "erro_direcionado":
        return "REMEDIAÇÃO_POR_ERRO";
      default:
        return "MANUTENÇÃO";
    }
  };

  const topUrgentReviews: UrgentReviewSummary[] = reviewQueue.slice(0, 5).map((r) => {
    const mastery = r.input?.mastery ?? 0;
    const confidence = r.input?.confidence ?? 0;

    return {
      topicId: r.topicId,
      topicName: r.input?.topicId || r.topicId,
      subjectName: "",
      urgencyCategory: r.urgencyCategory || (r.reviewUrgency >= 0.8 ? "CRITICA" : "ALTA"),
      overdueDays: Math.max(0, Math.round(r.reviewUrgency * 10)),
      reviewType: mapReviewTypeStr(r.reviewType),
      reviewIntensity: r.reviewIntensity,
      masteryPercent: Math.round(mastery * 100),
      confidencePercent: Math.round(confidence * 100),
      decayRiskPercent: Math.round((1 - mastery) * 50),
    };
  });

  // 4. Processar Erros e Taxonomia Qualitativa
  const totalUnresolved = errorSummaries.reduce((sum, e) => sum + e.unresolvedCount, 0);

  const topCategories = errorSummaries
    .filter((e) => e.unresolvedCount > 0)
    .slice(0, 5)
    .map((e) => ({
      category: e.topicName || "Geral",
      topicName: e.subjectName,
      unresolvedCount: e.unresolvedCount,
    }));

  const categoryCounts = new Map<string, number>();
  for (const e of errorSummaries) {
    const cat = e.topicName || "Outros";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + e.unresolvedCount);
  }

  const taxonomyBreakdown = Array.from(categoryCounts.entries()).map(([cat, count]) => ({
    category: cat,
    count,
    percentage: totalUnresolved > 0 ? Math.round((count / totalUnresolved) * 100) : 0,
  }));

  // 5. Cronograma de Hoje
  const totalPlannedMinutes = todayTasks.reduce((sum, t) => sum + (t.planned_minutes ?? 0), 0);
  const completedMinutes = todayTasks
    .filter((t) => t.status === "completed" || t.status === "concluida")
    .reduce((sum, t) => sum + (t.actual_minutes ?? t.planned_minutes ?? 0), 0);

  const tasksSummary = todayTasks.map((t) => ({
    title: t.title,
    activityType: t.activity_type ?? "estudo",
    plannedMinutes: t.planned_minutes ?? 0,
    status: t.status,
    topicName: t.topic_name,
  }));

  // 6. Concurso Ativo e Relevância
  let activeContest: CoachContext["activeContest"] = undefined;
  if (data.activeContest?.name) {
    let daysUntilExam: number | null = null;
    if (data.activeContest.examDate) {
      const exam = new Date(data.activeContest.examDate).getTime();
      const now = new Date().getTime();
      const diff = Math.ceil((exam - now) / (1000 * 60 * 60 * 24));
      if (!isNaN(diff)) daysUntilExam = diff;
    }

    const topWeightedTopics = rawContestTopics
      .filter((ct) => ct.weight != null || ct.incidence_score != null)
      .sort(
        (a, b) =>
          (b.weight ?? 0) + (b.incidence_score ?? 0) - ((a.weight ?? 0) + (a.incidence_score ?? 0)),
      )
      .slice(0, 5)
      .map((ct) => ({
        topicId: ct.topic_id,
        topicName: ct.topic_name,
        subjectName: ct.subject_name,
        weight: ct.weight ?? 1,
        incidenceScore: ct.incidence_score ?? 0,
        relevanceScore: ct.relevance_score ?? 0,
        inEdital: ct.in_edital ?? true,
      }));

    activeContest = {
      name: data.activeContest.name,
      daysUntilExam,
      topWeightedTopics: topWeightedTopics.length > 0 ? topWeightedTopics : undefined,
    };
  }

  // 7. Extrair Tópicos Válidos (`validTopicNames`) para Validação Programática
  const topicNamesSet = new Set<string>();

  for (const d of diagnoses) {
    if (d.topicName) topicNamesSet.add(d.topicName.trim());
    if (d.subjectName) topicNamesSet.add(d.subjectName.trim());
  }
  for (const r of reviewQueue) {
    if (r.input?.topicId) topicNamesSet.add(r.input.topicId.trim());
    if (r.topicId) topicNamesSet.add(r.topicId.trim());
  }
  for (const e of errorSummaries) {
    if (e.topicName) topicNamesSet.add(e.topicName.trim());
    if (e.subjectName) topicNamesSet.add(e.subjectName.trim());
  }
  for (const t of todayTasks) {
    if (t.title) topicNamesSet.add(t.title.trim());
    if (t.topic_name) topicNamesSet.add(t.topic_name.trim());
  }
  for (const p of rawPrereqs) {
    if (p.topic_name) topicNamesSet.add(p.topic_name.trim());
    if (p.prerequisite_topic_name) topicNamesSet.add(p.prerequisite_topic_name.trim());
  }
  for (const ct of rawContestTopics) {
    if (ct.topic_name) topicNamesSet.add(ct.topic_name.trim());
    if (ct.subject_name) topicNamesSet.add(ct.subject_name.trim());
  }

  const validTopicNames = Array.from(topicNamesSet).filter((s) => s.length > 0);

  // Verificar se há dados pedagógicos suficientes
  const hasEnoughData =
    diagnoses.length > 0 ||
    reviewQueue.length > 0 ||
    totalUnresolved > 0 ||
    todayTasks.length > 0 ||
    rawPrereqs.length > 0;

  return {
    activeContest,
    diagnosesSummary: {
      totalTopics: diagnoses.length,
      criticalCount: criticalTopics.length,
      alertCount: alertTopics.length,
      topCriticalTopics,
    },
    reviewsSummary: {
      totalPending: reviewQueue.length,
      urgentCount: urgentReviews.length,
      byTypeBreakdown: {
        manutencaoCount,
        consolidacaoCount,
        recuperacaoCount,
        remediacaoErroCount,
      },
      topUrgentReviews,
    },
    errorsSummary: {
      totalUnresolved,
      topCategories,
      taxonomyBreakdown,
    },
    prerequisitesSummary: {
      totalDependenciesCount: rawPrereqs.length,
      unmetDependenciesCount: unmetPrereqSummaries.length,
      unmetPrerequisites: unmetPrereqSummaries,
      blockedTopicNames: Array.from(blockedTopicNamesSet),
    },
    todaySchedule: {
      totalPlannedMinutes,
      completedMinutes,
      tasks: tasksSummary,
    },
    validTopicNames,
    hasEnoughData,
  };
}
