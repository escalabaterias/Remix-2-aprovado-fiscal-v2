import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { SyllabusTracker } from "@/components/syllabus/SyllabusTracker";

export const Route = createFileRoute("/_authenticated/estudo/edital")({
  head: () => ({
    meta: [
      { title: "Edital Verticalizado & LawTags — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "Rastreamento de progresso por disciplina, tópicos e LawTags do Vade Mecum para Carreiras Fiscais.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditalPage,
});

function EditalPage() {
  return (
    <AppShell
      title="Edital Verticalizado & Vade Mecum"
      description="Gerencie seu progresso no edital por peso de incidência e consulte artigos mapeados (LawTags)."
    >
      <SyllabusTracker />
    </AppShell>
  );
}
