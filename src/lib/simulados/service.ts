import { supabase as defaultSupabase } from "@/integrations/supabase/client";
import { ExamGeneratorEngine } from "./engine";
import { ExamGenerationOptions, ExamSession, ExamTemplate, QuestionCandidate } from "./types";

export class ExamGeneratorService {
  /**
   * Instancia uma nova sessão de simulado (exam_sessions) a partir de um template cadastrado,
   * selecionando as questões de forma inteligente e gravando o estado inicial em lote.
   */
  static async createSessionFromTemplate(
    userId: string,
    templateId: string,
    options?: ExamGenerationOptions,
    supabaseClient = defaultSupabase,
  ): Promise<{ session: ExamSession; answersCount: number }> {
    // 1. Buscar o template de simulado
    const { data: template, error: templateError } = await supabaseClient
      .from("exam_templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (templateError || !template) {
      throw new Error(
        `Falha ao obter o template de simulado: ${templateError?.message || "Não encontrado"}`,
      );
    }

    const examTemplate = template as unknown as ExamTemplate;
    const distribution = examTemplate.distribution_config;

    // 2. Coletar matérias e tópicos para filtrar a query de questões candidatas
    const subjectIds = distribution.subjects.map((s) => s.subject_id);
    if (subjectIds.length === 0) {
      throw new Error(
        "O template de simulado não possui matérias cadastradas em sua distribuição.",
      );
    }

    // 3. Buscar todas as questões candidatas no banco compatíveis com as matérias/tópicos do template
    let query = supabaseClient
      .from("questions")
      .select("id, subject_id, topic_id, banca, difficulty")
      .in("subject_id", subjectIds);

    // Se houver restrições específicas de tópicos no template, podemos usá-las para filtrar ainda mais a query
    const allTopicIds = distribution.subjects.flatMap((s) => s.topic_ids || []);
    if (allTopicIds.length > 0) {
      // Opcional: filtrar apenas pelos tópicos citados
      query = query.in("topic_id", allTopicIds);
    }

    const { data: questionsData, error: questionsError } = await query;
    if (questionsError || !questionsData) {
      throw new Error(`Erro ao consultar questões candidatas do banco: ${questionsError?.message}`);
    }

    const candidates: QuestionCandidate[] = (questionsData as any[]).map((q) => ({
      id: q.id,
      subject_id: q.subject_id,
      topic_id: q.topic_id,
      banca: q.banca || "Geral",
      difficulty: (q.difficulty || "medium") as "easy" | "medium" | "hard",
    }));

    // 4. Buscar histórico de questões já respondidas pelo usuário para respeitar "allow_already_answered"
    const { data: historyData, error: historyError } = await supabaseClient
      .from("exam_session_answers")
      .select("question_id")
      .eq("user_id", userId);

    const userAnsweredQuestionIds = new Set<string>();
    if (!historyError && historyData) {
      for (const row of historyData) {
        userAnsweredQuestionIds.add(row.question_id);
      }
    }

    // 5. Buscar o domínio cognitivo/maestria por tópico do usuário para priorização de lacunas
    const { data: masteryData } = await supabaseClient
      .from("knowledge_mastery")
      .select("topic_id, mastery_score")
      .eq("user_id", userId);

    const userTopicMastery: Record<string, number> = {};
    if (masteryData) {
      for (const row of masteryData) {
        userTopicMastery[row.topic_id] = Number(row.mastery_score);
      }
    }

    // 6. Invocar o motor determinístico para seleção das questões e cálculo de pontuações
    const generationResult = ExamGeneratorEngine.selectQuestions({
      candidates,
      distribution,
      options,
      userAnsweredQuestionIds,
      userTopicMastery,
    });

    if (generationResult.selected_questions.length === 0) {
      throw new Error(
        "Não foi possível selecionar nenhuma questão para montar o simulado baseado nas restrições especificadas.",
      );
    }

    const timeLimitSeconds =
      examTemplate.time_limit_minutes > 0
        ? examTemplate.time_limit_minutes * 60
        : generationResult.session_payload.time_limit_seconds;

    // 7. Criar a sessão de simulado (exam_sessions)
    const sessionId = crypto.randomUUID ? crypto.randomUUID() : this.generateUUID();
    const newSessionPayload = {
      id: sessionId,
      user_id: userId,
      template_id: templateId,
      contest_id: examTemplate.contest_id || null,
      set_id: generationResult.session_payload.set_id,
      status: "ready" as const,
      time_limit_seconds: timeLimitSeconds,
      accumulated_pause_seconds: 0,
      max_possible_score: generationResult.session_payload.max_possible_score,
      version: 1,
      started_at: null,
      ended_at: null,
    };

    const { data: createdSession, error: sessionCreateError } = await supabaseClient
      .from("exam_sessions")
      .insert(newSessionPayload)
      .select()
      .single();

    if (sessionCreateError || !createdSession) {
      throw new Error(`Falha ao criar a sessão de simulado: ${sessionCreateError?.message}`);
    }

    // 8. Inserir em lote as questões selecionadas em exam_session_answers
    const answersPayload = generationResult.selected_questions.map((sq) => ({
      id: crypto.randomUUID ? crypto.randomUUID() : this.generateUUID(),
      session_id: sessionId,
      question_id: sq.question.id,
      user_id: userId,
      position: sq.position,
      subject_id: sq.question.subject_id,
      topic_id: sq.question.topic_id,
      weight: sq.weight,
      is_flagged_for_review: false,
      answer_change_count: 0,
      time_spent_seconds: 0,
      chosen_answer: null,
      is_correct: null,
    }));

    const { error: answersInsertError } = await supabaseClient
      .from("exam_session_answers")
      .insert(answersPayload);

    if (answersInsertError) {
      // Se falhar a inserção em lote, remove a sessão para evitar dados órfãos e simular rollback transacional manual
      await supabaseClient.from("exam_sessions").delete().eq("id", sessionId);
      throw new Error(
        `Falha ao inicializar as questões do simulado: ${answersInsertError.message}`,
      );
    }

    return {
      session: createdSession as unknown as ExamSession,
      answersCount: answersPayload.length,
    };
  }

  /**
   * Fallback de UUID simples para ambientes de teste
   */
  private static generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
