/**
 * COACH SERVICE — Mentor de IA Proativo (Fase 7.2.1)
 *
 * Orquestra a coleta de dados dos motores determinísticos (Diagnosis, Review,
 * Error Central, Scheduler, Prerequisites, Contest Topics), constrói o CoachContext
 * multidimensional, despacha para o AI Gateway com a task `coach_daily_guidance` e
 * valida a orientação retornada contra os tópicos do contexto.
 *
 * SEGURANÇA:
 *  - Isolamento por usuário autenticado
 *  - Nenhuma API key exposta no frontend
 *  - Cache automático e determinístico via `ai_results` da Fase 7.1
 */

import { supabase } from "@/integrations/supabase/client";
import { getUserDiagnoses } from "@/lib/diagnosis/service";
import { getUserReviewQueue } from "@/lib/review/service";
import { fetchTopicErrorSummaries } from "@/lib/error-central/service";
import { runAiTask } from "@/services/ai/gateway";
import { buildCoachContext, type RawPrerequisite, type RawContestTopic } from "./context-builder";
import { COACH_PROMPT_VERSION, COACH_SYSTEM_PROMPT, validateCoachGuidance } from "./prompts";
import type { CoachGuidanceResult } from "./types";

/**
 * Busca as tarefas planejadas para o dia atual no Supabase.
 */
async function fetchTodayTasks() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("plan_tasks")
    .select("id, title, status, planned_minutes, actual_minutes, activity_type, scheduled_date")
    .eq("scheduled_date", today);

  if (error) {
    return [];
  }
  return data ?? [];
}

/**
 * Busca informações do concurso/plano ativo do usuário.
 */
async function fetchActiveContest() {
  const { data, error } = await supabase
    .from("study_plans")
    .select("name, contest_id, contests(name, exam_date)")
    .eq("status", "ativo")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const contestObj = data.contests as { name?: string; exam_date?: string } | null;

  return {
    name: contestObj?.name || data.name || "Concurso Fiscal",
    examDate: contestObj?.exam_date || null,
    contestId: data.contest_id || undefined,
  };
}

/**
 * Busca os pré-requisitos cadastrados na base para avaliar dependências entre tópicos.
 */
async function fetchPrerequisites(): Promise<RawPrerequisite[]> {
  const { data, error } = await supabase.from("topic_prerequisites").select(`
      topic_id,
      prerequisite_topic_id,
      topics!topic_prerequisites_topic_id_fkey(name),
      prereq_topic:topics!topic_prerequisites_prerequisite_topic_id_fkey(name)
    `);

  if (error || !data) {
    return [];
  }

  const prereqTopicIds = Array.from(new Set(data.map((p) => p.prerequisite_topic_id)));
  const masteryMap = new Map<string, number>();

  if (prereqTopicIds.length > 0) {
    const { data: kData } = await supabase
      .from("user_topic_knowledge")
      .select("topic_id, mastery")
      .in("topic_id", prereqTopicIds);

    if (kData) {
      for (const row of kData) {
        masteryMap.set(row.topic_id, Number(row.mastery ?? 0));
      }
    }
  }

  return data.map((p) => {
    const topicObj = p.topics as unknown as { name?: string } | null;
    const prereqObj = p.prereq_topic as unknown as { name?: string } | null;

    return {
      topic_id: p.topic_id,
      prerequisite_topic_id: p.prerequisite_topic_id,
      topic_name: topicObj?.name || p.topic_id,
      prerequisite_topic_name: prereqObj?.name || p.prerequisite_topic_id,
      prerequisite_mastery: masteryMap.get(p.prerequisite_topic_id) ?? 0,
    };
  });
}

/**
 * Busca peso, incidência e relevância dos tópicos do concurso ativo.
 */
