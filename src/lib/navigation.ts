import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Target,
  FileText,
  HelpCircle,
  RotateCcw,
  Brain,
  Sparkles,
  FolderOpen,
  Scale,
  BarChart2,
  Bot,
  Settings,
  AlertTriangle,
  Award,
  type LucideIcon,
} from "lucide-react";

export type NavGroupKey = "estudo" | "treino" | "materiais" | "inteligencia" | "sistema";

export type NavItem = {
  label: string;
  to: string | null;
  group: NavGroupKey;
  icon: LucideIcon;
  badge?: string;
};

export const NAV_GROUP_LABELS: Record<NavGroupKey, string> = {
  estudo: "ESTUDAR",
  treino: "TREINAR",
  materiais: "MATERIAIS",
  inteligencia: "INTELIGÊNCIA",
  sistema: "CONFIGURAÇÕES E SISTEMA",
};

export const NAV_ITEMS: NavItem[] = [
  // INÍCIO E ESTUDAR
  { label: "Início", to: "/dashboard", group: "estudo", icon: LayoutDashboard },
  { label: "Estudar agora", to: "/estudo", group: "estudo", icon: BookOpen },
  { label: "Meu plano", to: "/plano", group: "estudo", icon: Calendar },
  { label: "Revisões", to: "/revisao", group: "estudo", icon: RotateCcw },

  // TREINAR
  { label: "Questões", to: "/questoes", group: "treino", icon: HelpCircle },
  { label: "Flashcards", to: "/flashcards", group: "treino", icon: Brain },
  { label: "Caderno de erros", to: "/central-erros", group: "treino", icon: AlertTriangle },
  { label: "Simulados", to: "/simulados", group: "treino", icon: Award },

  // MATERIAIS
  { label: "Materiais", to: "/materiais", group: "materiais", icon: FolderOpen },
  { label: "Edital Verticalizado", to: "/estudo/edital", group: "materiais", icon: FileText },
  { label: "Vade Mecum & Prontidão", to: "/estudo/prontidao", group: "materiais", icon: Scale },
  { label: "Matérias & Árvore", to: "/materias", group: "materiais", icon: BookOpen },

  // INTELIGÊNCIA
  { label: "Coach Aprovado Fiscal", to: "/coach", group: "inteligencia", icon: Bot },
  { label: "Diagnóstico & Domínio", to: "/dominio", group: "inteligencia", icon: BarChart2 },
  {
    label: "Mnemônicos",
    to: null,
    group: "inteligencia",
    icon: Sparkles,
    badge: "Em breve",
  },

  // CONFIGURAÇÕES E SISTEMA
  { label: "Radar de Concursos", to: "/concursos", group: "sistema", icon: Target },
  { label: "Raio-X de Bancas", to: "/bancas", group: "sistema", icon: FileText },
  { label: "Disponibilidade", to: "/disponibilidade", group: "sistema", icon: Calendar },
  { label: "Configurações", to: "/configuracoes", group: "sistema", icon: Settings },
];
