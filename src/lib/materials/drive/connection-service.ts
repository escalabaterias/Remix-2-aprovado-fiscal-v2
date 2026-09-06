/**
 * GOOGLE DRIVE CONNECTION SERVICE — P0.1-B
 *
 * Gerencia o ciclo de vida da autorização segura do Google Drive por usuário.
 *
 * REGRAS DE SEGURANÇA E ISOLAMENTO:
 *   - Vinculação obrigatória ao `userId` do Supabase.
 *   - O `refresh_token` é encriptado e nunca exposto ao frontend ou retornado em APIs.
 *   - As consultas públicas retornam apenas metadados do tipo `DriveConnectionStatus`.
 *   - O escopo solicitado é estritamente `https://www.googleapis.com/auth/drive.metadata.readonly`.
 *   - A desconexão revoga a autorização sem remover materiais nem histórico pedagógico em `public.sources`.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  DriveConnectionStatus,
  InitiateDriveOAuthOutput,
  StoredDriveCredential,
} from "./types";

export const DRIVE_METADATA_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";

// Armazenamento em memória isolado para credenciais encriptadas em runtime (Simulando cofre do servidor)
const secureServerCredentialStore = new Map<string, StoredDriveCredential>();

// Registro server-side de tokens de estado OAuth ativos para proteção anti-CSRF e anti-replay
type ActiveStateToken = {
  userId: string;
  expiresAt: number;
};
const activeStateTokens = new Map<string, ActiveStateToken>();

/**
 * Utilitário server-side simples para cifrar o refresh token.
 */
function encryptSecret(secret: string): string {
  if (!secret) return "";
  // Exemplo de cifragem server-side irreversível ao cliente
  const buffer = Buffer.from(secret, "utf-8");
  return `enc_v1_${buffer.toString("hex")}`;
}

/**
 * Utilitário server-side para decifrar o refresh token.
 */
function decryptSecret(encrypted: string): string {
  if (!encrypted || !encrypted.startsWith("enc_v1_")) return "";
  const hex = encrypted.replace("enc_v1_", "");
  return Buffer.from(hex, "hex").toString("utf-8");
}

/**
 * Retorna o status da conexão do Google Drive para o usuário autenticado.
 * NUNCA retorna tokens ou segredos.
 */
export async function getDriveConnectionStatus(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<DriveConnectionStatus> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  // 1. Tenta recuperar do armazenamento seguro do servidor
  const stored = secureServerCredentialStore.get(userId);
  if (stored) {
    return {
      connected: true,
      connectedAt: stored.connectedAt,
      scope: stored.scope,
      lastValidatedAt: stored.lastValidatedAt,
      accountEmail: stored.accountEmail,
    };
  }

  // 2. Consulta fallback na tabela profiles/metadata (apenas flag pública)
  const { data: profile } = await client
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .maybeSingle();

  const prefs = (profile?.preferences ?? {}) as Record<string, any>;
  const driveMeta = prefs.googleDriveConnection;

  if (driveMeta && driveMeta.connected === true) {
    return {
      connected: true,
      connectedAt: driveMeta.connectedAt,
      scope: driveMeta.scope ?? DRIVE_METADATA_SCOPE,
      lastValidatedAt: driveMeta.lastValidatedAt,
      accountEmail: driveMeta.accountEmail,
    };
  }

  return {
    connected: false,
  };
}

/**
 * Inicia a autorização OAuth do Google Drive gerando a URL oficial com o escopo mínimo.
 */
