import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Flag } from "lucide-react";
import { ExamAnswerWithQuestion } from "@/hooks/useExamRunner";

interface ExamConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  answers: ExamAnswerWithQuestion[];
  isSubmitting: boolean;
}

export function ExamConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  answers,
  isSubmitting,
}: ExamConfirmationModalProps) {
  const total = answers.length;
  const answered = answers.filter((a) => a.chosen_answer !== null && a.chosen_answer !== "").length;
  const unanswered = total - answered;
  const flagged = answers.filter((a) => a.is_flagged_for_review).length;

  const hasPendencies = unanswered > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-6 rounded-lg border border-border bg-card">
        <DialogHeader className="space-y-3 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2.5">
            {hasPendencies ? (
              <div className="p-2 rounded-full bg-amber-50 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
            ) : (
              <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
              </div>
            )}
            <DialogTitle className="text-lg font-bold text-foreground">
              {hasPendencies ? "Questões Pendentes Detectadas" : "Pronto para entregar?"}
            </DialogTitle>
          </div>

          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {hasPendencies
              ? "Você possui questões que ainda não foram respondidas. Ao enviar, elas contarão como erros ou em branco conforme as regras da prova."
              : "Parabéns! Todas as questões do simulado foram preenchidas. Deseja finalizar e submeter o simulado para análise?"}
          </DialogDescription>
        </DialogHeader>

        {/* Quadro de Status / Métricas */}
        <div className="grid grid-cols-3 gap-3 py-4 border-t border-b border-border my-2 text-center">
          <div className="bg-secondary/40 rounded-lg p-2.5">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
              Total
            </span>
            <span className="block text-xl font-bold text-foreground">{total}</span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-emerald-800">
              Respondidas
            </span>
            <span className="block text-xl font-bold text-emerald-700">{answered}</span>
          </div>
          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5">
            <span className="block text-[10px] uppercase tracking-wider font-semibold text-amber-800">
              Revisar
            </span>
            <span className="block text-xl font-bold text-amber-700 flex items-center justify-center gap-1">
              {flagged}
              {flagged > 0 && <Flag className="h-3 w-3 fill-current text-amber-500" />}
            </span>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            id="cancel-submit-btn"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto cursor-pointer"
          >
            Voltar para a Prova
          </Button>
          <Button
            variant={hasPendencies ? "destructive" : "default"}
            id="confirm-submit-btn"
            onClick={onConfirm}
            isLoading={isSubmitting}
            className="w-full sm:w-auto cursor-pointer"
          >
            Entregar Simulado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
