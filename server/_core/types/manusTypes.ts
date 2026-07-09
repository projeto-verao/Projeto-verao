/**
 * Tipos legados do fluxo OAuth (mantidos apenas para compatibilidade de
 * compilação do sdk.ts). O login oficial do Projeto Verão é o Firebase Auth;
 * estes tipos não são usados em produção no Firebase Hosting.
 */

export interface ExchangeTokenRequest {
  clientId: string;
  grantType: string;
  code: string;
  redirectUri: string;
}

export interface ExchangeTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface GetUserInfoResponse {
  openId: string;
  name: string;
  email?: string | null;
  platform?: string | null;
  loginMethod?: string | null;
  platforms?: string[];
}

export interface GetUserInfoWithJwtRequest {
  jwtToken: string;
  projectId: string;
}

export interface GetUserInfoWithJwtResponse extends GetUserInfoResponse {
  taskUid?: string | null;
}
