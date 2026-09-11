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

export type NavGroupKey = "estudo" | "edital" | "treino" | "inteligencia" | "sistema";

export type NavItem = {
  label: string;
  to: string | null;
  group: NavGroupKey;
  icon: LucideIcon;
  badge?: string;
};

export const NAV_GROUP_LABELS: Record<NavGroupKey, string> = {
  estudo: "ESTUDO",
  edital: "EDITAL",
  treino: "TREINO",
  inteligencia: "INTELIGÊNCIA",
  sistema: "SISTEMA",
};

export const NAV_ITEMS: NavItem[] = [
  // ESTUDO
  { label: "Início", to: "/dashboard", group: "estudo", icon: LayoutDashboard },
  { label: "Sessão de Estudo", to: "/estudo", group: "estudo", icon: BookOpen },
  { label: "Plano de Estudos", to: "/plano", group: "estudo", icon: Calendar },
  { label: "Disponibilidade", to: "/disponibilidade", group: "estudo", icon: Target },

  // EDITAL
  { label: "Materiais", to: "/materiais", group: "edital", icon: FolderOpen },
  { label: "Edital Verticalizado", to: "/estudo/edital", group: "edital", icon: FileText },
  { label: "Vade Mecum & Prontidão", to: "/estudo/prontidao", group: "edital", icon: Scale },
  { label: "Matérias & Árvore", to: "/materias", group: "edital", icon: BookOpen },

  // TREINO
  { label: "Questões", to: "/questoes", group: "treino", icon: HelpCircle },
  { label: "Revisões", to: "/revisao", group: "treino", icon: RotateCcw },
  { label: "Caderno de Erros", to: "/central-erros", group: "treino", icon: AlertTriangle },
  { label: "Flashcards", to: "/flashcards", group: "treino", icon: Brain },
  { label: "Simulados", to: "/simulados", group: "treino", icon: Award },

  // INTELIGÊNCIA
  { label: "Coach Aprovado Fiscal", to: "/coach", group: "inteligencia", icon: Bot },
  { label: "Diagnóstico & Domínio", to: "/dominio", group: "inteligencia", icon: BarChart2 },
  {
    label: "Mnemônicos",
    to: null,
    group: "inteligencia",
    icon: Sparkles,
    badge: "Em preparação",
  },

  // SISTEMA
  { label: "Radar de Concursos", to: "/concursos", group: "sistema", icon: Target },
  { label: "Raio-X de Bancas", to: "/bancas", group: "sistema", icon: FileText },
  { label: "Configurações", to: "/configuracoes", group: "sistema", icon: Settings },
];
