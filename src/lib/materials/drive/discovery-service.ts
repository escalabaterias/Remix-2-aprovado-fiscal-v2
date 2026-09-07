/**
 * DRIVE DISCOVERY SERVICE — P0.2-B (CORRECTED)
 *
 * Serviço responsável por consultar, listar e estruturar arquivos do Google Drive
 * acessíveis pela conta autenticada, contemplando:
 *   - Meu Drive (arquivos e subpastas de propriedade do usuário)
 *   - Compartilhados comigo (arquivos e pastas compartilhadas diretamente ou via subpastas)
 *   - Shared Drives (Drives compartilhados de equipe/institucionais com corpora e driveId)
 *   - Atalhos (Google Drive shortcuts com resolução do targetFileId real)
 *
 * REGRAS ARQUITETÔNICAS:
 *   - Preserva `public.sources` como entidade oficial e única de materiais.
 *   - NÃO cria tabelas paralelas ou duplicadas.
 *   - Respeita deduplicação lógica por `user_id + targetFileId` em `public.sources`.
 *   - NÃO utiliza mocks em produção ou tokens fictícios.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createMaterial, getUserMaterials, updateMaterial } from "../service";
import type { MaterialRow, SourceType } from "../types";

export type DriveLocation = "all" | "my_drive" | "shared_with_me" | "shared_drive" | "shortcut";

export interface DriveDiscoveryItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string | null;
  iconLink?: string | null;
  thumbnailLink?: string | null;
  modifiedTime?: string | null;
  size?: number | null;
  location: DriveLocation;
  shared: boolean;
  owners?: string[];
  parents?: string[];
  driveId?: string | null;
  shortcutTargetId?: string | null;
  shortcutTargetMimeType?: string | null;
}

export interface DriveDiscoveryFilter {
  location?: DriveLocation;
  query?: string;
  pageSize?: number;
  pageToken?: string;
  mimeTypeFilter?: "all" | "pdf" | "folder" | "document";
  driveId?: string;
}

export interface DriveDiscoveryResponse {
  items: DriveDiscoveryItem[];
  nextPageToken?: string | null;
  totalFound: number;
  incompleteSearch?: boolean;
}

export interface SharedDriveItem {
  id: string;
  name: string;
}

/**
 * Converte MimeType do Google Drive para o enum SourceType nativo do Supabase.
 */
export function mapMimeTypeToSourceType(mimeType: string): SourceType {
  if (!mimeType) return "outro";

  const lower = mimeType.toLowerCase();
  if (lower.includes("pdf")) return "pdf";
  if (lower.includes("video")) return "video";
  if (lower.includes("audio")) return "outro";
  if (lower.includes("presentation") || lower.includes("powerpoint") || lower.includes("slide"))
    return "documento";
  if (lower.includes("spreadsheet") || lower.includes("excel") || lower.includes("csv"))
    return "documento";
  if (lower.includes("document") || lower.includes("word") || lower.includes("text/plain"))
    return "documento";
  if (lower.includes("folder")) return "outro";

  return "pdf";
}

/**
 * Constrói a consulta 'q' apropriada para a API v3 do Google Drive.
 */
export function buildDriveApiQuery(filter?: DriveDiscoveryFilter): string {
  const clauses: string[] = ["trashed = false"];

  const location = filter?.location || "all";

  if (location === "my_drive") {
    // Permite buscar arquivos na raiz e em subpastas pertencentes ao usuário no Meu Drive
    clauses.push("('me' in owners or 'root' in parents) and sharedWithMe = false");
  } else if (location === "shared_with_me") {
    clauses.push("sharedWithMe = true");
  } else if (location === "shortcut") {
    clauses.push("mimeType = 'application/vnd.google-apps.shortcut'");
  }

  if (filter?.mimeTypeFilter && filter.mimeTypeFilter !== "all") {
    if (filter.mimeTypeFilter === "pdf") {
      clauses.push("mimeType = 'application/pdf'");
    } else if (filter.mimeTypeFilter === "folder") {
      clauses.push("mimeType = 'application/vnd.google-apps.folder'");
    } else if (filter.mimeTypeFilter === "document") {
      clauses.push(
        "(mimeType contains 'document' or mimeType contains 'spreadsheet' or mimeType contains 'presentation')",
      );
    }
  }

  if (filter?.query && filter.query.trim().length > 0) {
    const sanitizedQuery = filter.query.trim().replace(/'/g, "\\'");
    clauses.push(`name contains '${sanitizedQuery}'`);
  }

  return clauses.join(" and ");
}

/**
 * Lista os Shared Drives acessíveis pela conta.
 */
export async function listSharedDrives(accessToken: string): Promise<SharedDriveItem[]> {
  if (!accessToken) return [];

  const url = new URL("https://www.googleapis.com/drive/v3/drives");
  url.searchParams.set("pageSize", "100");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.drives || []).map((d: any) => ({ id: d.id, name: d.name }));
  } catch {
    return [];
  }
}

/**
 * Executa a requisição real à API do Google Drive v3 com suporte a Meu Drive,
 * Compartilhados Comigo, Subpastas, Shared Drives e Atalhos.
 */
