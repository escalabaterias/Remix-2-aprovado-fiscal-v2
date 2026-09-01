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
 * Gera uma orientação pedagógica determinística baseada estritamente no CoachContext.
 * Utilizada como fallback instantâneo e seguro quando o motor de IA está indisponível ou em falha.
 */
export function buildDeterministicCoachGuidance(context: CoachContext): CoachGuidance {
  let priorityTopic = "";
  let headline = "";
  let situation = "";
  let reason = "";
  let recommendedAction = "";
  let secondaryAction: string | undefined = undefined;

  const topCritical = context.diagnosesSummary?.topCriticalTopics?.[0];
  const topUrgent = context.reviewsSummary?.topUrgentReviews?.[0];
  const topError = context.errorsSummary?.topCategories?.[0];

  if (topCritical) {
    priorityTopic = topCritical.topicName || topCritical.subjectName || "Tópico Crítico";
    headline = `Foco Prioritário: ${priorityTopic}`;
    situation = `Identificado nível crítico de desempenho no tópico ${priorityTopic} (${topCritical.masteryPercent}% de domínio).`;
    reason = `Este tópico requer atenção imediata devido a ${topCritical.unresolvedErrorsCount ?? 0} erros pendentes e alta relevância no edital.`;
    recommendedAction = `Resolver 10 questões focadas em ${priorityTopic} e revisar a teoria dos pontos de falha.`;
    if (topCritical.hasUnmetPrerequisites && topCritical.unmetPrerequisiteNames?.length) {
      secondaryAction = `Atenção aos pré-requisitos: ${topCritical.unmetPrerequisiteNames.join(", ")}.`;
    }
  } else if (topUrgent) {
    priorityTopic = topUrgent.topicName || "Revisão Urgente";
    headline = `Revisão Pendente: ${priorityTopic}`;
    situation = `Revisão do tipo ${topUrgent.reviewType} acumulada para o tópico.`;
    reason = `Risco de decaimento de memória após ${topUrgent.overdueDays} dias sem revisão.`;
    recommendedAction = `Concluir sessão de revisão adaptativa para ${priorityTopic}.`;
  } else if (topError) {
    priorityTopic = topError.category || "Central de Erros";
    headline = `Remediação de Erros em ${priorityTopic}`;
    situation = `Foram registrados ${topError.unresolvedCount} erros pendentes de resolução nesta categoria.`;
    reason = `A correção de erros recorrentes é o caminho mais rápido para elevação de nota.`;
    recommendedAction = `Acessar a Central de Erros e reexecutar a análise guiada dos itens pendentes.`;
  } else if (context.validTopicNames && context.validTopicNames.length > 0) {
    priorityTopic = context.validTopicNames[0]!;
    headline = `Orientação de Estudo: ${priorityTopic}`;
    situation = `Acompanhamento proativo do seu plano de estudos.`;
    reason = `Manter a constância diária de execução nos tópicos agendados.`;
    recommendedAction = `Realizar o bloco de estudos agendado no seu cronograma diário.`;
  } else {
    priorityTopic = "Estudo Geral";
    headline = "Acompanhamento Proativo do Aluno";
    situation = "Dados pedagógicos cadastrados e prontos para acompanhamento.";
    reason = "Inicie sessões de estudo para alimentar os motores de inteligência.";
    recommendedAction = "Executar uma sessão de estudo ou resolver bloco de questões do edital.";
  }

  return {
    headline,
    situation,
    priorityTopic,
    reason,
    recommendedAction,
    secondaryAction,
    avoid:
      "Evite dispersar o tempo de estudo em tópicos de baixa relevância antes de cumprir a prioridade.",
    nextStep: "Registrar a conclusão no Centro de Comando para atualizar os indicadores.",
    confidenceScore: 0.85,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Função principal proativa para obter a orientação diária do Coach.
 */
export async function getDailyCoachGuidance(options?: {
  forceRefresh?: boolean;
}): Promise<CoachGuidanceResult> {
  try {
    // Timeout de segurança de 10 segundos
    const timeoutPromise = new Promise<CoachGuidanceResult>((resolve) => {
      setTimeout(() => {
        resolve({
          guidance: null,
          cached: false,
          status: "erro",
          errorMessage: "Tempo limite de resposta do Professor Fiscal excedido.",
          hasEnoughData: false,
        });
      }, 10_000);
    });

    const executionPromise = (async (): Promise<CoachGuidanceResult> => {
      // 1. Verificar usuário autenticado
      let userId: string | null = null;
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (!authErr && authData?.user) {
          userId = authData.user.id;
        }
      } catch (authException) {
        console.warn("Exceção ao verificar usuário autenticado:", authException);
      }

      if (!userId) {
        try {
          const { data: sessData } = await supabase.auth.getSession();
          if (sessData?.session?.user) {
            userId = sessData.session.user.id;
          }
        } catch {
          // Ignora
        }
      }

      if (!userId) {
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
        getUserDiagnoses().catch(() => []),
        getUserReviewQueue().catch(() => []),
        fetchTopicErrorSummaries().catch(() => []),
        fetchTodayTasks().catch(() => []),
        fetchActiveContest().catch(() => null),
        fetchPrerequisites().catch(() => []),
        fetchContestTopics().catch(() => []),
      ]);

      const diagnoses = diagnosesRes.status === "fulfilled" ? diagnosesRes.value : [];
      const reviewQueue = reviewQueueRes.status === "fulfilled" ? reviewQueueRes.value : [];
      const errorSummaries =
        errorSummariesRes.status === "fulfilled" ? errorSummariesRes.value : [];
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
          // Fallback gracioso para orientação determinística
          return {
            guidance: buildDeterministicCoachGuidance(context),
            cached: Boolean(aiResult.cached),
            status: "processado",
            errorMessage:
              aiResult.errorMessage || "Orientação gerada pelo motor determinístico pedagógico.",
            hasEnoughData: true,
            model: aiResult.model,
            durationMs: aiResult.durationMs,
          };
        }

        // 6. Validar o JSON retornado contra os tópicos válidos do contexto
        try {
          const validatedGuidance = validateCoachGuidance(aiResult.output, context);

          return {
            guidance: validatedGuidance,
            cached: aiResult.cached,
            status: "processado",
            hasEnoughData: true,
            model: aiResult.model,
            durationMs: aiResult.durationMs,
          };
        } catch {
          // Se a validação do JSON da IA falhar, utilizar o motor determinístico
          return {
            guidance: buildDeterministicCoachGuidance(context),
            cached: Boolean(aiResult.cached),
            status: "processado",
            hasEnoughData: true,
            model: aiResult.model,
            durationMs: aiResult.durationMs,
          };
        }
      } catch {
        // Fallback para motor determinístico se a chamada de IA lançar exceção
        return {
          guidance: buildDeterministicCoachGuidance(context),
          cached: false,
          status: "processado",
          hasEnoughData: true,
        };
      }
    })();

    return await Promise.race([executionPromise, timeoutPromise]);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro inesperado no serviço do Coach.";
    return {
      guidance: null,
      cached: false,
      status: "erro",
      errorMessage: msg,
      hasEnoughData: false,
    };
  }
}
