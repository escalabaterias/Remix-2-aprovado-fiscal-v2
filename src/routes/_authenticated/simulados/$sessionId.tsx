import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { ExamRunnerView } from "@/components/simulados/ExamRunnerView";

export const Route = createFileRoute("/_authenticated/simulados/$sessionId")({
  head: () => ({
    meta: [
      { title: "Execução do Simulado — Aprovado Fiscal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExamRunnerPage,
});

function ExamRunnerPage() {
  const { sessionId } = Route.useParams();

  return (
    <AppShell
      title="Sessão de Simulado"
      description="Resolução cronometrada e focada para alto rendimento fiscal."
    >
      <div className="py-4">
        <ExamRunnerView sessionId={sessionId} />
      </div>
    </AppShell>
  );
}
