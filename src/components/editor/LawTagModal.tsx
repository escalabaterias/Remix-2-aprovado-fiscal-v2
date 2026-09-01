import React, { useState } from "react";
import { searchVadeMecum } from "@/lib/vademecum/search";
import { LawArticle, RelevanceLevel } from "@/lib/vademecum/types";
import {
  X,
  Search,
  Flame,
  AlertTriangle,
  BookOpen,
  Award,
  Check,
  ChevronRight,
  ShieldAlert,
  FolderLock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface LawTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLawTag: (metadata: { lawNumber: string; articleNumber: string; text: string }) => void;
}

export const LawTagModal: React.FC<LawTagModalProps> = ({ isOpen, onClose, onSelectLawTag }) => {
  const [query, setQuery] = useState("");
  const [selectedDiploma, setSelectedDiploma] = useState<string>("ALL");
  const [selectedRelevance, setSelectedRelevance] = useState<string>("ALL");
  const [selectedArtId, setSelectedArtId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filtrar artigos
  const filtered = searchVadeMecum({
    query,
    diploma: selectedDiploma === "ALL" ? undefined : selectedDiploma,
    relevance: selectedRelevance === "ALL" ? undefined : (selectedRelevance as RelevanceLevel),
  });

  const selectedArticle = filtered.find((a) => a.id === selectedArtId) || filtered[0];

  const handleConfirmSelection = (art: LawArticle) => {
    onSelectLawTag({
      lawNumber: art.diploma,
      articleNumber: art.articleNumber,
      text: `${art.diploma} - ${art.articleNumber}`,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 md:p-6 animate-fade-in"
      id="law-tag-modal-overlay"
    >
      <div className="relative flex flex-col w-full max-w-6xl h-[80vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[#13141c]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FolderLock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base tracking-tight">
                Vade Mecum Inteligente
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Vincule artigos com estatísticas reais de cobrança para a Área Fiscal.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            id="close-law-tag-modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Barra de Filtros Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/10 border-b border-border">
          <div className="relative col-span-1 md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por termo ou artigo..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 text-xs h-9"
              id="vademecum-search-input"
            />
          </div>

          <div className="flex gap-2 col-span-1 md:col-span-2 overflow-x-auto">
            {/* Filtro por Diploma */}
            <div className="flex bg-muted p-0.5 rounded-lg text-xs h-9 items-center shrink-0">
              <button
                onClick={() => setSelectedDiploma("ALL")}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${selectedDiploma === "ALL" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedDiploma("CF/88")}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${selectedDiploma === "CF/88" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                CF/88
              </button>
              <button
                onClick={() => setSelectedDiploma("CTN")}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${selectedDiploma === "CTN" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                CTN
              </button>
            </div>

            {/* Filtro por Incidência */}
            <div className="flex bg-muted p-0.5 rounded-lg text-xs h-9 items-center shrink-0">
              <button
                onClick={() => setSelectedRelevance("ALL")}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${selectedRelevance === "ALL" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                Todas Incidências
              </button>
              <button
                onClick={() => setSelectedRelevance("high")}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${selectedRelevance === "high" ? "bg-card text-destructive shadow-sm" : "text-muted-foreground"}`}
              >
                Alta
              </button>
              <button
                onClick={() => setSelectedRelevance("medium")}
                className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${selectedRelevance === "medium" ? "bg-card text-[#ffb86c] shadow-sm" : "text-muted-foreground"}`}
              >
                Média
              </button>
            </div>
          </div>
        </div>

        {/* Corpo Principal (Dois Painéis: Lista vs Inteligência Detalhada) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5">
          {/* Painel Esquerdo: Lista de Artigos Encontrados (2/5) */}
          <div className="col-span-2 overflow-y-auto border-r border-border p-4 space-y-3">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">
              Resultados ({filtered.length})
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-xs text-muted-foreground font-medium">
                  Nenhum artigo localizado.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((art) => {
                  const isSelected = selectedArticle?.id === art.id;
                  const isHigh = art.intelligence?.relevanceLevel === "high";

                  return (
                    <div
                      key={art.id}
                      onClick={() => setSelectedArtId(art.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left space-y-2 ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-sm"
                          : "bg-card/50 border-border hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {art.diploma} - {art.articleNumber}
                        </span>

                        <div className="flex gap-1.5 items-center">
                          {isHigh ? (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/25 text-[9px] hover:bg-destructive/10">
                              <Flame className="h-2.5 w-2.5 mr-0.5 fill-destructive" /> ALTA
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[#ffb86c] border-[#ffb86c]/25 text-[9px]"
                            >
                              MÉDIA
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {art.intelligence?.recurrenceCount}x cobrado
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {art.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Painel Direito: Detalhes Inteligentes, Pegadinhas e Seleção (3/5) */}
          <div className="col-span-3 overflow-y-auto bg-[#13141c]/40 p-5 md:p-6 space-y-6 flex flex-col justify-between">
            {selectedArticle ? (
              <div className="space-y-6 flex-1">
                {/* Cabeçalho do Artigo */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">
                        {selectedArticle.diploma}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        {selectedArticle.section || "Legislação Seca"}
                      </span>
                    </div>
                    <h4 className="text-lg font-extrabold text-foreground tracking-tight">
                      {selectedArticle.articleNumber}
                    </h4>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleConfirmSelection(selectedArticle)}
                    className="font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                    id={`confirm-lawtag-${selectedArticle.id}`}
                  >
                    <Check className="h-4 w-4" /> Vincular Artigo
                  </Button>
                </div>

                {/* Texto da Lei */}
                <div className="bg-[#1e1f29] rounded-xl p-4 border border-[#282a36] space-y-3">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Texto Literal (Lei Seca)
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed font-mono">
                    {selectedArticle.text}
                  </p>

                  {selectedArticle.incises && selectedArticle.incises.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/30 pl-4 font-mono text-xs text-gray-400">
                      {selectedArticle.incises.map((inc, i) => (
                        <div key={i}>{inc}</div>
                      ))}
                    </div>
                  )}

                  {selectedArticle.paragraphs && selectedArticle.paragraphs.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/30 pl-4 font-mono text-xs text-gray-400">
                      {selectedArticle.paragraphs.map((p, i) => (
                        <div key={i}>{p}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metadados de Inteligência de Prova */}
                {selectedArticle.intelligence && (
                  <div className="space-y-5">
                    {/* Pegadinhas Comuns */}
                    {selectedArticle.intelligence.commonTraps.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#ff5555] uppercase tracking-wider">
                          <ShieldAlert className="h-4 w-4" /> Pegadinhas Frequentes da Banca
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {selectedArticle.intelligence.commonTraps.map((trap, idx) => (
                            <div
                              key={idx}
                              className="bg-[#ff5555]/5 border border-[#ff5555]/20 rounded-xl p-4 space-y-2"
                            >
                              <h5 className="text-xs font-bold text-[#ff5555]">{trap.title}</h5>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {trap.trapText}
                              </p>
                              <div className="flex flex-wrap gap-1.5 items-center pt-1">
                                <span className="text-[9px] text-muted-foreground uppercase font-bold mr-1">
                                  Palavras Alerta:
                                </span>
                                {trap.keyTermsToWatch.map((term, tIdx) => (
                                  <Badge
                                    key={tIdx}
                                    className="bg-destructive/10 text-destructive border-destructive/20 text-[9px] hover:bg-destructive/10 rounded"
                                  >
                                    {term}
                                  </Badge>
                                ))}
                              </div>
                              <div className="text-[11px] text-[#50fa7b] font-medium pt-1">
                                💡 Dica: {trap.tipToAvoid}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Estilos das Bancas (FGV, FCC, Cebraspe) */}
                    {selectedArticle.intelligence.bankStyles.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#ffb86c] uppercase tracking-wider">
                          <Award className="h-4 w-4" /> Como cai em cada banca
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {selectedArticle.intelligence.bankStyles.map((bst, idx) => (
                            <div
                              key={idx}
                              className="bg-[#1e222b] border border-border rounded-xl p-3.5 space-y-2"
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded">
                                  {bst.bank}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                {bst.styleDescription}
                              </p>
                              <div className="text-[10px] text-[#8be9fd] font-medium border-t border-border/40 pt-1.5">
                                Conceito Frequente: "{bst.typicalQuestionConcept}"
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Súmulas & Jurisprudência */}
                    {selectedArticle.intelligence.jurisprudences.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#8be9fd] uppercase tracking-wider">
                          <BookOpen className="h-4 w-4" /> Súmulas e Jurisprudência Vinculada
                        </div>
                        <div className="space-y-2">
                          {selectedArticle.intelligence.jurisprudences.map((jur, idx) => (
                            <div
                              key={idx}
                              className="bg-[#8be9fd]/5 border border-[#8be9fd]/15 rounded-xl p-4 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-extrabold text-[#8be9fd]">
                                  {jur.court} - {jur.reference}
                                </span>
                                {jur.year && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    Ano: {jur.year}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-300 leading-relaxed font-mono">
                                {jur.summary}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center space-y-3">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Selecione um artigo no painel lateral para ver a inteligência de provas.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
