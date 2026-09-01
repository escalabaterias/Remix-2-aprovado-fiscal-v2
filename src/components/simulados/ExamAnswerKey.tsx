import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ExamAnswerWithQuestion } from "@/hooks/useExamRunner";
import { Button } from "@/components/ui/button";
import {
  Check,
  X,
  Flag,
  BookOpen,
  Filter,
  CheckCircle,
  HelpCircle,
  AlertCircle,
} from "lucide-react";

interface ExamAnswerKeyProps {
  answers: ExamAnswerWithQuestion[];
}

type FilterType = "all" | "errors" | "flagged" | "correct";

export function ExamAnswerKey({ answers }: ExamAnswerKeyProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Filtros de perguntas
  const filteredAnswers = useMemo(() => {
    return answers.filter((ans) => {
      const question = ans.question;
      const correct = question?.correct_answer?.toUpperCase();
      const chosen = ans.chosen_answer?.toUpperCase();
      const isCorrect = correct && chosen === correct;

      if (activeFilter === "errors") {
        return chosen !== null && chosen !== "" && !isCorrect;
      }
      if (activeFilter === "correct") {
        return isCorrect;
      }
      if (activeFilter === "flagged") {
        return ans.is_flagged === true;
      }
      return true;
    });
  }, [answers, activeFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 py-4" id="exam-answer-key">
      {/* Controles e Filtros de Gabarito */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/40 p-4 rounded-xl border border-border">
        <div className="space-y-0.5">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-4.5 w-4.5 text-primary" /> Gabarito Comentado Questão por Questão
          </h2>
          <p className="text-xs text-muted-foreground">
            Revise seus erros, acertos e sinalizações com os comentários fundamentados da banca.
          </p>
        </div>

        {/* Filtros em Botões de Pílula */}
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={activeFilter === "all" ? "default" : "outline"}
            size="xs"
            onClick={() => setActiveFilter("all")}
            className="rounded-full text-xs"
          >
            Todas ({answers.length})
          </Button>
          <Button
            variant={activeFilter === "errors" ? "default" : "outline"}
            size="xs"
            onClick={() => setActiveFilter("errors")}
            className={cn(
              "rounded-full text-xs",
              activeFilter === "errors"
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "text-rose-600 hover:bg-rose-50/10 border-rose-200 dark:border-rose-900",
            )}
          >
            Erros (
            {
              answers.filter(
                (a) =>
                  a.chosen_answer &&
                  a.chosen_answer.toUpperCase() !== a.question?.correct_answer?.toUpperCase(),
              ).length
            }
            )
          </Button>
          <Button
            variant={activeFilter === "correct" ? "default" : "outline"}
            size="xs"
            onClick={() => setActiveFilter("correct")}
            className={cn(
              "rounded-full text-xs",
              activeFilter === "correct"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "text-emerald-600 hover:bg-emerald-50/10 border-emerald-200 dark:border-emerald-900",
            )}
          >
            Acertos (
            {
              answers.filter(
                (a) =>
                  a.chosen_answer &&
                  a.chosen_answer.toUpperCase() === a.question?.correct_answer?.toUpperCase(),
              ).length
            }
            )
          </Button>
          <Button
            variant={activeFilter === "flagged" ? "default" : "outline"}
            size="xs"
            onClick={() => setActiveFilter("flagged")}
            className={cn(
              "rounded-full text-xs",
              activeFilter === "flagged"
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "text-amber-600 hover:bg-amber-50/10 border-amber-200 dark:border-amber-900",
            )}
          >
            Dúvidas ({answers.filter((a) => a.is_flagged).length})
          </Button>
        </div>
      </div>

      {/* Listagem de Questões */}
      {filteredAnswers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <HelpCircle className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma questão corresponde ao filtro selecionado.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredAnswers.map((ans, idx) => {
            const question = ans.question;
            if (!question) return null;

            const chosen = ans.chosen_answer?.toUpperCase() || null;
            const correct = question.correct_answer?.toUpperCase() || null;
            const isCorrect = correct && chosen === correct;
            const isUnanswered = !chosen;

            // Carregar alternativas
            let alternatives: Array<{ label: string; text: string }> = [];
            try {
              if (typeof question.alternatives === "string") {
                alternatives = JSON.parse(question.alternatives);
              } else if (Array.isArray(question.alternatives)) {
                alternatives = question.alternatives;
              }
            } catch (err) {
              console.error("Falha ao analisar as alternativas:", err);
            }

            return (
              <div
                key={ans.id}
                className={cn(
                  "bg-card border rounded-xl p-6 space-y-6 transition-all duration-200",
                  isUnanswered
                    ? "border-amber-500/20 bg-amber-500/[0.01]"
                    : isCorrect
                      ? "border-emerald-500/20 bg-emerald-500/[0.01]"
                      : "border-rose-500/20 bg-rose-500/[0.01]",
                )}
              >
                {/* Meta-informações da questão */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-foreground">QUESTÃO {idx + 1}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="bg-muted px-2 py-0.5 rounded text-muted-foreground font-medium uppercase tracking-wider">
                      {question.exam_board || "Banca Própria"}
                    </span>
                    {question.topic_id && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <span
                          className="text-primary font-medium truncate max-w-[150px]"
                          title={question.topic_id}
                        >
                          {question.topic_id}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Badges de Resultado de Resposta */}
                  <div className="flex items-center gap-2">
                    {ans.is_flagged && (
                      <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-medium border border-amber-500/20">
                        <Flag className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> Dúvida
                      </span>
                    )}
                    {isUnanswered ? (
                      <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded font-medium border border-amber-500/20">
                        <AlertCircle className="h-3.5 w-3.5" /> Em Branco
                      </span>
                    ) : isCorrect ? (
                      <span className="flex items-center gap-1 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-medium border border-emerald-500/20">
                        <Check className="h-3.5 w-3.5 stroke-[3px]" /> Correta
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded font-medium border border-rose-500/20">
                        <X className="h-3.5 w-3.5 stroke-[3px]" /> Incorreta
                      </span>
                    )}
                  </div>
                </div>

                {/* Enunciado */}
                <div className="text-foreground text-sm font-medium leading-relaxed whitespace-pre-wrap">
                  {question.statement}
                </div>

                {/* Alternativas */}
                <div className="space-y-2">
                  {alternatives.map((alt) => {
                    const isChosenOption = chosen === alt.label.toUpperCase();
                    const isCorrectOption = correct === alt.label.toUpperCase();

                    let optionBg = "bg-muted/10 border-border/80 hover:bg-muted/30";
                    let optionText = "text-foreground";
                    let icon = null;

                    if (isCorrectOption) {
                      optionBg = "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/40";
                      optionText = "text-emerald-700 dark:text-emerald-400 font-medium";
                      icon = (
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 stroke-[3px]" />
                      );
                    } else if (isChosenOption && !isCorrect) {
                      optionBg = "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/40";
                      optionText = "text-rose-700 dark:text-rose-400 font-medium";
                      icon = (
                        <X className="h-4 w-4 text-rose-600 dark:text-rose-400 stroke-[3px]" />
                      );
                    }

                    return (
                      <div
                        key={alt.label}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border text-xs leading-relaxed transition-all",
                          optionBg,
                          optionText,
                        )}
                      >
                        <span className="font-bold flex-shrink-0 mt-0.5">{alt.label})</span>
                        <div className="flex-grow">{alt.text}</div>
                        {icon && <div className="flex-shrink-0">{icon}</div>}
                      </div>
                    );
                  })}
                </div>

                {/* Histórico do Aluno e Feedback Temporal */}
                <div className="flex justify-between items-center bg-muted/20 border border-border/40 p-2 px-3 rounded-lg text-[11px] text-muted-foreground">
                  <span>
                    Tempo gasto na questão:{" "}
                    <strong className="text-foreground">{ans.time_spent_seconds || 0}s</strong>
                  </span>
                  {chosen && (
                    <span>
                      Sua resposta:{" "}
                      <strong className={isCorrect ? "text-emerald-600" : "text-rose-600"}>
                        {chosen}
                      </strong>
                    </span>
                  )}
                  <span>
                    Gabarito oficial: <strong className="text-emerald-600">{correct}</strong>
                  </span>
                </div>

                {/* Comentário do Professor / Fundamentação Legal */}
                {question.explanation && (
                  <div className="bg-primary/[0.02] border border-primary/15 rounded-lg p-4 space-y-2">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                      Explicação do Professor e Gabarito Comentado
                    </span>
                    <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {question.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
