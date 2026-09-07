/**
 * DRIVE SERVER FUNCTIONS — P0.1-B
 *
 * Encapsula as chamadas privilegiadas do Google Drive em Server Functions do TanStack Start.
 *
 * SEGURANÇA:
 *  - Executa exclusivamente no ambiente server-side.
 *  - Valida autenticação via middleware requireSupabaseAuth.
 *  - Protege e isola o módulo connection-service.ts (e node:crypto) para que NUNCA
 *    vazem para o bundle do navegador.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getDriveConnectionStatus,
  initiateDriveConnection,
  disconnectDrive,
  handleDriveOAuthCallback,
  refreshDriveAccessToken,
} from "./connection-service";
import {
  discoverDriveFiles,
  importDriveFileToSources,
  type DriveDiscoveryFilter,
  type DriveDiscoveryItem,
  type DriveDiscoveryResponse,
} from "./discovery-service";
import type { DriveConnectionStatus } from "./types";
import type { MaterialRow } from "../types";

/**
 * Server Function para consultar o status público da conexão do Google Drive.
 */
export const serverGetDriveStatus = createServerFn({
  method: "GET",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriveConnectionStatus> => {
    return getDriveConnectionStatus(context.supabase, context.userId);
  });

/**
 * Server Function para iniciar o fluxo OAuth do Google Drive.
 */
export const serverInitiateDriveOAuth = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator((input: { redirectUri: string }): { redirectUri: string } => {
    if (!input?.redirectUri || typeof input.redirectUri !== "string") {
      throw new Error("redirectUri é obrigatório.");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<{ authUrl: string; stateToken: string }> => {
    return initiateDriveConnection(context.userId, data.redirectUri);
  });

/**
 * Server Function para desconectar a integração do Google Drive.
 */
export const serverDisconnectDrive = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ success: boolean }> => {
    return disconnectDrive(context.supabase, context.userId);
  });

/**
 * Server Function para processar o callback do OAuth do Google Drive.
 */
export const serverHandleDriveOAuthCallback = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      code: string;
      stateToken: string;
      redirectUri?: string;
    }): { code: string; stateToken: string; redirectUri?: string } => {
      if (!input?.code || typeof input.code !== "string") {
        throw new Error("Código OAuth é obrigatório.");
      }
      if (!input?.stateToken || typeof input.stateToken !== "string") {
        throw new Error("stateToken é obrigatório.");
      }
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<DriveConnectionStatus> => {
    return handleDriveOAuthCallback(
      context.supabase,
      context.userId,
      data.code,
      data.stateToken,
      data.redirectUri,
    );
  });

/**
 * Server Function para executar o Discovery de arquivos no Google Drive.
 */
export const serverDiscoverDriveFiles = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator((input: DriveDiscoveryFilter): DriveDiscoveryFilter => input ?? {})
  .handler(async ({ data, context }): Promise<DriveDiscoveryResponse> => {
    try {
      const { accessToken } = await refreshDriveAccessToken(
        context.userId,
        undefined,
        context.supabase,
      );
      return await discoverDriveFiles(accessToken, data);
    } catch (err: any) {
      // Retorna resposta limpa em caso de desconexão ou ausência de credenciais
      return {
        items: [],
        nextPageToken: null,
        totalFound: 0,
      };
    }
  });

/**
 * Server Function para importar um arquivo do Google Drive para a tabela official `sources`.
 */
export const serverImportDriveFile = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      driveItem: DriveDiscoveryItem;
      topicId?: string | null;
      subjectId?: string | null;
      contestId?: string | null;
    }): {
      driveItem: DriveDiscoveryItem;
      topicId?: string | null;
      subjectId?: string | null;
      contestId?: string | null;
    } => {
      if (!input?.driveItem || !input.driveItem.id) {
        throw new Error("driveItem é obrigatório e deve ter id.");
      }
      return input;
    },
  )
  .handler(async ({ data, context }): Promise<MaterialRow> => {
    return importDriveFileToSources(context.supabase, context.userId, data.driveItem, {
      topicId: data.topicId,
      subjectId: data.subjectId,
      contestId: data.contestId,
    });
  });
