import { QuestionAttempt, Question, ErrorCategory } from "../questions/types";
import { FISCAL_QUESTIONS } from "../questions/errorTracker";
import {
  StudentPerformanceReport,
  SubjectPerformance,
  ErrorDistribution,
  GapDiagnostic,
  MaturityIndex,
} from "./types";

/**
 * Motor Inteligente de Análise de Desempenho e Diagnóstico de Lacunas
 */
export function generatePerformanceReport(
  attempts: QuestionAttempt[],
  questions: Question[] = FISCAL_QUESTIONS,
): StudentPerformanceReport {
  const totalQuestionsResolved = attempts.length;
  if (totalQuestionsResolved === 0) {
    return {
      overallAccuracy: 0,
      totalTimeSpentSeconds: 0,
      totalQuestionsResolved: 0,
      subjectPerformance: [],
      errorDistribution: [],
      gapDiagnostics: [],
      maturityIndexes: [],
    };
  }

  const correctAttempts = attempts.filter((a) => a.isCorrect);
  const totalCorrect = correctAttempts.length;
  const overallAccuracy = totalCorrect / totalQuestionsResolved;
  const totalTimeSpentSeconds = attempts.reduce((acc, a) => acc + (a.timeSpentSeconds || 0), 0);

  // 1. Calcular Desempenho por Tópico/Assunto
  const topicMap: Record<
    string,
    {
      subjectId: string;
      subjectName: string;
      topicId: string;
      topicName: string;
      total: number;
      correct: number;
      timeSpent: number;
    }
  > = {};

  attempts.forEach((att) => {
    const q = questions.find((x) => x.id === att.questionId);
    if (!q) return;

    const key = `${q.subjectId}-${q.topicId}`;
    if (!topicMap[key]) {
      topicMap[key] = {
        subjectId: q.subjectId,
        subjectName: q.subjectName,
        topicId: q.topicId,
        topicName: q.topicName,
        total: 0,
        correct: 0,
        timeSpent: 0,
      };
    }

    topicMap[key].total += 1;
    if (att.isCorrect) {
      topicMap[key].correct += 1;
    }
    topicMap[key].timeSpent += att.timeSpentSeconds || 0;
  });

  const subjectPerformance: SubjectPerformance[] = Object.values(topicMap).map((t) => ({
    subjectId: t.subjectId,
    subjectName: t.subjectName,
    topicId: t.topicId,
    topicName: t.topicName,
    totalQuestions: t.total,
    correctQuestions: t.correct,
    wrongQuestions: t.total - t.correct,
    accuracy: t.correct / t.total,
    averageTimeSeconds: t.timeSpent / t.total,
  }));

  // 2. Calcular Distribuição de Erros
  const errorMap: Record<ErrorCategory, number> = {
    conhecimento: 0,
    esquecimento: 0,
    interpretacao: 0,
    calculo: 0,
    atencao: 0,
    estrategia: 0,
    velocidade: 0,
    outros: 0,
  };

  const wrongAttempts = attempts.filter((a) => !a.isCorrect);
  wrongAttempts.forEach((att) => {
    const cat = att.errorCategory || "outros";
    errorMap[cat] = (errorMap[cat] || 0) + 1;
  });

  const totalErrors = wrongAttempts.length;
  const errorDistribution: ErrorDistribution[] = Object.entries(errorMap).map(
    ([category, count]) => ({
      category: category as ErrorCategory,
      count,
      percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
    }),
  );

  // 3. Gerar Diagnóstico de Lacunas (Gap Diagnostics)
  // Identifica tópicos com acurácia inferior a 75%
  const gapDiagnostics: GapDiagnostic[] = [];

  subjectPerformance.forEach((sp) => {
    if (sp.accuracy < 0.75 && sp.topicId && sp.topicName) {
      // Descobrir a causa principal do erro nesse tópico específico
      const topicAttempts = attempts.filter((att) => {
        const q = questions.find((x) => x.id === att.questionId);
        return q && q.subjectId === sp.subjectId && q.topicId === sp.topicId && !att.isCorrect;
      });

      const topicErrorCounts: Record<ErrorCategory, number> = {
        conhecimento: 0,
        esquecimento: 0,
        interpretacao: 0,
        calculo: 0,
        atencao: 0,
        estrategia: 0,
        velocidade: 0,
        outros: 0,
      };

      topicAttempts.forEach((att) => {
        const cat = att.errorCategory || "outros";
        topicErrorCounts[cat] += 1;
      });

      let primaryErrorCategory: ErrorCategory = "conhecimento";
      let maxCount = -1;
      Object.entries(topicErrorCounts).forEach(([cat, count]) => {
        if (count > maxCount) {
          maxCount = count;
          primaryErrorCategory = cat as ErrorCategory;
        }
      });

      // Severidade
      const severity = sp.accuracy < 0.5 ? "high" : sp.accuracy < 0.7 ? "medium" : "low";

      // Recomendações personalizadas
      let recommendation = "";
      switch (primaryErrorCategory) {
        case "atencao":
          recommendation = `Realize uma leitura ativa do enunciado, sublinhando com as cores de marcação termos excludentes (ex: "não", "sempre", "vedado").`;
          break;
        case "conhecimento":
          recommendation = `Estude a fundo as fundamentações e jurisprudências associadas a este tópico. Recomenda-se leitura da lei seca associada no Vade Mecum.`;
          break;
        case "interpretacao":
          recommendation = `Revise os estilos e pegadinhas de banca para este tópico específico. Monte um resumo focado nas malícias da banca examinadora.`;
          break;
        case "esquecimento":
          recommendation = `Aumente a frequência de repetição espaçada no Anki para este tópico. Recomenda-se realizar uma revisão imediata dos resumos.`;
          break;
        default:
          recommendation = `Faça mais baterias de questões de nível fácil a médio para consolidar a base doutrinária antes de avançar para cenários complexos.`;
          break;
      }

      // Descobrir LawTags associadas a este assunto/tópico nas questões erradas
      const suggestedLawTags: string[] = [];
      topicAttempts.forEach((att) => {
        const q = questions.find((x) => x.id === att.questionId);
        if (q && q.associatedLaws) {
          q.associatedLaws.forEach((l) => {
            if (!suggestedLawTags.includes(l)) {
              suggestedLawTags.push(l);
            }
          });
        }
      });

      gapDiagnostics.push({
        id: `GAP-${sp.subjectId}-${sp.topicId}`,
        subjectId: sp.subjectId,
        subjectName: sp.subjectName,
        topicId: sp.topicId,
        topicName: sp.topicName,
        accuracy: sp.accuracy,
        averageTimeSeconds: sp.averageTimeSeconds,
        primaryErrorCategory,
        severity,
        recommendation,
        suggestedLawTags,
      });
    }
  });

  // Ordenar lacunas de maior severidade para menor
  gapDiagnostics.sort((a, b) => {
    const sevScore = { high: 3, medium: 2, low: 1 };
    return sevScore[b.severity] - sevScore[a.severity] || a.accuracy - b.accuracy;
  });

  // 4. Calcular Índice de Maturidade por Banca
  const boardMap: Record<string, { total: number; correct: number; timeSpent: number }> = {};
  attempts.forEach((att) => {
    const q = questions.find((x) => x.id === att.questionId);
    if (!q) return;

    if (!boardMap[q.examBoard]) {
      boardMap[q.examBoard] = { total: 0, correct: 0, timeSpent: 0 };
    }

    boardMap[q.examBoard].total += 1;
    if (att.isCorrect) {
      boardMap[q.examBoard].correct += 1;
    }
    boardMap[q.examBoard].timeSpent += att.timeSpentSeconds || 0;
  });

  const maturityIndexes: MaturityIndex[] = Object.entries(boardMap).map(([examBoard, data]) => {
    const accuracy = data.correct / data.total;
    const avgTime = data.timeSpent / data.total;

    // Pontuação de maturidade baseada em acerto (80% do peso) e tempo de resposta ágil (20% do peso, penaliza se for maior que 120 segundos por questão)
    const accuracyScore = accuracy * 100;
    const timePenalty = avgTime > 120 ? Math.min((avgTime - 120) * 0.5, 20) : 0;
    const maturityScore = Math.max(
      0,
      Math.min(100, Math.round(accuracyScore * 0.8 + (100 - timePenalty) * 0.2)),
    );

    let level: MaturityIndex["level"] = "Iniciante";
    if (maturityScore >= 85) level = "Alta Performance";
    else if (maturityScore >= 70) level = "Avançado";
    else if (maturityScore >= 50) level = "Intermediário";

    return {
      examBoard,
      accuracy,
      maturityScore,
      level,
    };
  });

  return {
    overallAccuracy,
    totalTimeSpentSeconds,
    totalQuestionsResolved,
    subjectPerformance,
    errorDistribution,
    gapDiagnostics,
    maturityIndexes,
  };
}
