import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { CoachPanel } from "@/components/coach/CoachPanel";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "Coach de Elite IA — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "Analise suas lacunas críticas de conhecimento e converse com seu mentor inteligente.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoachRoutePage,
});

function CoachRoutePage() {
  return (
    <AppShell
      title="Coach de Elite IA"
      description="O motor socrático e analítico mapeia seus desvios de atenção e lacunas teóricas para acelerar sua aprovação."
    >
      <CoachPanel />
    </AppShell>
  );
}
