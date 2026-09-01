import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { CoachPanel } from "@/components/coach/CoachPanel";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "Coach IA — Aprovado Fiscal" },
      {
        name: "description",
        content: "Mentor virtual socrático e estratégico especialista em Carreiras Fiscais.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoachPage,
});

function CoachPage() {
  return (
    <AppShell
      title="Coach Fiscal IA"
      description="Atendimento socrático de alta performance integrado ao seu perfil de desempenho, revisões e Caderno de Erros."
    >
      <CoachPanel />
    </AppShell>
  );
}
