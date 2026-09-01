import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { BancasPanel } from "@/components/bancas/BancasPanel";

export const Route = createFileRoute("/_authenticated/bancas")({
  head: () => ({
    meta: [
      { title: "Análise de Bancas — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "Estatísticas de incidência por disciplina, distribuição de complexidade e raio-x de pegadinhas das bancas FGV, Cebraspe, FCC e Vunesp.",
      },
      { property: "og:title", content: "Análise de Bancas — Aprovado Fiscal" },
      {
        property: "og:description",
        content: "Mapeamento analítico de bancas examinadoras para concursos fiscais.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BancasPage,
});

function BancasPage() {
  return (
    <AppShell
      title="Análise de Bancas"
      description="Estatísticas detalhadas de incidência por disciplina, distribuição de complexidade e o perfil de armadilhas das bancas FGV, Cebraspe, FCC e Vunesp."
    >
      <BancasPanel />
    </AppShell>
  );
}
