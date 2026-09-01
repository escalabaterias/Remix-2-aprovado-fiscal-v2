import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Target,
  BookOpen,
  Calendar,
  Clock,
  Zap,
  Building2,
  ShieldCheck,
  Award,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addDays, todayISO } from "@/lib/planner/availability";
import {
  DEFAULT_BLOCK_MINUTES,
  DEFAULT_MAX_DAILY_MINUTES,
  generatePlanTasks,
} from "@/lib/planner/service";
import {
  OFFICIAL_FISCAL_CONTESTS,
  type OfficialFiscalContest,
} from "@/lib/concursos/fiscalKnowledgeBase";
import { cloneOfficialFiscalContest } from "@/lib/concursos/fiscalSyncService";

export function PlanoWizard({ onCancel }: { onCancel?: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Concurso Fiscal Alvo
  const [selectedOfficialId, setSelectedOfficialId] = useState<string>("sefaz-sp-afre");
  const [contestId, setContestId] = useState<string>("");
  const [name, setName] = useState("Ciclo Reta Final — SEFAZ-SP AFRE");

  // Step 2: Matérias e Domínio Inicial
  const [selectedTopics, setSelectedTopics] = useState<
    Record<string, "iniciante" | "intermediario" | "avancado">
  >({});

  // Step 3: Disponibilidade
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDays(todayISO(), 27));
  const [blockMinutes, setBlockMinutes] = useState(String(DEFAULT_BLOCK_MINUTES));
  const [maxDaily, setMaxDaily] = useState(String(DEFAULT_MAX_DAILY_MINUTES / 60));
  const [isCloning, setIsCloning] = useState(false);

  // Query concursos já cadastrados no Supabase
  const { data: dbContests, isLoading: loadingContests } = useQuery({
    queryKey: ["contests-for-wizard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contests")
        .select("id, name, role_title, exam_board, exam_date, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Query tópicos para o concurso selecionado
  const {
    data: contestTopics,
    isLoading: loadingTopics,
    refetch: refetchTopics,
  } = useQuery({
    queryKey: ["contest-topics-wizard", contestId],
    enabled: Boolean(contestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contest_topics")
        .select("id, priority, weight, relevance_score, subjects(id, name), topics(id, name)")
        .eq("contest_id", contestId)
        .order("priority", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleSelectOfficialContest = (official: OfficialFiscalContest) => {
    setSelectedOfficialId(official.id);
    setName(`Plano de Alta Performance — ${official.name}`);
  };

  const handleProceedToTopics = async () => {
    try {
      setIsCloning(true);
      // Provisiona e clona a árvore do edital oficial em lote (bulk insert)
      const sync = await cloneOfficialFiscalContest(selectedOfficialId);
      setContestId(sync.contestId);
      await queryClient.invalidateQueries({ queryKey: ["contest-topics-wizard"] });
      await queryClient.invalidateQueries({ queryKey: ["contests"] });
      await queryClient.invalidateQueries({ queryKey: ["contests-for-wizard"] });
      await refetchTopics();
      setStep(2);
      toast.success(
        `Árvore oficial sincronizada: ${sync.subjectsCount} matérias e ${sync.contestTopicsCount} tópicos carregados com sucesso!`,
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao sincronizar edital fiscal.");
    } finally {
      setIsCloning(false);
    }
  };

  const handleDomainChange = (
    topicId: string,
    level: "iniciante" | "intermediario" | "avancado",
  ) => {
    setSelectedTopics((prev) => ({
      ...prev,
      [topicId]: level,
    }));
  };

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      if (!contestId) throw new Error("Selecione um concurso alvo.");
      if (!name.trim()) throw new Error("Informe o nome do plano de estudos.");

      const selectedTopicIds = Object.keys(selectedTopics);
      const domainMap = selectedTopics;

      // 1. Criar o plano
      const { data: newPlan, error: planError } = await supabase
        .from("study_plans")
        .insert({
          user_id: auth.user.id,
          contest_id: contestId,
          name: name.trim(),
          start_date: startDate,
          end_date: endDate,
          is_active: true,
          settings: {
            blockMinutes: Number(blockMinutes) || DEFAULT_BLOCK_MINUTES,
            maxDailyMinutes: Math.round((Number(maxDaily) || 8) * 60),
            contestTopicIds: selectedTopicIds,
            domainMap,
          },
        })
        .select("id")
        .single();

      if (planError || !newPlan) throw planError || new Error("Erro ao criar plano");

      // 2. Gerar tarefas no motor de planejamento cognitivo unificado
      try {
        await generatePlanTasks(newPlan.id);
      } catch (err) {
        console.warn("Plano criado. Erro ao pré-gerar tarefas automáticas:", err);
      }

      return newPlan.id;
    },
    onSuccess: (newPlanId) => {
      toast.success("Plano de estudos fiscal gerado e tarefas distribuídas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["study-plans"] });
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
      navigate({ to: "/plano/$planId", params: { planId: newPlanId } });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Barra de Progresso do Wizard */}
      <Card className="border-border/60 bg-card/60 backdrop-blur-xs">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3 text-xs font-semibold">
            <span className="text-emerald-400 font-mono flex items-center gap-1.5">
              <Sparkles className="h-4 w-4" />
              Onboarding & Planejador Fiscal
            </span>
            <span className="text-muted-foreground">Etapa {step} de 3</span>
          </div>

          <Progress value={(step / 3) * 100} className="h-2 bg-muted" />

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div
              className={`p-2 rounded-lg border text-xs transition-colors ${
                step === 1
                  ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-400"
                  : step > 1
                    ? "border-emerald-500/30 text-emerald-400/80 bg-emerald-500/5"
                    : "border-border text-muted-foreground"
              }`}
            >
              1. Edital Fiscal Alvo
            </div>
            <div
              className={`p-2 rounded-lg border text-xs transition-colors ${
                step === 2
                  ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-400"
                  : step > 2
                    ? "border-emerald-500/30 text-emerald-400/80 bg-emerald-500/5"
                    : "border-border text-muted-foreground"
              }`}
            >
              2. Matérias & Nível Inicial
            </div>
            <div
              className={`p-2 rounded-lg border text-xs transition-colors ${
                step === 3
                  ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-400"
                  : "border-border text-muted-foreground"
              }`}
            >
              3. Ritmo & Disponibilidade
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ETAPA 1: SELEÇÃO DO EDITAL FISCAL REAL */}
      {step === 1 && (
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              >
                <Target className="h-3.5 w-3.5 mr-1" />
                Etapa 1
              </Badge>
              <CardTitle className="text-xl font-bold font-display">
                Escolha o Edital Fiscal de Referência
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Selecione o concurso fiscal desejado. O Aprovado Fiscal importará automaticamente toda
              a árvore de matérias, tópicos, pesagens e incidências históricas da banca oficial.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {OFFICIAL_FISCAL_CONTESTS.map((official) => {
                const isSelected = selectedOfficialId === official.id;
                return (
                  <button
                    key={official.id}
                    type="button"
                    onClick={() => handleSelectOfficialContest(official)}
                    className={`panel p-4 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden ${
                      isSelected
                        ? "border-emerald-500/70 bg-emerald-950/30 ring-1 ring-emerald-500/50 shadow-sm"
                        : "hover:border-border/80 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {official.area}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          >
                            Banca {official.examBoard}
                          </Badge>
                        </div>
                        <p className="font-bold text-base font-display text-foreground mt-1.5">
                          {official.name}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {official.description}
                        </p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] pt-2 border-t border-border/40 text-muted-foreground">
                      <span>
                        Vagas: <strong>{official.expectedVagas}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Inicial:{" "}
                        <strong className="text-emerald-400">{official.salaryInitial}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Prova: <strong>{official.examDate}</strong>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="plan-name-input" className="text-xs font-semibold">
                Nome do Plano de Estudos
              </Label>
              <Input
                id="plan-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Ciclo Reta Final — SEFAZ 2026"
                className="text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              {onCancel ? (
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Cancelar
                </Button>
              ) : (
                <div />
              )}

              <Button
                onClick={handleProceedToTopics}
                disabled={!selectedOfficialId || !name.trim() || isCloning}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isCloning ? "Sincronizando Árvore..." : "Próxima Etapa: Matérias & Domínio"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ETAPA 2: MATÉRIAS E NÍVEL DE DOMÍNIO INICIAL */}
      {step === 2 && (
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              >
                <BookOpen className="h-3.5 w-3.5 mr-1" />
                Etapa 2
              </Badge>
              <CardTitle className="text-xl font-bold font-display">
                Árvore do Edital & Nível de Domínio Inicial
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              A árvore oficial foi clonada com pesagens P5/P4 da banca. Indique sua afinidade em
              cada tópico para o algoritmo calibrar o ciclo (iniciante = mais teoria/exemplos;
              avançado = baterias de questões e revisões espaçadas).
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {loadingTopics ? (
              <p className="text-xs text-muted-foreground">
                Carregando matérias do edital fiscal...
              </p>
            ) : !contestTopics || contestTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum tópico encontrado. O plano incluirá a grade fiscal padrão.
              </p>
            ) : (
              <div className="space-y-3 max-h-[440px] overflow-y-auto pr-2">
                {contestTopics.map((item) => {
                  const subjectName = (item.subjects as { name: string } | null)?.name || "Matéria";
                  const topicName = (item.topics as { name: string } | null)?.name;
                  const label = topicName ? `${subjectName} — ${topicName}` : subjectName;
                  const currentLevel = selectedTopics[item.id] || "iniciante";

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-lg border border-border/60 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {label}
                          </span>
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                            Peso P{item.priority}
                          </Badge>
                          {item.relevance_score && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0"
                            >
                              Incidência {item.relevance_score}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDomainChange(item.id, "iniciante")}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                            currentLevel === "iniciante"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold"
                              : "bg-muted/40 text-muted-foreground border-transparent hover:text-foreground"
                          }`}
                        >
                          Iniciante
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDomainChange(item.id, "intermediario")}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                            currentLevel === "intermediario"
                              ? "bg-blue-500/20 text-blue-300 border-blue-500/40 font-bold"
                              : "bg-muted/40 text-muted-foreground border-transparent hover:text-foreground"
                          }`}
                        >
                          Intermediário
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDomainChange(item.id, "avancado")}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                            currentLevel === "avancado"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold"
                              : "bg-muted/40 text-muted-foreground border-transparent hover:text-foreground"
                          }`}
                        >
                          Avançado
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>

              <Button
                onClick={() => setStep(3)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Próxima Etapa: Disponibilidade
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ETAPA 3: CONFIGURAÇÃO RÁPIDA DE DISPONIBILIDADE */}
      {step === 3 && (
        <Card className="border-border/60">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
              >
                <Clock className="h-3.5 w-3.5 mr-1" />
                Etapa 3
              </Badge>
              <CardTitle className="text-xl font-bold font-display">
                Ritmo Diário & Disponibilidade Semanal
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Ajuste as datas de vigência, a duração de cada bloco de estudo e o teto diário de
              horas para a geração automática do ciclo cognitivo.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wiz-start" className="text-xs font-semibold">
                  Data Inicial do Ciclo
                </Label>
                <Input
                  id="wiz-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wiz-end" className="text-xs font-semibold">
                  Data Final do Ciclo
                </Label>
                <Input
                  id="wiz-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wiz-block" className="text-xs font-semibold">
                  Duração do Bloco (minutos)
                </Label>
                <Input
                  id="wiz-block"
                  type="number"
                  min="15"
                  step="5"
                  value={blockMinutes}
                  onChange={(e) => setBlockMinutes(e.target.value)}
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Recomendado: 50 a 60 minutos por bloco de estudo.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wiz-max" className="text-xs font-semibold">
                  Máximo de Horas por Dia
                </Label>
                <Input
                  id="wiz-max"
                  type="number"
                  min="1"
                  step="0.5"
                  value={maxDaily}
                  onChange={(e) => setMaxDaily(e.target.value)}
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Teto máximo diário de horas estudadas.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                Resumo do Algoritmo de Planejamento Aprovado Fiscal
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao clicar em <strong>"Gerar Plano & Sincronizar Edital"</strong>, o sistema
                distribuirá as tarefas cognitivas priorizando os tópicos de maior peso (P5/P4) e
                incidência na banca oficial ({selectedOfficialId}), alocando teoria, questões e
                revisões conforme seu domínio inicial.
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/40">
              <Button variant="outline" size="sm" onClick={() => setStep(2)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>

              <Button
                onClick={() => createPlanMutation.mutate()}
                disabled={createPlanMutation.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6"
              >
                {createPlanMutation.isPending
                  ? "Gerando Ciclo..."
                  : "Gerar Plano & Sincronizar Edital"}
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
