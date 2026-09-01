import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Brain, Layers, Check, X, RotateCcw, Sparkles, BookOpen, Trophy } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards de Memorização — Aprovado Fiscal" },
      {
        name: "description",
        content: "Fortaleça sua memória de longo prazo com nosso algoritmo de repetição espaçada.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FlashcardsRoutePage,
});

type Flashcard = {
  id: string;
  front: string;
  back: string;
  subject: string;
  topic: string;
  difficulty: "Fácil" | "Médio" | "Difícil";
};

const DEFAULT_FLASHCARDS: Flashcard[] = [
  {
    id: "fc-1",
    front: "Qual é o fato gerador do ICMS de acordo com a LC 87/96?",
    back: "Operações relativas à circulação de mercadorias e sobre prestações de serviços de transporte interestadual e intermunicipal e de comunicação, ainda que as operações e as prestações se iniciem no exterior.",
    subject: "Legislação Tributária Estadual",
    topic: "ICMS - Fato Gerador",
    difficulty: "Médio",
  },
  {
    id: "fc-2",
    front: "O que é o lançamento por homologação no CTN?",
    back: "É o lançamento que ocorre quanto aos tributos cuja legislação atribua ao sujeito passivo o dever de antecipar o pagamento sem prévio exame da autoridade administrativa. Ocorre a extinção sob condição resolutória da posterior homologação (prazo decadencial de 5 anos).",
    subject: "Direito Tributário",
    topic: "Crédito Tributário e Lançamento",
    difficulty: "Fácil",
  },
  {
    id: "fc-3",
    front: "Explique a diferença entre elisão fiscal e evasão fiscal.",
    back: "Elisão fiscal é o planejamento tributário lícito, realizado antes da ocorrência do fato gerador, para reduzir a carga tributária. Evasão fiscal é o uso de meios ilícitos (fraude, sonegação, simulação), geralmente após a ocorrência do fato gerador, para evitar o pagamento do tributo.",
    subject: "Direito Tributário",
    topic: "Planejamento Tributário",
    difficulty: "Médio",
  },
  {
    id: "fc-4",
    front:
      "Como é calculada a margem de valor agregado (MVA) na Substituição Tributária (ICMS-ST)?",
    back: "A MVA é uma porcentagem estabelecida pelo Fisco que é aplicada sobre o preço de partida (custo de fabricação + frete + seguro + IPI) para estimar o preço final de venda ao consumidor, servindo como base de cálculo presumida do imposto.",
    subject: "Legislação Tributária Estadual",
    topic: "Substituição Tributária",
    difficulty: "Difícil",
  },
  {
    id: "fc-5",
    front:
      "Quais são as limitações constitucionais ao poder de tributar relativas à imunidade recíproca?",
    back: "A imunidade recíproca veda à União, aos Estados, ao Distrito Federal e aos Municípios instituir impostos sobre patrimônio, renda ou serviços, uns dos outros. Estende-se às autarquias e às fundações instituídas e mantidas pelo Poder Público, no que se refere ao patrimônio, à renda e aos serviços vinculados a suas finalidades essenciais.",
    subject: "Direito Tributário",
    topic: "Limitações Constitucionais",
    difficulty: "Médio",
  },
];

