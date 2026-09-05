import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { SimulationReport } from "@/components/simulados/SimulationReport";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/simulados/$setId/resultado")({
  head: () => ({
    meta: [
      { title: "Relatório de Desempenho do Simulado — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "Relatório analítico de desempenho do simulado com análise de matérias, tópicos, ritmo e sinais cognitivos.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SimulationResultadoPage,
});

function SimulationResultadoPage() {
  const navigate = useNavigate();
  const { setId } = useParams({ from: "/_authenticated/simulados/$setId/resultado" });

  const handleClose = () => {
    navigate({ to: "/simulados" });
  };

  return (
    <AppShell
      title="Relatório de Desempenho do Simulado"
      description="Análise detalhada de performance, mapa de matérias, ritmo de prova e diagnósticos."
      actions={
        <Button variant="outline" size="sm" onClick={handleClose} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar à Central
        </Button>
      }
    >
      <SimulationReport setId={setId} onClose={handleClose} />
    </AppShell>
  );
}
