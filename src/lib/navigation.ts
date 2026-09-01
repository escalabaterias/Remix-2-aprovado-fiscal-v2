/**
 * Itens de navegação do sistema.
 * Centralizado para evitar duplicação entre AppShell, mobile menu, etc.
 */

export type NavItem = {
  label: string;
  to: string | null;
  group: "ciclo_planner" | "edital_vade" | "treino_inteligencia" | "sistema";
  iconName?: string;
};

export const NAV_GROUP_LABELS: Record<NavItem["group"], string> = {
  ciclo_planner: "📊 Meu Ciclo & Planner",
  edital_vade: "📜 Edital & Vade Mecum",
  treino_inteligencia: "🎯 Treino & Inteligência",
  sistema: "⚙️ Sistema",
};

export const NAV_ITEMS: NavItem[] = [
  // HUB 1: Meu Ciclo & Planner
  { label: "Centro de Comando", to: "/dashboard", group: "ciclo_planner" },
  { label: "Plano de Estudos", to: "/plano", group: "ciclo_planner" },
  { label: "Disponibilidade", to: "/disponibilidade", group: "ciclo_planner" },
  { label: "Concursos & Metas", to: "/concursos", group: "ciclo_planner" },
  { label: "Matérias & Árvore", to: "/materias", group: "ciclo_planner" },

  // HUB 2: Edital & Vade Mecum
  { label: "Edital Verticalizado", to: "/estudo/edital", group: "edital_vade" },
  { label: "Vade Mecum & Prontidão", to: "/estudo/prontidao", group: "edital_vade" },
  { label: "Discursivas & Peças", to: "/estudo/discursivas", group: "edital_vade" },

  // HUB 3: Treino & Inteligência
  { label: "Sessão de Questões", to: "/questoes", group: "treino_inteligencia" },
  { label: "Caderno de Erros", to: "/central-erros", group: "treino_inteligencia" },
  { label: "Flashcards", to: "/flashcards", group: "treino_inteligencia" },
  { label: "Raio-X de Bancas", to: "/bancas", group: "treino_inteligencia" },
  { label: "Revisões Ativas", to: "/revisao", group: "treino_inteligencia" },

  // SISTEMA
  { label: "Configurações", to: "/configuracoes", group: "sistema" },
];
