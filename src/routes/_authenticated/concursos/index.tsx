import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Award, BookOpen, Plus, Sparkles } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  REFERENCE_FISCAL_CONTESTS,
  type ReferenceFiscalContest,
} from "@/lib/concursos/fiscalReferenceContests";
import { cloneOfficialFiscalContest } from "@/lib/concursos/fiscalSyncService";
import { cleanupLegacyMockContests } from "@/lib/concursos/dbCleanupService";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTEST_STATUS_LABELS, type ContestStatus } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/concursos/")({
  head: () => ({
    meta: [
      { title: "Meus Concursos — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "Cadastre e acompanhe múltiplos concursos fiscais com órgão, banca e data de prova.",
      },
      { property: "og:title", content: "Meus Concursos — Aprovado Fiscal" },
      {
        property: "og:description",
        content: "Gestão de concursos acompanhados no Aprovado Fiscal.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContestsPage,
});

const EMPTY_FORM = {
  name: "",
  organization: "",
  role_title: "",
  area: "",
  exam_board: "",
  exam_date: "",
  status: "futuro" as ContestStatus,
  description: "",
  edital_source_url: "",
};

function ContestsPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: contests, isLoading } = useQuery({
    queryKey: ["contests"],
    queryFn: async () => {
      // Limpeza automática de dados e mocks legados
      await cleanupLegacyMockContests();

      const { data, error } = await supabase
        .from("contests")
        .select("id, name, organization, role_title, exam_board, area, exam_date, status")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const createContest = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      const { error } = await supabase.from("contests").insert({
        user_id: auth.user.id,
        name: form.name,
        organization: form.organization || null,
        role_title: form.role_title || null,
        area: form.area || null,
        exam_board: form.exam_board || null,
        exam_date: form.exam_date || null,
        status: form.status,
        description: form.description || null,
        edital_source_url: form.edital_source_url || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Concurso cadastrado.");
      setForm(EMPTY_FORM);
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["contests"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const importReferenceContest = useMutation({
    mutationFn: async (ref: ReferenceFiscalContest) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");

      // Clona e auto-provisiona a árvore completa de matérias e tópicos fiscais
      const res = await cloneOfficialFiscalContest(ref.id, auth.user.id);
      return res;
    },
    onSuccess: (res) => {
      toast.success(
        `Edital ${res.contestName} importado com sucesso! ${res.subjectsCount} matérias e ${res.contestTopicsCount} tópicos sincronizados.`,
      );
      queryClient.invalidateQueries({ queryKey: ["contests"] });
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell
      title="Meus Concursos"
      description="Você pode acompanhar vários concursos simultaneamente. Cada concurso é um contexto próprio sobre a mesma base de conhecimento."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Novo concurso</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo concurso</DialogTitle>
              <DialogDescription>
                Apenas o nome é obrigatório. Os demais campos podem ser completados depois.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createContest.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="organization">Órgão</Label>
                  <Input
                    id="organization"
                    value={form.organization}
                    onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role_title">Cargo</Label>
                  <Input
                    id="role_title"
                    value={form.role_title}
                    onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area">Área</Label>
                  <Input
                    id="area"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exam_board">Banca</Label>
                  <Input
                    id="exam_board"
                    value={form.exam_board}
                    onChange={(e) => setForm({ ...form, exam_board: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exam_date">Data da prova</Label>
                  <Input
                    id="exam_date"
                    type="date"
                    value={form.exam_date}
                    onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v as ContestStatus })}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CONTEST_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edital_source_url">Fonte do edital (URL)</Label>
                <Input
                  id="edital_source_url"
                  value={form.edital_source_url}
                  onChange={(e) => setForm({ ...form, edital_source_url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createContest.isPending}>
                  Salvar concurso
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-8">
        <div>
          <h2 className="text-base font-bold font-display text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            Concursos em Acompanhamento
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : !contests?.length ? (
            <EmptyState
              title="Nenhum concurso cadastrado"
              description="Cadastre um novo concurso ou escolha um edital fiscal de referência no catálogo abaixo."
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {contests.map((contest) => (
                <li key={contest.id}>
                  <Link
                    to="/concursos/$contestId"
                    params={{ contestId: contest.id }}
                    className="panel block px-5 py-4 transition-colors hover:border-primary/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-base font-semibold">{contest.name}</h3>
                      <Badge variant="outline">{CONTEST_STATUS_LABELS[contest.status]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[contest.organization, contest.role_title, contest.exam_board]
                        .filter(Boolean)
                        .join(" · ") || "Sem detalhes adicionais"}
                    </p>
                    {contest.exam_date ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Prova: {new Date(contest.exam_date).toLocaleDateString("pt-BR")}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Catálogo de Editais Fiscais Reais de Referência */}
        <div className="space-y-4 pt-4 border-t border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold font-display text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                Catálogo de Editais Fiscais de Referência
              </h2>
              <p className="text-xs text-muted-foreground">
                Editais fiscais reais pré-configurados (SEFAZ-SP, SEFAZ-AL, SEF-SC, Receita Federal,
                ISS-SP) com pesos de matérias e bancas.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {REFERENCE_FISCAL_CONTESTS.map((ref) => (
              <div
                key={ref.id}
                className="panel p-5 space-y-4 flex flex-col justify-between border-emerald-500/20 bg-emerald-950/10 hover:border-emerald-500/40 transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                    >
                      Banca {ref.examBoard}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {ref.area}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-foreground font-display leading-snug">
                    {ref.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Remuneração Inicial:{" "}
                    <span className="text-emerald-400 font-mono font-bold">
                      {ref.salaryInitial}
                    </span>
                  </p>
                  <ul className="space-y-1 pt-1">
                    {ref.highlights.map((h, i) => (
                      <li
                        key={i}
                        className="text-[11px] text-muted-foreground flex items-center gap-1.5"
                      >
                        <span className="text-emerald-400 font-bold">•</span> {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {ref.expectedVagas} vagas est.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    disabled={importReferenceContest.isPending}
                    onClick={() => importReferenceContest.mutate(ref)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Adicionar aos Meus Concursos
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
