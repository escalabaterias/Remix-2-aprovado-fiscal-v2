/**
 * COMPONENTE UI — AdaptiveStudyArtifact (Fase 7.6.4)
 *
 * Exibe o artefato cognitivo recomendado (MNEMONIC, MIND_MAP, FLASHCARD, SUMMARY,
 * COMPARISON_TABLE, ACTIVE_RECALL) e gerencia a experiência de estudo do aluno,
 * garantindo a geração de evidência real apenas após a interação pedagógica.
 *
 * REGRAS DE NEGÓCIO:
 * - O tipo exibido é exclusivamente o `artifactKind` decidido pelo Artifacts Engine.
 * - Nenhuma evidência é registrada na simples exibição/renderização.
 * - Evidência registrada SOMENTE após interação válida via `processArtifactInteraction()`.
 * - Exibe grounding jurídico quando aplicável.
 * - Falhas não interrompem o fluxo de estudo normal do aluno.
 */

import React, { useState } from "react";
import {
  Sparkles,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Brain,
  Layers,
  Table,
  HelpCircle,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Check,
  X,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

import type { GeneratedArtifact } from "@/lib/artifacts/generation-types";
import type { PedagogicalAction } from "@/lib/decision/types";
import type { ArtifactKind } from "@/lib/artifacts/types";
import {
  processArtifactInteraction,
  type ArtifactInteractionResult,
  type ArtifactUserResponse,
} from "@/lib/artifacts/interaction";

export interface AdaptiveStudyArtifactProps {
  artifact?: GeneratedArtifact | null;
  pedagogicalAction?: PedagogicalAction;
  userId: string;
  topicId: string;
  subjectId?: string | null;
  onInteractionComplete?: (result: ArtifactInteractionResult) => void;
  onSkipOrContinue?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  className?: string;
}

export function AdaptiveStudyArtifact({
  artifact,
  pedagogicalAction = "REMEDIATION",
  userId,
  topicId,
  subjectId,
  onInteractionComplete,
  onSkipOrContinue,
  isLoading = false,
  errorMessage = null,
  className = "",
}: AdaptiveStudyArtifactProps) {
  // Estados interativos por tipo de artefato
  const [flashcardRevealed, setFlashcardRevealed] = useState(false);
  const [activeRecallAnswer, setActiveRecallAnswer] = useState("");
  const [activeRecallRevealed, setActiveRecallRevealed] = useState(false);

  // Estado de submissão e resultado da interação
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interactionResult, setInteractionResult] = useState<ArtifactInteractionResult | null>(
    null,
  );

  // 1. ESTADO DE CARREGAMENTO (LOADING)
  if (isLoading) {
    return (
      <Card variant="solid" className={`border-primary/30 p-6 space-y-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full rounded-lg" />
        <div className="flex justify-end gap-2 pt-2">
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </Card>
    );
  }

  // 2. ESTADO DE ERRO OU DADOS AUSENTES
  if (errorMessage || !artifact || !artifact.content) {
    return (
      <Card
        variant="solid"
        className={`border-amber-500/30 bg-amber-500/5 p-6 text-center space-y-3 ${className}`}
      >
        <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
        <h3 className="font-semibold text-foreground text-sm">Artefato de Estudo Indisponível</h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          {errorMessage || "Não foi possível carregar o artefato adaptativo recomendado."}
        </p>
        {onSkipOrContinue && (
          <Button size="sm" variant="outline" onClick={onSkipOrContinue} className="mt-2">
            Continuar Estudo Normal
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </Card>
    );
  }

  const { artifactKind, title, content, grounded, sourceContext } = artifact;

  // Handler unificado de interações pedagógicas reais
  const handleUserInteraction = async (
    interactionType: "comprehended" | "flashcard_recall" | "active_recall_answer",
    userResponse: ArtifactUserResponse,
  ) => {
    setIsSubmitting(true);
    try {
      const res = await processArtifactInteraction({
        userId,
        topicId,
        subjectId,
        artifactId: artifact.artifactId,
        artifactKind,
        pedagogicalAction,
        interactionType,
        userResponse,
      });

      setInteractionResult(res);
      if (onInteractionComplete) {
        onInteractionComplete(res);
      }
    } catch (err) {
      // Falhas na interação nunca interrompem o fluxo
      console.warn("Aviso na interação com artefato:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ícone representativo por tipo de artefato
  const getKindBadgeInfo = (kind: ArtifactKind) => {
    switch (kind) {
      case "MNEMONIC":
        return {
          label: "Mnemônico",
          icon: Brain,
          color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
        };
      case "MIND_MAP":
        return {
          label: "Mapa Mental",
          icon: Layers,
          color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
        };
      case "FLASHCARD":
        return {
          label: "Flashcard",
          icon: RotateCcw,
          color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
        };
      case "SUMMARY":
        return {
          label: "Síntese",
          icon: FileText,
          color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
        };
      case "COMPARISON_TABLE":
        return {
          label: "Quadro Comparativo",
          icon: Table,
          color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
        };
      case "ACTIVE_RECALL":
        return {
          label: "Recuperação Ativa",
          icon: HelpCircle,
          color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
        };
    }
  };

  const kindInfo = getKindBadgeInfo(artifactKind);
  const KindIcon = kindInfo.icon;

  return (
    <Card className={`border-primary/30 bg-card shadow-sm relative overflow-hidden ${className}`}>
      {/* Accent Header Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-emerald-500" />

      {/* HEADER DO ARTEFATO */}
      <CardHeader className="pb-3 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <KindIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] font-semibold ${kindInfo.color}`}>
                {kindInfo.label}
              </Badge>
              {grounded && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] gap-1"
                >
                  <Scale className="h-3 w-3" />
                  Grounding Jurídico
                </Badge>
              )}
            </div>
            <CardTitle className="text-base font-bold text-foreground mt-0.5">{title}</CardTitle>
          </div>
        </div>

        {interactionResult && (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Evidência Registrada
          </Badge>
        )}
      </CardHeader>

      {/* CONTEÚDO ESPECÍFICO PELO TIPO DE ARTEFATO */}
      <CardContent className="pt-4 space-y-4">
        {/* Visão geral/resumo opcional */}
        {content.summaryOrOverview && (
          <p className="text-xs text-muted-foreground leading-relaxed bg-muted/40 p-3 rounded-md border border-border/40">
            {content.summaryOrOverview}
          </p>
        )}

        {/* 1. MNEMONIC */}
        {artifactKind === "MNEMONIC" && content.mnemonic && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Palavra-Chave Mnemônica
                </span>
                <span className="font-mono text-xl font-extrabold tracking-widest text-purple-700 dark:text-purple-300">
                  {content.mnemonic.word}
                </span>
              </div>

              {/* Expansão das Letras */}
              <div className="grid gap-2 sm:grid-cols-2">
                {content.mnemonic.expansion.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-background/80 p-2 rounded-md border border-border/60"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-500 text-white font-mono text-xs font-bold">
                      {item.letter}
                    </span>
                    <span className="text-xs text-foreground font-medium truncate">
                      {item.meaning}
                    </span>
                  </div>
                ))}
              </div>

              {/* Explicação pedagógica */}
              <p className="text-xs text-muted-foreground pt-1 border-t border-purple-500/20">
                <strong className="text-foreground">Aplicação:</strong>{" "}
                {content.mnemonic.explanation}
              </p>
            </div>
          </div>
        )}

        {/* 2. MIND MAP */}
        {artifactKind === "MIND_MAP" && content.mindMap && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-3">
              <div className="text-center p-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm shadow-xs">
                🎯 {content.mindMap.centralNode}
              </div>

              {/* Nós Hierárquicos */}
              <div className="grid gap-2 sm:grid-cols-2">
                {content.mindMap.nodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-2.5 rounded-md bg-background border border-border/70 space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{node.label}</span>
                      {node.relationship && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 border-blue-500/30 text-blue-600"
                        >
                          {node.relationship}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. FLASHCARD */}
        {artifactKind === "FLASHCARD" && content.flashcard && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                Conceito: {content.flashcard.keyConcept}
              </span>

              {/* Frente do Card */}
              <div className="py-3 px-4 rounded-lg bg-background border border-border text-foreground font-medium text-sm sm:text-base">
                {content.flashcard.front}
              </div>

              {/* Botão de Revelar Verso */}
              {!flashcardRevealed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFlashcardRevealed(true)}
                  className="mt-2 text-amber-600 border-amber-500/40 hover:bg-amber-500/10 gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  Revelar Verso do Card
                </Button>
              )}

              {/* Verso Revelado */}
              {flashcardRevealed && (
                <div className="pt-3 border-t border-amber-500/20 space-y-3 animate-in fade-in duration-200">
                  <span className="text-xs font-semibold text-muted-foreground block">
                    Resposta / Verso:
                  </span>
                  <div className="p-3.5 rounded-lg bg-amber-500/10 text-foreground text-xs leading-relaxed text-left border border-amber-500/20">
                    {content.flashcard.back}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. SUMMARY */}
        {artifactKind === "SUMMARY" && content.summary && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
              {/* Pontos-Chave */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Pontos Fundamentais
                </span>
                <ul className="space-y-1 text-xs text-foreground list-disc pl-4">
                  {content.summary.keyPoints.map((pt, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Regra Central */}
              <div className="p-3 rounded-lg bg-background border border-emerald-500/30 text-xs">
                <strong className="text-emerald-600 dark:text-emerald-400 block mb-0.5">
                  Regra Geral:
                </strong>
                <p className="text-foreground">{content.summary.coreRule}</p>
              </div>

              {/* Exceções se houver */}
              {content.summary.exceptions && content.summary.exceptions.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200">
                  <strong className="block mb-0.5">Exceções Importantes:</strong>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {content.summary.exceptions.map((exc, idx) => (
                      <li key={idx}>{exc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. COMPARISON TABLE */}
        {artifactKind === "COMPARISON_TABLE" && content.comparisonTable && (
          <div className="space-y-3 overflow-x-auto">
            <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-3 min-w-[320px]">
              <div className="grid grid-cols-3 gap-2 text-xs font-bold border-b border-cyan-500/30 pb-2">
                <span className="text-muted-foreground">Característica</span>
                <span className="text-cyan-600 dark:text-cyan-400">
                  {content.comparisonTable.conceptA}
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  {content.comparisonTable.conceptB}
                </span>
              </div>

              {content.comparisonTable.rows.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-3 gap-2 text-xs py-1.5 border-b border-border/40 last:border-none"
                >
                  <span className="font-medium text-foreground">{row.feature}</span>
                  <span className="text-muted-foreground bg-background/60 p-1.5 rounded border border-border/50">
                    {row.valA}
                  </span>
                  <span className="text-muted-foreground bg-background/60 p-1.5 rounded border border-border/50">
                    {row.valB}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. ACTIVE RECALL */}
        {artifactKind === "ACTIVE_RECALL" && content.activeRecall && (
          <div className="space-y-3">
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                Prática de Recuperação Ativa
              </span>

              {content.activeRecall.promptQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-3 rounded-lg bg-background border border-border space-y-2"
                >
                  <p className="text-xs font-semibold text-foreground">❓ {q.question}</p>
                  {q.hint && !activeRecallRevealed && (
                    <p className="text-[11px] text-muted-foreground italic">Dica: {q.hint}</p>
                  )}
                </div>
              ))}

              {/* Área de resposta do aluno */}
              <div className="space-y-2">
                <Textarea
                  value={activeRecallAnswer}
                  onChange={(e) => setActiveRecallAnswer(e.target.value)}
                  placeholder="Escreva sua resposta de memória antes de revelar a solução..."
                  className="min-h-[70px] text-xs resize-none"
                  disabled={interactionResult !== null || isSubmitting}
                />
              </div>

              {!activeRecallRevealed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveRecallRevealed(true)}
                  disabled={!activeRecallAnswer.trim()}
                  className="text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10 gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Verificar / Revelar Solução
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* FOOTER & AÇÕES DE INTERAÇÃO PEDAGÓGICA */}
      <CardFooter className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
        {/* Estado sem resposta ainda */}
        {!interactionResult && (
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              Interaja com o artefato para registrar sua evidência cognitiva.
            </span>

            <div className="flex items-center gap-2">
              {artifactKind === "FLASHCARD" && flashcardRevealed && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                    Autoavaliação:
                  </span>
                  {[
                    {
                      rating: 1,
                      label: "Não lembrei",
                      color: "border-red-500/40 text-red-500 hover:bg-red-500/10",
                    },
                    {
                      rating: 3,
                      label: "Parcial",
                      color: "border-amber-500/40 text-amber-500 hover:bg-amber-500/10",
                    },
                    {
                      rating: 5,
                      label: "Domínio Total",
                      color: "border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10",
                    },
                  ].map((btn) => (
                    <Button
                      key={btn.rating}
                      size="sm"
                      variant="outline"
                      disabled={isSubmitting}
                      onClick={() =>
                        handleUserInteraction("flashcard_recall", {
                          flashcardSelfRating: btn.rating,
                        })
                      }
                      className={`text-xs h-8 px-2.5 ${btn.color}`}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
              )}

              {artifactKind === "ACTIVE_RECALL" && activeRecallRevealed && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() =>
                      handleUserInteraction("active_recall_answer", {
                        comprehended: false,
                        answerText: activeRecallAnswer,
                      })
                    }
                    className="text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10 gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    Preciso Reforçar
                  </Button>
                  <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() =>
                      handleUserInteraction("active_recall_answer", {
                        comprehended: true,
                        answerText: activeRecallAnswer,
                      })
                    }
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Resposta Correta
                  </Button>
                </div>
              )}

              {["MNEMONIC", "MIND_MAP", "SUMMARY", "COMPARISON_TABLE"].includes(artifactKind) && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isSubmitting}
                    onClick={() => handleUserInteraction("comprehended", { comprehended: false })}
                    className="text-xs border-amber-500/40 text-amber-600 hover:bg-amber-500/10 gap-1"
                  >
                    <X className="h-3.5 w-3.5" />
                    Tenho Dúvidas
                  </Button>
                  <Button
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleUserInteraction("comprehended", { comprehended: true })}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Compreendi
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Estado após interação concluída */}
        {interactionResult && (
          <div className="w-full flex items-center justify-between gap-3 bg-emerald-500/5 p-2.5 rounded-lg border border-emerald-500/30 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>Interação concluída! {interactionResult.statusMessage}</span>
            </div>

            {onSkipOrContinue && (
              <Button size="sm" onClick={onSkipOrContinue} className="text-xs gap-1.5 shrink-0">
                Continuar
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