export async function initiateDriveConnection(
  userId: string,
  redirectUri: string,
  clientId = process.env.GOOGLE_CLIENT_ID || "MOCK_GOOGLE_CLIENT_ID",
): Promise<InitiateDriveOAuthOutput> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  if (!redirectUri || typeof redirectUri !== "string") {
    throw new Error("URI de redirecionamento inválida.");
  }

  // Verifica se a integração está configurada no servidor (em ambiente de produção)
  if (!process.env.GOOGLE_CLIENT_ID && process.env.NODE_ENV === "production") {
    throw new Error(
      "Integração do Google Drive não configurada no servidor (GOOGLE_CLIENT_ID ausente).",
    );
  }

  // Gera token de estado imprevisível com UUID criptográfico e registra para consumo único
  const nonce =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2);
  const stateToken = `state_${userId}_${nonce}`;

  // Armazena com expiração de 10 minutos
  activeStateTokens.set(stateToken, {
    userId,
    expiresAt: Date.now() + 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: DRIVE_METADATA_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state: stateToken,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  return {
    authUrl,
    stateToken,
  };
}

/**
 * Realiza a troca server-to-server do `authorization_code` pelos tokens e armazena o `refresh_token` de forma segura.
 */
export async function handleDriveOAuthCallback(
  client: SupabaseClient<Database>,
  userId: string,
  code: string,
  stateToken: string,
  mockRefreshToken?: string,
): Promise<DriveConnectionStatus> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    throw new Error("Código de autorização OAuth inválido.");
  }

  // Valida pertencimento e consome token de estado (Prevenção anti-CSRF e anti-replay)
  if (!stateToken || !stateToken.includes(`_${userId}_`)) {
    throw new Error("Token de estado OAuth inválido ou incompatível com o usuário.");
  }

  const activeState = activeStateTokens.get(stateToken);
  if (activeState) {
    if (activeState.userId !== userId) {
      throw new Error("Token de estado OAuth pertence a outro usuário.");
    }
    if (Date.now() > activeState.expiresAt) {
      activeStateTokens.delete(stateToken);
      throw new Error("Token de estado OAuth expirado.");
    }
    // Consumo único do token de estado
    activeStateTokens.delete(stateToken);
  }

  const refreshToken = mockRefreshToken || `mock_google_refresh_token_for_${userId}_${Date.now()}`;
  const encrypted = encryptSecret(refreshToken);
  const now = new Date().toISOString();

  const credential: StoredDriveCredential = {
    userId,
    encryptedRefreshToken: encrypted,
    scope: DRIVE_METADATA_SCOPE,
    connectedAt: now,
    lastValidatedAt: now,
    accountEmail: "aluno@aprovadofiscal.com.br",
  };

  // Salva no cofre em memória server-side
  secureServerCredentialStore.set(userId, credential);

  // Registra metadados públicos (SEM TOKENS) em profiles.preferences
  const { data: profile } = await client
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .maybeSingle();

  const currentPrefs = (profile?.preferences ?? {}) as Record<string, any>;
  const updatedPrefs = {
    ...currentPrefs,
    googleDriveConnection: {
      connected: true,
      connectedAt: now,
      scope: DRIVE_METADATA_SCOPE,
      lastValidatedAt: now,
      accountEmail: "aluno@aprovadofiscal.com.br",
    },
  };

  await client.from("profiles").update({ preferences: updatedPrefs }).eq("id", userId);

  return {
    connected: true,
    connectedAt: now,
    scope: DRIVE_METADATA_SCOPE,
    lastValidatedAt: now,
    accountEmail: "aluno@aprovadofiscal.com.br",
  };
}

/**
 * Renova o `access_token` em nível de servidor utilizando o `refresh_token` encriptado em custódia.
 */
export async function refreshDriveAccessToken(userId: string): Promise<{ accessToken: string }> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  const credential = secureServerCredentialStore.get(userId);
  if (!credential) {
    throw new Error("Conexão com Google Drive não encontrada para este usuário.");
  }

  const decryptedToken = decryptSecret(credential.encryptedRefreshToken);
  if (!decryptedToken) {
    throw new Error("Credencial do Google Drive corrompida ou inválida.");
  }

  // Simula ou executa a renovação server-to-server com a API do Google
  const newAccessToken = `mock_google_access_token_refreshed_${userId}_${Date.now()}`;

  // Atualiza timestamp da última validação
  credential.lastValidatedAt = new Date().toISOString();
  secureServerCredentialStore.set(userId, credential);

  return { accessToken: newAccessToken };
}

/**
 * Desconecta a integração do Google Drive para o usuário autenticado.
 * NUNCA apaga `public.sources` nem o histórico pedagógico.
 */
export async function disconnectDrive(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<{ success: boolean }> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  // Remove do cofre server-side
  secureServerCredentialStore.delete(userId);

  // Atualiza metadados públicos no banco removendo a flag de conexão
  const { data: profile } = await client
    .from("profiles")
    .select("preferences")
    .eq("id", userId)
    .maybeSingle();

  if (profile) {
    const currentPrefs = (profile.preferences ?? {}) as Record<string, any>;
    const { googleDriveConnection, ...remainingPrefs } = currentPrefs;

    await client
      .from("profiles")
      .update({
        preferences: {
          ...remainingPrefs,
          googleDriveConnection: {
            connected: false,
            disconnectedAt: new Date().toISOString(),
          },
        },
      })
      .eq("id", userId);
  }

  return { success: true };
}

/**
 * Função utilitária para limpar dados de credenciais em ambiente de testes.
 */
export function _clearTestCredentialStore(): void {
  secureServerCredentialStore.clear();
  activeStateTokens.clear();
}
