/**
 * COMPONENTE UI — ProfessorFiscalSocraticTutor
 *
 * Exibe o diálogo pedagógico socrático do PROFESSOR FISCAL
 * com fundamentação jurídica RAG durante a resolução de questões,
 * sessões de estudo, revisão e saneamento de erros.
 */

import { useState } from "react";
import {
  Sparkles,
  Send,
  Lightbulb,
  Scale,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import type { SocraticSessionContext, SocraticResponse } from "@/lib/socratic/types";
import type { LegalEvidenceMetadata } from "@/lib/legal/types";
import {
  executeStudySocraticTurn,
  startStudySocraticSession,
} from "@/lib/socratic/study-integration";

export type ProfessorFiscalSocraticTutorProps = {
  topicId: string;
  topicName: string;
  subjectName?: string;
  questionContext?: {
    questionId?: string;
    statement: string;
    options?: string[];
    correctAnswer?: string;
    targetConcept?: string;
  };
  errorEntryId?: string;
  initialSocraticContext?: SocraticSessionContext;
  onSessionComplete?: () => void;
};

export function ProfessorFiscalSocraticTutor({
  topicId,
  topicName,
  subjectName,
  questionContext,
  errorEntryId,
  initialSocraticContext,
  onSessionComplete,
}: ProfessorFiscalSocraticTutorProps) {
  const [socraticContext, setSocraticContext] = useState<SocraticSessionContext>(() => {
    return (
      initialSocraticContext ||
      startStudySocraticSession({
        topicId,
        topicName,
        subjectName,
        questionContext,
        errorContext: errorEntryId
          ? { errorEntryId, errorCategory: "compreensao_conceitual" }
          : undefined,
      })
    );
  });

  const [studentAnswerInput, setStudentAnswerInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<SocraticResponse | null>(null);
  const [legalMeta, setLegalMeta] = useState<LegalEvidenceMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCompleted =
    socraticContext.currentState === "COMPLETED" ||
    currentResponse?.action === "COMPLETE" ||
    currentResponse?.action === "CONSOLIDATE";

  const handleSendReasoning = async (customAnswerText?: string) => {
    const textToSend = customAnswerText || studentAnswerInput;
    if (!textToSend.trim() && socraticContext.turnHistory.length > 0) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await executeStudySocraticTurn({
        socraticContext,
        studentAnswerText: textToSend,
      });

      setSocraticContext(result.socraticResult.updatedContext);
      setCurrentResponse(result.socraticResult.response);
      setLegalMeta(result.socraticResult.legalEvidenceMetadata || null);
      setStudentAnswerInput("");

      if (result.consolidated && onSessionComplete) {
        onSessionComplete();
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Não foi possível obter resposta do Professor Fiscal.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestHint = () => {
    handleSendReasoning("Professor, preciso de uma pista para entender este conceito.");
  };

  const stateBadgeLabel = (state: SocraticSessionContext["currentState"]) => {
    switch (state) {
      case "QUESTION":
      case "WAITING_FOR_ANSWER":
        return "Instigando";
      case "HINT_1":
        return "Pista 1 de 3";
      case "HINT_2":
        return "Pista 2 de 3";
      case "HINT_3":
        return "Pista 3 de 3";
      case "REFORMULATING":
        return "Reformulando";
      case "CORRECTING":
        return "Explicando";
      case "CONSOLIDATING":
      case "COMPLETED":
        return "Consolidado";
      default:
        return "Ativo";
    }
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-b from-primary/5 via-card to-card shadow-sm transition-all">
      <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary p-2 text-primary-foreground shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-foreground tracking-tight">
                PROFESSOR FISCAL
              </CardTitle>
              <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                {stateBadgeLabel(socraticContext.currentState)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">{topicName}</p>
          </div>
        </div>

        {legalMeta && legalMeta.legalGrounded && (
          <Badge
            variant="secondary"
            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] gap-1"
          >
            <Scale className="h-3 w-3" />
            Grounding Jurídico ({legalMeta.sourceCount} fonte{legalMeta.sourceCount > 1 ? "s" : ""})
          </Badge>
        )}
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Histórico recente de turnos */}
        {socraticContext.turnHistory.length > 0 && (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {socraticContext.turnHistory.map((turn, idx) => (
              <div key={idx} className="space-y-2 text-xs">
                {turn.studentAnswerText && (
                  <div className="flex justify-end">
                    <div className="bg-primary/10 text-foreground border border-primary/20 rounded-lg px-3 py-2 max-w-[85%]">
                      <span className="font-semibold block text-[10px] text-primary mb-0.5">
                        Seu Raciocínio:
                      </span>
                      {turn.studentAnswerText}
                    </div>
                  </div>
                )}

                {(turn.questionOrHintText || turn.explanationText) && (
                  <div className="flex justify-start">
                    <div className="bg-muted/60 border border-border/60 text-foreground rounded-lg px-3 py-2 max-w-[90%] space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
                        <Sparkles className="h-3 w-3" />
                        <span>Professor Fiscal</span>
                        {turn.hintLevel > 0 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                            Pista {turn.hintLevel}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed whitespace-pre-wrap">
                        {turn.questionOrHintText || turn.explanationText}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Mensagem atual do Professor Fiscal se nenhuma resposta no histórico ainda */}
        {socraticContext.turnHistory.length === 0 && !isLoading && (
          <div className="rounded-lg bg-muted/40 p-3.5 border border-border/50 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-primary">
              <Lightbulb className="h-4 w-4" />
              <span>Diálogo Socrático Ativo</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Olá! Sou o Professor Fiscal. Vamos analisar o raciocínio por trás de{" "}
              <strong className="text-foreground">{topicName}</strong>. Clique em "Pedir Pista" ou
              digite sua dúvida/raciocínio abaixo.
            </p>
          </div>
        )}

        {/* Estado de carregamento */}
        {isLoading && (
          <div className="space-y-2 p-3 rounded-lg border border-border/40 bg-background/50">
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Professor Fiscal analisando fundamentação jurídica...</span>
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {/* Alerta de Erro */}
        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Área de Entrada / Ações */}
        {!isCompleted && (
          <div className="space-y-2 pt-2">
            <Textarea
              value={studentAnswerInput}
              onChange={(e) => setStudentAnswerInput(e.target.value)}
              placeholder="Digite sua dúvida ou seu raciocínio sobre a questão..."
              className="min-h-[70px] text-xs resize-none"
              disabled={isLoading}
            />

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestHint}
                disabled={isLoading}
                className="text-xs h-8 text-primary border-primary/30 hover:bg-primary/10 gap-1.5"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                Pedir Pista
              </Button>

              <Button
                size="sm"
                onClick={() => handleSendReasoning()}
                disabled={
                  isLoading ||
                  (!studentAnswerInput.trim() && socraticContext.turnHistory.length === 0)
                }
                className="text-xs h-8 gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Enviar Raciocínio
              </Button>
            </div>
          </div>
        )}

        {/* Estado Concluído / Consolidado */}
        {isCompleted && (
          <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              Conceito consolidado com sucesso pelo Professor Fiscal com fundamentação nas normas!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