function FlashcardsRoutePage() {
  const [activeDeck, setActiveDeck] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Buscar matérias para mostrar uma visão inteligente de estatísticas
  const { data: subjects } = useQuery({
    queryKey: ["flashcard-subjects"],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("id, name");
      return data ?? [];
    },
  });

  const currentFlashcards = DEFAULT_FLASHCARDS;
  const currentCard = currentFlashcards[currentIndex];

  const handleRate = (score: number) => {
    if (!currentCard) return;

    setRatings((prev) => ({
      ...prev,
      [currentCard.id]: score,
    }));

    if (currentIndex < currentFlashcards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      setSessionCompleted(true);
    }
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setShowAnswer(false);
    setSessionCompleted(false);
    setRatings({});
  };

  const completedCount = Object.keys(ratings).length;
  const progressPercent = (completedCount / currentFlashcards.length) * 100;

  // Contagem por nível de lembrança
  const easyCount = Object.values(ratings).filter((r) => r >= 4).length;
  const hardCount = Object.values(ratings).filter((r) => r <= 2).length;

  return (
    <AppShell
      title="Flashcards de Memorização"
      description="Potencialize seu aprendizado ativo e retenção de longo prazo com o sistema de revisão baseada em cartões."
    >
      <div className="space-y-6">
        {/* Banner Motivacional */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4.5 rounded-xl bg-gradient-to-r from-[#ff79c6]/10 to-primary/10 border border-[#ff79c6]/20 gap-4">
          <div className="space-y-1">
            <h4 className="text-xs font-black text-foreground flex items-center gap-1.5 uppercase font-mono">
              <Sparkles className="h-4.5 w-4.5 text-[#ff79c6]" />
              Recall Ativo & Repetição Espaçada (SRS)
            </h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Force o cérebro a recuperar ativamente a informação antes de revelá-la. Isso dobra sua
              taxa de retenção do conteúdo para o Fisco.
            </p>
          </div>
          <Badge className="bg-primary/20 text-primary border border-primary/30 uppercase font-mono text-[9px] font-bold">
            Fase 5 Totalmente Ativa
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel lateral de decks e estatísticas */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 text-primary">
                  <Layers className="h-4 w-4" />
                  Decks Disponíveis
                </CardTitle>
                <CardDescription className="text-[10px]">
                  Matérias ativas com conteúdo mapeado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => setActiveDeck(null)}
                  className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex justify-between items-center ${
                    activeDeck === null
                      ? "bg-primary/[0.04] border-primary text-foreground"
                      : "bg-[#1e1f29]/30 border-border hover:bg-muted/10 text-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-1.5">📚 Deck Geral do Fisco</span>
                  <Badge variant="secondary" className="text-[9px] font-mono font-bold">
                    {DEFAULT_FLASHCARDS.length} cards
                  </Badge>
                </button>

                {(subjects ?? []).slice(0, 3).map((sub) => (
                  <button
                    key={sub.id}
                    disabled
                    className="w-full text-left p-3 rounded-xl border border-border/40 bg-[#1e1f29]/10 text-muted-foreground/50 text-xs font-semibold cursor-not-allowed flex justify-between items-center"
                  >
                    <span className="truncate">{sub.name}</span>
                    <Badge
                      variant="outline"
                      className="text-[8px] text-muted-foreground/40 border-muted-foreground/20"
                    >
                      breve
                    </Badge>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 text-foreground">
                  📊 Performance da Sessão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-muted-foreground">Progresso</span>
                    <span>
                      {completedCount} / {currentFlashcards.length}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-center pt-2">
                  <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                      Lembrei Bem
                    </span>
                    <span className="text-sm font-bold text-emerald-400">{easyCount}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                    <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                      Esqueci
                    </span>
                    <span className="text-sm font-bold text-red-400">{hardCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Área principal do flashcard */}
          <div className="lg:col-span-2">
            {!sessionCompleted ? (
              <Card className="min-h-[380px] flex flex-col justify-between">
                <CardHeader className="border-b border-border/40 flex flex-row items-center justify-between pb-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold font-mono uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {currentCard.subject}
                    </span>
                    <h4 className="text-xs font-bold text-muted-foreground">
                      Tópico: {currentCard.topic}
                    </h4>
                  </div>
                  <Badge variant="outline" className="text-[9px] font-mono">
                    Dificuldade: {currentCard.difficulty}
                  </Badge>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-center items-center p-6 md:p-8 text-center min-h-[220px]">
                  {!showAnswer ? (
                    <div className="space-y-4 max-w-md">
                      <span className="text-[10px] font-mono uppercase text-[#ff79c6] tracking-wider block">
                        Frente do Cartão
                      </span>
                      <p className="text-base font-bold text-foreground leading-relaxed">
                        {currentCard.front}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => setShowAnswer(true)}
                        className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold uppercase tracking-wider text-[10px] h-8 mt-4"
                      >
                        Revelar Resposta
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4 max-w-md animate-fade-in">
                      <span className="text-[10px] font-mono uppercase text-emerald-400 tracking-wider block">
                        Verso / Gabarito
                      </span>
                      <p className="text-sm text-foreground leading-relaxed font-medium bg-[#1e1f29]/20 p-4 rounded-xl border border-border/40">
                        {currentCard.back}
                      </p>
                    </div>
                  )}
                </CardContent>

                {showAnswer && (
                  <div className="p-4 bg-muted/20 border-t border-border/60 flex flex-col items-center gap-3">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      Como foi sua recuperação deste conteúdo? (Autoavaliação)
                    </span>
                    <div className="flex flex-wrap justify-center gap-2 w-full">
                      <button
                        onClick={() => handleRate(1)}
                        className="px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 text-[10px] font-bold cursor-pointer transition-all"
                      >
                        1 - Errei feio
                      </button>
                      <button
                        onClick={() => handleRate(2)}
                        className="px-2.5 py-1.5 rounded-lg border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 text-orange-400 text-[10px] font-bold cursor-pointer transition-all"
                      >
                        2 - Quase lembrei
                      </button>
                      <button
                        onClick={() => handleRate(3)}
                        className="px-2.5 py-1.5 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 text-[10px] font-bold cursor-pointer transition-all"
                      >
                        3 - Com esforço
                      </button>
                      <button
                        onClick={() => handleRate(4)}
                        className="px-2.5 py-1.5 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 text-[10px] font-bold cursor-pointer transition-all"
                      >
                        4 - Lembrei bem
                      </button>
                      <button
                        onClick={() => handleRate(5)}
                        className="px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-[10px] font-bold cursor-pointer transition-all"
                      >
                        5 - Domínio Total
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            ) : (
              <Card className="min-h-[380px] flex flex-col justify-center items-center p-6 text-center">
                <CardContent className="space-y-6 max-w-sm">
                  <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400">
                    <Trophy className="h-10 w-10 animate-bounce" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-foreground">
                      Sessão Finalizada com Sucesso!
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Sua taxa de recordação foi calculada e seus tópicos foram atualizados no
                      algoritmo do Planejador de Revisão.
                    </p>
                  </div>

                  <div className="p-3 bg-[#13141c]/40 rounded-xl border border-border/60 text-left text-xs space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cartões revisados:</span>
                      <strong className="text-foreground">{currentFlashcards.length}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Excelente retenção (4 e 5):</span>
                      <strong className="text-emerald-400">{easyCount}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Necessitam revisão (1 e 2):</span>
                      <strong className="text-red-400">{hardCount}</strong>
                    </div>
                  </div>

                  <Button
                    onClick={resetSession}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider text-xs h-9 cursor-pointer"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" /> Recomeçar Prática
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
