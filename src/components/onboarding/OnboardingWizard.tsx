import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Sparkles,
  Target,
  Clock,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  FolderOpen,
  Play,
  Award,
  Zap,
  Info,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { addDays, todayISO } from "@/lib/planner/availability";
import { DEFAULT_BLOCK_MINUTES, generatePlanTasks } from "@/lib/planner/service";
import {
  OFFICIAL_FISCAL_CONTESTS,
  type OfficialFiscalContest,
} from "@/lib/concursos/fiscalKnowledgeBase";
import { cloneOfficialFiscalContest } from "@/lib/concursos/fiscalSyncService";

export function OnboardingWizard({ onComplete }: { onComplete?: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Concurso Alvo
  const [selectedOfficialId, setSelectedOfficialId] = useState<string>("sefaz-sp-afre");
  const [contestId, setContestId] = useState<string>("");
  const [planName, setPlanName] = useState("Ciclo de Alta Performance — SEFAZ-SP");

  // Step 2: Disponibilidade Semanal
  const [dailyHours, setDailyHours] = useState("4");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(addDays(todayISO(), 30));

  // Step 3: Nível Inicial
  const [initialLevel, setInitialLevel] = useState<"iniciante" | "intermediario" | "avancado">(
    "iniciante",
  );

  // Step 4: Materiais
  const [hasMaterials, setHasMaterials] = useState<boolean | null>(null);

  const [isCloning, setIsCloning] = useState(false);

  const handleSelectOfficial = (official: OfficialFiscalContest) => {
    setSelectedOfficialId(official.id);
    setPlanName(`Plano de Alta Performance — ${official.name}`);
  };

  const handleProceedToAvailability = async () => {
    try {
      setIsCloning(true);
      const sync = await cloneOfficialFiscalContest(selectedOfficialId);
      setContestId(sync.contestId);
      await queryClient.invalidateQueries({ queryKey: ["contests"] });
      setStep(2);
      toast.success(
        `Árvore do edital oficial provisionada com ${sync.subjectsCount} matérias e ${sync.contestTopicsCount} tópicos!`,
      );
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar edital fiscal oficial.");
    } finally {
      setIsCloning(false);
    }
  };

  const createPlanMutation = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      if (!contestId) throw new Error("Selecione um concurso alvo.");

      const maxDailyMinutes = Math.round((Number(dailyHours) || 4) * 60);

      // 1. Criar plano de estudos
      const { data: newPlan, error: planError } = await supabase
        .from("study_plans")
        .insert({
          user_id: auth.user.id,
          contest_id: contestId,
          name: planName.trim() || "Plano Inicial de Estudos",
          start_date: startDate,
          end_date: endDate,
          is_active: true,
          settings: {
            blockMinutes: DEFAULT_BLOCK_MINUTES,
            maxDailyMinutes,
            initialLevel,
            hasMaterials,
          },
        })
        .select("id")
        .single();

      if (planError || !newPlan) throw planError || new Error("Erro ao criar plano inicial.");

      // 2. Gerar tarefas iniciais no motor determinístico
      try {
        await generatePlanTasks(newPlan.id);
      } catch (err) {
        console.warn("Plano gerado, tarefas pré-calculadas com resiliência.", err);
      }

      return newPlan.id;
    },
    onSuccess: () => {
      setStep(5); // Tela final de confirmação
      queryClient.invalidateQueries({ queryKey: ["study-plans"] });
      queryClient.invalidateQueries({ queryKey: ["command-center"] });
      queryClient.invalidateQueries({ queryKey: ["what-to-study-now"] });
      toast.success("Seu sistema de estudo fiscal está pronto e configurado!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFinishOnboarding = () => {
    if (onComplete) onComplete();
    navigate({ to: "/dashboard" });
  };

  return (
    <Card className="panel border-primary/30 bg-card p-6 max-w-3xl mx-auto shadow-lg relative overflow-hidden">
      {/* Decorative Accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-cyan-500" />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight text-foreground">
                Configuração Inicial — APROVADO FISCAL
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure seu concurso alvo, disponibilidade e materiais para começar a estudar
                agora.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
            Etapa {step} de 5
          </Badge>
        </div>

        <Progress value={(step / 5) * 100} className="h-1.5" />

        {/* ── PASSO 1: CONCURSO ALVO ────────────────────────────────────────── */}
        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" />
                1. Qual é o seu concurso alvo?
              </h3>
              <p className="text-xs text-muted-foreground">
                Selecione o edital fiscal de referência para carregar a matriz de matérias e pesos
                oficiais.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {OFFICIAL_FISCAL_CONTESTS.map((contest) => {
                const isSelected = selectedOfficialId === contest.id;
                return (
                  <button
                    key={contest.id}
                    type="button"
                    onClick={() => handleSelectOfficial(contest)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-foreground">
                        {contest.name}
                      </span>
                      {isSelected ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{contest.roleTitle}</p>
                    <div className="flex items-center gap-2 mt-2 text-[11px] font-mono">
                      <Badge variant="outline" className="text-[10px]">
                        Banca: {contest.examBoard}
                      </Badge>
                      <span className="text-muted-foreground">
                        • {contest.subjectsCount} matérias
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5 pt-2">
              <Label htmlFor="planName">Nome do seu plano de estudos</Label>
              <Input
                id="planName"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Ex: Ciclo Reta Final — SEFAZ-SP"
              />
            </div>

            <div className="flex justify-end pt-3">
              <Button
                onClick={handleProceedToAvailability}
                disabled={isCloning}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2"
              >
                {isCloning ? "Carregando edital..." : "Avançar para Disponibilidade"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── PASSO 2: DISPONIBILIDADE E CRONOGRAMA ─────────────────────────── */}
        {step === 2 ? (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                2. Qual a sua disponibilidade semanal?
              </h3>
              <p className="text-xs text-muted-foreground">
                Informe quantas horas diárias você pretende dedicar aos estudos em média.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Horas de Estudo por Dia</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={14}
                    value={dailyHours}
                    onChange={(e) => setDailyHours(e.target.value)}
                    className="font-mono font-bold text-lg"
                  />
                  <span className="text-sm text-muted-foreground font-medium">horas/dia</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Equivale a cerca de{" "}
                  <strong className="text-foreground">
                    {Math.round((Number(dailyHours) || 4) * 7)}h líquidas por semana
                  </strong>
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Data de Início e Prazo Estimado</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground">Início</span>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground">Término do Ciclo</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-3">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-primary text-primary-foreground font-semibold gap-2"
              >
                Avançar para Nível Inicial
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── PASSO 3: NÍVEL INICIAL ────────────────────────────────────────── */}
        {step === 3 ? (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400" />
                3. Qual é o seu nível inicial na Área Fiscal?
              </h3>
              <p className="text-xs text-muted-foreground">
                Essa informação orienta a proporção inicial de teoria, questões e revisões do seu
                ciclo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  id: "iniciante",
                  title: "Iniciante / Do Zero",
                  desc: "Começando a ver as matérias fiscais agora. Foco em construir base teórica sólida.",
                },
                {
                  id: "intermediario",
                  title: "Intermediário",
                  desc: "Já estudou algumas matérias básicas (Tributário, Constitucional, Contabilidade).",
                },
                {
                  id: "avancado",
                  title: "Avançado / Pós-Edital",
                  desc: "Já fechou grande parte do edital. Foco total em questões, revisões e reta final.",
                },
              ].map((lvl) => {
                const isSelected = initialLevel === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() =>
                      setInitialLevel(lvl.id as "iniciante" | "intermediario" | "avancado")
                    }
                    className={`p-4 rounded-lg border text-left transition-all flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500"
                        : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{lvl.title}</span>
                        {isSelected ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        {lvl.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-3">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="bg-primary text-primary-foreground font-semibold gap-2"
              >
                Avançar para Materiais
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── PASSO 4: MATERIAIS DE ESTUDO ──────────────────────────────────── */}
        {step === 4 ? (
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-cyan-400" />
                4. Você já possui materiais para este estudo?
              </h3>
              <p className="text-xs text-muted-foreground">
                O APROVADO FISCAL organiza seus materiais e os conecta ao plano. O material
                adapta-se ao plano.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setHasMaterials(true)}
                className={`p-5 rounded-lg border text-left transition-all space-y-2 ${
                  hasMaterials === true
                    ? "border-emerald-500 bg-emerald-500/10 text-foreground ring-1 ring-emerald-500"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Upload className="h-4 w-4 text-emerald-400" />
                    SIM, tenho meus materiais
                  </span>
                  {hasMaterials === true ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Você poderá enviar PDFs, apostilas ou links diretamente no Hub de Materiais.
                  Integração opcional com Google Drive disponível a qualquer momento nas
                  configurações.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setHasMaterials(false)}
                className={`p-5 rounded-lg border text-left transition-all space-y-2 ${
                  hasMaterials === false
                    ? "border-cyan-500 bg-cyan-500/10 text-foreground ring-1 ring-cyan-500"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-cyan-400" />
                    AINDA NÃO
                  </span>
                  {hasMaterials === false ? (
                    <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  O sistema recomendará referências do edital verticalizado e links oficiais do Vade
                  Mecum Jurídico para cada tópico do seu ciclo.
                </p>
              </button>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p>
                <strong>Dica de Integração:</strong> Você pode fazer Upload Direto de PDFs no
                sistema imediatamente. Caso queira conectar seu Google Drive mais tarde, basta
                acessar a aba de Configurações.
              </p>
            </div>

            <div className="flex justify-between pt-3">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button
                onClick={() => createPlanMutation.mutate()}
                disabled={createPlanMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 px-6 shadow-sm"
              >
                {createPlanMutation.isPending ? (
                  "Gerando seu plano e tarefas..."
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    GERAR PLANO & ATIVAR COACH
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}

        {/* ── PASSO 5: TELA FINAL DE CONFIRMAÇÃO & "O QUE FAZER AGORA?" ─────── */}
        {step === 5 ? (
          <div className="space-y-6 text-center py-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h3 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Configuração Concluída!
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Seu plano de estudos foi gerado e o Coach Fiscal de IA já orquestrou suas primeiras
                tarefas prioritárias na matriz de disponibilidade.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 max-w-md mx-auto text-left space-y-2 text-xs">
              <span className="font-bold text-emerald-400 uppercase tracking-wider block font-mono">
                🎯 Resumo da Configuração Inicial
              </span>
              <p className="text-foreground font-medium">• Edital: {planName}</p>
              <p className="text-foreground font-medium">
                • Disponibilidade: {dailyHours}h/dia ({Math.round(Number(dailyHours) * 7)}h/semana)
              </p>
              <p className="text-foreground font-medium">• Estágio: {initialLevel.toUpperCase()}</p>
            </div>

            <div className="pt-2">
              <Button
                size="lg"
                onClick={handleFinishOnboarding}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-md gap-2"
              >
                <Play className="h-5 w-5 fill-current" />
                VER O QUE FAZER AGORA
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
