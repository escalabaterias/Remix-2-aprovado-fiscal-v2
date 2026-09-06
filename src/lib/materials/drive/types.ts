/**
 * GOOGLE DRIVE OAUTH — CONTRATOS E TIPOS — P0.1-B
 *
 * Define a estrutura de status da conexão do Google Drive e contratos de segurança.
 *
 * REGRAS CRÍTICAS DE SEGURANÇA:
 *   - NUNCA expor `refresh_token` ou `client_secret` nas respostas ou tipos do frontend.
 *   - O status expõe unicamente propriedades públicas de telemetria da conexão.
 */

export type DriveConnectionStatus = {
  connected: boolean;
  connectedAt?: string;
  scope?: string;
  lastValidatedAt?: string;
  accountEmail?: string;
};

export type InitiateDriveOAuthInput = {
  redirectUri: string;
};

export type InitiateDriveOAuthOutput = {
  authUrl: string;
  stateToken: string;
};

export type DriveOAuthCallbackInput = {
  code: string;
  stateToken: string;
};

export type StoredDriveCredential = {
  userId: string;
  encryptedRefreshToken: string;
  scope: string;
  accountEmail?: string;
  connectedAt: string;
  lastValidatedAt: string;
};
