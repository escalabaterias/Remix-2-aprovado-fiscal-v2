import { cn } from "@/lib/utils";
import { ExamAnswerWithQuestion } from "@/hooks/useExamRunner";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";

interface ExamNavigationPanelProps {
  answers: ExamAnswerWithQuestion[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
}

export function ExamNavigationPanel({
  answers,
  currentIndex,
  onSelectIndex,
}: ExamNavigationPanelProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-sm text-foreground">Navegador de Questões</h3>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
        {answers.map((ans, idx) => {
          const isCurrent = idx === currentIndex;
          const isAnswered = ans.chosen_answer !== null && ans.chosen_answer !== "";
          const isFlagged = ans.is_flagged_for_review;

          return (
            <Button
              key={ans.id}
              variant="outline"
              size="sm"
              id={`nav-btn-${idx}`}
              onClick={() => onSelectIndex(idx)}
              className={cn(
                "relative h-10 w-10 p-0 text-xs font-semibold rounded-md border transition-all cursor-pointer",
                isCurrent &&
                  "ring-2 ring-primary ring-offset-2 border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                !isCurrent &&
                  isAnswered &&
                  "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
                !isCurrent &&
                  !isAnswered &&
                  isFlagged &&
                  "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
                !isCurrent &&
                  !isAnswered &&
                  !isFlagged &&
                  "bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80",
              )}
            >
              {idx + 1}
              {isFlagged && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 text-[8px] text-white font-bold ring-1 ring-background">
                  <Flag className="h-2 w-2 fill-current text-white" />
                </span>
              )}
            </Button>
          );
        })}
      </div>

      <div className="pt-2 border-t border-border flex flex-col gap-1.5 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-emerald-50 border border-emerald-200 inline-block" />
          <span>Respondida</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-amber-50 border border-amber-200 inline-block" />
          <span>Marcada para Revisão</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-secondary inline-block" />
          <span>Não respondida</span>
        </div>
      </div>
    </div>
  );
}
