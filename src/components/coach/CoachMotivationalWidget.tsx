import { useState } from "react";
import { Quote, Flame, Sparkles, Award, ShieldAlert, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CoachMotivationalWidgetProps {
  accuracy?: number | null;
  daysToExam?: number | null;
  contestName?: string | null;
  completedTasksToday?: number;
  totalTasksToday?: number;
}

const FISCAL_MOTIVATIONAL_QUOTES = [
  {
    author: "Prof. Gustavo — Mentor Fiscal",
    text: "O teto constitucional da carreira fiscal não é conquistado por quem estuda 12h em um dia, mas por quem estuda com constância inabalável todos os dias.",
    context: "Conselho Diário de Alta Performance",
  },
  {
    author: "Profª. Helena — Especialista em Legislação Tributária",
    text: "Legislação Tributária Estadual e Contabilidade Avançada são os 2 pilares da sua posse. Domine os detalhes da lei seca e a prática de lançamentos sem medo dos cálculos.",
    context: "Estratégia de Prova SEFAZ/Receita",
  },
  {
    author: "Prof. Ricardo — Auditor Fiscal",
    text: "Em bancas como a FGV, uma questão de auditoria com caso prático pode valer a sua vaga. Leia cada enunciado como um caso real de fiscalização.",
    context: "Mentalidade de Prova e Resolução",
  },
  {
    author: "Coach Fiscal Aprovado",
    text: "Se você cumpriu seu bloco hoje, comemore! Cada questão resolvida e cada artigo revisado do CTN aprova você um passo à frente da concorrência.",
    context: "Encorajamento Operacional",
  },
];

export function CoachMotivationalWidget({
  accuracy,
  daysToExam,
  contestName,
  completedTasksToday = 0,
  totalTasksToday = 0,
}: CoachMotivationalWidgetProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);

  const currentQuote = FISCAL_MOTIVATIONAL_QUOTES[quoteIndex % FISCAL_MOTIVATIONAL_QUOTES.length];

  const handleNextQuote = () => {
    setQuoteIndex((prev) => prev + 1);
  };

  // Mensagem personalizada por contexto do aluno
  let statusBadge = "Foco & Disciplina";
  let contextualTip =
    "A constância supera a intensidade desordenada. Siga o ciclo hoje com precisão.";

  if (daysToExam !== null && daysToExam !== undefined && daysToExam <= 60) {
    statusBadge = `Reta Final: ${daysToExam} dias para a prova`;
    contextualTip =
      "Foco total em baterias de questões da banca oficial e revisão das LawTags de maior incidência no edital.";
  } else if (accuracy !== null && accuracy !== undefined) {
    if (accuracy >= 80) {
      statusBadge = `Rendimento Alto: ${accuracy.toFixed(0)}% de acertos`;
      contextualTip =
        "Excelente domínio! Mantenha a rotina de questões para fixar os detalhes mais sutis da jurisprudência.";
    } else if (accuracy < 65) {
      statusBadge = `Atenção Pedagógica: ${accuracy.toFixed(0)}% de acertos`;
      contextualTip =
        "Utilize a Central de Erros para remediar os tópicos frágeis. Cada erro corrigido hoje é um ponto na prova real.";
    }
  }

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-primary/20 bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-800 p-5 text-white shadow-md relative overflow-hidden">
        {/* Adorno sutil de fundo estilo executivo */}
        <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold tracking-tight text-white">
                  Coach Fiscal Motivacional
                </span>
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-[10px]"
                >
                  {statusBadge}
                </Badge>
              </div>
              <p className="text-xs text-slate-300">
                {contestName
                  ? `Preparação Alvo: ${contestName}`
                  : "Orientação Diária para Carreiras Fiscais"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-xs text-slate-300 border border-white/10">
                  <Flame className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                  <span>
                    Ritmo Hoje: {completedTasksToday}/{totalTasksToday} metas
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-900 border-slate-700 text-slate-200 text-xs max-w-xs">
                Progresso diário no ciclo cognitivo. Concluir metas parciais atualiza o ritmo
                semanal sem empurrar tarefas em bola de neve.
              </TooltipContent>
            </Tooltip>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextQuote}
              className="h-7 text-xs text-slate-300 hover:text-white hover:bg-white/10"
            >
              Outro conselho
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          <div className="md:col-span-2 space-y-2">
            <div className="flex items-start gap-2">
              <Quote className="h-5 w-5 text-emerald-400 shrink-0 opacity-70 mt-0.5" />
              <p className="text-sm font-medium italic text-slate-100 leading-relaxed">
                "{currentQuote.text}"
              </p>
            </div>
            <p className="text-xs text-emerald-400/90 font-medium pl-7">
              — {currentQuote.author} ·{" "}
              <span className="text-slate-400 font-normal">{currentQuote.context}</span>
            </p>
          </div>

          <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
              <Award className="h-3.5 w-3.5" />
              <span>Direcionamento Estratégico</span>
            </div>
            <p className="text-xs text-slate-200 leading-normal">{contextualTip}</p>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
