import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ExamAnswerWithQuestion } from "@/hooks/useExamRunner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Flag, MessageSquare, EyeOff, Check, X } from "lucide-react";

interface ExamQuestionCardProps {
  answer: ExamAnswerWithQuestion;
  eliminatedAlternatives: string[];
  onSelectAnswer: (choice: string | null) => void;
  onToggleFlag: () => void;
  onToggleEliminate: (letter: string) => void;
}

export function ExamQuestionCard({
  answer,
  eliminatedAlternatives,
  onSelectAnswer,
  onToggleFlag,
  onToggleEliminate,
}: ExamQuestionCardProps) {
  const { question } = answer;
  const [notes, setNotes] = useState<string>(() => {
    return localStorage.getItem(`exam_note_${answer.id}`) || "";
  });
  const [showNotes, setShowNotes] = useState(false);

  // Sincronizar anotações com o localStorage
  const handleNotesChange = (text: string) => {
    setNotes(text);
    localStorage.setItem(`exam_note_${answer.id}`, text);
  };

  useEffect(() => {
    setNotes(localStorage.getItem(`exam_note_${answer.id}`) || "");
  }, [answer.id]);

  if (!question) {
    return (
      <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center min-h-[300px]">
        <p className="text-muted-foreground text-sm">Dados da questão indisponíveis.</p>
      </div>
    );
  }

  // Parse das alternativas (que podem vir como string JSON ou objeto)
  let parsedAlternatives: Array<{ label: string; text: string }> = [];
  try {
    if (typeof question.alternatives === "string") {
      parsedAlternatives = JSON.parse(question.alternatives);
    } else if (Array.isArray(question.alternatives)) {
      parsedAlternatives = question.alternatives;
    }
  } catch (err) {
    console.error("Erro ao ler alternativas da questão:", err);
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6 transition-all duration-200">
      {/* Cabeçalho da Questão */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            Questão {answer.position}
          </span>
          {question.exam_board && (
            <span className="text-xs text-muted-foreground ml-2">
              Banca: <span className="font-medium text-foreground">{question.exam_board}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            id={`notes-toggle-btn-${answer.id}`}
            onClick={() => setShowNotes(!showNotes)}
            className={cn(
              "h-8 text-xs cursor-pointer",
              (showNotes || notes.trim()) && "bg-secondary text-secondary-foreground",
            )}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            Anotações {notes.trim() ? "•" : ""}
          </Button>

          <Button
            variant="outline"
            size="sm"
            id={`flag-toggle-btn-${answer.id}`}
            onClick={onToggleFlag}
            className={cn(
              "h-8 text-xs cursor-pointer",
              answer.is_flagged_for_review &&
                "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
            )}
          >
            <Flag
              className={cn("h-3.5 w-3.5 mr-1.5", answer.is_flagged_for_review && "fill-current")}
            />
            Revisar
          </Button>
        </div>
      </div>

      {/* Enunciado */}
      <div className="space-y-3">
        <p className="text-foreground text-base leading-relaxed whitespace-pre-wrap font-medium">
          {question.statement}
        </p>
      </div>

      {/* Caixa de Anotações */}
      {showNotes && (
        <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 space-y-2">
          <label className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <MessageSquare className="h-3 w-3" />
            Minhas Anotações Rascunho:
          </label>
          <Textarea
            value={notes}
            id={`notes-textarea-${answer.id}`}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Digite aqui observações relevantes, fórmulas ou justificativas desta questão..."
            className="min-h-[80px] bg-background border-amber-200 focus:border-amber-300 focus:ring-amber-200 text-sm"
          />
        </div>
      )}

      {/* Alternativas */}
      <div className="space-y-3">
        {parsedAlternatives.map((alt) => {
          const letter = alt.label.toUpperCase();
          const isSelected = answer.chosen_answer === letter;
          const isEliminated = eliminatedAlternatives.includes(letter);

          return (
            <div
              key={letter}
              className={cn(
                "group relative flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer select-none",
                isSelected && "border-primary bg-primary/5 text-foreground ring-1 ring-primary",
                !isSelected &&
                  !isEliminated &&
                  "border-border hover:border-input hover:bg-secondary/40",
                isEliminated &&
                  "border-border/60 bg-secondary/20 opacity-40 line-through text-muted-foreground",
              )}
              onClick={() => {
                if (!isEliminated) {
                  onSelectAnswer(isSelected ? null : letter);
                }
              }}
            >
              {/* Círculo Letra / Check */}
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input group-hover:border-primary/50 bg-background",
                )}
              >
                {isSelected ? <Check className="h-3.5 w-3.5" /> : letter}
              </div>

              {/* Texto Alternativa */}
              <div className="flex-1 text-sm leading-relaxed whitespace-pre-wrap">{alt.text}</div>

              {/* Ações de Linha: Botão Riscar */}
              <Button
                variant="ghost"
                size="sm"
                id={`eliminate-btn-${letter}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleEliminate(letter);
                }}
                className={cn(
                  "opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-all",
                  isEliminated && "opacity-100 text-primary",
                )}
                title={isEliminated ? "Restaurar alternativa" : "Eliminar visualmente"}
              >
                <EyeOff className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
