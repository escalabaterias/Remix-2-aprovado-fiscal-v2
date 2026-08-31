/**
 * COMPONENTE UI — CognitiveCycleInteractiveView (Fase 8)
 *
 * Renderiza o fluxo interativo do Orquestrador Unificado do Ciclo Cognitivo (Fase 7.7),
 * conectando a interface real do aluno às Ações Pedagógicas e Telemetria (Fase 7.8).
 *
 * INVARIANTES ARQUITETURAIS:
 * 1. O FRONTEND NÃO POSSUI AUTORIDADE PEDAGÓGICA. O componente apenas renderiza e interpreta
 *    o `executionMode`, `pedagogicalDecision`, `stepPlan`, `artifact` e `socraticContext`
 *    retornados pelos motores determinísticos (Decision Engine e Artifacts Engine).
 * 2. AUSÊNCIA DE EVIDÊNCIA PASSIVA: A simples renderização/exibição deste componente NUNCA
 *    gera evidência cognitiva. Evidências são registradas SOMENTE após interação ativa do aluno
 *    via `processCognitiveCycleInteraction`.
 * 3. SUBMISSÃO IDEMPOTENTE: Bloqueia duplos cliques / submissões concorrentes e preserva a
 *    `idempotencyKey` da orquestração.
 * 4. GROUNDING JURÍDICO: Exibe citações normativas RAG anti-alucinação quando aplicável.
 */

