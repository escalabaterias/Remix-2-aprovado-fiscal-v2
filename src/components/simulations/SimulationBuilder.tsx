import React, { useState } from "react";
import { SimulationConfig } from "@/lib/simulations/types";
import { FISCAL_SUBJECTS } from "@/lib/simulations/simulationEngine";
import { Sparkles, Trophy, Settings, Play, Sliders, Hourglass, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SimulationBuilderProps {
  onStartSimulation: (config: SimulationConfig) => void;
}

export const SimulationBuilder: React.FC<SimulationBuilderProps> = ({ onStartSimulation }) => {
  const [targetExam, setTargetExam] = useState<"SEFAZ" | "RECEITA" | "ISS">("SEFAZ");
  const [board, setBoard] = useState<"FGV" | "CEBRASPE" | "FCC">("FGV");
  const [totalQuestions, setTotalQuestions] = useState<number>(10);
  const [durationMinutes, setDurationMinutes] = useState<number>(30);

  // Pesos/Proporção de questões por disciplina
  const [weights, setWeights] = useState<Record<string, number>>({
    "DIR-TRIB": 40,
    CONTAB: 30,
    RLM: 30,
  });

  const handleWeightChange = (subjectId: string, val: number) => {
    setWeights((prev) => ({
      ...prev,
      [subjectId]: Math.max(0, val),
    }));
  };

  const handleStart = () => {
    const config: SimulationConfig = {
      targetExam,
      board,
      totalQuestions,
      durationMinutes,
      weightsBySubject: weights,
    };
    onStartSimulation(config);
  };

  return (
    <div
      className="bg-card border border-border rounded-2xl p-5 md:p-7 space-y-6 max-w-4xl mx-auto shadow-md"
      id="simulation-builder-view"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 pb-4">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base md:text-lg font-black text-foreground tracking-tight">
            Gerador Dinâmico de Simulados Customizados
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Configure seu edital-alvo e simule condições reais de prova com o cérebro matemático de
            alta performance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado Esquerdo: Parâmetros de Banca e Prova */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Hourglass className="h-4 w-4" /> Configuração do Exame
          </h4>

          {/* Fisco Alvo */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-muted-foreground uppercase font-mono">
              Fisco Alvo / Edital
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["SEFAZ", "RECEITA", "ISS"] as const).map((exam) => (
                <button
                  key={exam}
                  onClick={() => setTargetExam(exam)}
                  className={`p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    targetExam === exam
                      ? "bg-primary/15 border-primary text-foreground shadow-xs"
                      : "bg-[#13141c]/40 border-border/60 text-muted-foreground hover:bg-[#13141c]/60"
                  }`}
                >
                  {exam}
                </button>
              ))}
            </div>
          </div>

          {/* Banca Organizadora */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-muted-foreground uppercase font-mono">
              Banca Examinadora
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["FGV", "CEBRASPE", "FCC"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBoard(b)}
                  className={`p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                    board === b
                      ? "bg-primary/15 border-primary text-foreground shadow-xs"
                      : "bg-[#13141c]/40 border-border/60 text-muted-foreground hover:bg-[#13141c]/60"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Quantidade e Tempo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-muted-foreground uppercase font-mono">
                Nº de Questões
              </label>
              <input
                type="number"
                min={5}
                max={50}
                value={totalQuestions}
                onChange={(e) =>
                  setTotalQuestions(Math.min(50, Math.max(5, parseInt(e.target.value) || 10)))
                }
                className="w-full bg-[#13141c]/50 border border-border/80 rounded-xl p-3 text-xs font-bold text-foreground font-mono focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-muted-foreground uppercase font-mono">
                Tempo Limite (minutos)
              </label>
              <input
                type="number"
                min={10}
                max={300}
                value={durationMinutes}
                onChange={(e) =>
                  setDurationMinutes(Math.min(300, Math.max(10, parseInt(e.target.value) || 30)))
                }
                className="w-full bg-[#13141c]/50 border border-border/80 rounded-xl p-3 text-xs font-bold text-foreground font-mono focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Lado Direito: Distribuição de Pesos de Disciplinas */}
        <div className="space-y-4 bg-[#13141c]/30 border border-border/50 rounded-xl p-4.5">
          <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="h-4 w-4" /> Distribuição de Pesos (%)
          </h4>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Ajuste a importância e relevância de cada matéria do edital. O motor criará questões
            proporcionalmente aos valores abaixo.
          </p>

          <div className="space-y-3 pt-1">
            {Object.keys(FISCAL_SUBJECTS).map((subjectId) => {
              const currentVal = weights[subjectId] || 0;
              return (
                <div key={subjectId} className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-foreground truncate max-w-[200px]">
                      {FISCAL_SUBJECTS[subjectId]}
                    </span>
                    <span className="text-primary font-mono">{currentVal}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={currentVal}
                      onChange={(e) => handleWeightChange(subjectId, parseInt(e.target.value) || 0)}
                      className="w-full h-1 bg-[#13141c] rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={currentVal}
                      onChange={(e) => handleWeightChange(subjectId, parseInt(e.target.value) || 0)}
                      className="w-12 bg-[#13141c] border border-border/50 rounded p-1 text-[10px] text-center font-mono text-foreground"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerta Cebraspe */}
      {board === "CEBRASPE" && (
        <div className="bg-red-500/[0.02] border border-red-500/20 rounded-xl p-3.5 flex items-start gap-2.5">
          <Trophy className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="text-xs font-bold text-foreground block">
              Regra de Penalização Ativa — Estilo CEBRASPE
            </span>
            <span className="text-[10px] text-muted-foreground leading-relaxed block">
              Uma resposta errada anula uma certa. Sua nota líquida final será calculada sob esta
              metodologia tradicional de pontuação fiscal.
            </span>
          </div>
        </div>
      )}

      {/* Ação Principal */}
      <div className="flex justify-end pt-2">
        <Button
          onClick={handleStart}
          className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-black uppercase tracking-widest px-6 py-4 rounded-xl flex items-center gap-2 cursor-pointer"
          id="btn-generate-custom-simulation"
        >
          <Play className="h-4 w-4" /> Gerar e Iniciar Simulado Real
        </Button>
      </div>
    </div>
  );
};
