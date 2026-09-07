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
} from "./connection-service";
import type { DriveConnectionStatus } from "./types";

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
    (input: { code: string; stateToken: string }): { code: string; stateToken: string } => {
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
    return handleDriveOAuthCallback(context.supabase, context.userId, data.code, data.stateToken);
  });
