import React, { useState, useEffect, useCallback } from "react";
import { getLocalAttempts, FISCAL_QUESTIONS } from "@/lib/questions/errorTracker";
import { generatePerformanceReport } from "@/lib/analytics/performanceEngine";
import {
  determineCoachPersona,
  generateAdaptiveExplanation,
  getRecommendedMethod,
} from "@/lib/coach/coachEngine";
import { CoachPersona, AdaptiveExplanation, ExplanationType, CoachTone } from "@/lib/coach/types";
import { GapDiagnostic } from "@/lib/analytics/types";
import {
  Sparkles,
  Brain,
  HelpCircle,
  BookOpen,
  Eye,
  ShieldAlert,
  Terminal,
  HeartHandshake,
  CheckCircle,
  FileText,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PERSONALITY_META: Record<
  CoachTone,
  { title: string; avatar: string; bg: string; border: string; text: string; desc: string }
> = {
  socratic: {
    title: "Mentor Socrático (Foco em Desafio)",
    avatar: "🦉",
    bg: "bg-purple-500/[0.03]",
    border: "border-purple-500/20",
    text: "text-purple-400",
    desc: "Faz perguntas provocativas para guiar sua dedução e refinar seu senso crítico frente a pegadinhas de banca.",
  },
  encouraging: {
    title: "Coach Empático (Foco em Resiliência)",
    avatar: "🤝",
    bg: "bg-pink-500/[0.03]",
    border: "border-pink-500/20",
    text: "text-pink-400",
    desc: "Ajuda você a manter a calma, focar na superação dos erros repetitivos e vencer barreiras psicológicas.",
  },
  analytical: {
    title: "Auditor Analítico (Foco em Métricas)",
    avatar: "📊",
    bg: "bg-blue-500/[0.03]",
    border: "border-blue-500/20",
    text: "text-blue-400",
    desc: "Direto ao ponto, com embasamento estatístico e mapeamento matemático do seu desvio de foco.",
  },
};

export const CoachPanel: React.FC = () => {
  const [persona, setPersona] = useState<CoachPersona | null>(null);
  const [activeGap, setActiveGap] = useState<GapDiagnostic | null>(null);
  const [explanation, setExplanation] = useState<AdaptiveExplanation | null>(null);
  const [activeTab, setActiveTab] = useState<ExplanationType>("practical_case");
  const [isDemo, setIsDemo] = useState(false);
  const [resolvedGaps, setResolvedGaps] = useState<GapDiagnostic[]>([]);

  const loadCoach = useCallback(() => {
    const attempts = getLocalAttempts();
    let gaps: GapDiagnostic[] = [];

    if (attempts.length === 0) {
      // Cenário de fallback imediato caso não haja progresso gravado ("Show the working application instantly")
      gaps = [
        {
          id: "GAP-DIR-TRIB-ST",
          subjectId: "DIR-TRIB",
          subjectName: "Direito Tributário",
          topicId: "SUBST",
          topicName: "Substituição Tributária e ICMS-ST",
          accuracy: 0.48,
          averageTimeSeconds: 155,
          primaryErrorCategory: "interpretacao",
          severity: "high",
          recommendation:
            "Analise a jurisprudência do RE 593.849 sobre a restituição do ICMS pago a maior no ST.",
          suggestedLawTags: ["CF/88 - Art. 150", "RE 593.849"],
        },
        {
          id: "GAP-RLM-PROP",
          subjectId: "RLM",
          subjectName: "Raciocínio Lógico",
          topicId: "PROP",
          topicName: "Proposições Lógicas e Equivalências",
          accuracy: 0.55,
          averageTimeSeconds: 140,
          primaryErrorCategory: "conhecimento",
          severity: "medium",
          recommendation:
            "Escreva as tabelas verdade e aplique as Leis de De Morgan para negação de conjunções.",
          suggestedLawTags: ["Negação de P ∧ Q"],
        },
      ];
      setIsDemo(true);
    } else {
      const report = generatePerformanceReport(attempts, FISCAL_QUESTIONS);
      gaps = report.gapDiagnostics;
      setIsDemo(false);
    }

    setResolvedGaps(gaps);

    if (gaps.length > 0) {
      // Seleciona a primeira lacuna como foco principal da sessão do coach
      const focusGap = gaps[0];
      setActiveGap(focusGap);

      // Determina a personalidade com base no rendimento e na quantidade de erros
      const calculatedPersona = determineCoachPersona(
        gaps,
        attempts.filter((a) => !a.isCorrect).length,
      );
      setPersona(calculatedPersona);

      // Descobre o melhor método didático de estudo recomendado para esta matéria
      const recMethod = getRecommendedMethod(focusGap.subjectId, gaps);
      setActiveTab(recMethod);

      // Gera a explicação adaptativa usando o motor
      const exp = generateAdaptiveExplanation(
        focusGap.subjectId,
        focusGap.topicName,
        calculatedPersona,
        focusGap,
      );
      setExplanation(exp);
    }
  }, []);

  useEffect(() => {
    loadCoach();
  }, [loadCoach]);

  const selectGap = (gap: GapDiagnostic) => {
    if (!persona) return;
    setActiveGap(gap);
    const recMethod = getRecommendedMethod(gap.subjectId, resolvedGaps);
    setActiveTab(recMethod);
    const exp = generateAdaptiveExplanation(gap.subjectId, gap.topicName, persona, gap);
    setExplanation(exp);
  };

  const forceExplanationType = (type: ExplanationType) => {
    if (!persona || !activeGap) return;
    setActiveTab(type);
    const exp = generateAdaptiveExplanation(
      activeGap.subjectId,
      activeGap.topicName,
      persona,
      activeGap,
    );
    // Substitui o tipo gerado
    if (exp) {
      // Vamos simular a geração específica
      let modifiedExp = { ...exp };
      if (type === "visual_step_by_step") {
        modifiedExp = generateAdaptiveExplanation("RLM", activeGap.topicName, persona, activeGap);
      } else if (type === "practical_case") {
        modifiedExp = generateAdaptiveExplanation(
          "DIR-TRIB",
          activeGap.topicName,
          persona,
          activeGap,
        );
      } else {
        // Active Recall
        modifiedExp = generateAdaptiveExplanation("GERAL", activeGap.topicName, persona, activeGap);
      }
      modifiedExp.type = type;
      setExplanation(modifiedExp);
    }
  };

  if (!persona || !activeGap || !explanation) return null;

  const currentMeta = PERSONALITY_META[persona.tone];

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" id="coach-socratic-panel">
      {/* Bloco de Apresentação da Persona do Coach */}
      <div
        className={`border rounded-2xl p-5 md:p-6 shadow-sm transition-all ${currentMeta.bg} ${currentMeta.border}`}
      >
        <div className="flex flex-col md:flex-row gap-5 items-start">
          <div className="text-4xl bg-card border border-border/80 w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner shrink-0">
            {currentMeta.avatar}
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/20`}
              >
                Coach de Elite Concursos
              </span>
              <h3 className="text-base font-black text-foreground tracking-tight">
                {currentMeta.title}
              </h3>
              {isDemo && (
                <Badge
                  variant="outline"
                  className="bg-[#ff79c6]/5 text-[#ff79c6] border-[#ff79c6]/20 text-[9px] uppercase font-bold py-0.5 tracking-wider shrink-0"
                >
                  Modo de Demonstração
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">{currentMeta.desc}</p>

            <div className="flex flex-wrap gap-4 pt-1.5 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <Brain className="h-3.5 w-3.5 text-primary" /> Resiliência do Mentor:{" "}
                <strong>{persona.resilienceLevel}%</strong>
              </span>
              <span className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-emerald-400" /> Empatia Cognitiva:{" "}
                <strong>{persona.empathyScore}%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Painel Esquerdo: Menu e Seletor de Tópicos Críticos */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 md:p-5 space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Diagnóstico de Tópicos sob Análise
              </h4>
              <p className="text-[10px] text-muted-foreground">
                Selecione uma lacuna ativa para carregar a mentoria didática especializada.
              </p>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-none pr-1">
              {resolvedGaps.map((gap) => {
                const isSelected = activeGap.id === gap.id;
                return (
                  <button
                    key={gap.id}
                    onClick={() => selectGap(gap)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer block space-y-2 ${
                      isSelected
                        ? "bg-primary/[0.04] border-primary text-foreground shadow-sm"
                        : "bg-[#1e1f29]/30 border-border hover:bg-muted/20 text-muted-foreground"
                    }`}
                    id={`select-gap-${gap.id}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono font-bold uppercase block truncate max-w-[130px]">
                        {gap.subjectName}
                      </span>
                      <Badge
                        className={`text-[8px] font-bold ${
                          gap.severity === "high"
                            ? "bg-red-500/10 text-red-400 border-red-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        Aproveitamento: {Math.round(gap.accuracy * 100)}%
                      </Badge>
                    </div>

                    <h5
                      className={`text-xs font-bold truncate leading-snug ${isSelected ? "text-foreground" : "text-muted-foreground"}`}
                    >
                      {gap.topicName}
                    </h5>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dica Rápida de Estudos */}
          <div className="bg-[#13141c]/50 border border-border rounded-2xl p-4 md:p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-[#ffb86c]">
              <Sparkles className="h-4.5 w-4.5" />
              <h4 className="text-xs font-bold text-foreground">Diretriz Pedagógica Recomendada</h4>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O Coach de Elite fiscal identificou que o seu método mais eficiente de absorção para a
              matéria de <strong>{activeGap.subjectName}</strong> é através de
              <strong>
                {" "}
                {activeTab === "visual_step_by_step"
                  ? "Esquemas Visuais de Variáveis"
                  : activeTab === "practical_case"
                    ? "Ancoragem em Casos Práticos de Fiscalização"
                    : "Recall Ativo e Forçamento Cognitivo"}
              </strong>
              .
            </p>
          </div>
        </div>

        {/* Painel Direito (Conteúdo da Explicação e Interação Socrática) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 md:p-6 space-y-5">
          {/* Abas e Chaveadores de Métodos Didáticos */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/60 pb-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                Método de Explicação
              </span>
              <h4 className="text-sm font-bold text-foreground truncate max-w-[280px]">
                {explanation.title}
              </h4>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-[#13141c] p-1 rounded-xl border border-border/40">
              <button
                onClick={() => forceExplanationType("practical_case")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === "practical_case"
                    ? "bg-primary text-primary-foreground font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                id="btn-tab-practical"
              >
                Auditor Prático
              </button>
              <button
                onClick={() => forceExplanationType("visual_step_by_step")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === "visual_step_by_step"
                    ? "bg-primary text-primary-foreground font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                id="btn-tab-visual"
              >
                Desenho de Exatas
              </button>
              <button
                onClick={() => forceExplanationType("active_recall")}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === "active_recall"
                    ? "bg-primary text-primary-foreground font-black"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                id="btn-tab-recall"
              >
                Recordação Ativa
              </button>
            </div>
          </div>

          {/* Área de Renderização Dinâmica do Markdown */}
          <div className="bg-[#1e1f29]/30 border border-border/40 rounded-xl p-5 text-xs text-foreground leading-relaxed space-y-4 font-mono overflow-x-auto">
            {/* Simulando renderização estilizada rápida de Markdown */}
            <div className="space-y-4">
              {explanation.content.split("\n\n").map((paragraph, pIdx) => {
                if (paragraph.trim().startsWith("###")) {
                  return (
                    <h3
                      key={pIdx}
                      className="text-sm font-black text-foreground border-b border-border/30 pb-1 flex items-center gap-1.5 pt-2"
                    >
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      {paragraph.replace("###", "").trim()}
                    </h3>
                  );
                }
                if (paragraph.trim().startsWith("|")) {
                  // Renderização de tabela rápida estilizada
                  return (
                    <div key={pIdx} className="overflow-x-auto py-2">
                      <table className="w-full text-[10px] border-collapse border border-border/40">
                        <thead>
                          <tr className="bg-[#13141c]">
                            <th className="border border-border/40 p-2 text-left">Passo</th>
                            <th className="border border-border/40 p-2 text-left">Lógica / Caso</th>
                            <th className="border border-border/40 p-2 text-left">
                              Fórmula / Base
                            </th>
                            <th className="border border-border/40 p-2 text-left">Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paragraph
                            .split("\n")
                            .slice(2)
                            .filter((line) => line.trim().startsWith("|"))
                            .map((row, rIdx) => {
                              const cells = row
                                .split("|")
                                .map((c) => c.trim())
                                .filter((c) => c);
                              return (
                                <tr
                                  key={rIdx}
                                  className="hover:bg-muted/20 border-b border-border/20"
                                >
                                  <td className="p-2 font-black border border-border/40 text-primary">
                                    {cells[0]}
                                  </td>
                                  <td className="p-2 border border-border/40">{cells[1]}</td>
                                  <td className="p-2 border border-border/40 font-semibold">
                                    {cells[2]}
                                  </td>
                                  <td className="p-2 border border-border/40 text-[#50fa7b]">
                                    {cells[3]}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                if (paragraph.trim().startsWith("-") || paragraph.trim().startsWith("*")) {
                  return (
                    <ul key={pIdx} className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                      {paragraph.split("\n").map((li, lIdx) => (
                        <li key={lIdx}>{li.replace(/^[\s-*]+/, "").trim()}</li>
                      ))}
                    </ul>
                  );
                }
                if (paragraph.trim().startsWith(">")) {
                  return (
                    <blockquote
                      key={pIdx}
                      className="border-l-2 border-primary pl-3 py-1 my-2 italic bg-[#13141c]/50 text-muted-foreground text-[11px] rounded-r-lg"
                    >
                      {paragraph.replace(">", "").trim()}
                    </blockquote>
                  );
                }
                return (
                  <p key={pIdx} className="text-muted-foreground leading-relaxed">
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Bloco de Desafio Ativo / Socrático Final */}
          {explanation.interactivePrompt && (
            <div className="bg-[#ff79c6]/[0.02] border border-[#ff79c6]/20 rounded-xl p-4.5 space-y-3">
              <div className="flex items-center gap-1.5 text-[#ff79c6]">
                <Brain className="h-4.5 w-4.5" />
                <h5 className="text-xs font-bold text-foreground">
                  Pergunta Socrática de Engajamento Ativo
                </h5>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                {explanation.interactivePrompt}
              </p>
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-[10px] font-bold h-7.5 border-[#ff79c6]/20 text-[#ff79c6] hover:bg-[#ff79c6]/5 cursor-pointer"
                  onClick={() =>
                    alert(
                      "Exato! O esforço de dedução melhora a formação de conexões neurais para o dia da prova.",
                    )
                  }
                  id="btn-submit-answer"
                >
                  Confirmar Resposta Mental
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
