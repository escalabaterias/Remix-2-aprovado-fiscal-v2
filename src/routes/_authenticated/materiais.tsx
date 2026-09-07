import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  UploadCloud,
  HardDrive,
  Youtube,
  Link as LinkIcon,
  BookOpen,
  Scale,
  Plus,
  Search,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Folder,
  Share2,
  Bookmark,
  Info,
  Filter,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  getUserMaterials,
  createMaterial,
  deleteMaterial,
  uploadMaterialFile,
} from "@/lib/materials/service";
import {
  serverGetDriveStatus,
  serverDiscoverDriveFiles,
  serverImportDriveFile,
} from "@/lib/materials/drive/drive-server-fn";
import type { MaterialRow, SourceType } from "@/lib/materials/types";
import type { DriveDiscoveryItem, DriveLocation } from "@/lib/materials/drive/discovery-service";

export const Route = createFileRoute("/_authenticated/materiais")({
  head: () => ({
    meta: [
      { title: "Hub de Materiais — Aprovado Fiscal" },
      {
        name: "description",
        content:
          "Central unificada de materiais de estudo: Upload de arquivos, Google Drive, URLs, YouTube, Legislação e Livros.",
      },
      { property: "og:title", content: "Hub de Materiais — Aprovado Fiscal" },
      {
        property: "og:description",
        content:
          "Gerencie e conecte seus materiais de estudo com o plano adaptativo do Aprovado Fiscal.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MaterialHubPage,
});

type FilterTab =
  | "todos"
  | "upload"
  | "google_drive"
  | "youtube"
  | "legislacao"
  | "livro"
  | "anotacao"
  | "pendente";

function getSourceTypeIcon(type: SourceType, origin?: string | null) {
  if (origin === "google_drive") return <HardDrive className="h-4 w-4 text-emerald-500" />;
  if (type === "youtube") return <Youtube className="h-4 w-4 text-red-500" />;
  if (type === "pdf") return <FileText className="h-4 w-4 text-blue-500" />;
  if (type === "legislacao") return <Scale className="h-4 w-4 text-purple-500" />;
  if (type === "livro") return <BookOpen className="h-4 w-4 text-amber-500" />;
  if (type === "anotacao") return <Bookmark className="h-4 w-4 text-cyan-500" />;
  return <LinkIcon className="h-4 w-4 text-muted-foreground" />;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "processado":
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-1"
        >
          <CheckCircle2 className="h-3 w-3" /> Processado
        </Badge>
      );
    case "processando":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 flex items-center gap-1"
        >
          <RefreshCw className="h-3 w-3 animate-spin" /> Processando
        </Badge>
      );
    case "erro":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800 flex items-center gap-1"
        >
          <AlertCircle className="h-3 w-3" /> Erro
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1"
        >
          <Clock className="h-3 w-3" /> Pendente
        </Badge>
      );
  }
}

