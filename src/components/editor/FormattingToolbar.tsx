import React, { useEffect, useState } from "react";
import { InlineMark } from "@/lib/editor/types";

interface FormattingToolbarProps {
  onApplyMark: (mark: InlineMark) => void;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({ onApplyMark }) => {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setPosition(null);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setPosition({
        top: rect.top - 45 + window.scrollY,
        left: rect.left + rect.width / 2 - 120 + window.scrollX,
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  if (!position) return null;

  return (
    <div
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 flex items-center gap-1 rounded-lg border border-[#383a59] bg-[#1f2128] p-1 shadow-2xl backdrop-blur-md"
    >
      <button
        onClick={() => onApplyMark({ type: "bold" })}
        className="rounded px-2 py-1 text-xs font-bold text-gray-200 hover:bg-[#282a36] hover:text-[#50fa7b]"
        title="Negrito"
      >
        B
      </button>
      <button
        onClick={() => onApplyMark({ type: "italic" })}
        className="rounded px-2 py-1 text-xs italic text-gray-200 hover:bg-[#282a36] hover:text-[#50fa7b]"
        title="Itálico"
      >
        I
      </button>
      <div className="h-4 w-[1px] bg-[#383a59]" />
      <button
        onClick={() => onApplyMark({ type: "highlight", color: "#50fa7b" })}
        className="rounded px-2 py-1 text-xs font-semibold text-[#50fa7b] hover:bg-[#50fa7b]/20"
        title="Grifar Verde (Pontos Relevantes)"
      >
        Highlights
      </button>
      <button
        onClick={() =>
          onApplyMark({
            type: "law-tag",
            metadata: { lawNumber: "CTN", articleNumber: "Art. 113" },
          })
        }
        className="rounded bg-[#ff79c6]/20 px-2 py-1 text-xs font-bold text-[#ff79c6] hover:bg-[#ff79c6]/30"
        title="Vincular Artigo de Lei"
      >
        § LawTag
      </button>
    </div>
  );
};