export async function discoverDriveFiles(
  accessToken: string,
  filter?: DriveDiscoveryFilter,
): Promise<DriveDiscoveryResponse> {
  if (!accessToken) {
    throw new Error("Access token do Google Drive não fornecido.");
  }

  const queryStr = buildDriveApiQuery(filter);
  const pageSize = filter?.pageSize || 30;

  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", queryStr);
  url.searchParams.set("pageSize", pageSize.toString());
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");

  // Estratégia refinada de corpora de acordo com o escopo solicitado
  if (filter?.driveId) {
    url.searchParams.set("corpora", "drive");
    url.searchParams.set("driveId", filter.driveId);
  } else if (filter?.location === "shared_drive" || filter?.location === "all") {
    url.searchParams.set("corpora", "allDrives");
  } else {
    url.searchParams.set("corpora", "user");
  }

  url.searchParams.set(
    "fields",
    "incompleteSearch, nextPageToken, files(id, name, mimeType, webViewLink, iconLink, thumbnailLink, modifiedTime, size, shared, owners, parents, driveId, shortcutDetails)",
  );

  if (filter?.pageToken) {
    url.searchParams.set("pageToken", filter.pageToken);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro na API do Google Drive (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawFiles = data.files || [];

  const items: DriveDiscoveryItem[] = rawFiles.map((file: any) => {
    let loc: DriveLocation = "my_drive";
    if (file.mimeType === "application/vnd.google-apps.shortcut") {
      loc = "shortcut";
    } else if (file.driveId) {
      loc = "shared_drive";
    } else if (file.shared) {
      loc = "shared_with_me";
    }

    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      webViewLink: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      iconLink: file.iconLink || null,
      thumbnailLink: file.thumbnailLink || null,
      modifiedTime: file.modifiedTime || null,
      size: file.size ? parseInt(file.size, 10) : null,
      location: loc,
      shared: !!file.shared,
      owners: file.owners?.map((o: any) => o.displayName || o.emailAddress) || [],
      parents: file.parents || [],
      driveId: file.driveId || null,
      shortcutTargetId: file.shortcutDetails?.targetId || null,
      shortcutTargetMimeType: file.shortcutDetails?.targetMimeType || null,
    };
  });

  return {
    items,
    nextPageToken: data.nextPageToken || null,
    totalFound: items.length,
    incompleteSearch: !!data.incompleteSearch,
  };
}

/**
 * Importa um item descoberto no Google Drive para a tabela oficial `public.sources`.
 * Para atalhos, resolve o targetFileId real do material alvo e aplica deduplicação lógica.
 */
export async function importDriveFileToSources(
  client: SupabaseClient<Database>,
  userId: string,
  driveItem: DriveDiscoveryItem,
  options?: {
    topicId?: string | null;
    subjectId?: string | null;
    contestId?: string | null;
  },
): Promise<MaterialRow> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }
  if (!driveItem || !driveItem.id) {
    throw new Error("Item do Google Drive inválido.");
  }

  // Resoluçao de atalhos para o material real alvo
  const isShortcut = driveItem.mimeType === "application/vnd.google-apps.shortcut";
  const targetFileId =
    isShortcut && driveItem.shortcutTargetId ? driveItem.shortcutTargetId : driveItem.id;
  const effectiveMimeType =
    isShortcut && driveItem.shortcutTargetMimeType
      ? driveItem.shortcutTargetMimeType
      : driveItem.mimeType;

  if (isShortcut && !driveItem.shortcutTargetId) {
    throw new Error("O atalho fornecido não possui um arquivo alvo acessível.");
  }

  // 1. Verifica se o material de destino (por targetFileId) já existe no banco do usuário
  const existingMaterials = await getUserMaterials(client, userId);
  const existing = existingMaterials.find((m) => {
    const meta = (m.metadata as Record<string, any>) || {};
    return (
      meta.provider === "google_drive" &&
      (meta.driveFileId === targetFileId || meta.shortcutTargetId === targetFileId)
    );
  });

  const sourceType = mapMimeTypeToSourceType(effectiveMimeType);
  const webViewLink = `https://drive.google.com/file/d/${targetFileId}/view`;

  const metadataPayload = {
    provider: "google_drive",
    driveFileId: targetFileId,
    shortcutId: isShortcut ? driveItem.id : null,
    shortcutTargetId: driveItem.shortcutTargetId || null,
    mimeType: effectiveMimeType,
    webViewLink,
    driveLocation: driveItem.location,
    shared: driveItem.shared,
    size: driveItem.size,
    modifiedTime: driveItem.modifiedTime,
    owners: driveItem.owners,
    parents: driveItem.parents,
    driveId: driveItem.driveId,
    importedAt: new Date().toISOString(),
  };

  if (existing) {
    // Atualiza metadados e localização mantendo identidade do material
    return updateMaterial(client, userId, existing.id, {
      title: driveItem.name,
      url: webViewLink,
      topicId: options?.topicId || existing.topic_id,
      subjectId: options?.subjectId || existing.subject_id,
      contestId: options?.contestId || existing.contest_id,
      metadata: metadataPayload,
    });
  }

  // 2. Insere novo registro na tabela oficial public.sources
  return createMaterial(client, userId, {
    title: driveItem.name,
    type: sourceType,
    url: webViewLink,
    origin: "google_drive",
    topicId: options?.topicId || null,
    subjectId: options?.subjectId || null,
    contestId: options?.contestId || null,
    metadata: metadataPayload,
  });
}
