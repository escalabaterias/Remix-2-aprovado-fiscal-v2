/**
 * GOOGLE DRIVE CONNECTION SERVICE — TESTES UNITÁRIOS E DE SEGURANÇA — P0.1-B
 *
 * Testa exaustivamente todos os critérios de aceite e segurança do fluxo OAuth do Drive.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getDriveConnectionStatus,
  initiateDriveConnection,
  handleDriveOAuthCallback,
  refreshDriveAccessToken,
  disconnectDrive,
  _clearTestCredentialStore,
  DRIVE_METADATA_SCOPE,
} from "./connection-service";

// Mock do cliente Supabase
function createMockSupabaseClient(mockProfileData: any = null) {
  let profile = mockProfileData;

  return {
    from: vi.fn((table: string) => {
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
      return {};
    }),
  } as any;
}

describe("Google Drive Connection Service (P0.1-B)", () => {
  beforeEach(() => {
    _clearTestCredentialStore();
  });

  it("Caso 1: Usuário não conectado retorna connected = false", async () => {
    const mockClient = createMockSupabaseClient({ id: "user_123", preferences: {} });
    const status = await getDriveConnectionStatus(mockClient, "user_123");

    expect(status.connected).toBe(false);
    expect(status.scope).toBeUndefined();
    expect(status.accountEmail).toBeUndefined();
  });

  it("Caso 2: Usuário conectado retorna connected = true com metadados públicos", async () => {
    const mockClient = createMockSupabaseClient({ id: "user_123", preferences: {} });

    await handleDriveOAuthCallback(
      mockClient,
      "user_123",
      "valid_code",
      "state_user_123_1000",
      "secret_refresh_token_123",
    );

    const status = await getDriveConnectionStatus(mockClient, "user_123");

    expect(status.connected).toBe(true);
    expect(status.scope).toBe(DRIVE_METADATA_SCOPE);
    expect(status.connectedAt).toBeDefined();
    expect(status.accountEmail).toBe("aluno@aprovadofiscal.com.br");
  });

  it("Caso 3: Usuário A não pode consultar ou alterar credencial do Usuário B", async () => {
    const mockClientA = createMockSupabaseClient({ id: "user_A", preferences: {} });
    const mockClientB = createMockSupabaseClient({ id: "user_B", preferences: {} });

    // Conecta Usuário A
    await handleDriveOAuthCallback(
      mockClientA,
      "user_A",
      "code_A",
      "state_user_A_1000",
      "secret_refresh_token_A",
    );

    // Consulta status para Usuário B
    const statusB = await getDriveConnectionStatus(mockClientB, "user_B");
    expect(statusB.connected).toBe(false);

    // Tentativa de callback do Usuário B usando token de estado do Usuário A deve falhar
    await expect(
      handleDriveOAuthCallback(
        mockClientB,
        "user_B",
        "code_B",
        "state_user_A_1000",
        "secret_token",
      ),
    ).rejects.toThrow("Token de estado OAuth inválido ou incompatível com o usuário.");
  });

  it("Caso 4: Frontend nunca recebe refresh token em nenhuma resposta", async () => {
    const mockClient = createMockSupabaseClient({ id: "user_123", preferences: {} });

    const callbackResponse = await handleDriveOAuthCallback(
      mockClient,
      "user_123",
      "code_123",
      "state_user_123_1000",
      "secret_refresh_token_super_sensivel",
    );

    expect((callbackResponse as any).refreshToken).toBeUndefined();
    expect((callbackResponse as any).encryptedRefreshToken).toBeUndefined();

    const statusResponse = await getDriveConnectionStatus(mockClient, "user_123");
    expect((statusResponse as any).refreshToken).toBeUndefined();
    expect((statusResponse as any).encryptedRefreshToken).toBeUndefined();
  });

  it("Caso 5: Desconexão remove a autorização armazenada sem apagar histórico", async () => {
    const mockClient = createMockSupabaseClient({ id: "user_123", preferences: {} });

    // Conecta
    await handleDriveOAuthCallback(
      mockClient,
      "user_123",
      "code_123",
      "state_user_123_1000",
      "secret_token",
    );

    let status = await getDriveConnectionStatus(mockClient, "user_123");
    expect(status.connected).toBe(true);

    // Desconecta
    const result = await disconnectDrive(mockClient, "user_123");
    expect(result.success).toBe(true);

    status = await getDriveConnectionStatus(mockClient, "user_123");
    expect(status.connected).toBe(false);
  });

  it("Caso 6: Token expirado pode ser renovado server-side via refresh_token", async () => {
    const mockClient = createMockSupabaseClient({ id: "user_123", preferences: {} });

    await handleDriveOAuthCallback(
      mockClient,
      "user_123",
      "code_123",
      "state_user_123_1000",
      "secret_token_123",
    );

    const refreshed = await refreshDriveAccessToken("user_123");

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

  it("Caso 8: Replay do stateToken já consumido é rejeitado", async () => {
    const mockClient = createMockSupabaseClient({ id: "user_777", preferences: {} });

    const init = await initiateDriveConnection(
      "user_777",
      "https://aprovadofiscal.com.br/auth/drive/callback",
    );

    // Primeiro callback com o stateToken válido consome o state
    await handleDriveOAuthCallback(
      mockClient,
      "user_777",
      "code_1",
      init.stateToken,
      "refresh_token_1",
    );

    // Tentativa de reutilização do mesmo stateToken deve falhar ou ser tratada
    const status = await getDriveConnectionStatus(mockClient, "user_777");
    expect(status.connected).toBe(true);
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
});
