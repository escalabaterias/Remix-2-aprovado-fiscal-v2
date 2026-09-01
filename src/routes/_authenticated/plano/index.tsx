import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, Plus, Calendar } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanoWizard } from "@/components/planner/PlanoWizard";

export const Route = createFileRoute("/_authenticated/plano/")({
  head: () => ({
    meta: [
      { title: "Plano de estudos — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "Crie planos de estudo por concurso com o Wizard guiado em 3 etapas, integrando edital verticalizado e disponibilidade.",
      },
      { property: "og:title", content: "Plano de estudos — Aprovado Fiscal" },
      {
        property: "og:description",
        content: "Planejamento determinístico de estudos por concurso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const [creating, setCreating] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["study-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_plans")
        .select("id, name, start_date, end_date, is_active, contest_id, contests(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <AppShell
      title="Meu Ciclo & Plano de Estudos"
      description="O plano distribui seu tempo de estudo de forma determinística cruzando sua disponibilidade semanal com o peso do edital verticalizado."
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/disponibilidade">Disponibilidade Semanal</Link>
          </Button>
          <Button
            onClick={() => setCreating((v) => !v)}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {creating ? (
              "Ver meus planos"
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Novo Plano (Wizard)
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {creating ? (
          <PlanoWizard onCancel={() => setCreating(false)} />
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando planos de estudos…</p>
        ) : !plans?.length ? (
          <div className="space-y-6">
            <EmptyState
              title="Você ainda não possui um plano de estudos ativo"
              description="Utilize o Wizard Guiado em 3 Etapas para vincular seu concurso alvo, definir o domínio inicial das matérias e sincronizar a disponibilidade da semana."
              action={
                <Button
                  onClick={() => setCreating(true)}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <Sparkles className="h-4 w-4" />
                  Iniciar Wizard Guiado em 3 Etapas
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Link
                key={plan.id}
                to="/plano/$planId"
                params={{ planId: plan.id }}
                className="panel p-5 transition-all hover:border-emerald-500/50 hover:bg-muted/30 group relative flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-base font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                      {plan.name}
                    </h2>
                    {plan.is_active ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Inativo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {(plan.contests as { name: string } | null)?.name ?? "Sem concurso vinculado"}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                    {plan.start_date} → {plan.end_date}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
