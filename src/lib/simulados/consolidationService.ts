import { supabase } from "@/integrations/supabase/client";
import { ExamSession, ExamTemplate } from "./types";
import { ExamConsolidationEngine, ExamConsolidationResult } from "./consolidation";
import { ExamAnswerWithQuestion } from "@/hooks/useExamRunner";

export class ExamConsolidationService {
  /**
   * Consolida os resultados de um simulado finalizado, atualiza o status,
   * popula a central de erros de forma idempotente e retroalimenta a maestria por tópico.
   */
  static async consolidateAndSave(sessionId: string): Promise<{
    session: ExamSession;
    result: ExamConsolidationResult;
  }> {
    // 1. Buscar a sessão do simulado
    const { data: sessionData, error: sessionErr } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionErr || !sessionData) {
      throw new Error(
        `Sessão de simulado não encontrada: ${sessionErr?.message || "Erro desconhecido"}`,
      );
    }

    const session = sessionData as unknown as ExamSession;

    // Se já tiver sido concluída, recalcular apenas para consistência, mas não bloquear
    // 2. Buscar informações do Template associado para regras de pontuação
    let scoringRule: any = "standard";
    let negativePenalty = 0;

    if (session.template_id) {
      const { data: templateData } = await supabase
        .from("exam_templates")
        .select("scoring_rule, negative_marking_penalty")
        .eq("id", session.template_id)
        .maybeSingle();

      if (templateData) {
        scoringRule = templateData.scoring_rule;
        negativePenalty = templateData.negative_marking_penalty || 0;
      }
    }

    // 3. Buscar respostas e dados de questões associados
    const { data: answersData, error: answersErr } = await supabase
      .from("exam_session_answers")
      .select(
        `
        *,
        question:questions (
          id,
          statement,
          alternatives,
          correct_answer,
          exam_board,
          subject_id,
          topic_id
        )
      `,
      )
      .eq("session_id", sessionId);

    if (answersErr || !answersData) {
      throw new Error(
        `Respostas do simulado não encontradas: ${answersErr?.message || "Erro desconhecido"}`,
      );
    }

    const answers = answersData as unknown as ExamAnswerWithQuestion[];

    // 4. Executar cálculo matemático na engine pura (Requisito Crítico: Piso zero na nota líquida)
    const result = ExamConsolidationEngine.consolidate(
      session,
      answers,
      scoringRule,
      negativePenalty,
    );

    const nowIso = new Date().toISOString();

    // 5. Salvar a consolidação de notas na sessão e transicionar status para 'completed'
    const { data: updatedSessionData, error: updateErr } = await supabase
      .from("exam_sessions")
      .update({
        status: "completed",
        ended_at: nowIso,
        gross_score: result.stats.raw_score,
        net_score: result.stats.final_score_net,
        max_possible_score: result.stats.max_possible_score,
        accuracy_percentage: result.stats.accuracy_percentage,
        performance_summary: result as any,
        total_time_seconds: result.stats.total_time_spent_seconds,
        updated_at: nowIso,
        version: session.version + 1,
      })
      .eq("id", sessionId)
      .select()
      .single();

    if (updateErr || !updatedSessionData) {
      throw new Error(
        `Falha ao atualizar sessão de simulado: ${updateErr?.message || "Lock concorrente"}`,
      );
    }

    const updatedSession = updatedSessionData as unknown as ExamSession;

    // 6. Sincronizar Central de Erros de forma IDEMPOTENTE (Requisito Crítico 2)
    // Deletar erros gerados anteriormente por esse mesmo simulado para evitar duplicações
    const uniqueNotesKey = `Simulado ID: ${sessionId}`;
    const { error: deleteErrorsErr } = await supabase
      .from("error_entries")
      .delete()
      .eq("user_id", session.user_id)
      .eq("notes", uniqueNotesKey);

    if (deleteErrorsErr) {
      console.warn("Aviso ao limpar erros anteriores:", deleteErrorsErr.message);
    }

    // Inserir os novos erros
    const incorrectAnswers = answers.filter((ans) => {
      const isAnswered = ans.chosen_answer !== null && ans.chosen_answer !== "";
      if (!isAnswered) return false;
      const correct = ans.question?.correct_answer?.toUpperCase();
      const chosen = ans.chosen_answer?.toUpperCase();
      return correct && chosen !== correct;
    });

    if (incorrectAnswers.length > 0) {
      const errorEntriesToInsert = incorrectAnswers.map((ans) => ({
        user_id: session.user_id,
        question_id: ans.question_id,
        subject_id: ans.question?.subject_id || null,
        topic_id: ans.question?.topic_id || null,
        root_topic_id: ans.question?.topic_id || null,
        notes: uniqueNotesKey,
        is_resolved: false,
        occurred_at: nowIso,
      }));

      const { error: insertErrorsErr } = await supabase
        .from("error_entries")
        .insert(errorEntriesToInsert);

      if (insertErrorsErr) {
        console.error("Erro ao inserir erros na Central de Erros:", insertErrorsErr.message);
      }
    }

    // 7. Retroalimentar a Maestria de Estudos (Requisito Crítico 3: user_topic_knowledge)
    const topicPerformances = Object.values(result.topic_performances);

    for (const perf of topicPerformances) {
      if (!perf.topic_id) continue;

      // Buscar conhecimento atual do tópico para o usuário
      const { data: currentKnowledge } = await supabase
        .from("user_topic_knowledge")
        .select("*")
        .eq("user_id", session.user_id)
        .eq("topic_id", perf.topic_id)
        .maybeSingle();

      let finalTotal = perf.total_questions;
      let finalCorrect = perf.correct_count;
      let finalMastery = perf.accuracy_rate;
      let finalConfidence = perf.accuracy_rate;

      if (currentKnowledge) {
        const prevTotal = currentKnowledge.total_questions ?? 0;
        const prevCorrect = currentKnowledge.correct_questions ?? 0;
        const prevMastery = currentKnowledge.mastery ?? 0.5;
        const prevConfidence = currentKnowledge.confidence ?? 0.5;

        finalTotal = prevTotal + perf.total_questions;
        finalCorrect = prevCorrect + perf.correct_count;

        // Média ponderada de maestria e confiança
        finalMastery = (prevMastery * prevTotal + perf.correct_count) / finalTotal;
        finalConfidence = (prevConfidence * prevTotal + perf.correct_count) / finalTotal;
      }

      // Limitar entre 0 e 1
      finalMastery = Math.max(0, Math.min(1, finalMastery));
      finalConfidence = Math.max(0, Math.min(1, finalConfidence));

      const { error: upsertMasteryErr } = await supabase.from("user_topic_knowledge").upsert(
        {
          user_id: session.user_id,
          topic_id: perf.topic_id,
          total_questions: finalTotal,
          correct_questions: finalCorrect,
          mastery: finalMastery,
          confidence: finalConfidence,
          last_practiced_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "user_id,topic_id" },
      );

      if (upsertMasteryErr) {
        console.error(
          `Erro ao atualizar maestria do tópico ${perf.topic_id}:`,
          upsertMasteryErr.message,
        );
      }
    }

    return {
      session: updatedSession,
      result,
    };
  }
}
