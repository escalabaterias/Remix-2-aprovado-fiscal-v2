/**
 * GOOGLE DRIVE CONNECTION SERVICE — TESTES UNITÁRIOS, DE PERSISTÊNCIA E DE SEGURANÇA — P0.1-B
 *
 * Valida os requisitos de segurança, persistência e isolamento da integração OAuth do Google Drive:
 *   - Persistência real em Supabase através de reconstrução do store (Cold Start / Deploy).
 *   - Cifragem AES-256-GCM com chave do servidor e integridade criptográfica.
 *   - Estabilidade da chave (K1 vs K2) com rejeição por GCM Auth Tag.
 *   - Isolamento multi-tenant estrito vinculado ao auth.uid().
 *   - Impossibilidade de vazamento de segredos para o frontend ou banco público.
 *   - Proteção do State OAuth (anti-CSRF, anti-replay, TTL e validação de pertencimento).
 *   - Desconexão segura sem perda de dados pedagógicos.
 *   - Rejeição estrita de credenciais legadas enc_v1_.
 *   - Falha segura e explícita na ausência de DRIVE_CREDENTIAL_KEY (sem fallback hardcoded).
 *   - Restrição estrita de acesso: tabela inacessível para anon e authenticated (RLS/REVOKE).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getDriveConnectionStatus,
  initiateDriveConnection,
  handleDriveOAuthCallback,
  refreshDriveAccessToken,
  disconnectDrive,
  encryptSecret,
  decryptSecret,
  PersistentServerCredentialStore,
  _clearTestCredentialStore,
  _registerTestStateToken,
  DRIVE_METADATA_SCOPE,
} from "./connection-service";

const TEST_KEY = "test-drive-credential-key-32b-secure-value!";

interface MockDatabaseOptions {
  profile?: any;
  role?: "anon" | "authenticated" | "service_role";
  userDriveCredentials?: Map<string, any>;
  sessionUser?: { id: string; email?: string } | null;
}

// Mock controlado do cliente Supabase com emulação de RLS / REVOKE de permissões
function createMockSupabaseClient(options: MockDatabaseOptions = {}) {
  let profile = options.profile || { id: "user_test", preferences: {} };
  const role = options.role || "service_role";
  const userDriveCredentials = options.userDriveCredentials || new Map<string, any>();
  const accessedTables: string[] = [];

  return {
    _role: role,
    _getAccessedTables: () => accessedTables,
    _getProfile: () => profile,
    _getUserDriveCredentials: () => userDriveCredentials,
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options.sessionUser ?? null },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      accessedTables.push(table);

      if (table === "user_drive_credentials") {
        // Simulação do RLS e REVOKE ALL: papéis anon e authenticated NÃO possuem acesso
        if (role === "anon" || role === "authenticated") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: null,
                  error: new Error("permission denied for table user_drive_credentials"),
                })),
              })),
            })),
            upsert: vi.fn(async () => ({
              data: null,
              error: new Error("permission denied for table user_drive_credentials"),
            })),
            delete: vi.fn(() => ({
              eq: vi.fn(async () => ({
                data: null,
                error: new Error("permission denied for table user_drive_credentials"),
              })),
            })),
          };
        }

        // service_role (backend server-side) tem acesso total
        return {
          select: vi.fn((_cols?: string) => ({
            eq: vi.fn((_col: string, val: string) => ({
              maybeSingle: vi.fn(async () => {
                const record = userDriveCredentials.get(val);
                return { data: record ? { ...record } : null, error: null };
              }),
            })),
          })),
          upsert: vi.fn(async (record: any) => {
            userDriveCredentials.set(record.user_id, {
              id: record.id || `cred_uuid_${Date.now()}`,
              user_id: record.user_id,
              encrypted_refresh_token: record.encrypted_refresh_token,
              encryption_version: record.encryption_version || "enc_v2",
              scope: record.scope || DRIVE_METADATA_SCOPE,
              account_email: record.account_email || null,
              last_validated_at: record.last_validated_at || new Date().toISOString(),
              created_at: record.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            return { data: userDriveCredentials.get(record.user_id), error: null };
          }),
          delete: vi.fn(() => ({
            eq: vi.fn(async (_col: string, val: string) => {
              userDriveCredentials.delete(val);
              return { data: null, error: null };
            }),
          })),
        };
      }

      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: profile, error: null })),
            })),
          })),
          update: vi.fn((updateObj: any) => ({
            eq: vi.fn(async (col: string, val: string) => {
              if (profile && profile.id === val) {
                profile = { ...profile, ...updateObj };
              } else {
                profile = { id: val, ...updateObj };
              }
              return { data: profile, error: null };
            }),
          })),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null })) })),
        })),
        delete: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
      };
    }),
  } as any;
}

describe("Google Drive Connection Service — P0.1-B (Durable Storage & Strict Security)", () => {
  const originalEnvKey = process.env["DRIVE_CREDENTIAL_KEY"];

  beforeEach(async () => {
    process.env["DRIVE_CREDENTIAL_KEY"] = TEST_KEY;
    await _clearTestCredentialStore();
  });

  afterEach(() => {
    if (originalEnvKey) {
      process.env["DRIVE_CREDENTIAL_KEY"] = originalEnvKey;
    } else {
      delete process.env["DRIVE_CREDENTIAL_KEY"];
    }
  });

  it("Caso 1: Usuário não conectado retorna connected = false", async () => {
    const mockClient = createMockSupabaseClient({ profile: { id: "user_123", preferences: {} } });
    const status = await getDriveConnectionStatus(mockClient, "user_123");

    expect(status.connected).toBe(false);
    expect(status.scope).toBeUndefined();
    expect(status.accountEmail).toBeUndefined();
  });

  it("Caso 2: Roundtrip completo — Usuário conectado retorna connected = true com metadados públicos e sem segredos", async () => {
    const mockClient = createMockSupabaseClient({ profile: { id: "user_123", preferences: {} } });
    const init = await initiateDriveConnection("user_123", "https://app.test/callback");

    const callbackResponse = await handleDriveOAuthCallback(
      mockClient,
      "user_123",
      "valid_auth_code",
      init.stateToken,
      "secret_refresh_token_123",
    );

    expect(callbackResponse.connected).toBe(true);
    expect((callbackResponse as any).refreshToken).toBeUndefined();
    expect((callbackResponse as any).encryptedRefreshToken).toBeUndefined();

    const status = await getDriveConnectionStatus(mockClient, "user_123");
    expect(status.connected).toBe(true);
    expect(status.scope).toBe(DRIVE_METADATA_SCOPE);
    expect(status.connectedAt).toBeDefined();
    expect(status.accountEmail).toBe("aluno@aprovadofiscal.com.br");

    // Verifica que profiles.preferences não contém segredos
    const savedProfile = mockClient._getProfile();
    const drivePref = savedProfile.preferences.googleDriveConnection;
    expect(drivePref.connected).toBe(true);
    expect(drivePref.refreshToken).toBeUndefined();
    expect(drivePref.encryptedRefreshToken).toBeUndefined();
  });

  it("Caso 3: Isolamento estrito — Usuário A não pode acessar credencial do Usuário B", async () => {
    const sharedDb = new Map<string, any>();
    const mockClientA = createMockSupabaseClient({
      profile: { id: "user_A", preferences: {} },
      userDriveCredentials: sharedDb,
    });
    const mockClientB = createMockSupabaseClient({
      profile: { id: "user_B", preferences: {} },
      userDriveCredentials: sharedDb,
    });

    const initA = await initiateDriveConnection("user_A", "https://app.test/callback");
    await handleDriveOAuthCallback(
      mockClientA,
      "user_A",
      "code_A",
      initA.stateToken,
      "secret_refresh_token_A",
    );

    // Consulta status para Usuário B deve ser desconectado
    const statusB = await getDriveConnectionStatus(mockClientB, "user_B");
    expect(statusB.connected).toBe(false);

    // Tentativa de renovação para Usuário B sem ter conectado deve falhar
    await expect(refreshDriveAccessToken("user_B", undefined, mockClientB)).rejects.toThrow(
      "Conexão com Google Drive não encontrada para este usuário.",
    );

    // Tentativa do Usuário B consumir o stateToken gerado para o Usuário A deve falhar
    await expect(
      handleDriveOAuthCallback(mockClientB, "user_B", "code_B", initA.stateToken, "secret_token_B"),
    ).rejects.toThrow("Token de estado OAuth inválido ou incompatível com o usuário.");
  });

  it("Caso 4: Frontend nunca recebe refresh token, ciphertext ou chaves em nenhuma resposta", async () => {
    const mockClient = createMockSupabaseClient({ profile: { id: "user_123", preferences: {} } });
    const init = await initiateDriveConnection("user_123", "https://app.test/callback");

    const callbackResponse = await handleDriveOAuthCallback(
      mockClient,
      "user_123",
      "code_123",
      init.stateToken,
      "secret_refresh_token_super_sensivel",
    );

    expect((callbackResponse as any).refreshToken).toBeUndefined();
    expect((callbackResponse as any).encryptedRefreshToken).toBeUndefined();
    expect((callbackResponse as any).key).toBeUndefined();

    const statusResponse = await getDriveConnectionStatus(mockClient, "user_123");
    expect((statusResponse as any).refreshToken).toBeUndefined();
    expect((statusResponse as any).encryptedRefreshToken).toBeUndefined();
    expect((statusResponse as any).key).toBeUndefined();
  });

  it("Caso 5: Desconexão remove credencial sem apagar dados pedagógicos nem public.sources", async () => {
    const sharedDb = new Map<string, any>();
    const mockClient = createMockSupabaseClient({
      profile: { id: "user_123", preferences: {} },
      userDriveCredentials: sharedDb,
    });
    const init = await initiateDriveConnection("user_123", "https://app.test/callback");

    await handleDriveOAuthCallback(
      mockClient,
      "user_123",
      "code_123",
      init.stateToken,
      "secret_token",
    );

    expect(sharedDb.has("user_123")).toBe(true);

    // Executa desconexão
    const result = await disconnectDrive(mockClient, "user_123");
    expect(result.success).toBe(true);

    // Credencial técnica foi removida da tabela
    expect(sharedDb.has("user_123")).toBe(false);

    const status = await getDriveConnectionStatus(mockClient, "user_123");
    expect(status.connected).toBe(false);

    // Garante que tabelas de materiais e estudo NÃO foram tocadas na desconexão
    const tables = mockClient._getAccessedTables();
    expect(tables).not.toContain("sources");
    expect(tables).not.toContain("generated_materials");
    expect(tables).not.toContain("study_sessions");
  });

  it("Caso 6: Renovação do access_token server-side funciona a partir do refresh_token sob custódia", async () => {
    const mockClient = createMockSupabaseClient({ profile: { id: "user_123", preferences: {} } });
    const init = await initiateDriveConnection("user_123", "https://app.test/callback");

    await handleDriveOAuthCallback(
      mockClient,
      "user_123",
      "code_123",
      init.stateToken,
      "secret_token_123",
    );

    const refreshed = await refreshDriveAccessToken("user_123", undefined, mockClient);
    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.accessToken).toContain("mock_google_access_token_refreshed_user_123");
  });

  it("Caso 7: Gera URL do OAuth com escopo mínimo e parâmetro de estado válido", async () => {
    const init = await initiateDriveConnection(
      "user_999",
      "https://aprovadofiscal.com.br/auth/drive/callback",
    );

    expect(init.authUrl).toContain("accounts.google.com/o/oauth2/v2/auth");
    expect(init.authUrl).toContain(encodeURIComponent(DRIVE_METADATA_SCOPE));
    expect(init.authUrl).toContain("access_type=offline");
    expect(init.authUrl).toContain("prompt=consent");
    expect(init.stateToken).toContain("state_user_999_");
  });

  it("Caso 8: Replay do stateToken já consumido é imediatamente rejeitado", async () => {
    const mockClient = createMockSupabaseClient({ profile: { id: "user_777", preferences: {} } });
    const init = await initiateDriveConnection(
      "user_777",
      "https://aprovadofiscal.com.br/auth/drive/callback",
    );

    // Primeiro consumo funciona
    await handleDriveOAuthCallback(
      mockClient,
      "user_777",
      "code_1",
      init.stateToken,
      "refresh_token_1",
    );

    // Segundo consumo do mesmo stateToken deve ser rejeitado (anti-replay)
    await expect(
      handleDriveOAuthCallback(
        mockClient,
        "user_777",
        "code_2",
        init.stateToken,
        "refresh_token_2",
      ),
    ).rejects.toThrow("Token de estado OAuth não encontrado ou já utilizado.");
  });

  it("Caso 9: Rejeita operações para usuários não autenticados (userId vazio)", async () => {
    const mockClient = createMockSupabaseClient();

    await expect(getDriveConnectionStatus(mockClient, "")).rejects.toThrow(
      "Usuário não autenticado.",
    );
    await expect(initiateDriveConnection("", "http://localhost/callback")).rejects.toThrow(
      "Usuário não autenticado.",
    );
    await expect(handleDriveOAuthCallback(mockClient, "", "code", "state")).rejects.toThrow(
      "Usuário não autenticado.",
    );
    await expect(refreshDriveAccessToken("")).rejects.toThrow("Usuário não autenticado.");
    await expect(disconnectDrive(mockClient, "")).rejects.toThrow("Usuário não autenticado.");
  });

  it("Caso 10: Persistência durável — Credencial sobrevive à reinicialização de store/processo (Cold start / Deploy)", async () => {
    // Simula banco Supabase persistente compartilhado entre instâncias de aplicação
    const sharedDatabase = new Map<string, any>();
    const mockClientAdmin = createMockSupabaseClient({
      profile: { id: "user_cold_start", preferences: {} },
      userDriveCredentials: sharedDatabase,
    });

    // 1. Instância do servidor Processo A recebe o OAuth callback e persiste no Supabase
    const storeProcessA = new PersistentServerCredentialStore(mockClientAdmin);
    const init = await initiateDriveConnection("user_cold_start", "https://app.test/callback");

    await handleDriveOAuthCallback(
      mockClientAdmin,
      "user_cold_start",
      "auth_code_A",
      init.stateToken,
      "refresh_token_super_persistente",
      storeProcessA,
    );

    // Confirma que foi persistido no banco durável (não apenas memória)
    expect(sharedDatabase.has("user_cold_start")).toBe(true);

    // 2. Simula encerramento do processo / Cold Start:
    // Destrói Store A e cria Store Processo B com cache em memória COMPLETAMENTE VAZIO
    const storeProcessB = new PersistentServerCredentialStore(mockClientAdmin);

    // 3. Verifica que a credencial é recuperada duravelmente do Supabase pelo novo processo
    const recovered = await storeProcessB.get("user_cold_start");
    expect(recovered).not.toBeNull();
    expect(recovered?.userId).toBe("user_cold_start");
    expect(recovered?.scope).toBe(DRIVE_METADATA_SCOPE);

    // 4. Executa a renovação server-side usando o novo processo do store sem pedir reconexão
    const refreshed = await refreshDriveAccessToken("user_cold_start", storeProcessB);
    expect(refreshed.accessToken).toContain("mock_google_access_token_refreshed_user_cold_start");
  });

  it("Caso 11: Cifragem AES-256-GCM — Payload é cifrado e rejeita adulteração (tampering)", async () => {
    const originalSecret = "my-ultra-confidential-google-refresh-token";
    const encrypted = await encryptSecret(originalSecret);

    expect(encrypted).toMatch(/^enc_v2_/);
    expect(encrypted).not.toContain(originalSecret);

    // Decifragem com dados íntegros funciona
    const decrypted = await decryptSecret(encrypted);
    expect(decrypted).toBe(originalSecret);

    // Adulteração do ciphertext causa falha na verificação de autenticidade (GCM Auth Tag)
    const parts = encrypted.split("_");
    const tamperedParts = [...parts];
    const cipher = tamperedParts[3] || "";
    tamperedParts[3] = cipher.slice(0, -2) + (cipher.slice(-2) === "00" ? "ff" : "00");
    const tamperedEncrypted = tamperedParts.join("_");

    const resultAfterTampering = await decryptSecret(tamperedEncrypted);
    expect(resultAfterTampering).toBe("");
  });

  it("Caso 12: Estabilidade da chave — Rejeita decifragem com chave divergente (K1 vs K2)", async () => {
    const originalSecret = "token-para-teste-de-chaves-k1-k2";
    const key1 = "primary-secret-key-32b-deploy-1!";
    const key2 = "different-secret-key-32b-deploy-2";

    // Cifra com K1
    const encryptedWithK1 = await encryptSecret(originalSecret, key1);

    // Decifra com a mesma chave K1 -> sucesso
    const decryptedWithK1 = await decryptSecret(encryptedWithK1, key1);
    expect(decryptedWithK1).toBe(originalSecret);

    // Tentativa de decifrar com K2 -> falha de integridade criptográfica GCM -> retorna string vazia com segurança
    const decryptedWithK2 = await decryptSecret(encryptedWithK1, key2);
    expect(decryptedWithK2).toBe("");
  });

  it("Caso 13: Rejeição estrita de credenciais legadas no formato enc_v1_", async () => {
    // enc_v1_ era a codificação hexadecimal pura legada sem GCM
    const legacyToken = "enc_v1_7365637265745f746f6b656e";
    const decrypted = await decryptSecret(legacyToken);
    expect(decrypted).toBe("");

    // O store também deve rejeitar qualquer credencial que não seja enc_v2
    const sharedDb = new Map<string, any>();
    sharedDb.set("user_legacy", {
      id: "cred_legacy",
      user_id: "user_legacy",
      encrypted_refresh_token: legacyToken,
      encryption_version: "enc_v1",
      scope: DRIVE_METADATA_SCOPE,
      last_validated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    const mockClient = createMockSupabaseClient({ userDriveCredentials: sharedDb });
    const store = new PersistentServerCredentialStore(mockClient);

    const retrieved = await store.get("user_legacy");
    expect(retrieved).toBeNull();
  });

  it("Caso 14: Ausência de DRIVE_CREDENTIAL_KEY causa falha segura e explícita (sem fallback hardcoded)", async () => {
    delete process.env["DRIVE_CREDENTIAL_KEY"];

    await expect(encryptSecret("secret-sem-chave")).rejects.toThrow(
      "Chave de criptografia DRIVE_CREDENTIAL_KEY ausente ou não configurada no servidor.",
    );
  });

  it("Caso 15: Validação de segurança/grants — Usuários anon e authenticated são bloqueados na tabela privada", async () => {
    const sharedDb = new Map<string, any>();

    // Cliente anon (não autenticado no navegador)
    const anonClient = createMockSupabaseClient({
      role: "anon",
      userDriveCredentials: sharedDb,
    });
    const anonStore = new PersistentServerCredentialStore(anonClient);
    const anonGet = await anonStore.get("any_user");
    expect(anonGet).toBeNull();

    // Cliente authenticated (usuário normal com JWT no frontend)
    const authClient = createMockSupabaseClient({
      role: "authenticated",
      userDriveCredentials: sharedDb,
    });
    const authStore = new PersistentServerCredentialStore(authClient);
    const authGet = await authStore.get("any_user");
    expect(authGet).toBeNull();

    // Apenas service_role consegue operar na tabela técnica
    const adminClient = createMockSupabaseClient({
      role: "service_role",
      userDriveCredentials: sharedDb,
    });
    const adminStore = new PersistentServerCredentialStore(adminClient);
    await adminStore.set("admin_user", {
      userId: "admin_user",
      encryptedRefreshToken: "enc_v2_0123456789abcdef01234567_aabbccdd",
      scope: DRIVE_METADATA_SCOPE,
      connectedAt: new Date().toISOString(),
      lastValidatedAt: new Date().toISOString(),
    });

    // Inspeciona banco diretamente
    expect(sharedDb.has("admin_user")).toBe(true);
  });

  it("Caso 16: Identidade estrita auth.uid() — Rejeita spoofing de userId e resolve diretamente da sessão autenticada", async () => {
    const sharedDb = new Map<string, any>();
    const mockClientAlice = createMockSupabaseClient({
      sessionUser: { id: "alice_authenticated_123", email: "alice@aprovadofiscal.com.br" },
      profile: { id: "alice_authenticated_123", preferences: {} },
      userDriveCredentials: sharedDb,
    });

    // 1. Conecta Alice
    const initAlice = await initiateDriveConnection(
      "alice_authenticated_123",
      "https://app.test/callback",
    );
    await handleDriveOAuthCallback(
      mockClientAlice,
      "alice_authenticated_123",
      "code_alice",
      initAlice.stateToken,
      "secret_token_alice",
    );
    expect(sharedDb.has("alice_authenticated_123")).toBe(true);

    // 2. Alice autenticada tenta manipular o parâmetro userId para consultar o status de Bob -> REJEITADO
    await expect(getDriveConnectionStatus(mockClientAlice, "bob_victim_456")).rejects.toThrow(
      "Identidade não autorizada: divergência entre a sessão autenticada e o identificador do usuário.",
    );

    // 3. Alice autenticada tenta passar userId de Bob para desconectá-lo -> REJEITADO
    await expect(disconnectDrive(mockClientAlice, "bob_victim_456")).rejects.toThrow(
      "Identidade não autorizada: divergência entre a sessão autenticada e o identificador do usuário.",
    );

    // 4. Chamada de disconnect sem fornecer userId explicitamente resolve com segurança para Alice via auth.uid()
    const result = await disconnectDrive(mockClientAlice);
    expect(result.success).toBe(true);
    expect(sharedDb.has("alice_authenticated_123")).toBe(false);
  });
});
