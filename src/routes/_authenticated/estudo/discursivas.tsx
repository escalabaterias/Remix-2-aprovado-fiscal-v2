import { createFileRoute } from "@tanstack/react-router";

import { DiscursiveManager } from "@/components/discursive/DiscursiveManager";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/estudo/discursivas")({
  head: () => ({
    meta: [
      { title: "Discursivas & Peças Práticas — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "Prática de discursivas e peças da área fiscal com autoavaliação guiada pelo espelho oficial da banca.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DiscursivasPage,
});

function DiscursivasPage() {
  return (
    <AppShell
      title="Gestão de Discursivas & Peças Fiscais"
      description="Treine a resolução de questões dissertativas e peças práticas com espelho oficial da banca e rubricas de autoavaliação."
    >
      <DiscursiveManager />
    </AppShell>
  );
}
