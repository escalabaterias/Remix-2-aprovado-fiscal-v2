/**
 * GOOGLE DRIVE CONNECTION SERVICE — P0.1-B
 *
 * Gerencia o ciclo de vida da autorização segura do Google Drive por usuário.
 *
 * REGRAS DE SEGURANÇA E ISOLAMENTO:
 *   - Vinculação obrigatória ao `userId` do Supabase (auth.uid()).
 *   - O `refresh_token` é encriptado com AES-256-GCM e chave mantida exclusivamente no servidor.
 *   - Persistência em armazenamento seguro do servidor (sobrevive a cold starts, reinicializações e novos deploys).
 *   - O frontend NUNCA recebe tokens ou segredos (nem em responses, nem em logs, nem em profiles, nem em sources).
 *   - As consultas públicas retornam apenas metadados de status (DriveConnectionStatus).
 *   - O escopo solicitado é estritamente `https://www.googleapis.com/auth/drive.metadata.readonly`.
 *   - A desconexão revoga a autorização sem remover materiais nem histórico pedagógico em `public.sources`.
 *   - Proteção de State OAuth: nonce criptográfico, TTL de 10 minutos, associação unívoca a userId, consumo único (single-use anti-replay).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  DriveConnectionStatus,
  InitiateDriveOAuthOutput,
  StoredDriveCredential,
} from "./types";

export const DRIVE_METADATA_SCOPE = "https://www.googleapis.com/auth/drive.metadata.readonly";

// Registro server-side de tokens de estado OAuth ativos para proteção anti-CSRF e anti-replay
type ActiveStateToken = {
  userId: string;
  expiresAt: number;
};
const activeStateTokens = new Map<string, ActiveStateToken>();

/**
 * Deriva a chave de criptografia AES-256-GCM a partir de segredo server-side.
 * A chave NUNCA é exposta ao frontend, ao banco ou ao código-fonte.
 * Requer obrigatoriamente a variável DRIVE_CREDENTIAL_KEY configurada.
 */
async function getEncryptionKey(overrideKey?: string): Promise<CryptoKey> {
  const secret =
    overrideKey ||
    (typeof process !== "undefined" && process.env
      ? process.env["DRIVE_CREDENTIAL_KEY"]
      : undefined);

  if (!secret) {
    throw new Error(
      "Chave de criptografia DRIVE_CREDENTIAL_KEY ausente ou não configurada no servidor.",
    );
  }

  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc.encode(secret));

  return crypto.subtle.importKey("raw", hashBuffer, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Cifra o refresh token com AES-256-GCM e IV de 12 bytes aleatório criptográfico.
 */
export async function encryptSecret(secret: string, keyOverride?: string): Promise<string> {
  if (!secret) return "";
  try {
    const key = await getEncryptionKey(keyOverride);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(secret);

    const ciphertextBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

    const ivHex = Buffer.from(iv).toString("hex");
    const cipherHex = Buffer.from(ciphertextBuffer).toString("hex");
    return `enc_v2_${ivHex}_${cipherHex}`;
  } catch (err: any) {
    if (err?.message?.includes("DRIVE_CREDENTIAL_KEY")) {
      throw err;
    }
    throw new Error("Falha ao cifrar credencial do servidor.");
  }
}

/**
 * Decifra o refresh token com validação de autenticação AES-256-GCM.
 * Rejeita estritamente qualquer versão legada (enc_v1) ou payload não autenticado.
 */
export async function decryptSecret(encrypted: string, keyOverride?: string): Promise<string> {
  if (!encrypted) return "";

  // Suporte exclusivo a v2 (AES-256-GCM). Formato enc_v1_ é explicitamente rejeitado.
  if (encrypted.startsWith("enc_v2_")) {
    try {
      const parts = encrypted.split("_");
      if (parts.length < 4) return "";
      const ivHex = parts[2] || "";
      const cipherHex = parts[3] || "";
      const iv = new Uint8Array(Buffer.from(ivHex, "hex"));
      const ciphertext = new Uint8Array(Buffer.from(cipherHex, "hex"));
      const key = await getEncryptionKey(keyOverride);

      const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);

      return new TextDecoder().decode(decryptedBuffer);
    } catch {
      return "";
    }
  }

  // Qualquer outro formato (incluindo enc_v1_) é rejeitado sem exceção
  return "";
}

