import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/layout/AppShell";
import { FlashcardPlayer } from "@/components/flashcards/FlashcardPlayer";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — Aprovado Fiscal" },
      {
        name: "description",
        content: "Revisão espaçada de alta retenção baseada no algoritmo SM-2 (SuperMemo-2).",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  return (
    <AppShell
      title="Flashcards de Alta Retenção"
      description="Memorização acelerada da Lei Seca, jurisprudência e conceitos fiscais críticos através do algoritmo SM-2."
    >
      <FlashcardPlayer />
    </AppShell>
  );
}