function MaterialHubPage() {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("todos");

  // Formulário Upload Direto
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState<SourceType>("pdf");
  const [uploadSubjectId, setUploadSubjectId] = useState<string>("");
  const [uploadTopicId, setUploadTopicId] = useState<string>("");

  // Formulário URL / YouTube / Outros
  const [urlTitle, setUrlTitle] = useState("");
  const [urlLink, setUrlLink] = useState("");
  const [urlType, setUrlType] = useState<SourceType>("site");
  const [urlSubjectId, setUrlSubjectId] = useState<string>("");
  const [urlAuthor, setUrlAuthor] = useState("");

  // Google Drive Discovery States
  const [driveLocation, setDriveLocation] = useState<DriveLocation>("all");
  const [driveSearch, setDriveSearch] = useState("");

  // Consultar Sessão de Usuário
  const { data: userAuth } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const userId = userAuth?.id || "";

  // Consultar Disciplinas para Select
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects-list"],
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("id, name").order("name");
      return data || [];
    },
  });

  // Consultar Materiais Cadastrados (sources)
  const { data: materials = [], isLoading: isLoadingMaterials } = useQuery({
    queryKey: ["user-materials", userId],
    enabled: !!userId,
    queryFn: async () => {
      return getUserMaterials(supabase, userId);
    },
  });

  // Consultar Status Conexão Google Drive
  const { data: driveStatus } = useQuery({
    queryKey: ["drive-status"],
    queryFn: async () => {
      try {
        return await serverGetDriveStatus();
      } catch {
        return { connected: false };
      }
    },
  });

  // Consultar Discovery de Arquivos no Google Drive
  const {
    data: driveDiscovery,
    isLoading: isLoadingDriveDiscovery,
    refetch: refetchDriveDiscovery,
  } = useQuery({
    queryKey: ["drive-discovery", driveLocation, driveSearch],
    enabled: !!driveStatus?.connected && isAddDialogOpen,
    queryFn: async () => {
      try {
        return await serverDiscoverDriveFiles({
          data: {
            location: driveLocation,
            query: driveSearch,
            pageSize: 25,
          },
        });
      } catch {
        return { items: [], totalFound: 0 };
      }
    },
  });

  // Mutation: Upload de Arquivo Direto
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado.");
      if (!uploadFile) throw new Error("Selecione um arquivo para upload.");
      const finalTitle = uploadTitle.trim() || uploadFile.name;

      const { filePath, publicUrl } = await uploadMaterialFile(supabase, userId, uploadFile);

      return createMaterial(supabase, userId, {
        title: finalTitle,
        type: uploadType,
        filePath,
        url: publicUrl,
        origin: "user_upload",
        subjectId: uploadSubjectId || null,
        topicId: uploadTopicId || null,
        metadata: {
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
          mimeType: uploadFile.type,
          uploadedAt: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Material enviado com sucesso!");
      setUploadFile(null);
      setUploadTitle("");
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user-materials"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao realizar upload do material.");
    },
  });

  // Mutation: Cadastrar Link / URL / Outros
  const urlMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Usuário não autenticado.");
      if (!urlTitle.trim()) throw new Error("Título é obrigatório.");

      let detectedType = urlType;
      if (urlLink.includes("youtube.com") || urlLink.includes("youtu.be")) {
        detectedType = "youtube";
      }

      return createMaterial(supabase, userId, {
        title: urlTitle.trim(),
        type: detectedType,
        url: urlLink.trim() || null,
        origin: detectedType === "youtube" ? "youtube" : "url",
        author: urlAuthor.trim() || null,
        subjectId: urlSubjectId || null,
        metadata: {
          addedAt: new Date().toISOString(),
        },
      });
    },
    onSuccess: () => {
      toast.success("Fonte de estudo cadastrada!");
      setUrlTitle("");
      setUrlLink("");
      setUrlAuthor("");
      setIsAddDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["user-materials"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao cadastrar link.");
    },
  });

  // Mutation: Importar item do Google Drive
  const importDriveMutation = useMutation({
    mutationFn: async (item: DriveDiscoveryItem) => {
      return serverImportDriveFile({
        data: {
          driveItem: item,
        },
      });
    },
    onSuccess: () => {
      toast.success("Arquivo do Google Drive importado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["user-materials"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao importar do Google Drive.");
    },
  });

  // Mutation: Excluir Material
  const deleteMutation = useMutation({
    mutationFn: async (materialId: string) => {
      return deleteMaterial(supabase, userId, materialId);
    },
    onSuccess: () => {
      toast.success("Material removido.");
      queryClient.invalidateQueries({ queryKey: ["user-materials"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao excluir material.");
    },
  });

  // Filtragem de Materiais na tela
  const filteredMaterials = materials.filter((item) => {
    // Busca por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAuthor = item.author?.toLowerCase().includes(q);
      const matchOrigin = item.origin?.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor && !matchOrigin) return false;
    }

    // Filtro por Aba
    if (activeTab === "upload") return item.origin === "user_upload";
    if (activeTab === "google_drive") return item.origin === "google_drive";
    if (activeTab === "youtube") return item.type === "youtube" || item.origin === "youtube";
    if (activeTab === "legislacao") return item.type === "legislacao";
    if (activeTab === "livro") return item.type === "livro";
    if (activeTab === "anotacao") return item.type === "anotacao";
    if (activeTab === "pendente") return item.processing_status === "pendente";

    return true;
  });

  // Contadores Estatísticos
  const totalCount = materials.length;
  const driveCount = materials.filter((m) => m.origin === "google_drive").length;
  const uploadCount = materials.filter((m) => m.origin === "user_upload").length;
  const processedCount = materials.filter((m) => m.processing_status === "processado").length;

  return (
    <AppShell
      title="Hub de Materiais"
      description="Central de entrada e sincronização de PDFs, Google Drive, Vídeos e Legislação."
      actions={
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Adicionar Fonte de Estudo ao Hub</DialogTitle>
              <DialogDescription>
                Conecte seus arquivos locais, conta do Google Drive, canais do YouTube ou links
                externos.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="upload" className="w-full mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload" className="gap-1.5 text-xs">
                  <UploadCloud className="h-3.5 w-3.5" /> Upload Direto
                </TabsTrigger>
                <TabsTrigger value="drive" className="gap-1.5 text-xs">
                  <HardDrive className="h-3.5 w-3.5" /> Google Drive
                </TabsTrigger>
                <TabsTrigger value="link" className="gap-1.5 text-xs">
                  <LinkIcon className="h-3.5 w-3.5" /> URL / YouTube / Outros
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: UPLOAD DIRETO */}
              <TabsContent value="upload" className="space-y-4 py-3">
                <div className="space-y-2">
                  <Label>Selecione o Arquivo (PDF, Vídeo, Documento)</Label>
                  <Input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setUploadFile(file);
                      if (file && !uploadTitle) {
                        setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Título do Material</Label>
                  <Input
                    placeholder="Ex: Aula 01 — Direito Tributário LICC"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tipo de Conteúdo</Label>
                    <Select
                      value={uploadType}
                      onValueChange={(val) => setUploadType(val as SourceType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF / Documento</SelectItem>
                        <SelectItem value="video">Vídeo Aula</SelectItem>
                        <SelectItem value="livro">Livro / E-book</SelectItem>
                        <SelectItem value="legislacao">Legislação / Lei</SelectItem>
                        <SelectItem value="prova">Prova / Simulado</SelectItem>
                        <SelectItem value="anotacao">Resumo / Anotação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Disciplina (Opcional)</Label>
                    <Select value={uploadSubjectId} onValueChange={setUploadSubjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Vincular matéria..." />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={() => uploadMutation.mutate()}
                  disabled={uploadMutation.isPending || !uploadFile}
                  className="w-full mt-4"
                >
                  {uploadMutation.isPending ? "Enviando..." : "Confirmar Upload e Cadastrar"}
                </Button>
              </TabsContent>

              {/* ABA 2: GOOGLE DRIVE DISCOVERY */}
              <TabsContent value="drive" className="space-y-4 py-3">
                {!driveStatus?.connected ? (
                  <div className="p-6 text-center border rounded-lg bg-muted/20 space-y-3">
                    <HardDrive className="h-8 w-8 mx-auto text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">Google Drive não conectado</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Conecte sua conta do Google Drive nas Configurações do sistema para listar e
                        importar seus arquivos.
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/configuracoes">Ir para Configurações</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2 items-center">
                      <Input
                        placeholder="Buscar no Google Drive..."
                        value={driveSearch}
                        onChange={(e) => setDriveSearch(e.target.value)}
                        className="text-xs"
                      />
                      <Select
                        value={driveLocation}
                        onValueChange={(val) => setDriveLocation(val as DriveLocation)}
                      >
                        <SelectTrigger className="w-[180px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todo o Drive</SelectItem>
                          <SelectItem value="my_drive">Meu Drive</SelectItem>
                          <SelectItem value="shared_with_me">Compartilhados Comigo</SelectItem>
                          <SelectItem value="shared_drive">Shared Drives</SelectItem>
                          <SelectItem value="shortcut">Atalhos</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="icon" variant="outline" onClick={() => refetchDriveDiscovery()}>
                        <RefreshCw className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="border rounded-md max-h-60 overflow-y-auto divide-y text-xs">
                      {isLoadingDriveDiscovery ? (
                        <div className="p-4 text-center text-muted-foreground">
                          Buscando no Google Drive...
                        </div>
                      ) : !driveDiscovery?.items || driveDiscovery.items.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          Nenhum arquivo encontrado na localização selecionada.
                        </div>
                      ) : (
                        driveDiscovery.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-2.5 flex items-center justify-between hover:bg-muted/40 transition-colors"
                          >
                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                              {item.mimeType.includes("folder") ? (
                                <Folder className="h-4 w-4 text-amber-500 shrink-0" />
                              ) : (
                                <HardDrive className="h-4 w-4 text-emerald-500 shrink-0" />
                              )}
                              <div className="truncate">
                                <p className="font-medium truncate">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                                  <span>{item.location}</span>
                                  {item.shared && (
                                    <span className="flex items-center gap-0.5">
                                      <Share2 className="h-2.5 w-2.5" /> Compartilhado
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs shrink-0"
                              disabled={importDriveMutation.isPending}
                              onClick={() => importDriveMutation.mutate(item)}
                            >
                              Importar
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ABA 3: LINK / YOUTUBE / OUTROS */}
              <TabsContent value="link" className="space-y-4 py-3">
                <div className="space-y-2">
                  <Label>Título da Fonte</Label>
                  <Input
                    placeholder="Ex: Legislação Tributária Anotada ou Canal Exemplo"
                    value={urlTitle}
                    onChange={(e) => setUrlTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL / Link do Vídeo ou Site</Label>
                  <Input
                    placeholder="https://..."
                    value={urlLink}
                    onChange={(e) => setUrlLink(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Categoria</Label>
                    <Select value={urlType} onValueChange={(val) => setUrlType(val as SourceType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="site">Site / URL Web</SelectItem>
                        <SelectItem value="youtube">Vídeo no YouTube</SelectItem>
                        <SelectItem value="legislacao">Legislação Vade Mecum</SelectItem>
                        <SelectItem value="livro">Livro / Doutrina</SelectItem>
                        <SelectItem value="anotacao">Anotação Própria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Autor / Fonte (Opcional)</Label>
                    <Input
                      placeholder="Ex: Prof. Ricardo ou Estratégia"
                      value={urlAuthor}
                      onChange={(e) => setUrlAuthor(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => urlMutation.mutate()}
                  disabled={urlMutation.isPending || !urlTitle.trim()}
                  className="w-full mt-4"
                >
                  {urlMutation.isPending ? "Cadastrando..." : "Cadastrar Fonte de Estudo"}
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="space-y-6">
        {/* NOTA PEDAGÓGICA DO COACH */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">
                Princípio de Governança Pedagógica:
              </span>{" "}
              O Coach do Aprovado Fiscal ajusta a ordem dos materiais de acordo com a sua meta e
              peso no edital. Os materiais cadastrados abaixo alimentam seu repertório sem
              desorganizar seu ciclo de estudos.
            </div>
          </CardContent>
        </Card>

        {/* METRICS SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total no Hub</p>
            <p className="text-2xl font-bold mt-1">{totalCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Uploads Diretos</p>
            <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
              {uploadCount}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Google Drive</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {driveCount}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Processados</p>
            <p className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">
              {processedCount}
            </p>
          </Card>
        </div>

        {/* BARRA DE PESQUISA E ABAS */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar materiais por título, autor ou origem..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground self-end sm:self-auto">
              <Filter className="h-3.5 w-3.5" />
              <span>
                Exibindo {filteredMaterials.length} de {totalCount}
              </span>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as FilterTab)}
            className="w-full"
          >
            <TabsList className="w-full flex flex-wrap justify-start h-auto gap-1 bg-muted/40 p-1">
              <TabsTrigger value="todos" className="text-xs px-3 py-1.5">
                Todos ({totalCount})
              </TabsTrigger>
              <TabsTrigger value="upload" className="text-xs px-3 py-1.5">
                Uploads ({uploadCount})
              </TabsTrigger>
              <TabsTrigger value="google_drive" className="text-xs px-3 py-1.5">
                Google Drive ({driveCount})
              </TabsTrigger>
              <TabsTrigger value="youtube" className="text-xs px-3 py-1.5">
                YouTube
              </TabsTrigger>
              <TabsTrigger value="legislacao" className="text-xs px-3 py-1.5">
                Legislação
              </TabsTrigger>
              <TabsTrigger value="livro" className="text-xs px-3 py-1.5">
                Livros
              </TabsTrigger>
              <TabsTrigger value="anotacao" className="text-xs px-3 py-1.5">
                Anotações
              </TabsTrigger>
              <TabsTrigger value="pendente" className="text-xs px-3 py-1.5">
                Pendentes
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* LISTA / GRID DE MATERIAIS */}
        {isLoadingMaterials ? (
          <div className="py-12 text-center text-muted-foreground">
            Carregando materiais do Hub...
          </div>
        ) : filteredMaterials.length === 0 ? (
          <EmptyState
            title="Nenhum material encontrado"
            description="Adicione arquivos, links ou sincronize seu Google Drive para começar."
            actionLabel="Adicionar Primeiro Material"
            onAction={() => setIsAddDialogOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMaterials.map((item) => (
              <Card
                key={item.id}
                className="flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2 rounded-md bg-muted shrink-0">
                      {getSourceTypeIcon(item.type, item.origin)}
                    </div>
                    {getStatusBadge(item.processing_status)}
                  </div>
                  <CardTitle className="text-sm font-medium line-clamp-2 mt-2">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-1">
                    {item.author ? `Autor: ${item.author}` : `Origem: ${item.origin || "Geral"}`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    <Badge variant="secondary" className="capitalize">
                      {item.type}
                    </Badge>
                    {item.origin && (
                      <Badge variant="outline" className="capitalize">
                        {item.origin}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    {item.url ? (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1 text-primary pl-0"
                      >
                        <a href={item.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" /> Abrir Fonte
                        </a>
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground italic">
                        Sem URL externa
                      </span>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Deseja remover "${item.title}" do Hub?`)) {
                          deleteMutation.mutate(item.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
