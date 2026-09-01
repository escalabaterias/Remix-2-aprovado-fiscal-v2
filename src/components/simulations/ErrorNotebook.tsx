import React, { useState, useEffect } from "react";
import { ErrorCategory, Question } from "@/lib/questions/types";
import { EXTENDED_FISCAL_QUESTIONS } from "@/lib/questions/questionEngine";
import { getLocalAttempts } from "@/lib/questions/errorTracker";
import { FISCAL_SUBJECTS } from "@/lib/simulations/simulationEngine";
import {
  ShieldAlert,
  Search,
  BookOpen,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Filter,
  RefreshCw,
  Trophy,
  Sliders,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const ERROR_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  atencao: {
    label: "Falta de Atenção",
    icon: "👁️",
    desc: "Erros por pressa ou troca de conceitos.",
  },
  conhecimento: {
    label: "Falta de Conhecimento",
    icon: "📚",
    desc: "Assunto ou lei que ainda não foi dominado.",
  },
  interpretacao: {
    label: "Pegadinha de Banca",
    icon: "🪤",
    desc: "Pegadinhas e trocadilhos da banca.",
  },
  esquecimento: {
    label: "Esquecimento / Curva",
    icon: "🧠",
    desc: "Estudou no passado mas esqueceu o detalhe.",
  },
  calculo: { label: "Erro de Cálculo", icon: "🔢", desc: "Desvios em contas ou lançamentos." },
  estrategia: {
    label: "Estratégia",
    icon: "🎯",
    desc: "Indecisão ou escolha da pior alternativa.",
  },
  outros: { label: "Outros Motivos", icon: "⚙️", desc: "Outros fatores gerais." },
};

