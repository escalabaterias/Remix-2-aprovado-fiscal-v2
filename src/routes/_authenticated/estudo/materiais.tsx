import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { DocumentViewer } from "@/components/study/DocumentViewer";
import { DocumentBlock, StudyDocumentJSON } from "@/lib/editor/types";
import { blocksToMarkdown, markdownToBlocks } from "@/lib/editor/markdown";
import {
  FileText,
  Plus,
  BookOpen,
  Edit3,
  Trash2,
  Calendar,
  Tag,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/estudo/materiais")({
  head: () => ({
    meta: [
      { title: "Meus Materiais de Estudo — Aprovado Fiscal" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MateriaisPage,
});

interface MaterialRecord {
  id: string;
  title: string;
  content: string | null;
  content_json: any;
  type: "resumo" | "mapa_mental" | "mnemonico" | "pdf" | "revisao" | "outro";
  created_at: string;
  updated_at: string;
  subject_id: string | null;
  topic_id: string | null;
}

function MateriaisPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Estados de Visualização (Modos)
  const [viewMode, setViewMode] = useState<"list" | "edit" | "read">("list");
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRecord | null>(null);
  const [editorBlocks, setEditorBlocks] = useState<DocumentBlock[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Buscar todos os materiais do aluno
  const fetchMaterials = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado.");
      }

      const { data, error: fetchErr } = await supabase
        .from("generated_materials")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (fetchErr) {
        throw fetchErr;
      }

      setMaterials(data as unknown as MaterialRecord[]);
    } catch (err: any) {
      console.error("Erro ao carregar materiais:", err);
      setError(err.message || "Erro inesperado ao carregar seus materiais.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Criar um novo material vazio e abrir no editor
  const handleCreateNewMaterial = async () => {
    try {
      setIsSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado para criar um material.");
        return;
      }

      const defaultBlocks: DocumentBlock[] = [
        {
          id: "b-h1-new",
          type: "heading-1",
          properties: { content: [{ text: "Novo Resumo de Estudo" }] },
        },
        {
          id: "b-p-new",
          type: "paragraph",
          properties: {
            content: [{ text: "Digite seu resumo reativo baseado em leis ou disciplinas aqui..." }],
          },
        },
        {
          id: "b-c-new",
          type: "callout",
          properties: {
            style: "warning",
            icon: "🚨",
            content: [
              {
                text: "Dica de Prova: Sempre vincule as anotações aos artigos específicos das leis!",
              },
            ],
          },
        },
      ];

      const initialJSON: StudyDocumentJSON = {
        version: 1,
        blocks: defaultBlocks,
      };

      const markdownContent = blocksToMarkdown(defaultBlocks);

      const { data, error: insertErr } = await supabase
        .from("generated_materials")
        .insert({
          title: "Novo Resumo de Estudo",
          type: "resumo",
          content: markdownContent,
          content_json: initialJSON as any,
          user_id: user.id,
          generation_metadata: { source: "manual-notion-editor" },
        })
        .select()
        .single();

      if (insertErr || !data) {
        throw insertErr || new Error("Não foi possível persistir o resumo.");
      }

      toast.success("Resumo criado com sucesso!");

      // Carregar no Editor
      const created = data as unknown as MaterialRecord;
      setSelectedMaterial(created);
      setEditorBlocks(defaultBlocks);
      setViewMode("edit");
      fetchMaterials();
    } catch (err: any) {
      console.error("Erro ao criar material:", err);
      toast.error(err.message || "Ocorreu um erro ao criar seu resumo.");
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar alterações do editor de blocos no Supabase
  const handleSaveMaterial = async (updatedBlocks: DocumentBlock[]) => {
    if (!selectedMaterial) return;

    try {
      setIsSaving(true);

      // 1. Extrair título a partir do primeiro bloco H1 se houver
      let docTitle = selectedMaterial.title;
      const firstH1 = updatedBlocks.find((b) => b.type === "heading-1");
      if (firstH1) {
        const h1Text = (firstH1.properties as any).content?.[0]?.text;
        if (h1Text && h1Text.trim() !== "") {
          // Limpar tags HTML para obter apenas texto plano do título
          docTitle = h1Text.replace(/<[^>]*>/g, "").trim();
        }
      }

      // 2. Converter todos os blocos para Markdown para preencher a coluna content
      const markdown = blocksToMarkdown(updatedBlocks);
      const docJSON: StudyDocumentJSON = {
        version: 1,
        blocks: updatedBlocks,
      };

      // 3. Atualizar no banco
      const { error: updateErr } = await supabase
        .from("generated_materials")
        .update({
          title: docTitle,
          content: markdown,
          content_json: docJSON as any,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedMaterial.id);

      if (updateErr) {
        throw updateErr;
      }

      toast.success("Progresso salvo com sucesso!");
      fetchMaterials();
    } catch (err: any) {
      console.error("Erro ao salvar material:", err);
      toast.error(err.message || "Falha ao salvar modificações.");
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir material
  const handleDeleteMaterial = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Deseja realmente deletar este resumo permanente de seus materiais?")) {
      return;
    }

    try {
      const { error: deleteErr } = await supabase.from("generated_materials").delete().eq("id", id);

      if (deleteErr) {
        throw deleteErr;
      }

      toast.success("Resumo removido.");
      fetchMaterials();
    } catch (err: any) {
      console.error("Erro ao remover material:", err);
      toast.error("Falha ao deletar material.");
    }
  };

  // Abrir material no modo edição
  const handleOpenEdit = (material: MaterialRecord) => {
    setSelectedMaterial(material);

    // Se tiver dados estruturados JSON, carrega. Senão, faz fallback do Markdown
    if (material.content_json && (material.content_json as any).blocks) {
      setEditorBlocks((material.content_json as any).blocks);
    } else if (material.content) {
      setEditorBlocks(markdownToBlocks(material.content));
    } else {
      setEditorBlocks([
        {
          id: "b-fallback-1",
          type: "heading-1",
          properties: { content: [{ text: material.title }] },
        },
        {
          id: "b-fallback-2",
          type: "paragraph",
          properties: { content: [{ text: "" }] },
        },
      ]);
    }
    setViewMode("edit");
  };

  // Abrir material no modo leitura
  const handleOpenRead = (material: MaterialRecord) => {
    setSelectedMaterial(material);

    if (material.content_json && (material.content_json as any).blocks) {
      setEditorBlocks((material.content_json as any).blocks);
    } else if (material.content) {
      setEditorBlocks(markdownToBlocks(material.content));
    } else {
      setEditorBlocks([]);
    }
    setViewMode("read");
  };

  // Filtragem local
  const filteredMaterials = materials.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.content && m.content.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <>
      {/* 1. MODO LISTAGEM PRINCIPAL */}
      {viewMode === "list" && (
        <AppShell
          title="Fichas e Materiais de Estudo"
          description="Crie e gerencie resumos, mapas mentais estruturados e anotações atreladas à legislação."
        >
          <div className="space-y-6">
            {/* Barra de Filtro e Criação */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Pesquisar em meus materiais..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              <Button
                onClick={handleCreateNewMaterial}
                disabled={isSaving}
                className="w-full sm:w-auto font-bold flex items-center gap-1.5 cursor-pointer"
                id="create-material-btn"
              >
                <Plus className="h-4 w-4" /> Criar Novo Resumo
              </Button>
            </div>

            {/* Estado de Carregamento */}
            {isLoading && (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}

            {/* Estado de Erro */}
            {!isLoading && error && (
              <div className="bg-destructive/10 border border-destructive/25 text-destructive p-4 rounded-xl flex items-start gap-2 max-w-lg mx-auto">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm">Falha técnica</h4>
                  <p className="text-xs text-muted-foreground">{error}</p>
                </div>
              </div>
            )}

            {/* Grade de Materiais */}
            {!isLoading && !error && (
              <>
                {filteredMaterials.length === 0 ? (
                  <div className="text-center py-20 bg-card/50 border border-dashed rounded-2xl space-y-4">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">Nenhum material encontrado</p>
                      <p className="text-xs text-muted-foreground">
                        {searchQuery
                          ? "Nenhum resumo coincide com sua pesquisa."
                          : "Crie seu primeiro resumo com atalhos estilo Notion clicando acima!"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredMaterials.map((mat) => (
                      <div
                        key={mat.id}
                        onClick={() => handleOpenRead(mat)}
                        className="group bg-card border border-border hover:border-primary/50 hover:shadow-md rounded-2xl p-5 space-y-4 cursor-pointer transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
                              {mat.type === "resumo" ? "Resumo" : "Ficha"}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(mat.updated_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          <h3 className="font-bold text-foreground text-base tracking-tight line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                            {mat.title}
                          </h3>
                        </div>

                        <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEdit(mat);
                              }}
                              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="h-3.5 w-3.5" /> Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenRead(mat);
                              }}
                              className="text-xs text-muted-foreground hover:text-[#50fa7b] hover:bg-[#50fa7b]/10 cursor-pointer flex items-center gap-1"
                            >
                              <BookOpen className="h-3.5 w-3.5" /> Ler
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleDeleteMaterial(mat.id, e)}
                            className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </AppShell>
      )}

      {/* 2. MODO EDICAO COM BLOCK EDITOR */}
      {viewMode === "edit" && selectedMaterial && (
        <AppShell
          title="Editar Material"
          description={`Editando ${selectedMaterial.title} com comandos de barra (/h1, /callout, /math).`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("list")}
                className="cursor-pointer"
              >
                ← Painel de Materiais
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode("read")}
                className="cursor-pointer font-bold text-[#50fa7b] hover:bg-[#50fa7b]/10 hover:text-[#50fa7b]"
              >
                <BookOpen className="h-4 w-4 mr-1.5" /> Modo Leitura
              </Button>
            </div>

            <BlockEditor
              initialBlocks={editorBlocks}
              onSave={handleSaveMaterial}
              isSaving={isSaving}
            />
          </div>
        </AppShell>
      )}

      {/* 3. MODO LEITURA COM DOCUMENT VIEWER */}
      {viewMode === "read" && selectedMaterial && (
        <DocumentViewer
          title={selectedMaterial.title}
          blocks={editorBlocks}
          onBack={() => setViewMode("list")}
        />
      )}
    </>
  );
}
