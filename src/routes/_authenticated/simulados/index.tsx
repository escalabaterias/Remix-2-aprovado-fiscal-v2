import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Clock,
  Plus,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
  Sparkles,
  Award,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  getUserQuestionSets,
  createQuestionSet,
  fetchQuestions,
  fetchAvailableFilterOptions,
} from "@/lib/questions/service";
import type { QuestionSet } from "@/lib/questions/types";
import { SimulationRunner } from "@/components/simulados/SimulationRunner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/simulados/")({
  validateSearch: (search: Record<string, unknown>) => ({
    setId: typeof search["setId"] === "string" ? search["setId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Central de Simulados — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "Execute simulados cronometrados com controle oficial de tempo, estatísticas e diagnóstico.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SimuladosPage,
});

function SimuladosPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const queryClient = useQueryClient();

  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [newSimName, setNewSimName] = useState("Simulado Geral de Auditor Fiscal");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("todos");
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(60);

  const activeSetId = search.setId;

  // Busca simulados do usuário
  const { data: questionSets = [], isLoading: isLoadingSets } = useQuery({
    queryKey: ["user-question-sets", "simulado"],
    queryFn: () => getUserQuestionSets("simulado"),
  });

  // Opções de filtros para criação de simulados
  const { data: filterOptions } = useQuery({
    queryKey: ["available-filter-options"],
    queryFn: () => fetchAvailableFilterOptions(),
  });

  // Mutation para criar simulado
  const createMutation = useMutation({
    mutationFn: async () => {
      // Buscar questões no banco
      const questions = await fetchQuestions({
        filter: {
          subjectId: selectedSubjectId === "todos" ? null : selectedSubjectId,
        },
        limit: questionCount,
      });

      if (!questions || questions.length === 0) {
        throw new Error("Nenhuma questão encontrada para os critérios selecionados.");
      }

      const qIds = questions.map((q) => q.questionId);

      const result = await createQuestionSet({
        name: newSimName,
        type: "simulado",
        subjectId: selectedSubjectId === "todos" ? null : selectedSubjectId,
        timeLimitMinutes: timeLimitMinutes,
        isTimed: true,
        questionIds: qIds,
      });

      return result.set;
    },
    onSuccess: (newSet) => {
      toast.success("Simulado gerado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-question-sets"] });
      setIsNewDialogOpen(false);
      navigate({ from: Route.fullPath, search: { setId: newSet.setId } });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao criar simulado.");
    },
  });

  // Se houver um simulado ativo, renderiza o SimulationRunner
  if (activeSetId) {
    return (
      <AppShell
        title="Execução do Simulado"
        description="Simulado oficial cronometrado"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ from: Route.fullPath, search: { setId: undefined } })}
          >
            Sair do Simulado
          </Button>
        }
      >
        <SimulationRunner
          setId={activeSetId}
          onClose={() => navigate({ from: Route.fullPath, search: { setId: undefined } })}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Central de Simulados"
      description="Simulados cronometrados e monitorados com controle autoritativo do tempo"
      actions={
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button id="btn-novo-simulado" className="gap-2 font-semibold">
              <Plus className="w-4 h-4" /> Novo Simulado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Gerar Novo Simulado
              </DialogTitle>
              <DialogDescription>
                Selecione as disciplinas, quantidade de questões e tempo limite para montar um
                simulado personalizado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="sim-name">Nome do Simulado</Label>
                <Input
                  id="sim-name"
                  value={newSimName}
                  onChange={(e) => setNewSimName(e.target.value)}
                  placeholder="Ex: Simulado Direito Tributário e Constitucional"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Matéria / Disciplina</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as matérias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as Matérias (Geral)</SelectItem>
                    {filterOptions?.subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Quantidade de Questões</Label>
                  <Select
                    value={String(questionCount)}
                    onValueChange={(val) => setQuestionCount(Number(val))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 questões</SelectItem>
                      <SelectItem value="20">20 questões</SelectItem>
                      <SelectItem value="30">30 questões</SelectItem>
                      <SelectItem value="50">50 questões</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Tempo Limite (minutos)</Label>
                  <Select
                    value={String(timeLimitMinutes)}
                    onValueChange={(val) => setTimeLimitMinutes(Number(val))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="60">60 minutos (1h)</SelectItem>
                      <SelectItem value="90">90 minutos (1h30)</SelectItem>
                      <SelectItem value="120">120 minutos (2h)</SelectItem>
                      <SelectItem value="240">240 minutos (4h)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                id="btn-confirmar-gerar-simulado"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Gerando...
                  </>
                ) : (
                  "Iniciar Simulado"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div id="simulados-page-content" className="space-y-6">
        {/* Banner Informativo */}
        <Card className="border-border bg-gradient-to-r from-primary/10 via-background to-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <Badge variant="secondary" className="text-xs">
                  Provas & Avaliações
                </Badge>
                <h2 className="text-xl font-display font-bold text-foreground">
                  Ambiente Oficial de Simulados
                </h2>
                <p className="text-xs text-muted-foreground max-w-2xl">
                  Simule o dia da prova com controle rigoroso de tempo server-side. Respostas em
                  branco são preservadas como UNANSWERED sem gerar falsas evidências de erro.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Simulados */}
        <div className="space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> Meus Simulados ({questionSets.length})
          </h3>

          {isLoadingSets ? (
            <div className="p-12 text-center text-sm text-muted-foreground space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p>Carregando seus simulados...</p>
            </div>
          ) : questionSets.length === 0 ? (
            <Card className="border-dashed border-border p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Nenhum simulado cadastrado até o momento.
                </p>
                <p className="text-xs text-muted-foreground">
                  Clique em "Novo Simulado" para montar uma prova personalizada.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" /> Criar Primeiro Simulado
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {questionSets.map((sim) => {
                const isCompleted = sim.isCompleted;
                const isStarted = !!sim.startedAt;

                return (
                  <Card
                    key={sim.setId}
                    className="border-border hover:border-border/80 transition-all flex flex-col justify-between shadow-xs"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <Badge
                          variant={isCompleted ? "default" : isStarted ? "secondary" : "outline"}
                          className="text-[11px]"
                        >
                          {isCompleted ? "Concluído" : isStarted ? "Em Andamento" : "Não Iniciado"}
                        </Badge>
                        {sim.timeLimitMinutes && (
                          <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {sim.timeLimitMinutes} min
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold text-foreground mt-2 line-clamp-2">
                        {sim.name}
                      </CardTitle>
                      {sim.description && (
                        <CardDescription className="text-xs line-clamp-2">
                          {sim.description}
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="pb-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-md bg-muted/40">
                          <span className="text-muted-foreground block text-[10px]">Questões</span>
                          <span className="font-bold text-foreground">{sim.totalQuestions}</span>
                        </div>
                        <div className="p-2 rounded-md bg-muted/40">
                          <span className="text-muted-foreground block text-[10px]">
                            Nota Final
                          </span>
                          <span className="font-bold text-foreground">
                            {sim.score !== null ? `${sim.score.toFixed(1)}%` : "—"}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-2 border-t border-border/60">
                      <Button
                        variant={isCompleted ? "outline" : "default"}
                        size="sm"
                        className="w-full gap-2 font-semibold text-xs"
                        onClick={() =>
                          navigate({ from: Route.fullPath, search: { setId: sim.setId } })
                        }
                      >
                        {isCompleted ? (
                          <>
                            <Award className="w-3.5 h-3.5" /> Ver Resultado
                          </>
                        ) : isStarted ? (
                          <>
                            <Play className="w-3.5 h-3.5" /> Continuar Simulado
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" /> Iniciar Simulado
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
