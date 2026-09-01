import { useEffect, useState } from "react";
import {
  Bot,
  Sparkles,
  X,
  Minimize2,
  Maximize2,
  Send,
  BrainCircuit,
  ShieldAlert,
  Lightbulb,
} from "lucide-react";
import { useCoachDrawer } from "./CoachContext";
import { CoachPanel } from "./CoachPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function CoachDrawerWidget() {
  const { isOpen, contextData, closeCoach, toggleCoach } = useCoachDrawer();
  const [isExpanded, setIsExpanded] = useState(false);

  // Auto scroll to drawer on open if needed
  useEffect(() => {
    if (isOpen) {
      // Keep drawer in view
    }
  }, [isOpen]);

  return (
    <>
      {/* Botão Flutuante Omnipresente do Coach IA */}
      <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 print:hidden">
        {!isOpen && (
          <button
            type="button"
            onClick={toggleCoach}
            className="group relative flex items-center gap-2.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 px-4 py-3 text-white shadow-xl shadow-emerald-950/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-emerald-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-200"></span>
            </span>
            <Bot className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
            <span className="font-display text-sm font-semibold tracking-wide">Coach IA</span>
            <Sparkles className="h-4 w-4 text-emerald-200 animate-pulse" />
          </button>
        )}
      </div>

      {/* Drawer Lateral Retrátil */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-xs print:hidden animate-in fade-in duration-200">
          {/* Backdrop Click */}
          <div className="fixed inset-0" onClick={closeCoach} aria-hidden="true" />

          {/* Drawer Container */}
          <div
            className={cn(
              "relative z-10 flex h-full flex-col border-l border-border/80 bg-card shadow-2xl transition-all duration-300",
              isExpanded ? "w-full md:w-[700px] lg:w-[850px]" : "w-full sm:w-[450px] md:w-[500px]",
            )}
          >
            {/* Header do Drawer */}
            <div className="flex items-center justify-between border-b border-border/70 px-4 py-3.5 bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-base font-semibold text-foreground">
                      Coach IA Fiscal
                    </h2>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px]"
                    >
                      Onipresente
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Análise em tempo real de questões, edital e ciclos
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setIsExpanded((prev) => !prev)}
                  title={isExpanded ? "Recolher largura" : "Expandir largura"}
                >
                  {isExpanded ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={closeCoach}
                  title="Fechar Coach IA"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Context Notice Banner (if opened with specific question/banca context) */}
            {contextData &&
              (contextData.statement || contextData.examBoard || contextData.customPrompt) && (
                <div className="bg-emerald-950/20 border-b border-emerald-500/20 px-4 py-2.5 flex items-start gap-2 text-xs">
                  <BrainCircuit className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-emerald-300">
                      Contexto Ativo:{" "}
                      {contextData.examBoard
                        ? `Banca ${contextData.examBoard}`
                        : "Análise em Tempo Real"}
                      {contextData.topicName ? ` • ${contextData.topicName}` : ""}
                    </p>
                    {contextData.statement && (
                      <p className="text-muted-foreground line-clamp-1 italic mt-0.5">
                        "{contextData.statement}"
                      </p>
                    )}
                  </div>
                </div>
              )}

            {/* Conteúdo Principal do Coach */}
            <div className="flex-1 overflow-y-auto p-4">
              <CoachPanel initialCustomPrompt={contextData?.customPrompt} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
