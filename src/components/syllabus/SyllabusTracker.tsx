import React, { useMemo, useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Filter,
  Plus,
  Scale,
  Search,
  Sparkles,
  Star,
  Tag,
  Target,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addLawTag, getLawTags, searchLawTags } from "@/lib/syllabus/lawTagService";
import {
  calculateSyllabusProgress,
  getSubjectSummaries,
  getSyllabusItems,
  linkLawTagToSyllabusItem,
  updateSyllabusItemNotes,
  updateSyllabusItemStatus,
} from "@/lib/syllabus/syllabusEngine";
import type { LawTag, LawTagImportance, SyllabusItem, SyllabusStatus } from "@/lib/syllabus/types";

const STATUS_CONFIG: Record<
  SyllabusStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  not_started: {
    label: "Não Iniciado",
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/20",
    icon: <Clock className="h-3 w-3" />,
  },
  studying: {
    label: "Em Estudo",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    icon: <BookOpen className="h-3 w-3" />,
  },
  reviewed: {
    label: "Revisado",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  mastered: {
    label: "Dominado",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    icon: <Sparkles className="h-3 w-3" />,
  },
};

export function SyllabusTracker() {
  const [items, setItems] = useState<SyllabusItem[]>(getSyllabusItems());
  const [lawTags, setLawTags] = useState<LawTag[]>(getLawTags());

  const [activeTab, setActiveTab] = useState<"edital" | "vade_mecum">("edital");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [selectedLawTagModal, setSelectedLawTagModal] = useState<LawTag | null>(null);

  // Form para nova LawTag
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [newTagLawName, setNewTagLawName] = useState("");
  const [newTagArticle, setNewTagArticle] = useState("");
  const [newTagDesc, setNewTagDesc] = useState("");
  const [newTagImportance, setNewTagImportance] = useState<LawTagImportance>("high");

  // Anotações Inline Modal/Popover
  const [editingNotesItem, setEditingNotesItem] = useState<SyllabusItem | null>(null);
  const [notesText, setNotesText] = useState("");

  // Recalcular métricas
  const progress = useMemo(() => calculateSyllabusProgress(items), [items]);
  const subjectSummaries = useMemo(() => getSubjectSummaries(items), [items]);

  const uniqueSubjects = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.subject)));
  }, [items]);

  // Alternar Status do Item do Edital
  const handleStatusChange = (id: string, newStatus: SyllabusStatus) => {
    const updated = updateSyllabusItemStatus(id, newStatus);
    setItems(updated);
  };

  // Alternar Colapso da Disciplina
  const toggleSubject = (subject: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subject]: !prev[subject],
    }));
  };

  // Salvar Anotações
  const handleSaveNotes = () => {
    if (!editingNotesItem) return;
    const updated = updateSyllabusItemNotes(editingNotesItem.id, notesText);
    setItems(updated);
    setEditingNotesItem(null);
  };

  // Adicionar Nova LawTag
  const handleCreateLawTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagLawName || !newTagArticle) return;

    const created = addLawTag({
      lawName: newTagLawName,
      articleNumber: newTagArticle,
      description: newTagDesc,
      importanceLevel: newTagImportance,
    });

    setLawTags(getLawTags());
    setIsAddTagOpen(false);
    setNewTagLawName("");
    setNewTagArticle("");
    setNewTagDesc("");
  };

  // Filtragem dos Itens do Edital
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSubject = selectedSubject === "all" || item.subject === selectedSubject;
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        item.topic.toLowerCase().includes(q) ||
        (item.subtopic && item.subtopic.toLowerCase().includes(q)) ||
        item.subject.toLowerCase().includes(q) ||
        item.lawTags.some((tagId) => {
          const tag = lawTags.find((t) => t.id === tagId);
          return (
            tag &&
            (tag.lawName.toLowerCase().includes(q) ||
              tag.articleNumber.toLowerCase().includes(q) ||
              tag.description.toLowerCase().includes(q))
          );
        });

      return matchesSubject && matchesStatus && matchesQuery;
    });
  }, [items, lawTags, selectedSubject, selectedStatus, searchQuery]);

  // Agrupar Itens por Disciplina
  const groupedBySubject = useMemo(() => {
    const map = new Map<string, SyllabusItem[]>();
    filteredItems.forEach((item) => {
      const list = map.get(item.subject) || [];
      list.push(item);
      map.set(item.subject, list);
    });
    return map;
  }, [filteredItems]);

  return (
    <div className="space-y-6">
      {/* Resumo e Métricas Gerais do Edital Verticalizado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Progresso do Edital</span>
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {progress.percentage}%
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {progress.completedItems} de {progress.totalItems} tópicos concluídos
          </div>
        </div>

        <div className="panel p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Domínio Ponderado (Pesos)
            </span>
            <Scale className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">
              {progress.weightedPercentage}%
            </div>
            <div className="w-full bg-muted rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${progress.weightedPercentage}%` }}
              />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Ponderação pelo peso de incidência no concurso
          </div>
        </div>

        <div className="panel p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Status dos Tópicos</span>
            <BookOpen className="h-4 w-4 text-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-muted-foreground">Dominado:</span>
              <span className="font-mono font-bold text-foreground">
                {progress.statusCounts.mastered}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-muted-foreground">Revisado:</span>
              <span className="font-mono font-bold text-foreground">
                {progress.statusCounts.reviewed}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              <span className="text-muted-foreground">Estudando:</span>
              <span className="font-mono font-bold text-foreground">
                {progress.statusCounts.studying}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-zinc-500" />
              <span className="text-muted-foreground">Pendente:</span>
              <span className="font-mono font-bold text-foreground">
                {progress.statusCounts.not_started}
              </span>
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Distribuição pedagógica de retidao
          </div>
        </div>

        <div className="panel p-4 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">LawTags (Vade Mecum)</span>
            <Tag className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-foreground">{lawTags.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dispositivos legais mapeados diretamente nos tópicos do edital
            </p>
          </div>
          <div className="text-[11px] text-emerald-400 font-medium">
            Integração CTN, CF/88, LC 87/96 e Leis Fiscais
          </div>
        </div>
      </div>

      {/* Navegação entre Abas (Edital vs Vade Mecum) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("edital")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "edital"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4 text-primary" />
            Edital Verticalizado
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vade_mecum")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "vade_mecum"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Tag className="h-4 w-4 text-emerald-400" />
            LawTags & Vade Mecum ({lawTags.length})
          </button>
        </div>

        {activeTab === "vade_mecum" && (
          <Button size="sm" onClick={() => setIsAddTagOpen(true)} className="gap-2 text-xs">
            <Plus className="h-4 w-4" />
            Nova LawTag
          </Button>
        )}
      </div>

      {/* Conteúdo Aba 1: Edital Verticalizado */}
      {activeTab === "edital" && (
        <div className="space-y-4">
          {/* Barra de Filtros e Pesquisa */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar tópico, lei, artigo ou jurisprudência..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs bg-card"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                <span>Filtrar:</span>
              </div>

              {/* Filtro por Disciplina */}
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="h-9 px-3 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Todas as Matérias</option>
                {uniqueSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>

              {/* Filtro por Status */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-9 px-3 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Todos os Status</option>
                <option value="not_started">Não Iniciado</option>
                <option value="studying">Em Estudo</option>
                <option value="reviewed">Revisado</option>
                <option value="mastered">Dominado</option>
              </select>
            </div>
          </div>

          {/* Lista de Disciplinas e Tópicos */}
          <div className="space-y-4">
            {Array.from(groupedBySubject.entries()).map(([subjectName, subjectItems]) => {
              const summary = subjectSummaries.find((s) => s.subject === subjectName);
              const isCollapsed = expandedSubjects[subjectName] === false;

              return (
                <div key={subjectName} className="panel overflow-hidden">
                  {/* Cabeçalho da Disciplina */}
                  <div
                    onClick={() => toggleSubject(subjectName)}
                    className="p-4 bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        {isCollapsed ? (
                          <ChevronRight className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <h3 className="font-display font-semibold text-foreground text-sm sm:text-base">
                          {subjectName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {subjectItems.length} tópicos na grade
                        </p>
                      </div>
                    </div>

                    {summary && (
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-foreground">
                            {summary.percentage}% Concluído
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {summary.completedTopics} de {summary.totalTopics} tópicos
                          </span>
                        </div>
                        <div className="w-24 bg-muted rounded-full h-2 overflow-hidden border border-border">
                          <div
                            className="bg-primary h-full transition-all"
                            style={{ width: `${summary.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Conteúdo Expandido dos Tópicos */}
                  {!isCollapsed && (
                    <div className="divide-y divide-border/40">
                      {subjectItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                        >
                          {/* Detalhes do Tópico */}
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-start sm:items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground text-sm">
                                {item.topic}
                              </span>

                              {/* Badge de Peso do Edital */}
                              <Badge
                                variant="outline"
                                className="gap-1 text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/20"
                              >
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                Peso {item.weight}
                              </Badge>
                            </div>

                            {item.subtopic && (
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {item.subtopic}
                              </p>
                            )}

                            {/* LawTags Vinculadas ao Tópico */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {item.lawTags.map((tagId) => {
                                const tag = lawTags.find((t) => t.id === tagId);
                                if (!tag) return null;

                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => setSelectedLawTagModal(tag)}
                                    className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-medium transition-colors cursor-pointer flex items-center gap-1"
                                  >
                                    <Tag className="h-3 w-3" />
                                    {tag.lawName} {tag.articleNumber}
                                  </button>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNotesItem(item);
                                  setNotesText(item.notes || "");
                                }}
                                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 ml-2 underline underline-offset-2 cursor-pointer"
                              >
                                {item.notes ? "📝 Editar Anotação" : "+ Anotação"}
                              </button>
                            </div>

                            {item.notes && (
                              <div className="text-[11px] text-amber-300/90 italic bg-amber-500/5 p-2 rounded-md border border-amber-500/10 mt-1">
                                "{item.notes}"
                              </div>
                            )}
                          </div>

                          {/* Seletor de Status Segmentado */}
                          <div className="flex items-center gap-1 self-start md:self-center bg-muted/60 p-1 rounded-xl border border-border shrink-0">
                            {(
                              [
                                "not_started",
                                "studying",
                                "reviewed",
                                "mastered",
                              ] as SyllabusStatus[]
                            ).map((st) => {
                              const conf = STATUS_CONFIG[st];
                              const isActive = item.status === st;

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleStatusChange(item.id, st)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isActive
                                      ? `${conf.bg} ${conf.text} font-semibold shadow-xs border ${conf.border}`
                                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                  }`}
                                >
                                  {conf.icon}
                                  <span className="hidden sm:inline">{conf.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="panel p-8 text-center text-muted-foreground space-y-2">
                <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm">Nenhum tópico encontrado com os filtros selecionados.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo Aba 2: LawTags & Vade Mecum */}
      {activeTab === "vade_mecum" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lawTags.map((tag) => (
              <div
                key={tag.id}
                onClick={() => setSelectedLawTagModal(tag)}
                className="panel p-4 hover:border-emerald-500/40 transition-all cursor-pointer space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-emerald-400" />
                      <span className="font-bold text-foreground text-sm font-mono">
                        {tag.lawName} {tag.articleNumber}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        tag.importanceLevel === "high"
                          ? "bg-red-500/10 text-red-400 border-red-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {tag.importanceLevel === "high" ? "Alta Relevância" : "Média"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                    {tag.description}
                  </p>
                </div>

                {tag.subject && (
                  <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                    <span>{tag.subject}</span>
                    <span className="text-emerald-400 font-medium">Ver dispositivo →</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Detalhes da LawTag */}
      {selectedLawTagModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="panel p-6 max-w-lg w-full space-y-4 shadow-xl border-emerald-500/30">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-emerald-400" />
                <h3 className="font-display font-bold text-lg text-foreground font-mono">
                  {selectedLawTagModal.lawName} — {selectedLawTagModal.articleNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLawTagModal(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground font-medium">
                  Dispositivo / Jurisprudência Mapeada:
                </span>
                <p className="text-sm text-foreground bg-muted/40 p-3 rounded-lg border border-border mt-1 leading-relaxed">
                  {selectedLawTagModal.description}
                </p>
              </div>

              {selectedLawTagModal.subject && (
                <div className="text-xs text-muted-foreground">
                  Disciplina:{" "}
                  <strong className="text-foreground">{selectedLawTagModal.subject}</strong>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedLawTagModal(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal / Form para Adicionar Nova LawTag */}
      {isAddTagOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateLawTag}
            className="panel p-6 max-w-md w-full space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-base text-foreground">
                Cadastrar Nova LawTag no Vade Mecum
              </h3>
              <button
                type="button"
                onClick={() => setIsAddTagOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-muted-foreground mb-1">
                  Legislação (ex: CTN, CF/88, RICMS/SP):
                </label>
                <Input
                  required
                  placeholder="Ex: CTN"
                  value={newTagLawName}
                  onChange={(e) => setNewTagLawName(e.target.value)}
                  className="bg-card"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">
                  Artigo / Parágrafo / Súmula:
                </label>
                <Input
                  required
                  placeholder="Ex: Art. 156, V"
                  value={newTagArticle}
                  onChange={(e) => setNewTagArticle(e.target.value)}
                  className="bg-card"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">
                  Descrição ou Pegadinha do Dispositivo:
                </label>
                <textarea
                  rows={3}
                  placeholder="Resumo prático do dispositivo para memorização..."
                  value={newTagDesc}
                  onChange={(e) => setNewTagDesc(e.target.value)}
                  className="w-full p-2 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-muted-foreground mb-1">
                  Nível de Importância Fiscal:
                </label>
                <select
                  value={newTagImportance}
                  onChange={(e) => setNewTagImportance(e.target.value as LawTagImportance)}
                  className="w-full h-9 px-3 bg-card border border-border rounded-lg text-foreground"
                >
                  <option value="high">Alta Incidência (Sempre cobrado)</option>
                  <option value="medium">Média Incidência</option>
                  <option value="low">Baixa Incidência</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddTagOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm">
                Salvar LawTag
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal para Editar Anotações do Tópico */}
      {editingNotesItem && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="panel p-6 max-w-md w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-base text-foreground">
                Anotações: {editingNotesItem.topic}
              </h3>
              <button
                type="button"
                onClick={() => setEditingNotesItem(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Anote macetes, exceções ou pontos fracos neste tópico:
              </label>
              <textarea
                rows={4}
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Ex: Não esquecer a jurisprudência do STF sobre imunidades de e-readers..."
                className="w-full p-3 text-xs bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingNotesItem(null)}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleSaveNotes}>
                Salvar Anotação
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