async function fetchContestTopics(contestId?: string): Promise<RawContestTopic[]> {
  let query = supabase
    .from("contest_topics")
    .select(
      "topic_id, weight, incidence_score, relevance_score, in_edital, subjects(name), topics(name)",
    );

  if (contestId) {
    query = query.eq("contest_id", contestId);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data.map((ct) => {
    const subjObj = ct.subjects as unknown as { name?: string } | null;
    const topObj = ct.topics as unknown as { name?: string } | null;

    return {
      topic_id: ct.topic_id || "",
      topic_name: topObj?.name || "Tópico do Concurso",
      subject_name: subjObj?.name || "Matéria",
      weight: ct.weight != null ? Number(ct.weight) : null,
      incidence_score: ct.incidence_score != null ? Number(ct.incidence_score) : null,
      relevance_score: ct.relevance_score != null ? Number(ct.relevance_score) : null,
      in_edital: ct.in_edital ?? true,
    };
  });
}

/**
 * Função principal proativa para obter a orientação diária do Coach.
 */
export async function getDailyCoachGuidance(options?: {
  forceRefresh?: boolean;
}): Promise<CoachGuidanceResult> {
  // 1. Verificar usuário autenticado
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return {
      guidance: null,
      cached: false,
      status: "erro",
      errorMessage: "Usuário não autenticado no Supabase.",
      hasEnoughData: false,
    };
  }

  // 2. Coletar dados pedagógicos dos motores em paralelo com tratamento de erros
  const [
    diagnosesRes,
    reviewQueueRes,
    errorSummariesRes,
    todayTasksRes,
    contestRes,
    prereqsRes,
    contestTopicsRes,
  ] = await Promise.allSettled([
    getUserDiagnoses(),
    getUserReviewQueue(),
    fetchTopicErrorSummaries(),
    fetchTodayTasks(),
    fetchActiveContest(),
    fetchPrerequisites(),
    fetchContestTopics(),
  ]);

  const diagnoses = diagnosesRes.status === "fulfilled" ? diagnosesRes.value : [];
  const reviewQueue = reviewQueueRes.status === "fulfilled" ? reviewQueueRes.value : [];
  const errorSummaries = errorSummariesRes.status === "fulfilled" ? errorSummariesRes.value : [];
  const todayTasks = todayTasksRes.status === "fulfilled" ? todayTasksRes.value : [];
  const activeContest = contestRes.status === "fulfilled" ? contestRes.value : null;
  const prerequisites = prereqsRes.status === "fulfilled" ? prereqsRes.value : [];
  const contestTopics = contestTopicsRes.status === "fulfilled" ? contestTopicsRes.value : [];

  // 3. Construir o CoachContext compacto, sanitizado e multidimensional
  const context = buildCoachContext({
    diagnoses,
    reviewQueue,
    errorSummaries,
    prerequisites,
    contestTopics,
    todayTasks,
    activeContest,
  });

  // 4. Se não houver dados pedagógicos suficientes
  if (!context.hasEnoughData) {
    return {
      guidance: null,
      cached: false,
      status: "dados_insuficientes",
      hasEnoughData: false,
    };
  }

  // 5. Enviar ao AI Gateway da Fase 7.1
  try {
    const aiResult = await runAiTask({
      type: "coach_daily_guidance",
      tier: "inteligente",
      inputRef: context as unknown as Record<string, unknown>,
      promptVersion: COACH_PROMPT_VERSION,
      systemPrompt: COACH_SYSTEM_PROMPT,
      userPrompt: `Analise este CoachContext pedagógico e gere a orientação diária do aluno:\n${JSON.stringify(context, null, 2)}`,
      forceRefresh: options?.forceRefresh,
    });

    if (aiResult.status === "erro" || !aiResult.output) {
      return {
        guidance: null,
        cached: aiResult.cached,
        status: "erro",
        errorMessage: aiResult.errorMessage || "Falha ao gerar orientação com o AI Gateway.",
        hasEnoughData: true,
        model: aiResult.model,
        durationMs: aiResult.durationMs,
      };
    }

    // 6. Validar o JSON retornado contra os tópicos válidos do contexto
    const validatedGuidance = validateCoachGuidance(aiResult.output, context);

    return {
      guidance: validatedGuidance,
      cached: aiResult.cached,
      status: "processado",
      hasEnoughData: true,
      model: aiResult.model,
      durationMs: aiResult.durationMs,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro inesperado no serviço do Coach.";
    return {
      guidance: null,
      cached: false,
      status: "erro",
      errorMessage: msg,
      hasEnoughData: true,
    };
  }
}
