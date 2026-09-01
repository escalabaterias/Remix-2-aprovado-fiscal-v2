import { ExamSession, ScoringRule } from "./types";
import { ExamAnswerWithQuestion } from "@/hooks/useExamRunner";

export interface TopicPerformance {
  topic_id: string;
  subject_id: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
  unanswered_count: number;
  average_time_seconds: number;
  accuracy_rate: number; // 0.0 to 1.0
}

export interface ExamConsolidationResult {
  stats: {
    total_questions: number;
    answered_count: number;
    unanswered_count: number;
    correct_count: number;
    incorrect_count: number;

    // Pontuações
    raw_score: number; // Bruta
    penalty_score: number; // Deduções por erro
    final_score_net: number; // Líquida (travada em >= 0)
    max_possible_score: number;
    accuracy_percentage: number; // % líquida sobre o máximo

    // Tempos
    total_time_spent_seconds: number;
    average_time_per_question_seconds: number;
  };
  topic_performances: Record<string, TopicPerformance>;
  critical_gaps: string[]; // IDs dos tópicos críticos (acerto < 60%)
}

export class ExamConsolidationEngine {
  /**
   * Avalia as respostas registradas de forma pura e determina pontuações e métricas.
   */
  static consolidate(
    session: ExamSession,
    answers: ExamAnswerWithQuestion[],
    scoringRule: ScoringRule = "standard",
    negativeMarkingPenalty: number = 0,
  ): ExamConsolidationResult {
    const total_questions = answers.length;
    let answered_count = 0;
    let unanswered_count = 0;
    let correct_count = 0;
    let incorrect_count = 0;

    let raw_score = 0;
    let max_possible_score = 0;
    let total_time_spent_seconds = 0;

    const topicStats: Record<
      string,
      {
        topic_id: string;
        subject_id: string;
        total: number;
        correct: number;
        incorrect: number;
        unanswered: number;
        time_spent: number;
      }
    > = {};

    // 1. Processar cada resposta individualmente
    answers.forEach((ans) => {
      const isAnswered = ans.chosen_answer !== null && ans.chosen_answer !== "";
      const weight = ans.weight || 1.0;
      max_possible_score += weight;

      const timeSpent = ans.time_spent_seconds || 0;
      total_time_spent_seconds += timeSpent;

      const question = ans.question;
      const correctAnswer = question?.correct_answer?.toUpperCase() || null;
      const chosenAnswer = ans.chosen_answer?.toUpperCase() || null;

      let isCorrect = false;

      if (!isAnswered) {
        unanswered_count++;
      } else {
        answered_count++;
        if (correctAnswer && chosenAnswer === correctAnswer) {
          isCorrect = true;
          correct_count++;
          raw_score += weight;
        } else {
          incorrect_count++;
        }
      }

      // Agrupamento por Tópico para análise analítica
      if (question?.topic_id) {
        const tId = question.topic_id;
        const sId = question.subject_id || "unknown";

        if (!topicStats[tId]) {
          topicStats[tId] = {
            topic_id: tId,
            subject_id: sId,
            total: 0,
            correct: 0,
            incorrect: 0,
            unanswered: 0,
            time_spent: 0,
          };
        }

        topicStats[tId].total++;
        if (!isAnswered) {
          topicStats[tId].unanswered++;
        } else if (isCorrect) {
          topicStats[tId].correct++;
        } else {
          topicStats[tId].incorrect++;
        }
        topicStats[tId].time_spent += timeSpent;
      }
    });

    // 2. Calcular a penalização por erro conforme as regras da banca
    let penalty_score = 0;
    answers.forEach((ans) => {
      const isAnswered = ans.chosen_answer !== null && ans.chosen_answer !== "";
      if (!isAnswered) return;

      const weight = ans.weight || 1.0;
      const question = ans.question;
      const correctAnswer = question?.correct_answer?.toUpperCase() || null;
      const chosenAnswer = ans.chosen_answer?.toUpperCase() || null;
      const isCorrect = correctAnswer && chosenAnswer === correctAnswer;

      if (!isCorrect) {
        if (scoringRule === "cebraspe_1_for_1") {
          penalty_score += weight; // 1 errada anula 1 certa com o mesmo peso
        } else if (scoringRule === "cebraspe_half") {
          penalty_score += weight * 0.5; // Erro deduz metade do peso correspondente
        } else if (scoringRule === "custom" && negativeMarkingPenalty > 0) {
          penalty_score += weight * negativeMarkingPenalty;
        }
      }
    });

    // 3. Aplicar o Piso Zero na Nota Líquida (Requisito Crítico 1)
    const final_score_net = Math.max(0, raw_score - penalty_score);

    const accuracy_percentage =
      max_possible_score > 0
        ? Math.max(0, Math.min(100, (final_score_net / max_possible_score) * 100))
        : 0;

    const average_time_per_question_seconds =
      total_questions > 0 ? Math.round(total_time_spent_seconds / total_questions) : 0;

    // 4. Estruturar os resultados de tópicos
    const topic_performances: Record<string, TopicPerformance> = {};
    const critical_gaps: string[] = [];

    Object.entries(topicStats).forEach(([tId, stat]) => {
      const accuracy_rate = stat.total > 0 ? stat.correct / stat.total : 0;

      topic_performances[tId] = {
        topic_id: tId,
        subject_id: stat.subject_id,
        total_questions: stat.total,
        correct_count: stat.correct,
        incorrect_count: stat.incorrect,
        unanswered_count: stat.unanswered,
        average_time_seconds: stat.total > 0 ? Math.round(stat.time_spent / stat.total) : 0,
        accuracy_rate,
      };

      // Tópico é lacuna crítica se aproveitamento for inferior a 60%
      if (accuracy_rate < 0.6) {
        critical_gaps.push(tId);
      }
    });

    return {
      stats: {
        total_questions,
        answered_count,
        unanswered_count,
        correct_count,
        incorrect_count,
        raw_score,
        penalty_score,
        final_score_net,
        max_possible_score,
        accuracy_percentage,
        total_time_spent_seconds,
        average_time_per_question_seconds,
      },
      topic_performances,
      critical_gaps,
    };
  }
}
