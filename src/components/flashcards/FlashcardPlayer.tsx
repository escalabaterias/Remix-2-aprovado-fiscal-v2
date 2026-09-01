import React, { useEffect, useId, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Flame,
  GraduationCap,
  RotateCcw,
  RotateCw,
  Sparkles,
  Tag,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateSM2,
  filterDueCards,
  formatIntervalLabel,
  getDeckSummaries,
} from "@/lib/flashcards/spacedRepetitionEngine";
import { answerFlashcard, getFlashcards, resetFlashcardProgress } from "@/lib/flashcards/service";
import type { Flashcard, ReviewRating } from "@/lib/flashcards/types";
import { CreateFlashcardDialog } from "./CreateFlashcardDialog";

export function FlashcardPlayer() {
  const subjectSelectId = useId();
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [sessionReviewedCount, setSessionReviewedCount] = useState<number>(0);
  const [ratingStats, setRatingStats] = useState<Record<ReviewRating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  // Carrega cartões
  const reloadCards = () => {
    const all = getFlashcards();
    setCards(all);
  };

  useEffect(() => {
    reloadCards();
  }, []);

  // Filtra por matéria selecionada e verifica os devido no dia
  const filteredCards = cards.filter((c) => {
    if (selectedSubject === "all") return true;
    return c.subject === selectedSubject;
  });

  const dueCards = filterDueCards(filteredCards);
  const currentCard: Flashcard | undefined = dueCards[currentIndex];

  const totalDue = dueCards.length;
  const isFinished = totalDue === 0 || currentIndex >= totalDue;

  // Resumo por decks
  const deckSummaries = getDeckSummaries(cards);
  const allSubjects = Array.from(new Set(cards.map((c) => c.subject)));

  // Virar a carta
  const handleFlip = React.useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  // Responder a carta (SM-2)
  const handleAnswer = React.useCallback(
    (rating: ReviewRating) => {
      if (!currentCard) return;

      // Atualiza SM-2 no serviço
      answerFlashcard(currentCard.id, rating);

      // Atualiza estatísticas locais da sessão
      setSessionReviewedCount((prev) => prev + 1);
      setRatingStats((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

      // Reset estado da carta para o próximo
      setIsFlipped(false);
      reloadCards();
    },
    [currentCard],
  );

  // Reiniciar cartão
  const handleResetCard = () => {
    if (!currentCard) return;
    resetFlashcardProgress(currentCard.id);
    setIsFlipped(false);
    reloadCards();
  };

  // Suporte a Atalhos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Evita atalhos se o foco estiver em um input ou textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        if (!isFinished) {
          handleFlip();
        }
      } else if (isFlipped && !isFinished) {
        if (e.key === "1") handleAnswer("again");
        if (e.key === "2") handleAnswer("hard");
        if (e.key === "3") handleAnswer("good");
        if (e.key === "4") handleAnswer("easy");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, isFinished, handleFlip, handleAnswer]);

  // Previsão dos intervalos para a carta atual
  const sm2Predictions = currentCard
    ? {
        again: calculateSM2(currentCard, "again"),
        hard: calculateSM2(currentCard, "hard"),
        good: calculateSM2(currentCard, "good"),
        easy: calculateSM2(currentCard, "easy"),
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Barra de Ferramentas / Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Revisão Espaçada de Flashcards (SM-2)
            </h2>
            <p className="text-xs text-muted-foreground">
              {totalDue > 0
                ? `${totalDue} ${totalDue === 1 ? "cartão devido" : "cartões devidos"} hoje`
                : "Todos os cartões em dia!"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Matéria */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger id={subjectSelectId} className="w-[180px] text-xs">
                <SelectValue placeholder="Todas as matérias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Matérias</SelectItem>
                {allSubjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <CreateFlashcardDialog
            onCardCreated={() => {
              reloadCards();
            }}
          />
        </div>
      </div>

      {/* Grade de Decks de Matérias */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {deckSummaries.map((summary) => (
          <button
            key={summary.subject}
            type="button"
            onClick={() => {
              setSelectedSubject(summary.subject);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className={`panel text-left p-3.5 transition-all hover:border-primary/50 cursor-pointer ${
              selectedSubject === summary.subject
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground truncate max-w-[120px]">
                {summary.subject}
              </span>
              <Badge
                variant={summary.dueCards > 0 ? "default" : "outline"}
                className="text-[10px] px-1.5 py-0"
              >
                {summary.dueCards} devidos
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Total: {summary.totalCards}</span>
              {summary.newCards > 0 && (
                <span className="text-emerald-400 font-mono">+{summary.newCards} novos</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Progresso da Sessão */}
      {!isFinished && totalDue > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="label-eyebrow">
              Cartão {currentIndex + 1} de {totalDue}
            </span>
            <span className="font-mono text-xs text-foreground">
              {Math.round(((currentIndex + 1) / totalDue) * 100)}% concluído
            </span>
          </div>
          <Progress value={((currentIndex + 1) / totalDue) * 100} className="h-1.5" />
        </div>
      )}

      {/* ÁREA DO PLAYER DE FLASHCARD */}
      {!isFinished && currentCard ? (
        <div className="space-y-4">
          {/* Card Flip Container */}
          <div
            onClick={handleFlip}
            className="group relative min-h-[320px] sm:min-h-[360px] w-full cursor-pointer rounded-xl border border-border bg-card p-6 shadow-xl transition-all duration-300 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary select-none"
            role="button"
            tabIndex={0}
            aria-label="Clique para virar o cartão"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") handleFlip();
            }}
          >
            {/* Header da Carta: Matéria & Tags */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-muted/50 text-xs font-mono">
                  {currentCard.subject}
                </Badge>
                {currentCard.lawTagId && (
                  <Badge variant="secondary" className="gap-1 text-[11px] font-mono">
                    <Tag className="h-3 w-3" />
                    {currentCard.lawTagId}
                  </Badge>
                )}
                {currentCard.errorEntryId && (
                  <Badge variant="destructive" className="gap-1 text-[11px]">
                    <Flame className="h-3 w-3" />
                    Do Caderno de Erros
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                <span title="Fator de Facilidade SM-2">EF: {currentCard.easeFactor}</span>
                <span title="Repetições bem-sucedidas">Rep: {currentCard.repetitions}</span>
              </div>
            </div>

            {/* Conteúdo da Carta (Frente / Verso) */}
            <div className="flex flex-col items-center justify-center min-h-[200px] py-6 text-center">
              {!isFlipped ? (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <span className="label-eyebrow text-primary">FRENTE — CONCEITO / PERGUNTA</span>
                  <h3 className="font-display text-xl sm:text-2xl font-medium text-foreground leading-relaxed max-w-2xl">
                    {currentCard.frontContent}
                  </h3>
                  <p className="text-xs text-muted-foreground pt-4 flex items-center justify-center gap-1.5">
                    <RotateCw className="h-3.5 w-3.5" />
                    Clique ou pressione{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">
                      Espaço
                    </kbd>{" "}
                    para ver a resposta
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-in zoom-in-95 fade-in duration-200">
                  <span className="label-eyebrow text-emerald-400">
                    VERSO — FUNDAMENTAÇÃO / RESPOSTA
                  </span>
                  <p className="text-base sm:text-lg text-foreground leading-relaxed whitespace-pre-line max-w-2xl font-sans">
                    {currentCard.backContent}
                  </p>
                </div>
              )}
            </div>

            {/* Rodapé da Carta com Ações Auxiliares */}
            <div className="flex items-center justify-between pt-4 border-t border-border/50 text-xs text-muted-foreground">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetCard();
                }}
                className="flex items-center gap-1 hover:text-foreground text-[11px] cursor-pointer"
                title="Resetar parâmetros deste cartão"
              >
                <RotateCcw className="h-3 w-3" />
                Resetar SM-2
              </button>

              <span className="text-[11px]">
                {isFlipped ? "Avalie o grau de facilidade abaixo:" : "Toque no cartão para revelar"}
              </span>
            </div>
          </div>

          {/* Botões de Avaliação do Algoritmo SM-2 */}
          {isFlipped ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 animate-in slide-in-from-bottom-2 duration-200">
              {/* De novo (1) */}
              <Button
                variant="destructive"
                className="flex flex-col h-auto py-3 px-2 gap-1 cursor-pointer"
                onClick={() => handleAnswer("again")}
                id="sm2-btn-again"
              >
                <div className="flex items-center gap-1 font-semibold text-sm">
                  <span>1. De novo</span>
                </div>
                <span className="text-[11px] opacity-90 font-mono">
                  {sm2Predictions ? formatIntervalLabel(sm2Predictions.again.interval) : "1 dia"}
                </span>
              </Button>

              {/* Difícil (2) */}
              <Button
                variant="secondary"
                className="flex flex-col h-auto py-3 px-2 gap-1 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                onClick={() => handleAnswer("hard")}
                id="sm2-btn-hard"
              >
                <div className="flex items-center gap-1 font-semibold text-sm">
                  <span>2. Difícil</span>
                </div>
                <span className="text-[11px] opacity-90 font-mono">
                  {sm2Predictions ? formatIntervalLabel(sm2Predictions.hard.interval) : "3 dias"}
                </span>
              </Button>

              {/* Bom (3) */}
              <Button
                variant="default"
                className="flex flex-col h-auto py-3 px-2 gap-1 bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                onClick={() => handleAnswer("good")}
                id="sm2-btn-good"
              >
                <div className="flex items-center gap-1 font-semibold text-sm">
                  <span>3. Bom</span>
                </div>
                <span className="text-[11px] opacity-90 font-mono">
                  {sm2Predictions ? formatIntervalLabel(sm2Predictions.good.interval) : "6 dias"}
                </span>
              </Button>

              {/* Fácil (4) */}
              <Button
                variant="default"
                className="flex flex-col h-auto py-3 px-2 gap-1 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                onClick={() => handleAnswer("easy")}
                id="sm2-btn-easy"
              >
                <div className="flex items-center gap-1 font-semibold text-sm">
                  <span>4. Fácil</span>
                </div>
                <span className="text-[11px] opacity-90 font-mono">
                  {sm2Predictions ? formatIntervalLabel(sm2Predictions.easy.interval) : "10 dias"}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              className="w-full py-6 text-base font-medium gap-2 cursor-pointer"
              onClick={handleFlip}
              id="flip-flashcard-main-btn"
            >
              <RotateCw className="h-4 w-4" />
              Revelar Resposta (Espaço / Clique)
            </Button>
          )}

          {/* Navegação Manual entre cartões devidos */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => {
                setCurrentIndex((prev) => Math.max(0, prev - 1));
                setIsFlipped(false);
              }}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <span className="font-mono text-[11px]">
              {currentIndex + 1} de {totalDue}
            </span>

            <Button
              variant="ghost"
              size="sm"
              disabled={currentIndex >= totalDue - 1}
              onClick={() => {
                setCurrentIndex((prev) => Math.min(totalDue - 1, prev + 1));
                setIsFlipped(false);
              }}
              className="gap-1 text-xs"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        /* SESSÃO CONCLUÍDA */
        <div className="panel p-8 text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-2xl font-bold text-foreground">
              Revisão Diária Concluída!
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Você revisou todos os flashcards pendentes para o momento. A repetição espaçada
              agendou automaticamente o retorno do conteúdo conforme seu desempenho.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto sm:grid-cols-4">
            <div className="p-3 rounded-lg bg-card border border-border text-center">
              <span className="label-eyebrow text-destructive">De novo</span>
              <p className="font-display text-xl font-semibold mt-1">{ratingStats.again}</p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border text-center">
              <span className="label-eyebrow text-amber-400">Difícil</span>
              <p className="font-display text-xl font-semibold mt-1">{ratingStats.hard}</p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border text-center">
              <span className="label-eyebrow text-blue-400">Bom</span>
              <p className="font-display text-xl font-semibold mt-1">{ratingStats.good}</p>
            </div>
            <div className="p-3 rounded-lg bg-card border border-border text-center">
              <span className="label-eyebrow text-emerald-400">Fácil</span>
              <p className="font-display text-xl font-semibold mt-1">{ratingStats.easy}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentIndex(0);
                setIsFlipped(false);
                reloadCards();
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Revisar Novamente
            </Button>
            <CreateFlashcardDialog
              onCardCreated={() => {
                reloadCards();
                setCurrentIndex(0);
                setIsFlipped(false);
              }}
              triggerBtn={
                <Button className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Criar Novo Flashcard
                </Button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
