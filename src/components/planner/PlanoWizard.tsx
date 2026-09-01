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
  Layers,
  Award,
  Clock,
  Zap,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { addDays, todayISO } from "@/lib/planner/availability";
import { DEFAULT_BLOCK_MINUTES, DEFAULT_MAX_DAILY_MINUTES } from "@/lib/planner/service";

export function PlanoWizard({ onCancel }: { onCancel?: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Concurso e Cargo
  const [contestId, setContestId] = useState<string>("");
  const [name, setName] = useState("");

  // Step 2: Matérias e Domínio Inicial
  const [selectedTopics, setSelectedTopics] = useState<
    Record<string, "iniciante" | "intermediario" | "avancado">
  >({});

  // Step 3: Disponibilidade
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDays(todayISO(), 27));
  const [blockMinutes, setBlockMinutes] = useState(String(DEFAULT_BLOCK_MINUTES));
  const [maxDaily, setMaxDaily] = useState(String(DEFAULT_MAX_DAILY_MINUTES / 60));

  // Query contests
  const { data: contests, isLoading: loadingContests } = useQuery({
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

  // Query topics for selected contest
  const { data: contestTopics, isLoading: loadingTopics } = useQuery({
    queryKey: ["contest-topics-wizard", contestId],
    enabled: Boolean(contestId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contest_topics")
        .select("id, priority, subjects(id, name), topics(id, name)")
        .eq("contest_id", contestId)
        .order("priority", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleSelectContest = (id: string, defaultName: string) => {
    setContestId(id);
    if (!name) {
      setName(`Plano Reta Final — ${defaultName}`);
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

      const { data, error } = await supabase
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

      if (error) throw error;
      return data.id;
    },
    onSuccess: (newPlanId) => {
      toast.success("Plano de estudos criado com sucesso! O edital foi sincronizado.");
      queryClient.invalidateQueries({ queryKey: ["study-plans"] });
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
              Wizard de Criação de Plano de Estudos
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
              1. Concurso & Cargo
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
              2. Matérias & Domínio
            </div>
            <div
              className={`p-2 rounded-lg border text-xs transition-colors ${
                step === 3
                  ? "border-emerald-500/50 bg-emerald-500/10 font-bold text-emerald-400"
                  : "border-border text-muted-foreground"
              }`}
            >
              3. Disponibilidade Semanal
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ETAPA 1: SELEÇÃO DO CONCURSO & CARGO */}
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
                Escolha o Concurso Alvo e Cargo
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Selecione o concurso fiscal desejado. O Aprovado Fiscal importará automaticamente os
              pesos das matérias do edital verticalizado.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {loadingContests ? (
              <p className="text-xs text-muted-foreground">Carregando concursos disponíveis...</p>
            ) : !contests || contests.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed text-center space-y-2">
                <p className="text-sm font-semibold text-foreground">Nenhum concurso cadastrado.</p>
                <p className="text-xs text-muted-foreground">
                  Vá até a aba Concursos para cadastrar o edital alvo.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {contests.map((c) => {
                  const isSelected = contestId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectContest(c.id, c.name)}
                      className={`panel p-4 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? "border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/40"
                          : "hover:border-border/80 hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-base font-display text-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {c.role_title || "Auditor Fiscal"}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] pt-2 border-t border-border/40">
                        {c.exam_board && <Badge variant="outline">{c.exam_board}</Badge>}
                        {c.exam_date && (
                          <Badge variant="secondary" className="font-mono">
                            Prova: {c.exam_date}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="space-y-2 pt-2">
              <Label htmlFor="plan-name-input" className="text-xs font-semibold">
                Nome Personalizado para o Plano
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
                onClick={() => setStep(2)}
                disabled={!contestId || !name.trim()}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Próxima Etapa: Matérias & Domínio
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
                Seleção de Matérias e Domínio Inicial
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Defina o seu nível de facilidade em cada tópico do edital para o algoritmo otimizar a
              frequência de teoria x questões.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {loadingTopics ? (
              <p className="text-xs text-muted-foreground">Carregando matérias do concurso...</p>
            ) : !contestTopics || contestTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum tópico vinculado a este concurso. O plano incluirá todas as matérias gerais
                por padrão.
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
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
                          <Badge variant="outline" className="text-[10px] font-mono">
                            Peso P{item.priority}
                          </Badge>
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
                Configuração Rápida de Disponibilidade Semanal
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Ajuste as datas de vigência, a duração de cada bloco de estudo e o teto diário de
              horas.
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
                alimentará as sessões diárias com cálculo de tempo ideal por matéria, priorizando
                lacunas de aprendizado registradas no seu Caderno de Erros.
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
                  ? "Gerando Plano..."
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
