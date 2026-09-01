import { createFileRoute } from "@tanstack/react-router";

import { ReadinessAuditor } from "@/components/analytics/ReadinessAuditor";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/estudo/prontidao")({
  head: () => ({
    meta: [
      { title: "Prontidão Reta Final — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "Auditoria de prontidão global e simulador de notas de corte para concursos da Receita Federal e SEFAZ.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReadinessPage,
});

function ReadinessPage() {
  return (
    <AppShell
      title="Prontidão Reta Final & Otimizador Global"
      description="Calcule seu Índice de Prontidão Fiscal (IPF), simule colocação na zona de corte e veja o plano de ação de última hora."
    >
      <ReadinessAuditor />
    </AppShell>
  );
}
