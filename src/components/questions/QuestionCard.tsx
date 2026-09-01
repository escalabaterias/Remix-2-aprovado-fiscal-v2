import React, { useState, useEffect, useRef } from "react";
import { Question, ErrorCategory } from "@/lib/questions/types";
import { registerAttempt } from "@/lib/questions/errorTracker";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  BookOpen,
  HelpCircle,
  RefreshCw,
  MessageSquare,
  Sparkles,
  Bookmark,
  ShieldCheck,
  Flame,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface QuestionCardProps {
  question: Question;
  onAttemptCompleted?: (wasCorrect: boolean) => void;
  onNextQuestion?: () => void;
}

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

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAttemptCompleted,
  onNextQuestion,
}) => {
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [selectedErrorCategory, setSelectedErrorCategory] = useState<ErrorCategory | null>(null);
  const [errorNotes, setErrorNotes] = useState("");
  const [isNotesSaved, setIsNotesSaved] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Iniciar e resetar o cronômetro para cada questão individualmente
  useEffect(() => {
    setSelectedAlternative(null);
    setHasSubmitted(false);
    setIsCorrect(false);
    setSelectedErrorCategory(null);
    setErrorNotes("");
    setIsNotesSaved(false);
    setTimeSpent(0);

    timerRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [question.id]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSelectAlternative = (letter: string) => {
    if (hasSubmitted) return;
    setSelectedAlternative(letter);
  };

  const handleSubmitAnswer = () => {
    if (!selectedAlternative) return;

    // Parar cronômetro
    if (timerRef.current) clearInterval(timerRef.current);

    const correctLetter = question.correctAnswer.trim().toUpperCase();
    const wasCorrect = selectedAlternative === correctLetter;

    setIsCorrect(wasCorrect);
    setHasSubmitted(true);

    if (wasCorrect) {
      // Registrar no motor de erros local sem categoria de erro (já que acertou)
      registerAttempt("user-123", question.id, selectedAlternative, timeSpent);
      if (onAttemptCompleted) onAttemptCompleted(true);
    }
  };

  const handleRegisterFailureCause = () => {
    if (!selectedErrorCategory) return;

    // Registrar novamente agora com a categorização específica do desvio de erro
    registerAttempt(
      "user-123",
      question.id,
      selectedAlternative || "",
      timeSpent,
      selectedErrorCategory,
      errorNotes,
    );

    setIsNotesSaved(true);
    if (onAttemptCompleted) onAttemptCompleted(false);
  };

  const getAlternativeLetter = (index: number): string => {
    return ["A", "B", "C", "D", "E"][index] || String(index);
  };

  return (
    <div
      className="w-full bg-card border border-border rounded-2xl shadow-xl overflow-hidden flex flex-col"
      id={`question-card-${question.id}`}
    >
      {/* Cabeçalho da Questão */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-6 py-4 border-b border-border bg-[#13141c]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 font-bold">
            {question.examBoard}
          </Badge>
          <Badge variant="outline" className="text-muted-foreground border-border font-semibold">
            {question.year}
          </Badge>
          <Badge
            variant="outline"
            className={`font-semibold ${
              question.difficulty === "Difícil"
                ? "text-destructive border-destructive/20"
                : question.difficulty === "Médio"
                  ? "text-[#ffb86c] border-[#ffb86c]/25"
                  : "text-[#50fa7b] border-[#50fa7b]/25"
            }`}
          >
            {question.difficulty || "Médio"}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            {question.subjectName} &bull; {question.topicName}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span>{formatTime(timeSpent)}</span>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-6 md:p-8 space-y-6 flex-1">
        {/* Enunciado */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Enunciado da Questão
          </div>
          <p className="text-sm md:text-base text-foreground font-medium leading-relaxed">
            {question.statement}
          </p>
        </div>

        {/* Alternativas */}
        <div className="space-y-3">
          {question.alternatives.map((altText, idx) => {
            const letter = getAlternativeLetter(idx);
            const isSelected = selectedAlternative === letter;
            const isCorrectAnswer = letter === question.correctAnswer;

            let btnStyle = "bg-card/50 border-border hover:bg-muted/30 text-foreground";

            if (isSelected && !hasSubmitted) {
              btnStyle = "bg-primary/5 border-primary text-foreground shadow-sm shadow-primary/10";
            } else if (hasSubmitted) {
              if (isCorrectAnswer) {
                btnStyle = "bg-[#50fa7b]/10 border-[#50fa7b] text-[#50fa7b] font-medium";
              } else if (isSelected && !isCorrect) {
                btnStyle = "bg-[#ff5555]/10 border-[#ff5555] text-[#ff5555]";
              } else {
                btnStyle = "bg-card/30 border-border/50 text-muted-foreground opacity-60";
              }
            }

            return (
              <button
                key={letter}
                onClick={() => handleSelectAlternative(letter)}
                disabled={hasSubmitted}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${btnStyle}`}
                id={`alternative-${letter}`}
              >
                <span
                  className={`w-6 h-6 rounded-lg font-bold font-mono text-xs flex items-center justify-center shrink-0 border ${
                    isSelected && !hasSubmitted
                      ? "bg-primary text-primary-foreground border-primary"
                      : hasSubmitted && isCorrectAnswer
                        ? "bg-[#50fa7b] text-[#282a36] border-[#50fa7b]"
                        : hasSubmitted && isSelected
                          ? "bg-[#ff5555] text-white border-[#ff5555]"
                          : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {letter}
                </span>
                <span className="text-xs md:text-sm leading-relaxed pt-0.5">
                  {altText.replace(/^[A-E]\)\s*/, "")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Gabarito Comentado e Causa do Erro */}
        {hasSubmitted && (
          <div className="space-y-6 animate-fade-in pt-6 border-t border-border">
            {/* Feedback Visual de Acerto ou Erro */}
            <div
              className={`p-4 rounded-xl flex items-center gap-3 border ${
                isCorrect
                  ? "bg-[#50fa7b]/5 border-[#50fa7b]/20 text-[#50fa7b]"
                  : "bg-[#ff5555]/5 border-[#ff5555]/20 text-[#ff5555]"
              }`}
            >
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-5 w-5 fill-[#50fa7b] text-[#282a36]" />
                  <div>
                    <h5 className="text-sm font-bold">Excelente! Resposta Correta.</h5>
                    <p className="text-[11px] text-muted-foreground">
                      Você dominou as limitações tributárias e economizou valiosos pontos de prova.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 fill-[#ff5555] text-white" />
                  <div>
                    <h5 className="text-sm font-bold">Resposta Incorreta.</h5>
                    <p className="text-[11px] text-muted-foreground">
                      Identifique o erro abaixo para evitar que ele ocorra no dia do concurso
                      oficial.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* MÓDULO DE DESVIO DE ERRO (Apenas em caso de erro) */}
            {!isCorrect && !isNotesSaved && (
              <div className="bg-[#1e1f29] border border-border rounded-xl p-5 md:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-[#ffb86c]/10 text-[#ffb86c]">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Desvio de Erro &bull; Diagnóstico Ativo
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      Por que você errou esta questão? Marque com precisão técnica.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ERROR_CATEGORY_MAP.map((cat) => {
                    const isCatSelected = selectedErrorCategory === cat.value;
                    return (
                      <button
                        key={cat.value}
                        onClick={() => setSelectedErrorCategory(cat.value)}
                        className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                          isCatSelected
                            ? "bg-primary/5 border-primary shadow-sm"
                            : "bg-card border-border hover:bg-muted/25"
                        }`}
                        id={`category-btn-${cat.value}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{cat.icon}</span>
                          <span className="text-xs font-bold text-foreground">{cat.label}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-relaxed pl-1">
                          {cat.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Notas adicionais de superação / Plano de Ação
                  </label>
                  <textarea
                    placeholder="Escreva qual pegadinha você caiu ou o que fazer para lembrar (ex: ler mais o art. 150 da CF/88)..."
                    value={errorNotes}
                    onChange={(e) => setErrorNotes(e.target.value)}
                    className="w-full h-20 text-xs bg-card border border-border rounded-xl p-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                    id="error-notes-textarea"
                  />
                </div>

                <Button
                  onClick={handleRegisterFailureCause}
                  disabled={!selectedErrorCategory}
                  className="w-full text-xs font-bold h-9 cursor-pointer"
                  id="submit-error-cause-btn"
                >
                  Confirmar Cadastro no Caderno de Erros
                </Button>
              </div>
            )}

            {isNotesSaved && (
              <div className="bg-[#50fa7b]/5 border border-[#50fa7b]/15 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#50fa7b]" />
                  <span className="text-xs font-semibold text-gray-200">
                    Sua falha foi catalogada como{" "}
                    <strong className="text-[#50fa7b]">
                      "{ERROR_CATEGORY_MAP.find((c) => c.value === selectedErrorCategory)?.label}"
                    </strong>{" "}
                    e re-inserida na fila do Anki de revisão automática.
                  </span>
                </div>
              </div>
            )}

            {/* Gabarito Comentado Didático */}
            <div className="bg-muted/15 rounded-xl p-5 border border-border space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground uppercase tracking-wider">
                <BookOpen className="h-4 w-4 text-primary" /> Gabarito Comentado pelo Professor
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line font-mono">
                {question.explanation}
              </p>

              {question.associatedLaws && question.associatedLaws.length > 0 && (
                <div className="pt-3 border-t border-border/40 space-y-1.5">
                  <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    Legislação Seca de Suporte (LawTags)
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {question.associatedLaws.map((law, lIdx) => (
                      <span
                        key={lIdx}
                        className="bg-[#ff79c6]/10 text-[#ff79c6] border border-[#ff79c6]/20 px-2 py-0.5 rounded font-mono text-[10px] font-bold cursor-help"
                        title="Ver artigo no Vade Mecum"
                      >
                        § {law}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rodapé do Card */}
      <div className="px-6 py-4 bg-muted/20 border-t border-border flex justify-between items-center h-16">
        <div>
          {hasSubmitted && (
            <span className="text-xs text-muted-foreground">
              Alternativa correta:{" "}
              <strong className="text-[#50fa7b] font-extrabold">{question.correctAnswer}</strong>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!hasSubmitted ? (
            <Button
              onClick={handleSubmitAnswer}
              disabled={!selectedAlternative}
              className="font-bold text-xs h-9 px-5 cursor-pointer"
              id="submit-answer-btn"
            >
              Responder <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            onNextQuestion && (
              <Button
                onClick={onNextQuestion}
                variant="outline"
                className="font-bold text-xs h-9 px-5 cursor-pointer border-border hover:bg-muted"
                id="next-question-btn"
              >
                Próxima Questão <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
};
