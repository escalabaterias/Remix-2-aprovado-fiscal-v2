import React, { useState, useEffect, useRef } from "react";
import { DocumentBlock, HeadingData, ParagraphData } from "@/lib/editor/types";
import {
  ChevronRight,
  Menu,
  BookOpen,
  ArrowLeft,
  FileText,
  Sparkles,
  Award,
  AlertOctagon,
  Flame,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DocumentViewerProps {
  title: string;
  blocks: DocumentBlock[];
  onBack?: () => void;
}

interface TocItem {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({ title, blocks = [], onBack }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mapear cabeçalhos para o Sumário (TOC)
  const headings = blocks
    .filter((b) => b.type === "heading-1" || b.type === "heading-2" || b.type === "heading-3")
    .map((b) => {
      const level = b.type === "heading-1" ? 1 : b.type === "heading-2" ? 2 : 3;
      const text = (b.properties as HeadingData).content?.[0]?.text || "Sem título";
      return { id: b.id, text, level } as TocItem;
    });

  // Atualizar barra de progresso de leitura reativa baseada em scroll
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }

      // Detectar seção ativa no scroll
      let currentActiveId = null;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            currentActiveId = h.id;
          }
        }
      }
      if (currentActiveId) {
        setActiveHeadingId(currentActiveId);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0d0e12] text-gray-100" ref={containerRef}>
      {/* Barra de Progresso Linear de Leitura no Topo */}
      <div className="fixed top-0 left-0 w-full h-1 bg-[#1a1b23] z-50">
        <div
          className="h-full bg-[#50fa7b] transition-all duration-75"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Header Fixo de Navegação */}
      <header className="sticky top-0 bg-[#0d0e12]/90 backdrop-blur-md border-b border-[#1e2029] py-4 px-6 flex items-center justify-between z-40">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              id="viewer-back-btn"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
          )}
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-sm font-bold tracking-tight text-foreground truncate max-w-xs md:max-w-lg">
              {title}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#50fa7b] font-mono font-bold bg-[#50fa7b]/10 px-3 py-1.5 rounded-full">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Leitura Ativa:{" "}
          {Math.round(scrollProgress)}%
        </div>
      </header>

      {/* Grid Principal de Conteúdo e Índice */}
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 md:gap-12">
        {/* Sidebar Esquerda: Sumário Dinâmico (TOC) */}
        <aside className="hidden lg:block space-y-6">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center gap-2 px-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <Menu className="h-3.5 w-3.5" /> Sumário do Resumo
            </div>

            {headings.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1">Nenhum cabeçalho indexado.</p>
            ) : (
              <nav className="space-y-1 border-l border-[#1e2029] pl-3">
                {headings.map((h) => {
                  const isActive = activeHeadingId === h.id;

                  return (
                    <button
                      key={h.id}
                      onClick={() => scrollToHeading(h.id)}
                      className={`block w-full text-left transition-all truncate text-xs ${
                        isActive
                          ? "text-[#50fa7b] font-bold pl-1"
                          : "text-muted-foreground hover:text-foreground pl-0"
                      } ${h.level === 1 ? "font-semibold py-1" : "py-0.5"}`}
                      style={{ paddingLeft: `${(h.level - 1) * 8}px` }}
                    >
                      {h.text}
                    </button>
                  );
                })}
              </nav>
            )}
          </div>
        </aside>

        {/* Artigo / Conteúdo Otimizado para Leitura */}
        <main className="max-w-3xl mx-auto w-full space-y-8 pb-32">
          {/* Header de Título do Documento */}
          <div className="space-y-3 pb-6 border-b border-[#1e2029]">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-[#ff79c6]" />
              <span className="text-[10px] font-bold text-[#ff79c6] uppercase tracking-widest">
                Material Consolidado
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {title}
            </h2>
          </div>

          {/* Renderização Sequencial Limpa dos Blocos */}
          <div className="space-y-6">
            {blocks.map((block) => {
              const props = block.properties;

              switch (block.type) {
                case "paragraph": {
                  const pData = props as ParagraphData;
                  const textContent = pData.content?.[0]?.text || "";
                  return (
                    <p
                      key={block.id}
                      className="text-base text-gray-300 leading-relaxed font-normal"
                      dangerouslySetInnerHTML={{ __html: textContent }}
                    />
                  );
                }
                case "heading-1": {
                  const hData = props as HeadingData;
                  const textContent = hData.content?.[0]?.text || "Sem título";
                  return (
                    <h3
                      id={block.id}
                      key={block.id}
                      className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-10 mb-4 pt-4 border-b border-[#1e2029] pb-2"
                      dangerouslySetInnerHTML={{ __html: textContent }}
                    />
                  );
                }
                case "heading-2": {
                  const hData = props as HeadingData;
                  const textContent = hData.content?.[0]?.text || "Sem título";
                  return (
                    <h4
                      id={block.id}
                      key={block.id}
                      className="text-xl md:text-2xl font-bold text-gray-100 tracking-tight mt-8 mb-3"
                      dangerouslySetInnerHTML={{ __html: textContent }}
                    />
                  );
                }
                case "heading-3": {
                  const hData = props as HeadingData;
                  const textContent = hData.content?.[0]?.text || "Sem título";
                  return (
                    <h5
                      id={block.id}
                      key={block.id}
                      className="text-lg md:text-xl font-semibold text-gray-200 tracking-tight mt-6 mb-2"
                      dangerouslySetInnerHTML={{ __html: textContent }}
                    />
                  );
                }
                case "callout": {
                  const cData = props as any;
                  const icon = cData.icon || "💡";
                  const textContent = cData.content?.[0]?.text || "";

                  // Definir cor com base na gravidade do Callout (Aviso/Pegadinha Fiscal)
                  let cardStyle = "border-l-4 border-[#ff5555] bg-[#ff5555]/10";
                  let textStyle = "text-[#ff5555]";
                  if (cData.style === "info") {
                    cardStyle = "border-l-4 border-[#8be9fd] bg-[#8be9fd]/10";
                    textStyle = "text-[#8be9fd]";
                  } else if (cData.style === "warning") {
                    cardStyle = "border-l-4 border-[#ffb86c] bg-[#ffb86c]/10";
                    textStyle = "text-[#ffb86c]";
                  } else if (cData.style === "success") {
                    cardStyle = "border-l-4 border-[#50fa7b] bg-[#50fa7b]/10";
                    textStyle = "text-[#50fa7b]";
                  }

                  return (
                    <div
                      key={block.id}
                      className={`flex gap-4 p-4 rounded-r-xl shadow-md my-4 ${cardStyle}`}
                    >
                      <span className="text-2xl leading-none select-none shrink-0">{icon}</span>
                      <div className="space-y-1">
                        <div
                          className={`text-[10px] font-bold uppercase tracking-wider ${textStyle}`}
                        >
                          Pegadinha de Prova / Alerta
                        </div>
                        <p
                          className="text-sm font-medium text-gray-200 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: textContent }}
                        />
                      </div>
                    </div>
                  );
                }
                case "bullet-list": {
                  const lData = props as any;
                  return (
                    <ul key={block.id} className="list-disc pl-6 space-y-2 text-gray-300">
                      {(lData.items || []).map((item: any, iIdx: number) => (
                        <li key={iIdx} dangerouslySetInnerHTML={{ __html: item[0]?.text || "" }} />
                      ))}
                    </ul>
                  );
                }
                case "numbered-list": {
                  const lData = props as any;
                  return (
                    <ol key={block.id} className="list-decimal pl-6 space-y-2 text-gray-300">
                      {(lData.items || []).map((item: any, iIdx: number) => (
                        <li key={iIdx} dangerouslySetInnerHTML={{ __html: item[0]?.text || "" }} />
                      ))}
                    </ol>
                  );
                }
                case "formula": {
                  const fData = props as any;
                  return (
                    <div
                      key={block.id}
                      className="bg-[#1e1f29] border border-[#282a36] rounded-xl p-6 my-4 text-center"
                    >
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                        Fórmula de Estudo
                      </div>
                      <div className="font-serif text-xl text-[#50fa7b]">
                        $$\; {fData.expression || ""} \;$$
                      </div>
                    </div>
                  );
                }
                case "table": {
                  const tData = props as any;
                  return (
                    <div
                      key={block.id}
                      className="overflow-x-auto border border-[#1e2029] rounded-xl my-4 bg-[#1e1f29]/35 shadow-md"
                    >
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-[#1e2029] bg-[#1e1f29]">
                            {(tData.headers || []).map((h: any, cIdx: number) => (
                              <th
                                key={cIdx}
                                className="p-3.5 font-bold text-xs text-muted-foreground uppercase tracking-wider border-r border-[#1e2029] last:border-r-0"
                              >
                                {h.text}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(tData.rows || []).map((row: any, rIdx: number) => (
                            <tr
                              key={rIdx}
                              className="border-b border-[#1e2029] last:border-b-0 hover:bg-muted/10"
                            >
                              {row.map((cell: any, cIdx: number) => (
                                <td
                                  key={cIdx}
                                  className="p-3.5 border-r border-[#1e2029] last:border-r-0 text-gray-300"
                                  dangerouslySetInnerHTML={{ __html: cell[0]?.text || "" }}
                                />
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                }
                case "divider": {
                  return <hr key={block.id} className="my-8 border-t border-[#1e2029]" />;
                }
                default:
                  return null;
              }
            })}
          </div>
        </main>
      </div>
    </div>
  );
};
