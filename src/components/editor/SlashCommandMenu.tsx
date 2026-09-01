import React, { useEffect, useState, useRef } from "react";
import { BlockType } from "@/lib/editor/types";
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  AlertTriangle,
  List,
  ListOrdered,
  Sigma,
  Table2,
  Minus,
} from "lucide-react";

interface SlashCommandMenuProps {
  onSelectCommand: (type: BlockType) => void;
  onClose: () => void;
  searchText: string;
}

interface CommandItem {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}

const COMMANDS: CommandItem[] = [
  {
    type: "paragraph",
    label: "Texto Simples",
    description: "Parágrafo de texto corrido.",
    icon: Type,
  },
  {
    type: "heading-1",
    label: "Título Principal (H1)",
    description: "Título de seção maior.",
    icon: Heading1,
  },
  {
    type: "heading-2",
    label: "Subtítulo Médio (H2)",
    description: "Subtítulo para subseções.",
    icon: Heading2,
  },
  {
    type: "heading-3",
    label: "Subtítulo Pequeno (H3)",
    description: "Cabeçalho complementar.",
    icon: Heading3,
  },
  {
    type: "callout",
    label: "Alerta / Pegadinha Fiscal",
    description: "Aviso destacado para pegadinhas de prova.",
    icon: AlertTriangle,
  },
  {
    type: "bullet-list",
    label: "Lista com Marcadores",
    description: "Lista de pontos simples.",
    icon: List,
  },
  {
    type: "numbered-list",
    label: "Lista Numerada",
    description: "Lista de passos sequenciais.",
    icon: ListOrdered,
  },
  {
    type: "formula",
    label: "Fórmula LaTeX",
    description: "Fórmula de contabilidade ou finanças.",
    icon: Sigma,
  },
  {
    type: "table",
    label: "Tabela de Comparação",
    description: "Tabela simples de confronto de leis.",
    icon: Table2,
  },
  {
    type: "divider",
    label: "Linha Divisória",
    description: "Divisor sutil horizontal.",
    icon: Minus,
  },
];

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  onSelectCommand,
  onClose,
  searchText,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(searchText.toLowerCase()) ||
      cmd.type.toLowerCase().includes(searchText.toLowerCase()),
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelectCommand(filtered[selectedIndex].type);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, onSelectCommand, onClose]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="absolute z-50 mt-1 max-h-72 w-72 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
      id="slash-command-menu"
    >
      <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        Comandos Rápidos
      </div>
      <div className="space-y-0.5 mt-1">
        {filtered.map((cmd, idx) => {
          const Icon = cmd.icon;
          const isSelected = idx === selectedIndex;

          return (
            <button
              key={cmd.type}
              onClick={() => onSelectCommand(cmd.type)}
              className={`flex items-start gap-3 w-full p-2 text-left rounded-lg transition-all ${
                isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
              }`}
            >
              <div className={`p-1.5 rounded-md ${isSelected ? "bg-primary/20" : "bg-muted"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <div className="text-xs font-bold truncate">{cmd.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{cmd.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
