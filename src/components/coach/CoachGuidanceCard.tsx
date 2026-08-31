/**
 * COMPONENTE UI — CoachGuidanceCard (PROFESSOR FISCAL)
 *
 * Apresenta a orientação proativa do Coach no Dashboard.
 *
 * Exibe:
 *  - Situação pedagógica atual
 *  - Prioridade identificada pelos motores
 *  - O porquê da recomendação
 *  - Ação recomendada ("Faça agora")
 *  - Alerta do que evitar hoje
 *  - Próximo passo
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Target,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  ShieldCheck,
  Brain,
} from "lucide-react";
import { getDailyCoachGuidance } from "@/lib/coach/service";
import type { CoachGuidanceResult } from "@/lib/coach/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function CoachGuidanceCard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<CoachGuidanceResult>({
    queryKey: ["coach-daily-guidance"],
    queryFn: () => getDailyCoachGuidance(),
    staleTime: 1000 * 60 * 30, // 30 minutos
    refetchOnWindowFocus: false,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await getDailyCoachGuidance({ forceRefresh: true });
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  // 1. Estado de Carregamento
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">PROFESSOR FISCAL</h2>
              <p className="text-xs text-muted-foreground">
                Analisando dados pedagógicos em tempo real...
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  // 2. Estado de Erro
  if (isError || !data || data.status === "erro") {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">
              Não foi possível carregar a orientação do Professor Fiscal.
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  // 3. Estado de Dados Insuficientes
  if (data.status === "dados_insuficientes" || !data.hasEnoughData || !data.guidance) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">PROFESSOR FISCAL</h3>
            <p className="text-sm text-muted-foreground">
              Para receber orientação proativa personalizada, inicie sua primeira sessão de estudo
              ou resolva questões de diagnóstico.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const g = data.guidance;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 via-card to-card p-6 shadow-sm transition-all hover:shadow-md">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary p-2 text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-foreground">
                PROFESSOR FISCAL
              </h2>
              <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
                Proativo
              </Badge>
              {data.cached && (
                <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                  <ShieldCheck className="mr-1 h-3 w-3 text-emerald-500" />
                  Cache V7.2
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{g.headline}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-8 text-xs text-muted-foreground hover:text-foreground"
          title="Atualizar orientação pedagógica"
        >
          <RotateCcw className={`mr-1.5 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Corpo com Grid de Orientação */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Bloco 1: Prioridade Determinística & Motivo */}
        <div className="space-y-3 rounded-lg border border-border/40 bg-background/50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Target className="h-4 w-4" />
            <span>Foco Prioritário</span>
          </div>
          <div className="text-base font-bold text-foreground">{g.priorityTopic}</div>
          <p className="text-xs leading-relaxed text-muted-foreground">{g.reason}</p>
        </div>

        {/* Bloco 2: Ação Recomendada (Faça Agora) */}
        <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Lightbulb className="h-4 w-4" />
            <span>Faça Agora</span>
          </div>
          <div className="text-sm font-semibold text-foreground">{g.recommendedAction}</div>
          {g.secondaryAction && (
            <p className="text-xs text-muted-foreground">{g.secondaryAction}</p>
          )}
        </div>
      </div>

      {/* Rodapé: O que evitar & Próximo Passo */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <strong className="font-semibold text-foreground">Evite hoje:</strong> {g.avoid}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-primary">
          <span className="font-medium">Depois: {g.nextStep}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
}
