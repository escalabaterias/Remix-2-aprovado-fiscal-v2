import React, { useState, useEffect, useRef, useCallback } from "react";
import { Question, ErrorCategory } from "@/lib/questions/types";
import { SimulationConfig, SimulationResult } from "@/lib/simulations/types";
import {
  buildCustomSimulation,
  evaluateSimulation,
  FISCAL_SUBJECTS,
} from "@/lib/simulations/simulationEngine";
import {
  Clock,
  Sparkles,
  Trophy,
  AlertCircle,
  CheckCircle,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Eye,
  Flag,
  FileText,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SimulationRunnerProps {
  config: SimulationConfig;
  onFinish: () => void;
}

export const SimulationRunner: React.FC<SimulationRunnerProps> = ({ config, onFinish }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  // Timer regressivo
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(config.durationMinutes * 60);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  // Categorização de erros cognitivos (solicitada após a prova)
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [errorClassifications, setErrorClassifications] = useState<Record<string, ErrorCategory>>(
    {},
  );
  const [errorNotes, setErrorNotes] = useState<Record<string, string>>({});

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  // Inicializa a prova gerando as questões de edital
  useEffect(() => {
    const generated = buildCustomSimulation(config);
    setQuestions(generated);
    startTimeRef.current = new Date().toISOString();
  }, [config]);

  // Cronômetro regressivo e progressivo
  useEffect(() => {
    if (isRunning && timeLeftSeconds > 0 && !results) {
      timerRef.current = setInterval(() => {
        setTimeLeftSeconds((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
        setTimeSpentSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeftSeconds, results]);

  const handleSelectOption = (letter: string) => {
    if (results) return; // Bloqueia após finalizar
    setAnswers((prev) => ({
      ...prev,
      [questions[currentIndex].id]: letter,
    }));
  };

  const handleToggleFlag = () => {
    const qId = questions[currentIndex].id;
    setFlagged((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const handleAutoSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    handleSubmitExam();
  };

  const handleSubmitExam = () => {
    setIsRunning(false);

    // Constrói o objeto de tentativas estruturado para o motor
    const attemptsPayload: Record<string, any> = {};
    questions.forEach((q) => {
      const selected = answers[q.id] || "";
      const isCorrect = selected.trim().toUpperCase() === q.correctAnswer.trim().toUpperCase();

      attemptsPayload[q.id] = {
        questionId: q.id,
        selectedOption: selected,
        isCorrect,
        timeSpentSeconds: Math.round(timeSpentSeconds / questions.length), // Proporção simples
        errorCategory: undefined, // Será mapeado pelo usuário em pós-prova se desejar
        notes: "",
      };
    });

    const evaluated = evaluateSimulation(
      `SIM-RES-${Date.now()}`,
      config,
      attemptsPayload,
      timeSpentSeconds,
      startTimeRef.current,
    );

    setResults(evaluated);
  };

  const handleClassifyError = (qId: string, category: ErrorCategory, textNote = "") => {
    if (!results) return;

    setErrorClassifications((prev) => ({ ...prev, [qId]: category }));

    // Re-calcula e re-salva com os erros cognitivos categorizados
    const updatedAttempts = { ...results.attempts };
    if (updatedAttempts[qId]) {
      updatedAttempts[qId].errorCategory = category;
      updatedAttempts[qId].notes = textNote;
    }

    const reEvaluated = evaluateSimulation(
      results.id,
      config,
      updatedAttempts,
      timeSpentSeconds,
      startTimeRef.current,
    );

    setResults(reEvaluated);
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground font-mono">
        Montando proporcionalmente seu edital...
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isCebraspe = config.board === "CEBRASPE";

  // Formata tempo regressivo
  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="space-y-6" id="simulation-runner-workspace">
      {/* Topo do Runner de Prova Real */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card border border-border p-4.5 rounded-2xl gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 animate-pulse">
              Modo Simulação Real Ativo
            </span>
            <span className="text-xs text-muted-foreground">
              Questão {currentIndex + 1} de {questions.length}
            </span>
          </div>
          <h3 className="text-sm font-black text-foreground font-mono">
            Fisco: {config.targetExam} | Banca: {config.board}
          </h3>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-400">
            <Clock className="h-4.5 w-4.5 animate-spin-slow" />
            <span>Regressivo: {formatTime(timeLeftSeconds)}</span>
          </div>

          {!results && (
            <Button
              onClick={handleSubmitExam}
              size="sm"
              className="bg-primary text-primary-foreground font-black uppercase tracking-wider text-[11px] h-9 cursor-pointer px-4.5"
              id="btn-submit-simulation"
            >
              Finalizar Prova
            </Button>
          )}
        </div>
      </div>

      {!results ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Lado Esquerdo: Navegação de Cartão-resposta */}
          <div className="bg-card border border-border rounded-2xl p-4.5 space-y-4 shadow-sm lg:col-span-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" /> Cartão Resposta
            </h4>

            <div className="grid grid-cols-5 gap-2 pt-1">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = idx === currentIndex;
                const isFlagged = flagged[q.id];

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-9 w-9 text-xs font-bold rounded-lg border transition-all relative cursor-pointer flex items-center justify-center ${
                      isCurrent
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : isAnswered
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-border bg-[#13141c]/30 text-muted-foreground hover:bg-muted/10"
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] text-[#ffb86c]">
                        🚩
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="text-[10px] text-muted-foreground leading-relaxed pt-2 border-t border-border/50">
              <p>🟢 Esmeralda: Respondido</p>
              <p>🚩 Marcador: Duvidoso / Revisar</p>
              <p>🔒 Nota: O gabarito só é revelado após a conclusão de todo o simulado.</p>
            </div>
          </div>

          {/* Central: Resolução da Questão Ativa */}
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-6 lg:col-span-3">
            <div className="flex justify-between items-center pb-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-bold tracking-wider text-primary"
                >
                  {currentQuestion.subjectName}
                </Badge>
                <Badge variant="outline" className="text-[9px] uppercase text-muted-foreground">
                  {currentQuestion.difficulty}
                </Badge>
              </div>

              <button
                onClick={handleToggleFlag}
                className={`flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-1 rounded border transition-all cursor-pointer ${
                  flagged[currentQuestion.id]
                    ? "bg-[#ffb86c]/10 border-[#ffb86c] text-[#ffb86c]"
                    : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <Flag className="h-3 w-3" /> Revisar mais tarde
              </button>
            </div>

            <div className="text-sm font-sans leading-relaxed text-foreground">
              {currentQuestion.statement}
            </div>

            <div className="space-y-2.5">
              {isCebraspe ? (
                <div className="grid grid-cols-2 gap-3">
                  {["C", "E"].map((letter) => {
                    const isSelected = answers[currentQuestion.id] === letter;
                    const optionText = letter === "C" ? "Certo" : "Errado";
                    return (
                      <button
                        key={letter}
                        onClick={() => handleSelectOption(letter)}
                        className={`p-4 rounded-xl border text-xs font-bold font-mono transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground shadow-sm"
                            : "bg-[#1e1f29]/30 border-border hover:bg-muted/10 text-muted-foreground"
                        }`}
                      >
                        <span className="text-[10px] bg-muted w-5 h-5 rounded flex items-center justify-center shrink-0 border border-border/80">
                          {letter}
                        </span>
                        {optionText}
                      </button>
                    );
                  })}
                </div>
              ) : (
                currentQuestion.alternatives.map((alt) => {
                  const letter = alt.charAt(0);
                  const isSelected = answers[currentQuestion.id] === letter;
                  return (
                    <button
                      key={alt}
                      onClick={() => handleSelectOption(letter)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary text-foreground shadow-sm"
                          : "bg-[#1e1f29]/30 border-border hover:bg-muted/10 text-muted-foreground"
                      }`}
                    >
                      <span className="text-[10px] font-black bg-muted w-5 h-5 rounded flex items-center justify-center shrink-0 border border-border/80">
                        {letter}
                      </span>
                      <span className="leading-relaxed">{alt.substring(2)}</span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))}
                disabled={currentIndex === 0}
                className="text-[11px] font-bold h-9"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>

              <Button
                onClick={() => setCurrentIndex((p) => Math.min(questions.length - 1, p + 1))}
                disabled={currentIndex === questions.length - 1}
                size="sm"
                variant="outline"
                className="text-[11px] font-bold h-9"
              >
                Próxima <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        // RELATÓRIO PÓS-SIMULADO COMPLETO
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bloco de Notas */}
            <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-primary/10 border border-primary/20 text-primary rounded-xl flex items-center justify-center mx-auto text-xl">
                🏆
              </div>
              <div className="space-y-1">
                <h4 className="text-xs text-muted-foreground font-black uppercase tracking-wider font-mono">
                  Nota Bruta
                </h4>
                <p className="text-3xl font-black text-foreground">{results.score}%</p>
              </div>
              <div className="space-y-1 pt-2 border-t border-border/50">
                <h4 className="text-xs text-muted-foreground font-black uppercase tracking-wider font-mono">
                  Nota Líquida
                </h4>
                <p
                  className={`text-2xl font-black ${results.netScore >= 70 ? "text-emerald-400" : "text-amber-400"}`}
                >
                  {results.netScore}%
                </p>
                <span className="text-[9px] text-muted-foreground font-mono block">
                  {isCebraspe
                    ? "Penalização Cebraspe de 1x1 Aplicada"
                    : "Modelo Tradicional Proporcional"}
                </span>
              </div>
            </div>

            {/* Tempo e Métricas de Eficiência */}
            <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mx-auto text-xl">
                ⏱️
              </div>
              <div className="space-y-1">
                <h4 className="text-xs text-muted-foreground font-black uppercase tracking-wider font-mono">
                  Tempo de Prova
                </h4>
                <p className="text-2xl font-black text-foreground">
                  {Math.floor(results.timeSpentSeconds / 60)}m {results.timeSpentSeconds % 60}s
                </p>
              </div>
              <div className="space-y-1 pt-2 border-t border-border/50">
                <h4 className="text-xs text-muted-foreground font-black uppercase tracking-wider font-mono">
                  Tempo Médio por Questão
                </h4>
                <p className="text-xl font-black text-primary">
                  {Math.round(results.timeSpentSeconds / questions.length)}s
                </p>
                <span className="text-[9px] text-muted-foreground font-mono block">
                  Velocidade operacional ideal de banca
                </span>
              </div>
            </div>

            {/* Sugestões e Direcionamento do Planner (Módulo 4.2) */}
            <div className="bg-[#13141c]/50 border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-[#ff79c6]">
                <Calendar className="h-5 w-5 shrink-0" />
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Ação de Revisão Planejada
                </h4>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Nossas redes heurísticas calibraram sua curva de esquecimento para o Módulo 4.2. As
                seguintes ações de consolidação foram reagendadas:
              </p>

              <div className="space-y-2 pt-1">
                {Object.values(results.subjectPerformance).map((perf) => {
                  if (perf.total > 0 && perf.accuracy < 0.7) {
                    return (
                      <div
                        key={perf.subjectId}
                        className="flex justify-between items-center text-[10px] bg-red-500/[0.02] border border-red-500/10 rounded px-2 py-1.5 font-mono"
                      >
                        <span className="text-foreground font-bold truncate max-w-[140px]">
                          {perf.subjectName}
                        </span>
                        <span className="text-red-400 font-bold">
                          {Math.round(perf.accuracy * 100)}% (Crítico - Revisão 2d)
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>

          {/* Gabarito Comentado Integral com Opção de Classificação do Erro */}
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6 space-y-6">
            <h4 className="text-sm font-black text-foreground flex items-center gap-2 border-b border-border/50 pb-3">
              <Eye className="h-5 w-5 text-primary" /> Análise de Questões e Diagnóstico Cognitivo
            </h4>

            <div className="space-y-6 divide-y divide-border/40">
              {questions.map((q, idx) => {
                const userChoice = answers[q.id] || "Não Respondida";
                const isCorrect = userChoice === q.correctAnswer;
                const chosenCategory = errorClassifications[q.id] || "";

                return (
                  <div key={q.id} className={`pt-6 ${idx === 0 ? "pt-0" : ""}`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isCorrect
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          Questão {idx + 1}: {isCorrect ? "ACERTO" : "ERRO"}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Matéria: {q.subjectName}
                        </span>
                      </div>

                      <div className="text-xs font-mono">
                        Marcou: <span className="font-bold text-foreground">{userChoice}</span> |
                        Gabarito:{" "}
                        <span className="font-bold text-emerald-400">{q.correctAnswer}</span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3 font-sans leading-relaxed">
                      {q.statement}
                    </p>

                    {/* Classificador se o aluno errou */}
                    {!isCorrect && (
                      <div className="mt-4 bg-[#13141c]/50 border border-border/60 rounded-xl p-4 space-y-3 max-w-xl">
                        <h5 className="text-[10px] font-black uppercase text-[#ff79c6] tracking-wider">
                          Por que você errou essa questão?
                        </h5>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {[
                            { value: "atencao", label: "Atenção", icon: "👁️" },
                            { value: "conhecimento", label: "Conhecimento", icon: "📚" },
                            { value: "interpretacao", label: "Banca/Pegadinha", icon: "🪤" },
                            { value: "esquecimento", label: "Esquecimento", icon: "🧠" },
                            { value: "calculo", label: "Cálculo", icon: "🔢" },
                            { value: "estrategia", label: "Estratégia", icon: "🎯" },
                          ].map((cat) => (
                            <button
                              key={cat.value}
                              onClick={() => handleClassifyError(q.id, cat.value as ErrorCategory)}
                              className={`p-1.5 rounded text-[10px] text-left border cursor-pointer ${
                                chosenCategory === cat.value
                                  ? "bg-red-500/10 border-red-500/40 text-foreground font-black"
                                  : "bg-[#13141c] border-border/50 text-muted-foreground"
                              }`}
                            >
                              {cat.icon} {cat.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Explicação detalhada */}
                    <div className="mt-4 bg-muted/20 border border-border/40 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-bold">
                        <BookOpen className="h-4 w-4 text-primary" /> Gabarito Comentado:
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <Button
              onClick={onFinish}
              className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold px-6 py-4.5 rounded-xl cursor-pointer"
            >
              Voltar ao Gerador de Simulados
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