export const ErrorNotebook: React.FC = () => {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedBoard, setSelectedBoard] = useState<string>("all");

  // Estados de re-resolução individual
  const [reSolvingId, setReSolvingId] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [reSolvedSuccess, setReSolvedSuccess] = useState<boolean | null>(null);

  const loadAttempts = () => {
    const raw = localStorage.getItem("fiscal_simulation_results");
    const simulationResults = raw ? JSON.parse(raw) : [];

    // Carrega também tentativas do errorTracker local para unificar as fontes de erros
    const localAttempts = getLocalAttempts();

    const allAttemptsMap: Record<string, any> = {};

    // 1. Processa tentativas locais tradicionais
    localAttempts.forEach((att: any) => {
      if (!att.isCorrect) {
        allAttemptsMap[att.questionId] = {
          questionId: att.questionId,
          selectedOption: att.selectedAlternative || att.selectedOption,
          isCorrect: false,
          errorCategory: att.errorCategory || "outros",
          notes: att.notes || "Erro capturado no módulo de questões adaptativas.",
          occurredAt: att.occurredAt || att.timestamp || new Date().toISOString(),
        };
      }
    });

    // 2. Mescla tentativas oriundas dos simulados complexos
    simulationResults.forEach((sim: any) => {
      Object.values(sim.attempts).forEach((att: any) => {
        if (!att.isCorrect) {
          allAttemptsMap[att.questionId] = {
            ...att,
            errorCategory: att.errorCategory || "outros",
            occurredAt: sim.completedAt,
          };
        }
      });
    });

    setAttempts(Object.values(allAttemptsMap));
  };

  useEffect(() => {
    loadAttempts();
  }, []);

  // Filtra as tentativas cadastradas de acordo com as regras cognitivas selecionadas
  const filteredAttempts = attempts.filter((att) => {
    // Localiza questão correspondente para checar disciplina e banca
    const question = EXTENDED_FISCAL_QUESTIONS.find((q) => q.id === att.questionId);

    // Fallback de dados para IDs gerados sob demanda
    let questionSubject = "DIR-TRIB";
    let questionBoard = "FGV";

    if (question) {
      questionSubject = question.subjectId;
      questionBoard = question.examBoard;
    } else if (att.questionId.startsWith("SIM-")) {
      const parts = att.questionId.split("-");
      if (parts[1]) questionSubject = parts[1];
      if (parts[2]) questionBoard = parts[2];
    }

    const matchesCategory = selectedCategory === "all" || att.errorCategory === selectedCategory;
    const matchesSubject = selectedSubject === "all" || questionSubject === selectedSubject;
    const matchesBoard =
      selectedBoard === "all" || questionBoard.toUpperCase() === selectedBoard.toUpperCase();

    return matchesCategory && matchesSubject && matchesBoard;
  });

  const handleStartReSolve = (qId: string) => {
    setReSolvingId(qId);
    setSelectedOption(null);
    setReSolvedSuccess(null);
  };

  const handleConfirmReSolve = (question: Question) => {
    if (!selectedOption) return;

    const correct =
      selectedOption.trim().toUpperCase() === question.correctAnswer.trim().toUpperCase();
    setReSolvedSuccess(correct);

    if (correct) {
      // Se acertou, remove/marca como consolidada no simulado local para dar satisfação do progresso mnemônico
      try {
        const raw = localStorage.getItem("fiscal_simulation_results");
        let resultsList = raw ? JSON.parse(raw) : [];
        let updated = false;

        resultsList = resultsList.map((sim: any) => {
          if (sim.attempts[question.id]) {
            sim.attempts[question.id].isCorrect = true;
            updated = true;
          }
          return sim;
        });

        if (updated) {
          localStorage.setItem("fiscal_simulation_results", JSON.stringify(resultsList));
        }

        // Também remove do errorTracker para sincronia total
        const attemptsKey = "fiscal_question_attempts_aluno_demo_fiscal";
        const localRaw = localStorage.getItem(attemptsKey);
        if (localRaw) {
          let localList = JSON.parse(localRaw);
          localList = localList.map((item: any) => {
            if (item.questionId === question.id) {
              item.isCorrect = true;
            }
            return item;
          });
          localStorage.setItem(attemptsKey, JSON.stringify(localList));
        }

        // Dá reload gradual na lista
        setTimeout(() => {
          loadAttempts();
          setReSolvingId(null);
        }, 1500);
      } catch (err) {
        console.warn("Falha ao salvar consolidação de erro.", err);
      }
    }
  };

  return (
    <div className="space-y-6" id="error-notebook-view">
      {/* Banner Superior do Painel */}
      <div className="bg-card border border-border rounded-2xl p-4.5 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-black text-foreground tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-400" /> Caderno de Erros Cognitivo
          </h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Elimine as falhas mentais re-resolvendo questões mapeadas por padrão comportamental de
            desvio.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#13141c] border border-border/60 rounded-xl px-3 py-1.5 text-[10px] font-mono text-muted-foreground">
          <span>{filteredAttempts.length} erros localizados</span>
        </div>
      </div>

      {/* Painel de Filtros */}
      <Card className="border-border/60 bg-card/50 backdrop-blur-xs">
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-muted-foreground font-mono">
              Erro Cognitivo
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-[#13141c] border border-border/60 rounded-lg p-2 text-xs font-bold text-foreground focus:outline-none"
            >
              <option value="all">🔍 Todos os Tipos de Erro</option>
              {Object.keys(ERROR_LABELS).map((cat) => (
                <option key={cat} value={cat}>
                  {ERROR_LABELS[cat].icon} {ERROR_LABELS[cat].label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-muted-foreground font-mono">
              Disciplina
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-[#13141c] border border-border/60 rounded-lg p-2 text-xs font-bold text-foreground focus:outline-none"
            >
              <option value="all">📚 Todas as Disciplinas</option>
              {Object.keys(FISCAL_SUBJECTS).map((subId) => (
                <option key={subId} value={subId}>
                  {FISCAL_SUBJECTS[subId]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-muted-foreground font-mono">
              Banca
            </label>
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              className="w-full bg-[#13141c] border border-border/60 rounded-lg p-2 text-xs font-bold text-foreground focus:outline-none"
            >
              <option value="all">🏛️ Todas as Bancas</option>
              <option value="FGV">FGV</option>
              <option value="CEBRASPE">CEBRASPE</option>
              <option value="FCC">FCC</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Listagem de Falhas */}
      {filteredAttempts.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center space-y-3">
          <div className="text-3xl">🎉</div>
          <h4 className="text-sm font-bold text-foreground">
            Excelente! Nenhum desvio cognitivo cadastrado nesta combinação.
          </h4>
          <p className="text-[11px] text-muted-foreground">
            Sua assertividade de alto rendimento está calibrada.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAttempts.map((att) => {
            // Busca a questão completa
            const q =
              EXTENDED_FISCAL_QUESTIONS.find((question) => question.id === att.questionId) ||
              ({
                id: att.questionId,
                statement:
                  "Questão dinâmica do simulado. Verifique os metadados abaixo para re-resolver.",
                explanation: "Gabarito contido no resumo da questão no pós-prova do simulado.",
                correctAnswer: "B",
                alternatives: [
                  "A) Erro metodológico de tese.",
                  "B) Correção pragmática do fato gerador do CTN.",
                  "C) Imunidade estendida ao regramento estadual.",
                  "D) Ausência de amparo do poder municipal.",
                ],
                subjectName: FISCAL_SUBJECTS[att.questionId.split("-")[1]] || "Finanças Públicas",
                difficulty: "Médio",
                examBoard: att.questionId.split("-")[2] || "Banca",
              } as any);

            const isCebraspeQuestion = q.examBoard.toUpperCase() === "CEBRASPE";
            const errInfo = ERROR_LABELS[att.errorCategory] || ERROR_LABELS["outros"];
            const isReSolving = reSolvingId === q.id;

            return (
              <Card key={att.questionId} className="border-border/60 bg-card overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-4 bg-muted/20 border-b border-border/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                      {errInfo.icon} {errInfo.label}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono">
                      {q.subjectName} • {q.examBoard}
                    </span>
                  </div>

                  <div className="text-[9px] text-muted-foreground font-mono">
                    Registrado em: {new Date(att.occurredAt).toLocaleDateString()}
                  </div>
                </CardHeader>

                <CardContent className="p-4.5 space-y-4">
                  {/* Enunciado */}
                  <div className="text-xs text-foreground leading-relaxed">{q.statement}</div>

                  {/* Detalhes sobre as anotações do erro */}
                  {att.notes && (
                    <div className="text-[10px] bg-red-500/[0.01] border border-red-500/10 rounded-lg p-3 font-mono text-[#ffb86c]">
                      <strong>Minhas anotações:</strong> {att.notes}
                    </div>
                  )}

                  {/* Painel de Re-resolução */}
                  {isReSolving ? (
                    <div className="border border-primary/30 rounded-xl p-4 bg-[#13141c]/40 space-y-4 animate-fade-in">
                      <h5 className="text-[10px] font-black uppercase text-primary tracking-wider">
                        Modo Re-resolução de Segurança
                      </h5>

                      <div className="space-y-2">
                        {isCebraspeQuestion ? (
                          <div className="grid grid-cols-2 gap-3">
                            {["C", "E"].map((letter) => (
                              <button
                                key={letter}
                                onClick={() => setSelectedOption(letter)}
                                className={`p-3 rounded-lg border text-xs font-bold font-mono text-center cursor-pointer ${
                                  selectedOption === letter
                                    ? "bg-primary/10 border-primary text-foreground"
                                    : "bg-[#13141c] border-border/60 text-muted-foreground"
                                }`}
                              >
                                {letter === "C" ? "Certo" : "Errado"}
                              </button>
                            ))}
                          </div>
                        ) : (
                          q.alternatives.map((alt: string) => {
                            const letter = alt.charAt(0);
                            return (
                              <button
                                key={alt}
                                onClick={() => setSelectedOption(letter)}
                                className={`w-full text-left p-3 rounded-lg border text-xs flex items-center gap-2 cursor-pointer ${
                                  selectedOption === letter
                                    ? "bg-primary/10 border-primary text-foreground"
                                    : "bg-[#13141c] border-border/60 text-muted-foreground"
                                }`}
                              >
                                <span className="font-bold">{letter}</span>
                                <span className="truncate">{alt.substring(2)}</span>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {reSolvedSuccess !== null && (
                        <div
                          className={`text-xs font-bold flex items-center gap-1.5 ${
                            reSolvedSuccess ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {reSolvedSuccess ? (
                            <>
                              <CheckCircle2 className="h-4.5 w-4.5" /> Sucesso! Erro mitigado e
                              retirado da listagem ativa.
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4.5 w-4.5" /> Ops! Erro persistente. Estude o
                              gabarito comentado abaixo.
                            </>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setReSolvingId(null)}
                          className="text-[10px] font-bold h-8 cursor-pointer"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleConfirmReSolve(q)}
                          disabled={!selectedOption || reSolvedSuccess !== null}
                          className="text-[10px] font-bold h-8 bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer"
                        >
                          Confirmar Gabarito
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center pt-2">
                      <div className="text-[10px] text-muted-foreground font-mono">
                        Seu chute anterior:{" "}
                        <span className="text-red-400 font-bold">
                          {att.selectedOption || "N/A"}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleStartReSolve(q.id)}
                        className="text-[10px] font-bold h-8 bg-[#13141c] border border-border/80 text-foreground hover:bg-muted/10 cursor-pointer"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Re-resolver Questão
                      </Button>
                    </div>
                  )}

                  {/* Gabarito comentado para consulta rápida */}
                  {!isReSolving && (
                    <div className="bg-[#13141c]/30 border border-border/40 rounded-lg p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-foreground font-bold">
                        <BookOpen className="h-3.5 w-3.5 text-primary" /> Gabarito de Consulta:
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed font-mono">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
