import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck,
  FileEdit,
  FileText,
  Filter,
  History,
  Info,
  Play,
  RotateCcw,
  Save,
  Scale,
  Sparkles,
  Star,
  Tag,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  calculateSelfScore,
  getDiscursivePerformanceSummary,
  getDiscursiveQuestions,
  getSubmissionsForQuestion,
  saveDiscursiveSubmission,
} from "@/lib/discursive/discursiveEngine";
import type {
  DiscursivePerformanceSummary,
  DiscursiveQuestion,
  DiscursiveSubmission,
} from "@/lib/discursive/types";
import { addErrorToCentral } from "@/lib/error-central/service";
import { getLawTags } from "@/lib/syllabus/lawTagService";

export function DiscursiveManager() {
  const [questions] = useState<DiscursiveQuestion[]>(getDiscursiveQuestions());
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedBanca, setSelectedBanca] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Estado de Questão Ativa
  const [activeQuestion, setActiveQuestion] = useState<DiscursiveQuestion | null>(null);

  // Modo: 'list' | 'write' | 'grade' | 'result'
  const [mode, setMode] = useState<"list" | "write" | "grade">("list");

  // Estado da Resposta e Cronômetro
  const [userResponse, setUserResponse] = useState<string>("");
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Estado das Notas por Critério (Rubrica)
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [feedbackNotes, setFeedbackNotes] = useState<string>("");
  const [lastSubmission, setLastSubmission] = useState<DiscursiveSubmission | null>(null);

  // Resumo de Desempenho
  const [summary, setSummary] = useState<DiscursivePerformanceSummary>(
    getDiscursivePerformanceSummary(),
  );

  const lawTags = useMemo(() => getLawTags(), []);

  // Efeito do Cronômetro
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // Formatação de Tempo (MM:SS)
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Filtragem de Questões Discursivas
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesSubject = selectedSubject === "all" || q.subject === selectedSubject;
      const matchesBanca = selectedBanca === "all" || q.banca === selectedBanca;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        q.title.toLowerCase().includes(query) ||
        q.statement.toLowerCase().includes(query) ||
        q.subject.toLowerCase().includes(query);

      return matchesSubject && matchesBanca && matchesQuery;
    });
  }, [questions, selectedSubject, selectedBanca, searchQuery]);

  const uniqueSubjects = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.subject)));
  }, [questions]);

  const uniqueBancas = useMemo(() => {
    return Array.from(new Set(questions.map((q) => q.banca)));
  }, [questions]);

  // Iniciar Resolução de Questão
  const handleStartQuestion = (question: DiscursiveQuestion) => {
    setActiveQuestion(question);
    setUserResponse("");
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setMode("write");

    // Zerar rubricas com nota total inicial por conveniência
    const initialScores: Record<string, number> = {};
    question.gradingCriteria.forEach((c) => {
      initialScores[c.id] = c.weight;
    });
    setCriteriaScores(initialScores);
    setFeedbackNotes("");
  };

  // Avançar para Correção / Espelho Oficial
  const handleProceedToGrading = () => {
    setIsTimerRunning(false);
    setMode("grade");
  };

  // Atualizar pontuação de um critério específico
  const handleCriterionScoreChange = (critId: string, val: number) => {
    setCriteriaScores((prev) => ({
      ...prev,
      [critId]: val,
    }));
  };

  // Salvar Submissão da Autoavaliação
  const handleSaveSubmission = () => {
    if (!activeQuestion) return;

    const finalScore = calculateSelfScore(activeQuestion.gradingCriteria, criteriaScores);

    const saved = saveDiscursiveSubmission({
      questionId: activeQuestion.id,
      userResponse,
      selfScore: finalScore,
      criteriaScores,
      feedbackNotes,
      timeSpentSeconds: timerSeconds,
    });

    setLastSubmission(saved);
    setSummary(getDiscursivePerformanceSummary());
    setMode("list");
  };

  // Enviar lacuna/erro para o Caderno de Erros (Módulo 5.2)
  const handleAddToErrorCentral = () => {
    if (!activeQuestion) return;
    const finalScore = calculateSelfScore(activeQuestion.gradingCriteria, criteriaScores);

    addErrorToCentral({
      topicId: activeQuestion.id,
      topicName: activeQuestion.title,
      subjectName: activeQuestion.subject,
      errorCategory: "discursive_gap",
      notes: `Discursiva ${activeQuestion.banca} (${activeQuestion.contest || ""}): Nota ${finalScore}/${activeQuestion.maxScore}. Anotações: ${feedbackNotes || "Desvio de espelho de prova."}`,
    });

    alert("Lacuna adicionada ao Caderno de Erros com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Resumo de Desempenho e Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="panel p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Discursivas Resolvidas
            </span>
            <FileCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {summary.totalSubmissions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.totalQuestionsAttempted} enunciados únicos praticados
            </p>
          </div>
        </div>

        <div className="panel p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Aproveitamento Médio no Espelho
            </span>
            <Trophy className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {summary.averageScorePercentage}%
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${summary.averageScorePercentage}%` }}
              />
            </div>
          </div>
        </div>

        <div className="panel p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Padrão Banca FGV / Cebraspe
            </span>
            <Scale className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            Autoavaliação guiada por espelho oficial com fracionamento de rubrica e auditoria
            fiscal.
          </div>
        </div>
      </div>

      {/* MODO 1: Lista de Enunciados Discursivos */}
      {mode === "list" && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Input
                placeholder="Buscar por tema, enunciado ou legislação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs bg-card"
              />
              <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span>Filtros:</span>
              </div>

              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="h-9 px-3 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Todas as Disciplinas</option>
                {uniqueSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>

              <select
                value={selectedBanca}
                onChange={(e) => setSelectedBanca(e.target.value)}
                className="h-9 px-3 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Todas as Bancas</option>
                {uniqueBancas.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cards de Enunciados */}
          <div className="grid grid-cols-1 gap-4">
            {filteredQuestions.map((q) => {
              const questionSubs = getSubmissionsForQuestion(q.id);
              const bestScore = questionSubs.reduce((max, s) => Math.max(max, s.selfScore), 0);

              return (
                <div
                  key={q.id}
                  className="panel p-5 space-y-4 hover:border-primary/40 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold"
                        >
                          {q.banca}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-muted text-foreground">
                          {q.subject}
                        </Badge>
                        {q.contest && (
                          <span className="text-xs text-muted-foreground font-mono">
                            • {q.contest}
                          </span>
                        )}
                      </div>
                      <h3 className="font-display font-bold text-base text-foreground">
                        {q.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {questionSubs.length > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground block">
                            Melhor Pontuação
                          </span>
                          <span className="font-mono font-bold text-xs text-emerald-400">
                            {bestScore.toFixed(1)} / {q.maxScore.toFixed(1)} pts
                          </span>
                        </div>
                      )}

                      <Button
                        size="sm"
                        onClick={() => handleStartQuestion(q)}
                        className="gap-2 text-xs"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Praticar Redação
                      </Button>
                    </div>
                  </div>

                  {/* Trecho do Enunciado */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {q.statement}
                  </p>

                  {/* Informações de Rubrica e LawTags */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-primary" />
                        {q.suggestedTimeMinutes || 45} min sugeridos
                      </span>
                      <span className="flex items-center gap-1">
                        <Award className="h-3.5 w-3.5 text-amber-400" />
                        {q.gradingCriteria.length} critérios na rubrica ({q.maxScore} pts)
                      </span>
                    </div>

                    {q.lawTags && q.lawTags.length > 0 && (
                      <div className="flex items-center gap-1">
                        {q.lawTags.map((tagId) => {
                          const tag = lawTags.find((t) => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <span
                              key={tag.id}
                              className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono"
                            >
                              <Tag className="h-3 w-3 inline mr-1" />
                              {tag.lawName} {tag.articleNumber}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODO 2: Editor de Resposta / Redação */}
      {mode === "write" && activeQuestion && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setMode("list")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar para Enunciados
            </button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-muted px-3 py-1 rounded-lg text-xs font-mono font-bold text-foreground border border-border">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span>{formatTime(timerSeconds)}</span>
              </div>

              <Button size="sm" onClick={handleProceedToGrading} className="gap-2 text-xs">
                Concluir & Ir para Espelho <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Esquerda: Enunciado Oficial da Prova */}
            <div className="panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold"
                >
                  {activeQuestion.banca} — {activeQuestion.subject}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  Valendo {activeQuestion.maxScore.toFixed(1)} pontos
                </span>
              </div>

              <div>
                <h2 className="font-display font-bold text-lg text-foreground mb-3">
                  {activeQuestion.title}
                </h2>
                <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line bg-muted/30 p-4 rounded-xl border border-border/50">
                  {activeQuestion.statement}
                </div>
              </div>

              {/* Rubrica de Pontuação Esperada */}
              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-amber-400" />
                  Critérios Avaliados no Espelho:
                </span>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {activeQuestion.gradingCriteria.map((crit, idx) => (
                    <li key={crit.id} className="flex items-start gap-2">
                      <span className="font-mono text-primary font-bold">{idx + 1}.</span>
                      <span>
                        {crit.description} (até {crit.weight.toFixed(1)} pts)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Direita: Campo de Redação do Aluno */}
            <div className="panel p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <FileEdit className="h-4 w-4 text-primary" />
                    Sua Resposta Dissertativa / Peça Prática:
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {userResponse.length} caracteres |{" "}
                    {userResponse.trim().split(/\s+/).filter(Boolean).length} palavras
                  </span>
                </div>

                <textarea
                  rows={16}
                  value={userResponse}
                  onChange={(e) => setUserResponse(e.target.value)}
                  placeholder="Redija aqui sua fundamentação jurídica e contábil com precisão técnica..."
                  className="w-full p-4 text-xs font-sans bg-card border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-[11px] text-muted-foreground">
                  Dica: Argumente fundamentando nos artigos de lei (CTN, LC 87/96, CF/88).
                </span>
                <Button size="sm" onClick={handleProceedToGrading} className="gap-2 text-xs">
                  Submeter para Espelho <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODO 3: Autoavaliação com Espelho de Prova Oficial */}
      {mode === "grade" && activeQuestion && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <button
              type="button"
              onClick={() => setMode("write")}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" /> Editar Minha Redação
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Tempo Redação:</span>
              <span className="text-xs font-mono font-bold text-foreground">
                {formatTime(timerSeconds)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Esquerda: Comparação Resposta vs Espelho Oficial */}
            <div className="space-y-4">
              <div className="panel p-4 space-y-2 bg-emerald-500/5 border-emerald-500/20">
                <h3 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  Espelho Oficial de Resposta da Banca ({activeQuestion.banca})
                </h3>
                <div className="text-xs text-foreground leading-relaxed whitespace-pre-line bg-card p-3 rounded-lg border border-border/40">
                  {activeQuestion.modelAnswer}
                </div>
              </div>

              <div className="panel p-4 space-y-2">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" />
                  Sua Resposta Submetida:
                </h3>
                <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/40 p-3 rounded-lg border border-border/40">
                  {userResponse || "(Nenhuma resposta redigida)"}
                </div>
              </div>
            </div>

            {/* Direita: Grade de Correção / Rubricas */}
            <div className="panel p-5 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-display font-bold text-base text-foreground">
                      Rubrica de Autoavaliação
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Atribua a pontuação equivalente a cada item cobrado no espelho.
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-muted-foreground block">Nota Final</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">
                      {calculateSelfScore(activeQuestion.gradingCriteria, criteriaScores).toFixed(
                        1,
                      )}{" "}
                      / {activeQuestion.maxScore.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Lista de Critérios com Inputs */}
                <div className="space-y-4">
                  {activeQuestion.gradingCriteria.map((crit, idx) => {
                    const currentScore = criteriaScores[crit.id] ?? 0;

                    return (
                      <div
                        key={crit.id}
                        className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs text-foreground font-medium">
                            {idx + 1}. {crit.description}
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-400 shrink-0">
                            Máx: {crit.weight.toFixed(1)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <input
                            type="range"
                            min={0}
                            max={crit.weight}
                            step={0.5}
                            value={currentScore}
                            onChange={(e) =>
                              handleCriterionScoreChange(crit.id, parseFloat(e.target.value))
                            }
                            className="flex-1 accent-primary cursor-pointer"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={crit.weight}
                            step={0.5}
                            value={currentScore}
                            onChange={(e) =>
                              handleCriterionScoreChange(crit.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 h-8 text-xs font-mono text-center bg-card"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Anotações Pessoais de Feedback */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-muted-foreground block">
                    Observações de Correção & Onde Melhorar:
                  </label>
                  <textarea
                    rows={3}
                    value={feedbackNotes}
                    onChange={(e) => setFeedbackNotes(e.target.value)}
                    placeholder="Ex: Esqueci de citar expressamente o § 4º do Art. 150 do CTN..."
                    className="w-full p-3 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddToErrorCentral}
                  className="w-full sm:w-auto text-xs gap-1.5 text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Enviar para Caderno de Erros
                </Button>

                <Button
                  size="sm"
                  onClick={handleSaveSubmission}
                  className="w-full sm:w-auto gap-2 text-xs"
                >
                  <Save className="h-4 w-4" />
                  Salvar Avaliação
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