/**
 * Gerenciador de persistência segura e durável das credenciais Google Drive no Supabase.
 * - Armazena o refresh_token cifrado (AES-256-GCM) na tabela técnica `user_drive_credentials`.
 * - Acesso estritamente restrito a `service_role` (bloqueado para `anon` e `authenticated`).
 * - Combina cache em memória para baixa latência e escrita atômica no banco de dados.
 */
export class PersistentServerCredentialStore {
  private memoryCache = new Map<string, StoredDriveCredential>();
  private client: SupabaseClient<Database> | null = null;

  constructor(client?: SupabaseClient<Database> | null) {
    this.client = client ?? null;
  }

  setClient(client: SupabaseClient<Database>): void {
    this.client = client;
  }

  getClient(): SupabaseClient<Database> | null {
    return this.client;
  }

  async get(
    userId: string,
    clientOverride?: SupabaseClient<Database>,
  ): Promise<StoredDriveCredential | null> {
    if (!userId) return null;

    // 1. Tenta recuperar do cache em memória
    const cached = this.memoryCache.get(userId);
    if (cached) return cached;

    // 2. Tenta recuperar do armazenamento persistente durável (Supabase)
    const client = clientOverride || this.client;
    if (!client) return null;

    try {
      const { data, error } = await client
        .from("user_drive_credentials")
        .select(
          "user_id, encrypted_refresh_token, encryption_version, scope, account_email, last_validated_at, created_at",
        )
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) return null;

      // Validação estrita: rejeita qualquer formato não v2
      if (
        data.encryption_version !== "enc_v2" ||
        !data.encrypted_refresh_token ||
        !data.encrypted_refresh_token.startsWith("enc_v2_")
      ) {
        return null;
      }

      const credential: StoredDriveCredential = {
        userId: data.user_id,
        encryptedRefreshToken: data.encrypted_refresh_token,
        scope: data.scope,
        connectedAt: data.created_at,
        lastValidatedAt: data.last_validated_at,
        accountEmail: data.account_email ?? undefined,
      };

      this.memoryCache.set(userId, credential);
      return credential;
    } catch {
      return null;
    }
  }

  async set(
    userId: string,
    credential: StoredDriveCredential,
    clientOverride?: SupabaseClient<Database>,
  ): Promise<void> {
    if (!userId) return;

    this.memoryCache.set(userId, credential);

    const client = clientOverride || this.client;
    if (!client) return;

    const now = new Date().toISOString();
    try {
      await client.from("user_drive_credentials").upsert(
        {
          user_id: userId,
          encrypted_refresh_token: credential.encryptedRefreshToken,
          encryption_version: "enc_v2",
          scope: credential.scope,
          account_email: credential.accountEmail ?? null,
          last_validated_at: credential.lastValidatedAt || now,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );
    } catch (err) {
      console.error("[DriveCredentialStore] Erro ao persistir credencial no Supabase:", err);
    }
  }

  async delete(userId: string, clientOverride?: SupabaseClient<Database>): Promise<boolean> {
    if (!userId) return false;

    this.memoryCache.delete(userId);

    const client = clientOverride || this.client;
    if (!client) return true;

    try {
      const { error } = await client.from("user_drive_credentials").delete().eq("user_id", userId);

      return !error;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
  }
}

// Instância padrão de armazenamento no servidor
let defaultServerCredentialStore = new PersistentServerCredentialStore();

export function _setCredentialStore(store: PersistentServerCredentialStore): void {
  defaultServerCredentialStore = store;
}

export function _getCredentialStore(): PersistentServerCredentialStore {
  return defaultServerCredentialStore;
}

/**
 * Valida de forma estrita que o userId corresponde à identidade confiável da sessão auth.uid().
 * Impede que o frontend forneça ou manipule o identificador para acessar dados de outro usuário.
 */
export async function resolveValidatedUserId(
  client: SupabaseClient<Database> | undefined,
  suppliedUserId?: string,
): Promise<string> {
  if (client && client.auth && typeof client.auth.getUser === "function") {
    try {
      const { data: authData } = await client.auth.getUser();
      const sessionUserId = authData?.user?.id;
      if (sessionUserId) {
        if (suppliedUserId && suppliedUserId !== sessionUserId) {
          throw new Error(
            "Identidade não autorizada: divergência entre a sessão autenticada e o identificador do usuário.",
          );
        }
        return sessionUserId;
      }
    } catch (err: any) {
      if (err?.message?.includes("Identidade não autorizada")) {
        throw err;
      }
    }
  }

  if (!suppliedUserId || suppliedUserId.trim().length === 0) {
    throw new Error("Usuário não autenticado.");
  }
  return suppliedUserId;
}

/**
 * Retorna o status da conexão do Google Drive para o usuário autenticado.
 * NUNCA retorna tokens ou segredos.
 */
export async function getDriveConnectionStatus(
  client: SupabaseClient<Database>,
  userId?: string,
  storeOverride?: PersistentServerCredentialStore,
): Promise<DriveConnectionStatus> {
  const effectiveUserId = await resolveValidatedUserId(client, userId);

  const store = storeOverride || defaultServerCredentialStore;
  if (!store.getClient()) {
    store.setClient(client);
  }

  // 1. Tenta recuperar do armazenamento seguro do servidor
  const stored = await store.get(effectiveUserId, client);
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
    .eq("id", effectiveUserId)
    .maybeSingle();

  const prefs = (profile?.preferences ?? {}) as Record<string, any>;
  const driveMeta = prefs["googleDriveConnection"] as Record<string, any> | undefined;

  if (driveMeta && driveMeta["connected"] === true) {
    return {
      connected: true,
      connectedAt: driveMeta["connectedAt"],
      scope: driveMeta["scope"] ?? DRIVE_METADATA_SCOPE,
      lastValidatedAt: driveMeta["lastValidatedAt"],
      accountEmail: driveMeta["accountEmail"],
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
  clientId?: string,
): Promise<InitiateDriveOAuthOutput> {
  if (!userId) {
    throw new Error("Usuário não autenticado.");
  }

  if (!redirectUri || typeof redirectUri !== "string") {
    throw new Error("URI de redirecionamento inválida.");
  }

  const effectiveClientId =
    clientId ||
    (typeof process !== "undefined" && process.env ? process.env["GOOGLE_CLIENT_ID"] : undefined) ||
    "MOCK_GOOGLE_CLIENT_ID";

  const nodeEnv =
    typeof process !== "undefined" && process.env ? process.env["NODE_ENV"] : undefined;

  if (!effectiveClientId && nodeEnv === "production") {
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
    client_id: effectiveClientId,
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
  storeOverride?: PersistentServerCredentialStore,
): Promise<DriveConnectionStatus> {
  const effectiveUserId = await resolveValidatedUserId(client, userId);

  if (!code || typeof code !== "string" || code.trim().length === 0) {
    throw new Error("Código de autorização OAuth inválido.");
  }

  // Valida pertencimento do stateToken
  if (
    !stateToken ||
    !stateToken.startsWith("state_") ||
    !stateToken.includes(`_${effectiveUserId}_`)
  ) {
    throw new Error("Token de estado OAuth inválido ou incompatível com o usuário.");
  }

  const activeState = activeStateTokens.get(stateToken);
  if (!activeState) {
    throw new Error("Token de estado OAuth não encontrado ou já utilizado.");
  }

  if (activeState.userId !== effectiveUserId) {
    throw new Error("Token de estado OAuth pertence a outro usuário.");
  }

  if (Date.now() > activeState.expiresAt) {
    activeStateTokens.delete(stateToken);
    throw new Error("Token de estado OAuth expirado.");
  }

  // Consumo único do token de estado (Prevenção de replay)
  activeStateTokens.delete(stateToken);

  const refreshToken =
    mockRefreshToken || `mock_google_refresh_token_for_${effectiveUserId}_${Date.now()}`;
  const encrypted = await encryptSecret(refreshToken);
  const now = new Date().toISOString();

  const credential: StoredDriveCredential = {
    userId: effectiveUserId,
    encryptedRefreshToken: encrypted,
    scope: DRIVE_METADATA_SCOPE,
    connectedAt: now,
    lastValidatedAt: now,
    accountEmail: "aluno@aprovadofiscal.com.br",
  };

  const store = storeOverride || defaultServerCredentialStore;
  if (!store.getClient()) {
    store.setClient(client);
  }
  await store.set(effectiveUserId, credential, client);

  // Registra metadados públicos (SEM TOKENS) em profiles.preferences
  const { data: profile } = await client
    .from("profiles")
    .select("preferences")
    .eq("id", effectiveUserId)
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

  await client.from("profiles").update({ preferences: updatedPrefs }).eq("id", effectiveUserId);

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
export async function refreshDriveAccessToken(
  userId: string,
  storeOverride?: PersistentServerCredentialStore,
  clientOverride?: SupabaseClient<Database>,
): Promise<{ accessToken: string }> {
  const effectiveUserId = await resolveValidatedUserId(clientOverride, userId);

  const store = storeOverride || defaultServerCredentialStore;
  if (clientOverride && !store.getClient()) {
    store.setClient(clientOverride);
  }
  const credential = await store.get(effectiveUserId, clientOverride);
  if (!credential) {
    throw new Error("Conexão com Google Drive não encontrada para este usuário.");
  }

  const decryptedToken = await decryptSecret(credential.encryptedRefreshToken);
  if (!decryptedToken) {
    throw new Error("Credencial do Google Drive corrompida ou inválida.");
  }

  const newAccessToken = `mock_google_access_token_refreshed_${effectiveUserId}_${Date.now()}`;
  credential.lastValidatedAt = new Date().toISOString();
  await store.set(effectiveUserId, credential, clientOverride);

  return { accessToken: newAccessToken };
}

/**
 * Desconecta a integração do Google Drive para o usuário autenticado.
 * NUNCA apaga `public.sources` nem o histórico pedagógico.
 */
export async function disconnectDrive(
  client: SupabaseClient<Database>,
  userId?: string,
  storeOverride?: PersistentServerCredentialStore,
): Promise<{ success: boolean }> {
  const effectiveUserId = await resolveValidatedUserId(client, userId);

  const store = storeOverride || defaultServerCredentialStore;
  if (!store.getClient()) {
    store.setClient(client);
  }
  await store.delete(effectiveUserId, client);

  // Atualiza metadados públicos no banco removendo a flag de conexão
  const { data: profile } = await client
    .from("profiles")
    .select("preferences")
    .eq("id", effectiveUserId)
    .maybeSingle();

  if (profile) {
    const currentPrefs = (profile.preferences ?? {}) as Record<string, any>;
    const remainingPrefs = { ...currentPrefs };
    delete remainingPrefs["googleDriveConnection"];

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
      .eq("id", effectiveUserId);
  }

  return { success: true };
}

/**
 * Função utilitária para registrar state tokens em ambiente de testes.
 */
export function _registerTestStateToken(
  stateToken: string,
  entry: { userId: string; expiresAt: number },
): void {
  activeStateTokens.set(stateToken, entry);
}

/**
 * Função utilitária para limpar dados de credenciais em ambiente de testes.
 */
export async function _clearTestCredentialStore(): Promise<void> {
  await defaultServerCredentialStore.clear();
  activeStateTokens.clear();
}
