import React, { useState, useEffect, useRef, useCallback } from "react";
import { Question, QuestionAttempt, ExamSession, ErrorCategory } from "@/lib/questions/types";
import {
  EXTENDED_FISCAL_QUESTIONS,
  createExamSession,
  processQuestionAttempt,
} from "@/lib/questions/questionEngine";
import { getLocalAttempts } from "@/lib/questions/errorTracker";
import {
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  BookOpen,
  Keyboard,
  ShieldAlert,
  Compass,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const ERROR_CATEGORY_MAP: {
  value: ErrorCategory;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "atencao",
    label: "Falta de Atenção",
    description: "Leu rápido demais, confundiu o comando ou trocou 'exceto' por 'correto'.",
    icon: "👁️",
  },
  {
    value: "conhecimento",
    label: "Falta de Conhecimento",
    description: "Não dominava a lei seca, a jurisprudência ou o conceito teórico cobrado.",
    icon: "📚",
  },
  {
    value: "interpretacao",
    label: "Pegadinha de Banca",
    description: "Caiu em trocadilho sutil da FGV ou interpretação truncada da banca.",
    icon: "🪤",
  },
  {
    value: "esquecimento",
    label: "Esquecimento / Curva",
    description: "Já tinha estudado essa matéria no passado, mas esqueceu o detalhe.",
    icon: "🧠",
  },
  {
    value: "calculo",
    label: "Erro de Cálculo",
    description: "Falhou na conta de alíquota tributária, lançamento ou soma simples.",
    icon: "🔢",
  },
  {
    value: "estrategia",
    label: "Estratégia de Resolução",
    description: "Ficou em dúvida entre duas e escolheu a pior alternativa.",
    icon: "🎯",
  },
];

