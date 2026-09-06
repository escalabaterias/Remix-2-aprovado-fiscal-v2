/**
 * MATERIAL SERVICE — P0.1-A
 *
 * Camada de persistência, consulta e gerenciamento de materiais e fontes de estudo do aluno.
 * Opera exclusivamente sobre a tabela nativa `sources` do Supabase.
 *
 * REGRAS ARQUITETÔNICAS:
 *   - Utiliza a tabela nativa `public.sources`.
 *   - NÃO altera schema, RLS ou migrations.
 *   - NÃO altera `generated_materials` ou `review_events`.
 *   - NÃO duplica autoridade de decisão pedagógica (mantida em CoachEngine e PlannerEngine).
 *   - Força isolamento do usuário autenticado (`user_id = userId`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  MaterialRow,
  CreateMaterialInput,
  UpdateMaterialInput,
  MaterialFilter,
  SourceType,
} from "./types";

const VALID_SOURCE_TYPES: Set<SourceType> = new Set([
  "pdf",
  "video",
  "youtube",
  "livro",
  "legislacao",
  "jurisprudencia",
  "prova",
  "questao",
  "anotacao",
  "site",
  "documento",
  "material_proprio",
  "outro",
]);

/**
 * Valida o formato básico de uma URL se fornecida.
 */
function isValidUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;

  // Aceita URLs HTTP/HTTPS, links relativos ou esquemas conhecidos
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return true;
  }

  // Tenta parser URL padrão
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida entradas de criação de material.
 */
function validateCreateInput(input: CreateMaterialInput): void {
  if (!input || typeof input.title !== "string" || input.title.trim().length === 0) {
    throw new Error("Título do material é obrigatório e não pode ser vazio.");
  }

  if (input.type && !VALID_SOURCE_TYPES.has(input.type)) {
    throw new Error(`Tipo de material inválido: ${input.type}`);
  }

  if (input.url && !isValidUrl(input.url)) {
    throw new Error("URL informada é inválida.");
  }
}

/**
 * Valida entradas de atualização de material.
 */
function validateUpdateInput(input: UpdateMaterialInput): void {
  if (input.title !== undefined) {
    if (typeof input.title !== "string" || input.title.trim().length === 0) {
      throw new Error("Título do material não pode ser vazio.");
    }
  }

  if (input.type !== undefined && !VALID_SOURCE_TYPES.has(input.type)) {
    throw new Error(`Tipo de material inválido: ${input.type}`);
  }

  if (input.url !== undefined && input.url !== null && !isValidUrl(input.url)) {
    throw new Error("URL informada é inválida.");
  }
}

/**
 * Retorna todos os materiais do usuário autenticado com filtros opcionais.
 */
export async function getUserMaterials(
  client: SupabaseClient<Database>,
  userId: string,
  filters?: MaterialFilter,
): Promise<MaterialRow[]> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  let query = client.from("sources").select("*").eq("user_id", userId);

  if (filters?.topicId) {
    query = query.eq("topic_id", filters.topicId);
  }

  if (filters?.subjectId) {
    query = query.eq("subject_id", filters.subjectId);
  }

  if (filters?.contestId) {
    query = query.eq("contest_id", filters.contestId);
  }

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar materiais do usuário: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Retorna os materiais vinculados a um tópico específico para o usuário autenticado.
 */
export async function getMaterialsByTopic(
  client: SupabaseClient<Database>,
  userId: string,
  topicId: string,
): Promise<MaterialRow[]> {
  if (!topicId) return [];
  return getUserMaterials(client, userId, { topicId });
}

/**
 * Retorna os materiais vinculados a uma disciplina específica para o usuário autenticado.
 */
export async function getMaterialsBySubject(
  client: SupabaseClient<Database>,
  userId: string,
  subjectId: string,
): Promise<MaterialRow[]> {
  if (!subjectId) return [];
  return getUserMaterials(client, userId, { subjectId });
}

/**
 * Retorna um material por ID garantindo pertencimento ao usuário autenticado.
 */
export async function getMaterialById(
  client: SupabaseClient<Database>,
  userId: string,
  materialId: string,
): Promise<MaterialRow | null> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  if (!materialId) {
    return null;
  }

  const { data, error } = await client
    .from("sources")
    .select("*")
    .eq("id", materialId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar material por ID: ${error.message}`);
  }

  return data;
}

/**
 * Cadastra um novo material no banco vinculado ao usuário autenticado.
 */
export async function createMaterial(
  client: SupabaseClient<Database>,
  userId: string,
  input: CreateMaterialInput,
): Promise<MaterialRow> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  validateCreateInput(input);

  const newRecord = {
    user_id: userId,
    title: input.title.trim(),
    type: input.type ?? "pdf",
    url: input.url?.trim() || null,
    file_path: input.filePath?.trim() || null,
    origin: input.origin?.trim() || "user_upload",
    topic_id: input.topicId || null,
    subject_id: input.subjectId || null,
    contest_id: input.contestId || null,
    author: input.author?.trim() || null,
    metadata: (input.metadata ?? {}) as any,
  };

  const { data, error } = await client
    .from("sources")
    .insert(newRecord as any)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Erro ao cadastrar material: ${error.message}`);
  }

  return data;
}

/**
 * Atualiza um material existente pertencente ao usuário autenticado.
 */
export async function updateMaterial(
  client: SupabaseClient<Database>,
  userId: string,
  materialId: string,
  input: UpdateMaterialInput,
): Promise<MaterialRow> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  if (!materialId) {
    throw new Error("ID do material é obrigatório.");
  }

  validateUpdateInput(input);

  // Garantir que o material existe e pertence ao usuário
  const existing = await getMaterialById(client, userId, materialId);
  if (!existing) {
    throw new Error("Material não encontrado ou acesso não autorizado.");
  }

  const updateData: Record<string, unknown> = {};

  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.type !== undefined) updateData.type = input.type;
  if (input.url !== undefined) updateData.url = input.url ? input.url.trim() : null;
  if (input.filePath !== undefined)
    updateData.file_path = input.filePath ? input.filePath.trim() : null;
  if (input.origin !== undefined) updateData.origin = input.origin ? input.origin.trim() : null;
  if (input.topicId !== undefined) updateData.topic_id = input.topicId || null;
  if (input.subjectId !== undefined) updateData.subject_id = input.subjectId || null;
  if (input.contestId !== undefined) updateData.contest_id = input.contestId || null;
  if (input.author !== undefined) updateData.author = input.author ? input.author.trim() : null;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;
  if (input.processingStatus !== undefined) updateData.processing_status = input.processingStatus;

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from("sources")
    .update(updateData as any)
    .eq("id", materialId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar material: ${error.message}`);
  }

  return data;
}

/**
 * Remove um material pertencente ao usuário autenticado.
 */
export async function deleteMaterial(
  client: SupabaseClient<Database>,
  userId: string,
  materialId: string,
): Promise<{ success: boolean; id: string }> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  if (!materialId) {
    throw new Error("ID do material é obrigatório.");
  }

  // Garantir que o material existe e pertence ao usuário
  const existing = await getMaterialById(client, userId, materialId);
  if (!existing) {
    throw new Error("Material não encontrado ou acesso não autorizado.");
  }

  const { error } = await client
    .from("sources")
    .delete()
    .eq("id", materialId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Erro ao excluir material: ${error.message}`);
  }

  return { success: true, id: materialId };
}
