import React, { useState, useRef, useEffect } from "react";
import { DocumentBlock, BlockType, InlineMark, RichTextSegment } from "@/lib/editor/types";
import { SlashCommandMenu } from "./SlashCommandMenu";
import { FormattingToolbar } from "./FormattingToolbar";
import { LawTagModal } from "./LawTagModal";
import {
  Plus,
  GripVertical,
  Trash2,
  Sparkles,
  Code,
  Table,
  HelpCircle,
  AlertTriangle,
  Flame,
  Lightbulb,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BlockEditorProps {
  initialBlocks?: DocumentBlock[];
  onChange?: (blocks: DocumentBlock[]) => void;
  onSave?: (blocks: DocumentBlock[]) => Promise<void>;
  isSaving?: boolean;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  initialBlocks = [],
  onChange,
  onSave,
  isSaving = false,
}) => {
  const [blocks, setBlocks] = useState<DocumentBlock[]>(
    initialBlocks.length > 0
      ? initialBlocks
      : [
          {
            id: "b-initial-1",
            type: "heading-1",
            properties: { content: [{ text: "Novo Material de Estudo" }] },
          },
          {
            id: "b-initial-2",
            type: "paragraph",
            properties: { content: [{ text: "Digite '/' para acionar o menu de blocos..." }] },
          },
        ],
  );

  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [slashMenuState, setSlashMenuState] = useState<{
    show: boolean;
    blockId: string;
    top: number;
    left: number;
    query: string;
  } | null>(null);

  const [isLawTagModalOpen, setIsLawTagModalOpen] = useState(false);
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  const blockRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  const updateBlocks = (newBlocks: DocumentBlock[]) => {
    setBlocks(newBlocks);
    if (onChange) onChange(newBlocks);
  };

  // Tratar alteração de texto em tempo real em um bloco
  const handleContentChange = (blockId: string, text: string) => {
    const updated = blocks.map((block) => {
      if (block.id !== blockId) return block;

      // Se o usuário digitar '/' em um bloco, ativa o menu
      if (text.endsWith("/")) {
        const blockEl = blockRefs.current[blockId];
        if (blockEl) {
          const rect = blockEl.getBoundingClientRect();
          setSlashMenuState({
            show: true,
            blockId,
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
            query: "",
          });
        }
      } else if (slashMenuState && slashMenuState.blockId === blockId) {
        // Atualizar query se já estiver aberto
        const lastSlashIndex = text.lastIndexOf("/");
        if (lastSlashIndex !== -1) {
          const query = text.substring(lastSlashIndex + 1);
          setSlashMenuState((prev) => (prev ? { ...prev, query } : null));
        } else {
          setSlashMenuState(null);
        }
      }

      // Atualizar propriedade do bloco
      if (
        block.type === "paragraph" ||
        block.type === "heading-1" ||
        block.type === "heading-2" ||
        block.type === "heading-3"
      ) {
        return {
          ...block,
          properties: { content: [{ text }] },
        };
      }
      if (block.type === "callout") {
        return {
          ...block,
          properties: { ...(block.properties as any), content: [{ text }] },
        };
      }
      return block;
    });

    updateBlocks(updated);
  };

  // Tratar cliques e atalhos de teclado de alto nível (Notion-feel)
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    block: DocumentBlock,
    index: number,
  ) => {
    // Tecla Enter cria um novo parágrafo abaixo
    if (e.key === "Enter" && !e.shiftKey && !slashMenuState?.show) {
      e.preventDefault();
      const newBlock: DocumentBlock = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: "paragraph",
        properties: { content: [{ text: "" }] },
      };

      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      updateBlocks(newBlocks);

      // Focar no novo bloco após renderização
      setTimeout(() => {
        const nextEl = blockRefs.current[newBlock.id];
        if (nextEl) {
          nextEl.focus();
        }
      }, 50);
    }

    // Tecla Backspace remove ou reseta o bloco se estiver vazio
    if (e.key === "Backspace" && blocks.length > 1) {
      const el = blockRefs.current[block.id];
      const text = el?.innerText || "";

      if (text.length === 0) {
        e.preventDefault();

        // Se for um bloco complexo (ex: callout ou heading), reseta para parágrafo simples primeiro
        if (block.type !== "paragraph") {
          const updated = blocks.map((b) =>
            b.id === block.id
              ? { ...b, type: "paragraph" as BlockType, properties: { content: [{ text: "" }] } }
              : b,
          );
          updateBlocks(updated);
        } else {
          // Deletar o bloco e focar no anterior
          const prevBlock = blocks[index - 1];
          const updated = blocks.filter((b) => b.id !== block.id);
          updateBlocks(updated);

          if (prevBlock) {
            setTimeout(() => {
              const prevEl = blockRefs.current[prevBlock.id];
              if (prevEl) {
                prevEl.focus();
                // Mover cursor para o final
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(prevEl);
                range.collapse(false);
                sel?.removeAllRanges();
                sel?.addRange(range);
              }
            }, 50);
          }
        }
      }
    }

    // Seta para cima move o foco
    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      const prevBlock = blocks[index - 1];
      blockRefs.current[prevBlock.id]?.focus();
    }

    // Seta para baixo move o foco
    if (e.key === "ArrowDown" && index < blocks.length - 1) {
      e.preventDefault();
      const nextBlock = blocks[index + 1];
      blockRefs.current[nextBlock.id]?.focus();
    }
  };

  // Tratar comando selecionado no Slash Menu
  const handleSelectCommand = (type: BlockType) => {
    if (!slashMenuState) return;

    const blockId = slashMenuState.blockId;
    const blockEl = blockRefs.current[blockId];
    if (blockEl) {
      // Remover a barra "/" digitada
      let currentText = blockEl.innerText;
      if (currentText.endsWith("/")) {
        currentText = currentText.slice(0, -1);
      }

      const updated = blocks.map((block) => {
        if (block.id !== blockId) return block;

        // Propriedades padrão de acordo com o tipo do bloco
        let properties: any = { content: [{ text: currentText }] };
        if (type === "callout") {
          properties = {
            style: "info",
            icon: "💡",
            content: [{ text: currentText || "Dica / Pegadinha Fiscal" }],
          };
        } else if (type === "bullet-list" || type === "numbered-list") {
          properties = {
            items: [[{ text: currentText || "Item da lista" }]],
          };
        } else if (type === "formula") {
          properties = {
            expression: "E = mc^2",
          };
        } else if (type === "table") {
          properties = {
            headers: [{ text: "Banca" }, { text: "Incidência" }],
            rows: [
              [[{ text: "CEBRASPE" }], [{ text: "Alta" }]],
              [[{ text: "FCC" }], [{ text: "Média" }]],
            ],
          };
        }

        return {
          ...block,
          type,
          properties,
        };
      });

      updateBlocks(updated);
      setSlashMenuState(null);

      // Re-focar no elemento
      setTimeout(() => {
        blockRefs.current[blockId]?.focus();
      }, 50);
    }
  };

  // Formatações inline aplicadas através do Bubble Toolbar
  const handleApplyMark = (mark: InlineMark) => {
    const selection = window.getSelection();
    if (!selection) return;

    if (mark.type === "law-tag") {
      if (selection.rangeCount > 0) {
        setSavedRange(selection.getRangeAt(0));
      }
      setIsLawTagModalOpen(true);
      return;
    }

    if (selection.isCollapsed) return;

    // Aplicação simulada de marcação rica no bloco ativo
    if (activeBlockId) {
      const el = blockRefs.current[activeBlockId];
      if (el) {
        // Para simplificar no contentEditable reativo, adicionamos marcação simulada HTML
        // No mundo real, salvamos segmentos estruturados no JSON.
        // Simulamos adicionando tag de estilo no texto
        const selectedText = selection.toString();

        let formattedHTML = selectedText;
        if (mark.type === "bold") {
          formattedHTML = `<strong>${selectedText}</strong>`;
        } else if (mark.type === "italic") {
          formattedHTML = `<em>${selectedText}</em>`;
        } else if (mark.type === "highlight") {
          formattedHTML = `<mark style="background-color: ${mark.color || "#50fa7b"}">${selectedText}</mark>`;
        }

        document.execCommand("insertHTML", false, formattedHTML);
        handleContentChange(activeBlockId, el.innerHTML);
      }
    }
  };

  const handleSelectLawTag = (metadata: {
    lawNumber: string;
    articleNumber: string;
    text: string;
  }) => {
    if (activeBlockId) {
      const el = blockRefs.current[activeBlockId];
      if (el) {
        el.focus();
        const selection = window.getSelection();
        if (selection && savedRange) {
          selection.removeAllRanges();
          selection.addRange(savedRange);
        }

        const selectedText = selection?.toString() || "";
        const label = selectedText
          ? selectedText
          : `${metadata.articleNumber} da ${metadata.lawNumber}`;
        const formattedHTML = `<span class="bg-[#ff79c6]/20 text-[#ff79c6] px-1.5 py-0.5 rounded font-mono text-[11px] font-bold border border-[#ff79c6]/30 cursor-help" title="${metadata.lawNumber} - ${metadata.articleNumber}">§ ${label}</span>`;

        document.execCommand("insertHTML", false, formattedHTML);
        handleContentChange(activeBlockId, el.innerHTML);
      }
    }
    setSavedRange(null);
  };

  // Excluir bloco
  const handleDeleteBlock = (blockId: string) => {
    if (blocks.length <= 1) return;
    const updated = blocks.filter((b) => b.id !== blockId);
    updateBlocks(updated);
  };

  // Mover bloco para cima ou para baixo
  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === blocks.length - 1) return;

    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;

    updateBlocks(updated);
  };

  // Adicionar bloco no final
  const handleAddBlockAtEnd = () => {
    const newBlock: DocumentBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type: "paragraph",
      properties: { content: [{ text: "" }] },
    };
    updateBlocks([...blocks, newBlock]);
    setTimeout(() => {
      blockRefs.current[newBlock.id]?.focus();
    }, 50);
  };

  return (
    <div
      className="relative min-h-[500px] w-full bg-card rounded-2xl border border-border p-6 md:p-8 space-y-6"
      id="block-editor-container"
    >
      {/* Cabeçalho do Editor */}
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Notion-Style Block Editor
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onSave && (
            <Button
              size="sm"
              onClick={() => onSave(blocks)}
              disabled={isSaving}
              className="font-semibold"
              id="editor-save-btn"
            >
              {isSaving ? "Salvando Material..." : "Salvar Resumo"}
            </Button>
          )}
        </div>
      </div>

      {/* Lista Dinâmica de Blocos */}
      <div className="space-y-3 pl-2 pr-2">
        {blocks.map((block, idx) => {
          const isFocused = activeBlockId === block.id;

          return (
            <div
              key={block.id}
              className="group relative flex items-start gap-2.5 transition-all"
              onMouseEnter={() => setActiveBlockId(block.id)}
              onMouseLeave={() => {
                if (!isFocused) setActiveBlockId(null);
              }}
            >
              {/* Alça Lateral de Controle do Bloco (Drag & Options) */}
              <div className="absolute -left-10 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  type="button"
                  onClick={() => handleMoveBlock(idx, "up")}
                  disabled={idx === 0}
                  className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 cursor-pointer"
                  title="Mover para Cima"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveBlock(idx, "down")}
                  disabled={idx === blocks.length - 1}
                  className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 cursor-pointer"
                  title="Mover para Baixo"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(block.id)}
                  className="p-1 rounded hover:bg-destructive/10 text-destructive cursor-pointer"
                  title="Excluir Bloco"
                  id={`delete-block-${block.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Renderização Especializada por Tipo de Bloco */}
              <div className="flex-1 min-w-0">
                {block.type === "paragraph" && (
                  <div
                    ref={(el) => (blockRefs.current[block.id] = el)}
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={() => setActiveBlockId(block.id)}
                    onBlur={(e) => handleContentChange(block.id, e.currentTarget.innerHTML)}
                    onKeyDown={(e) => handleKeyDown(e, block, idx)}
                    className="outline-none text-base text-foreground leading-relaxed py-1 min-h-[24px] focus:bg-accent/5 rounded px-1 transition-colors"
                    placeholder="Digite seu texto ou '/' para comandos..."
                    dangerouslySetInnerHTML={{
                      __html: (block.properties as ParagraphData).content?.[0]?.text || "",
                    }}
                  />
                )}

                {block.type === "heading-1" && (
                  <div
                    ref={(el) => (blockRefs.current[block.id] = el)}
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={() => setActiveBlockId(block.id)}
                    onBlur={(e) => handleContentChange(block.id, e.currentTarget.innerHTML)}
                    onKeyDown={(e) => handleKeyDown(e, block, idx)}
                    className="outline-none text-3xl font-extrabold text-foreground tracking-tight py-2 min-h-[40px] focus:bg-accent/5 rounded px-1 transition-colors"
                    dangerouslySetInnerHTML={{
                      __html: (block.properties as HeadingData).content?.[0]?.text || "",
                    }}
                  />
                )}

                {block.type === "heading-2" && (
                  <div
                    ref={(el) => (blockRefs.current[block.id] = el)}
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={() => setActiveBlockId(block.id)}
                    onBlur={(e) => handleContentChange(block.id, e.currentTarget.innerHTML)}
                    onKeyDown={(e) => handleKeyDown(e, block, idx)}
                    className="outline-none text-2xl font-bold text-foreground tracking-tight py-1.5 min-h-[36px] focus:bg-accent/5 rounded px-1 transition-colors"
                    dangerouslySetInnerHTML={{
                      __html: (block.properties as HeadingData).content?.[0]?.text || "",
                    }}
                  />
                )}

                {block.type === "heading-3" && (
                  <div
                    ref={(el) => (blockRefs.current[block.id] = el)}
                    contentEditable
                    suppressContentEditableWarning
                    onFocus={() => setActiveBlockId(block.id)}
                    onBlur={(e) => handleContentChange(block.id, e.currentTarget.innerHTML)}
                    onKeyDown={(e) => handleKeyDown(e, block, idx)}
                    className="outline-none text-xl font-semibold text-foreground tracking-tight py-1 min-h-[32px] focus:bg-accent/5 rounded px-1 transition-colors"
                    dangerouslySetInnerHTML={{
                      __html: (block.properties as HeadingData).content?.[0]?.text || "",
                    }}
                  />
                )}

                {block.type === "callout" && (
                  <div className="flex gap-3 bg-[#1e222b] border-l-4 border-primary rounded-r-xl p-4 my-2 shadow-sm">
                    <span className="text-xl leading-none select-none">
                      {(block.properties as any).icon || "💡"}
                    </span>
                    <div
                      ref={(el) => (blockRefs.current[block.id] = el)}
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={() => setActiveBlockId(block.id)}
                      onBlur={(e) => handleContentChange(block.id, e.currentTarget.innerHTML)}
                      onKeyDown={(e) => handleKeyDown(e, block, idx)}
                      className="outline-none flex-1 text-sm font-medium text-foreground min-h-[20px]"
                      dangerouslySetInnerHTML={{
                        __html: (block.properties as any).content?.[0]?.text || "",
                      }}
                    />
                  </div>
                )}

                {block.type === "bullet-list" && (
                  <div className="flex items-start gap-2 py-1">
                    <span className="text-primary text-lg leading-none select-none mt-[3px]">
                      •
                    </span>
                    <div
                      ref={(el) => (blockRefs.current[block.id] = el)}
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={() => setActiveBlockId(block.id)}
                      onBlur={(e) => handleContentChange(block.id, e.currentTarget.innerHTML)}
                      onKeyDown={(e) => handleKeyDown(e, block, idx)}
                      className="outline-none flex-1 text-base text-foreground min-h-[24px]"
                      dangerouslySetInnerHTML={{
                        __html: (block.properties as any).items?.[0]?.[0]?.text || "",
                      }}
                    />
                  </div>
                )}

                {block.type === "numbered-list" && (
                  <div className="flex items-start gap-2 py-1">
                    <span className="text-primary text-sm font-bold leading-none select-none mt-[5px]">
                      1.
                    </span>
                    <div
                      ref={(el) => (blockRefs.current[block.id] = el)}
                      contentEditable
                      suppressContentEditableWarning
                      onFocus={() => setActiveBlockId(block.id)}
                      onBlur={(e) => handleContentChange(block.id, e.currentTarget.innerHTML)}
                      onKeyDown={(e) => handleKeyDown(e, block, idx)}
                      className="outline-none flex-1 text-base text-foreground min-h-[24px]"
                      dangerouslySetInnerHTML={{
                        __html: (block.properties as any).items?.[0]?.[0]?.text || "",
                      }}
                    />
                  </div>
                )}

                {block.type === "formula" && (
                  <div className="bg-muted/40 border border-dashed rounded-xl p-4 my-2 flex items-center gap-3">
                    <Code className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Fórmula LaTeX
                      </div>
                      <input
                        type="text"
                        defaultValue={(block.properties as any).expression || ""}
                        onChange={(e) => {
                          const updated = blocks.map((b) =>
                            b.id === block.id
                              ? { ...b, properties: { expression: e.target.value } }
                              : b,
                          );
                          updateBlocks(updated);
                        }}
                        className="w-full bg-transparent outline-none font-mono text-sm text-foreground border-b border-border focus:border-primary pb-1"
                      />
                      <div className="pt-2 text-center select-none font-serif text-lg text-primary bg-card/50 rounded p-2">
                        $$\; {(block.properties as any).expression || "E = mc^2"} \;$$
                      </div>
                    </div>
                  </div>
                )}

                {block.type === "table" && (
                  <div className="overflow-x-auto border border-border rounded-xl my-2 shadow-sm bg-muted/10">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          {((block.properties as any).headers || []).map((h: any, cIdx: number) => (
                            <th
                              key={cIdx}
                              className="p-3 font-semibold text-xs text-muted-foreground uppercase tracking-wider border-r border-border last:border-r-0"
                            >
                              {h.text}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {((block.properties as any).rows || []).map((row: any, rIdx: number) => (
                          <tr key={rIdx} className="border-b last:border-b-0 hover:bg-muted/20">
                            {row.map((cell: any, cIdx: number) => (
                              <td
                                key={cIdx}
                                className="p-3 border-r border-border last:border-r-0 text-foreground"
                              >
                                {cell[0]?.text || ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {block.type === "divider" && <hr className="my-4 border-t-2 border-border" />}
              </div>

              {/* Popup de Menu Slash Command se ativo neste bloco */}
              {slashMenuState && slashMenuState.blockId === block.id && (
                <SlashCommandMenu
                  onSelectCommand={handleSelectCommand}
                  onClose={() => setSlashMenuState(null)}
                  searchText={slashMenuState.query}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Botão para Inserir Bloco Adicional no final */}
      <div className="pt-4 flex justify-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddBlockAtEnd}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar Bloco
        </Button>
      </div>

      {/* Barra de Formatação Inline de Seleção */}
      <FormattingToolbar onApplyMark={handleApplyMark} />

      <LawTagModal
        isOpen={isLawTagModalOpen}
        onClose={() => setIsLawTagModalOpen(false)}
        onSelectLawTag={handleSelectLawTag}
      />
    </div>
  );
};