export const QuestionSolver: React.FC = () => {
  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [currentQuestionTime, setCurrentQuestionTime] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedErrorCategory, setSelectedErrorCategory] = useState<ErrorCategory | null>(null);
  const [notes, setNotes] = useState("");
  const [penaltyMode, setPenaltyMode] = useState(false);
  const [showCoachHelp, setShowCoachHelp] = useState(false);

  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = session?.questions[currentIndex];

  const initSession = useCallback(() => {
    // Busca lacunas anteriores do localStorage para carregar de forma adaptativa
    const localAttempts = getLocalAttempts();
    const mockGaps =
      localAttempts.length === 0
        ? [
            { subjectId: "DIR-TRIB", topicId: "LIMIT-TRIB", accuracy: 0.45 },
            { subjectId: "RLM", topicId: "PROP-LOG", accuracy: 0.5 },
          ]
        : [{ subjectId: "DIR-TRIB", topicId: "LIMIT-TRIB", accuracy: 0.6 }];

    const newSession = createExamSession("targeted_review", mockGaps, 5, 20);
    setSession(newSession);
    setCurrentIndex(0);
    setSelectedOption(null);
    setCurrentQuestionTime(0);
    setIsAnswered(false);
    setSelectedErrorCategory(null);
    setNotes("");
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Cronômetro inteligente por questão individual
  useEffect(() => {
    if (session && !isAnswered && !session.isCompleted) {
      setCurrentQuestionTime(0);
      questionTimerRef.current = setInterval(() => {
        setCurrentQuestionTime((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
  }, [currentIndex, isAnswered, session]);

  const handleSelectOption = useCallback(
    (optionLetter: string) => {
      if (isAnswered) return;
      setSelectedOption(optionLetter);
    },
    [isAnswered],
  );

  const handleSubmit = useCallback(() => {
    if (!selectedOption || !currentQuestion) return;

    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    setIsAnswered(true);

    if (isCorrect) {
      const updatedSession = processQuestionAttempt(
        session,
        currentQuestion.id,
        selectedOption,
        currentQuestionTime,
        undefined,
        undefined,
        penaltyMode,
      );
      setSession(updatedSession);
    }
  }, [selectedOption, currentQuestion, session, currentQuestionTime, penaltyMode]);

  // Teclas de atalho para navegação rápida (MCQ 1-5 / A-E ou Cebraspe C/E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnswered || !currentQuestion) return;

      const key = e.key.toUpperCase();

      const isCebraspe = currentQuestion.examBoard.toUpperCase() === "CEBRASPE";

      if (isCebraspe) {
        if (key === "C" || key === "1") {
          handleSelectOption("C");
        } else if (key === "E" || key === "2") {
          handleSelectOption("E");
        }
      } else {
        const optionKeys: Record<string, string> = {
          "1": "A",
          "2": "B",
          "3": "C",
          "4": "D",
          "5": "E",
          A: "A",
          B: "B",
          C: "C",
          D: "D",
          E: "E",
        };
        if (optionKeys[key]) {
          handleSelectOption(optionKeys[key]);
        }
      }

      // Enter para confirmar resposta
      if (e.key === "Enter" && selectedOption) {
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedOption, isAnswered, currentQuestion, handleSelectOption, handleSubmit]);

  if (!session || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground font-mono">
        Carregando banco adaptativo...
      </div>
    );
  }

  const isCebraspe = currentQuestion.examBoard.toUpperCase() === "CEBRASPE";

  const handleSaveFailureCategory = () => {
    if (!selectedOption || !selectedErrorCategory) return;

    const updatedSession = processQuestionAttempt(
      session,
      currentQuestion.id,
      selectedOption,
      currentQuestionTime,
      selectedErrorCategory,
      notes,
      penaltyMode,
    );

    setSession(updatedSession);
    alert("Causa do erro registrada! Isso realimenta o analytics global e o Coach Socrático.");
  };

  const handleNext = () => {
    if (currentIndex < session.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setSelectedErrorCategory(null);
      setNotes("");
      setShowCoachHelp(false);
    } else {
      // Finalizar sessão de estudos
      setSession((prev) => (prev ? { ...prev, isCompleted: true } : null));
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      const prevAttempt = session.attempts[session.questions[currentIndex - 1].id];
      if (prevAttempt) {
        setSelectedOption(prevAttempt.selectedAlternative);
        setIsAnswered(true);
        setSelectedErrorCategory(prevAttempt.errorCategory || null);
        setNotes(prevAttempt.notes || "");
      } else {
        setSelectedOption(null);
        setIsAnswered(false);
        setSelectedErrorCategory(null);
        setNotes("");
      }
      setShowCoachHelp(false);
    }
  };

  const currentAttempt = session.attempts[currentQuestion.id];
  const isCorrect = currentAttempt ? currentAttempt.isCorrect : false;

  const isTimeExcessive = currentQuestionTime > 120;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6" id="questions-solver-panel">
      {/* Top Banner de Sessão de Questões */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card border border-border rounded-2xl p-4.5 md:p-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Banco Adaptativo Ativo
            </span>
            <span className="text-xs text-muted-foreground">
              Questão {currentIndex + 1} de {session.questions.length}
            </span>
          </div>
          <h3 className="text-base font-black text-foreground tracking-tight">
            Estilo de Prova de Alta Performance
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Chaveador de Penalização (Estilo C/E Cebraspe) */}
          <div className="flex items-center gap-2 bg-[#13141c] px-3 py-1.5 rounded-xl border border-border/40 text-[10px] text-muted-foreground font-mono">
            <label className="cursor-pointer select-none" htmlFor="penalty-mode">
              Penalização Cebraspe (1 Errada anula 1 Certa)
            </label>
            <input
              type="checkbox"
              id="penalty-mode"
              checked={penaltyMode}
              onChange={(e) => setPenaltyMode(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
            />
          </div>

          <div className="flex items-center gap-1 text-xs font-mono text-[#ffb86c]">
            <Clock className="h-4.5 w-4.5" />
            <span>
              Tempo Total: {Math.floor(session.timeSpentSeconds / 60)}m{" "}
              {session.timeSpentSeconds % 60}s
            </span>
          </div>
        </div>
      </div>

      {!session.isCompleted ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel Central: Enunciado e Alternativas */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 md:p-6 space-y-6">
            {/* Metadados da Questão */}
            <div className="flex flex-wrap justify-between items-center gap-3 border-b border-border/50 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase font-bold tracking-wider text-primary border-primary/20 bg-primary/5"
                >
                  {currentQuestion.examBoard}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase text-muted-foreground border-border/60"
                >
                  {currentQuestion.year}
                </Badge>
                <Badge
                  variant="outline"
                  className="text-[9px] uppercase text-muted-foreground border-border/60"
                >
                  {currentQuestion.subjectName}
                </Badge>
              </div>

              {/* Cronômetro Individual Inteligente */}
              <div
                className={`flex items-center gap-1.5 text-xs font-mono ${isTimeExcessive ? "text-red-400 font-bold animate-pulse" : "text-muted-foreground"}`}
              >
                <Clock className="h-4 w-4" />
                <span>
                  Tempo na Questão: {Math.floor(currentQuestionTime / 60)}m{" "}
                  {(currentQuestionTime % 60).toString().padStart(2, "0")}s
                </span>
                {isTimeExcessive && (
                  <span className="text-[9px] text-red-500 bg-red-500/10 border border-red-500/20 rounded px-1.5 py-0.5 ml-1">
                    Gargalo ({Math.round(currentQuestionTime)}s)
                  </span>
                )}
              </div>
            </div>

            {/* Enunciado */}
            <div className="text-sm font-sans text-foreground leading-relaxed">
              {currentQuestion.statement}
            </div>

            {/* Alternativas */}
            <div className="space-y-2.5">
              {isCebraspe ? (
                // Estilo Cebraspe (Certo / Errado)
                <div className="grid grid-cols-2 gap-3">
                  {["C", "E"].map((letter) => {
                    const isSelected = selectedOption === letter;
                    const optionText = letter === "C" ? "Certo" : "Errado";
                    return (
                      <button
                        key={letter}
                        onClick={() => handleSelectOption(letter)}
                        disabled={isAnswered}
                        className={`p-4 rounded-xl border text-xs font-bold font-mono transition-all text-center flex items-center justify-center gap-2 cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground shadow-sm"
                            : "bg-[#1e1f29]/30 border-border hover:bg-muted/10 text-muted-foreground"
                        }`}
                        id={`btn-opt-${letter}`}
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
                // Estilo Múltipla Escolha (A, B, C, D, E)
                currentQuestion.alternatives.map((alt) => {
                  const letter = alt.charAt(0);
                  const isSelected = selectedOption === letter;
                  return (
                    <button
                      key={alt}
                      onClick={() => handleSelectOption(letter)}
                      disabled={isAnswered}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? "bg-primary/10 border-primary text-foreground shadow-sm"
                          : "bg-[#1e1f29]/30 border-border hover:bg-muted/10 text-muted-foreground"
                      }`}
                      id={`btn-opt-${letter}`}
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

            {/* Ações de Navegação e Submissão */}
            <div className="flex justify-between items-center pt-4 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="text-[11px] font-bold h-9"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>

              {!isAnswered ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedOption}
                  size="sm"
                  className="text-[11px] font-bold h-9 px-5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95"
                  id="btn-submit-answer"
                >
                  Responder Questão
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  size="sm"
                  className="text-[11px] font-bold h-9 px-5 cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white"
                  id="btn-next-question"
                >
                  Avançar <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

            {/* Dica de Teclas de Atalho */}
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
              <Keyboard className="h-3.5 w-3.5 text-primary" />
              <span>
                Dica UX: Use as teclas <strong>[1 a 5]</strong> ou <strong>[A a E]</strong> para
                marcar opções e <strong>[Enter]</strong> para confirmar.
              </span>
            </div>
          </div>

          {/* Painel Lateral Direito: Gabarito Comentado e Diagnóstico */}
          <div className="space-y-4">
            {isAnswered && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
                {/* Cabeçalho de Status do Gabarito */}
                <div className="flex items-center gap-2">
                  {selectedOption === currentQuestion.correctAnswer ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                      <CheckCircle className="h-5 w-5" /> Acertou de Primeira!
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs">
                      <XCircle className="h-5 w-5" /> Resposta Incorreta
                    </div>
                  )}
                </div>

                {/* Bloco de Classificação do Erro (Se Errou) */}
                {selectedOption !== currentQuestion.correctAnswer && !currentAttempt && (
                  <div className="bg-red-500/[0.02] border border-red-500/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-1.5 text-red-400">
                      <ShieldAlert className="h-4.5 w-4.5" />
                      <h4 className="text-xs font-bold text-foreground">
                        Classifique a causa do seu erro
                      </h4>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Isso ajuda o Coach a calibrar seu plano de estudos para revisar o assunto.
                    </p>

                    <div className="grid grid-cols-2 gap-1.5">
                      {ERROR_CATEGORY_MAP.map((cat) => (
                        <button
                          key={cat.value}
                          onClick={() => setSelectedErrorCategory(cat.value)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            selectedErrorCategory === cat.value
                              ? "bg-red-500/10 border-red-500/40 text-foreground"
                              : "bg-[#13141c] border-border/50 text-muted-foreground"
                          }`}
                        >
                          <div className="text-xs font-bold truncate">
                            {cat.icon} {cat.label}
                          </div>
                        </button>
                      ))}
                    </div>

                    <textarea
                      placeholder="Anote detalhes de como você errou ou dicas mnemônicas..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full text-[10px] bg-[#13141c] border border-border/50 rounded-lg p-2 text-foreground font-mono"
                      rows={2}
                    />

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleSaveFailureCategory}
                        disabled={!selectedErrorCategory}
                        className="text-[10px] font-bold h-7 cursor-pointer"
                        id="btn-save-error-cat"
                      >
                        Registrar no Caderno de Erros
                      </Button>
                    </div>
                  </div>
                )}

                {/* Gabarito Comentado Oficial */}
                <div className="space-y-3 border-t border-border/60 pt-4">
                  <div className="flex items-center gap-1.5 text-primary">
                    <BookOpen className="h-4.5 w-4.5" />
                    <h4 className="text-xs font-bold text-foreground">Gabarito Comentado</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-mono">
                    {currentQuestion.explanation}
                  </p>
                </div>

                {/* LawTags & Legislação Associada (Vade Mecum) */}
                {currentQuestion.associatedLaws && currentQuestion.associatedLaws.length > 0 && (
                  <div className="space-y-2 border-t border-border/60 pt-4">
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                      Direito Seco / LawTags
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {currentQuestion.associatedLaws.map((law) => (
                        <span
                          key={law}
                          className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-mono font-bold"
                        >
                          {law}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Integração Socrática com o Coach Fiscal */}
                <div className="border-t border-border/60 pt-4 space-y-3">
                  <div className="flex items-center gap-1.5 text-[#ff79c6]">
                    <Sparkles className="h-4 w-4" />
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-foreground">
                      Precisando de suporte extra?
                    </h5>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Você pode acionar o Coach de Elite para desenhar o raciocínio matemático ou
                    explicar de forma prática este conceito de direito.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCoachHelp(true)}
                    className="w-full text-[10px] font-bold border-[#ff79c6]/20 text-[#ff79c6] hover:bg-[#ff79c6]/5 h-8.5 cursor-pointer"
                    id="btn-coach-solver-help"
                  >
                    Acionar Coach Socrático
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Tela de Conclusão / Histórico do Simulado
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 space-y-6 text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto text-3xl">
            🏆
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-black text-foreground">Sessão Concluída com Sucesso!</h3>
            <p className="text-xs text-muted-foreground">
              Você resolveu de forma adaptativa as questões focadas nas suas lacunas de
              conhecimento.
            </p>
          </div>

          {/* Gráfico de Desempenho Rápido */}
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-2">
            <div className="bg-[#13141c] p-3.5 rounded-xl border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                Taxa de Acertos
              </span>
              <span className="text-xl font-black text-emerald-400">
                {Math.round(session.accuracy * 100)}%
              </span>
            </div>
            <div className="bg-[#13141c] p-3.5 rounded-xl border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase font-mono block">
                Maturidade de Banca
              </span>
              <span className="text-xl font-black text-primary">{session.score} / 100</span>
            </div>
          </div>

          <div className="flex gap-3 justify-center pt-4">
            <Button
              onClick={initSession}
              size="sm"
              className="text-xs font-bold px-5 bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer"
            >
              Iniciar Nova Lista
            </Button>
          </div>
        </div>
      )}

      {/* Visualizador de Explicador e Desenhos do Coach */}
      {showCoachHelp && currentQuestion && (
        <div
          className="bg-card border border-[#ff79c6]/20 rounded-2xl p-5 md:p-6 space-y-4"
          id="coach-integration-view"
        >
          <div className="flex items-center gap-2 text-[#ff79c6] border-b border-border/40 pb-3">
            <Sparkles className="h-5 w-5" />
            <h4 className="text-sm font-black text-foreground">
              Sessão Integrada do Coach de Elite
            </h4>
          </div>

          {currentQuestion.subjectId === "RLM" ? (
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-foreground">
                📊 Resolução de Exatas Passo a Passo sem Saltos Lógicos
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse border border-border/40 font-mono">
                  <thead>
                    <tr className="bg-[#13141c]">
                      <th className="border border-border/40 p-2 text-left">Passo</th>
                      <th className="border border-border/40 p-2 text-left">Lógica</th>
                      <th className="border border-border/40 p-2 text-left">Fórmula Aplicada</th>
                      <th className="border border-border/40 p-2 text-left">Resultado Parcial</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/20">
                      <td className="p-2 font-black border border-border/40 text-primary">1</td>
                      <td className="p-2 border border-border/40">Identificar Preposição p e q</td>
                      <td className="p-2 border border-border/40">
                        p = Autua empresa, q = Aumenta arrecadação
                      </td>
                      <td className="p-2 border border-border/40 text-[#50fa7b]">p → q</td>
                    </tr>
                    <tr className="border-b border-border/20">
                      <td className="p-2 font-black border border-border/40 text-primary">2</td>
                      <td className="p-2 border border-border/40">Aplicar Contrapositiva</td>
                      <td className="p-2 border border-border/40">~q → ~p</td>
                      <td className="p-2 border border-border/40 text-[#50fa7b]">
                        Se arrecadação não aumenta, não autua
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-3 font-mono text-[11px] text-muted-foreground leading-relaxed bg-[#13141c]/50 p-4 rounded-xl border border-border/40">
              <div className="flex items-center gap-1 text-[#ffb86c] mb-1">
                <Compass className="h-4 w-4" />
                <span className="font-bold">Ancoragem Prática do Auditor:</span>
              </div>
              De acordo com a jurisprudência contábil e tributária, no regime de competência,
              qualquer despesa ou receita deve pertencer exclusivamente ao período contábil
              correspondente do respectivo fato gerador contábil. No caso prático, receitas
              diferidas figuram no passivo até que o serviço de fato seja prestado de forma
              integral.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