import React, { useState } from "react";
import {
  Sparkles,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Brain,
  BookOpen,
  HelpCircle,
  RotateCcw,
  ArrowRight,
  Check,
  X,
  ShieldCheck,
  Send,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

import type {
  CognitiveCycleStepPlan,
  CognitiveCycleInteractionResult,
  CognitiveExecutionMode,
} from "@/lib/cognitive-cycle/types";
import { processCognitiveCycleInteraction } from "@/lib/cognitive-cycle/engine";

import { AdaptiveStudyArtifact } from "./AdaptiveStudyArtifact";
import { ProfessorFiscalSocraticTutor } from "./ProfessorFiscalSocraticTutor";

export interface CognitiveCycleInteractiveViewProps {
  stepPlan: CognitiveCycleStepPlan;
  onInteractionComplete?: (result: CognitiveCycleInteractionResult) => void;
  onContinue?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function CognitiveCycleInteractiveView({
  stepPlan,
  onInteractionComplete,
  onContinue,
  isLoading = false,
  className = "",
}: CognitiveCycleInteractiveViewProps) {
  const [userAnswerInput, setUserAnswerInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interactionResult, setInteractionResult] =
    useState<CognitiveCycleInteractionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. ESTADO DE CARREGAMENTO
  if (isLoading) {
    return (
      <Card className={`border-primary/30 p-6 space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg" />
      </Card>
    );
  }

  const {
    userId,
    topicId,
    topicName,
    subjectId,
    subjectName,
    pedagogicalDecision,
    executionMode,
    artifactResult,
    socraticContext,
    legalGrounding,
    fallbackTriggered,
    fallbackReason,
    idempotencyKey,
  } = stepPlan;

  // Handler idempotente para submissão de respostas nos modos padrão (standard_practice, review, direct_study)
  const handleGenericSubmission = async (overrideResponse?: string) => {
    // Trava de submissão concorrente / duplo clique
    if (isSubmitting) return;

    const textToSubmit = overrideResponse ?? userAnswerInput;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await processCognitiveCycleInteraction({
        userId,
        topicId,
        subjectId,
        stepPlan,
        userResponse: textToSubmit || "Estudo concluído",
        idempotencyKey: `int-${idempotencyKey}`,
      });

      setInteractionResult(result);
      if (onInteractionComplete) {
        onInteractionComplete(result);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Não foi possível registrar sua interação.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rótulo amigável para a Ação Pedagógica Decidida pelo Decision Engine
  const getActionBadgeLabel = (action: string) => {
    switch (action) {
      case "REMEDIATION":
      case "REVISAR_ERRO_GRAVE":
        return "Remediação Adaptativa";
      case "SOCRATIC":
      case "EXPLICACAO_SOCRATICA":
        return "Diálogo Socrático Guiado";
      case "ACTIVE_RECALL":
        return "Recuperação Ativa";
      case "GERAR_ARTEFATO_COGNITIVO":
        return "Artefato Cognitivo";
      case "PRACTICE":
      case "PRATICAR_QUESTOES":
        return "Prática de Questões";
      case "NEW_CONTENT":
        return "Conteúdo Novo";
      case "REVIEW":
      case "CONSOLIDATION":
      case "REVISAR_ESPACADO":
        return "Revisão Espaçada";
      default:
        return action;
    }
  };

  const modeBadgeInfo = (mode: CognitiveExecutionMode) => {
    switch (mode) {
      case "artifact":
        return {
          label: "Modo Artefato Adaptativo",
          color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
        };
      case "socratic":
        return {
          label: "Modo Tutor Socrático",
          color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
        };
      case "standard_practice":
        return {
          label: "Modo Prática Dirigida",
          color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
        };
      case "review":
        return {
          label: "Modo Revisão Ativa",
          color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
        };
      case "direct_study":
        return {
          label: "Modo Estudo Direto",
          color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30",
        };
    }
  };

  const modeInfo = modeBadgeInfo(executionMode);

  return (
    <Card
      className={`border-primary/30 bg-card shadow-sm space-y-0 relative overflow-hidden ${className}`}
    >
      {/* Visual Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-emerald-500" />

      {/* HEADER UNIFICADO DO CICLO COGNITIVO */}
      <CardHeader className="pb-3 border-b border-border/60">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                {subjectName}
              </span>
              <Badge variant="outline" className={`text-[10px] font-semibold ${modeInfo.color}`}>
                {modeInfo.label}
              </Badge>
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold bg-primary/10 text-primary"
              >
                {getActionBadgeLabel(pedagogicalDecision.primaryAction)}
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold text-foreground">{topicName}</CardTitle>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {legalGrounding && legalGrounding.legalGrounded && (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] gap-1"
                data-testid="legal-rag-badge"
              >
                <Scale className="h-3 w-3" />
                Grounding Jurídico ({legalGrounding.sourceCount} fonte
                {legalGrounding.sourceCount > 1 ? "s" : ""})
              </Badge>
            )}
            {interactionResult && (
              <Badge
                variant="outline"
                className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs gap-1"
                data-testid="evidence-recorded-badge"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Evidência Registrada
              </Badge>
            )}
          </div>
        </div>

        {/* Citações de Grounding Jurídico quando presente */}
        {legalGrounding && legalGrounding.citations && legalGrounding.citations.length > 0 && (
          <div className="mt-2.5 p-2.5 rounded-md bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Fundamentação Legal (Grounding RAG):</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
              {legalGrounding.citations.slice(0, 3).map((cit, idx) => (
                <li key={idx} className="truncate">
                  <strong className="text-foreground">{cit.sourceTitle}:</strong> {cit.excerpt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Alerta de Fallback Gracioso Determinístico */}
        {fallbackTriggered && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-md border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>{fallbackReason || "Executando em modo de segurança determinístico."}</span>
          </div>
        )}
      </CardHeader>

      {/* CORPO DE EXECUÇÃO — SEGUNDO O MODO RETORNADO PELO ENGINE */}
      <CardContent className="pt-4 space-y-4">
        {/* MODO 1: ARTIFACT */}
        {executionMode === "artifact" && (
          <div data-testid="mode-artifact-container">
            <AdaptiveStudyArtifact
              artifact={artifactResult?.generatedArtifact}
              pedagogicalAction={pedagogicalDecision.primaryAction}
              userId={userId}
              topicId={topicId}
              subjectId={subjectId}
              onInteractionComplete={(artRes) => {
                const stepResult: CognitiveCycleInteractionResult = {
                  success: true,
                  evidenceResult: artRes.evidenceResult,
                  artifactInteractionResult: artRes,
                  socraticResponse: null,
                  errorCentralUpdated: false,
                  reviewUpdated: false,
                  nextPedagogicalAction: "REVIEW",
                  guidanceSummary: artRes.statusMessage,
                  idempotencyKey: `int-${idempotencyKey}`,
                  completedAt: new Date().toISOString(),
                };
                setInteractionResult(stepResult);
                if (onInteractionComplete) onInteractionComplete(stepResult);
              }}
              onSkipOrContinue={onContinue}
            />
          </div>
        )}

        {/* MODO 2: SOCRATIC */}
        {executionMode === "socratic" && (
          <div data-testid="mode-socratic-container">
            <ProfessorFiscalSocraticTutor
              topicId={topicId}
              topicName={topicName}
              subjectName={subjectName || undefined}
              initialSocraticContext={socraticContext || undefined}
              onSessionComplete={() => {
                handleGenericSubmission("Sessão socrática concluída com sucesso.");
              }}
            />
          </div>
        )}

        {/* MODO 3: STANDARD PRACTICE */}
        {executionMode === "standard_practice" && (
          <div className="space-y-4" data-testid="mode-practice-container">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Brain className="h-4 w-4" />
                <span>Treino Intensivo de Prática</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                Aplicação direta de conhecimento para a matéria{" "}
                <strong className="text-primary">{subjectName}</strong> — tópico{" "}
                <strong className="text-primary">{topicName}</strong>. Resolva ou responda a questão
                abaixo de memória.
              </p>

              <div className="space-y-2 pt-2">
                <Textarea
                  value={userAnswerInput}
                  onChange={(e) => setUserAnswerInput(e.target.value)}
                  placeholder="Escreva sua resposta, justificativa ou gabarito do treino..."
                  className="min-h-[80px] text-xs resize-none"
                  disabled={isSubmitting || Boolean(interactionResult)}
                />
              </div>
            </div>
          </div>
        )}

        {/* MODO 4: REVIEW */}
        {executionMode === "review" && (
          <div className="space-y-4" data-testid="mode-review-container">
            <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                <RotateCcw className="h-4 w-4" />
                <span>Revisão Espaçada de Curva de Esquecimento</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                Este tópico requer manutenção periódica para evitar esquecimento. Relembre os pontos
                principais e confirme seu nível de domínio.
              </p>

              <div className="space-y-2 pt-2">
                <Textarea
                  value={userAnswerInput}
                  onChange={(e) => setUserAnswerInput(e.target.value)}
                  placeholder="Resuma os pontos principais do tópico de cabeça..."
                  className="min-h-[80px] text-xs resize-none"
                  disabled={isSubmitting || Boolean(interactionResult)}
                />
              </div>
            </div>
          </div>
        )}

        {/* MODO 5: DIRECT STUDY */}
        {executionMode === "direct_study" && (
          <div className="space-y-4" data-testid="mode-direct-container">
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
              <div className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <BookOpen className="h-4 w-4" />
                <span>Estudo Teórico Dirigido</span>
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                Você está iniciando um novo conteúdo do edital em{" "}
                <strong className="text-primary">{subjectName}</strong>. Faça a leitura atenta da
                legislação/teoria e registre suas impressões iniciais.
              </p>

              <div className="space-y-2 pt-2">
                <Textarea
                  value={userAnswerInput}
                  onChange={(e) => setUserAnswerInput(e.target.value)}
                  placeholder="Anote dúvidas ou conceitos-chave estudados..."
                  className="min-h-[80px] text-xs resize-none"
                  disabled={isSubmitting || Boolean(interactionResult)}
                />
              </div>
            </div>
          </div>
        )}

        {/* MENSAGEM DE ERRO NA INTERAÇÃO */}
        {errorMessage && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </CardContent>

      {/* FOOTER & CONTROLES DE SUBMISSÃO */}
      {["standard_practice", "review", "direct_study"].includes(executionMode) && (
        <CardFooter className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
          {!interactionResult ? (
            <div className="w-full flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Submeta sua resposta para registrar evidência cognitiva real.
              </span>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleGenericSubmission("Preciso revisar mais")}
                  className="text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10 gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  Dificuldade
                </Button>
                <Button
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => handleGenericSubmission()}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  data-testid="submit-interaction-btn"
                >
                  <Check className="h-3.5 w-3.5" />
                  {isSubmitting ? "Registrando..." : "Concluir Etapa"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between gap-3 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/30 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{interactionResult.guidanceSummary}</span>
              </div>

              {onContinue && (
                <Button size="sm" onClick={onContinue} className="text-xs gap-1.5 shrink-0">
                  Próxima Atividade
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
