import type { EmailProvider } from "@prisma/client";
import { createOAuthState, parseOAuthState } from "@/lib/email/oauth-state";
import {
  getAppBaseUrl,
  getEmailProviderConfig,
  getRedirectUri,
  parseEmailProvider
} from "@/lib/email/provider-config";
import { upsertEmailConnection } from "@/lib/email/token-store";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function createProviderAuthUrl(params: {
  provider: EmailProvider;
  userId: string;
  returnPath?: string;
}) {
  const cfg = getEmailProviderConfig(params.provider);
  const clientId = requiredEnv(cfg.clientIdEnv);
  const redirectUri = getRedirectUri(params.provider);
  const returnPath = params.returnPath || "/email-analyzer";
  const state = createOAuthState({
    userId: params.userId,
    provider: params.provider,
    returnPath
  });

  const query = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: cfg.scopes.join(" "),
    state,
    access_type: "offline",
    prompt: "consent"
  });

  if (params.provider === "OUTLOOK") {
    query.set("response_mode", "query");
  }

  return `${cfg.authUrl}?${query.toString()}`;
}

type OAuthCallbackInput = {
  provider: EmailProvider;
  code: string;
  state: string;
};

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

async function exchangeCodeForToken(provider: EmailProvider, code: string) {
  if (provider === "GMAIL") {
    const { OAuth2Client } = await import("google-auth-library");
    const cfg = getEmailProviderConfig(provider);
    const clientId = requiredEnv(cfg.clientIdEnv);
    const clientSecret = requiredEnv(cfg.clientSecretEnv);
    const redirectUri = getRedirectUri(provider);
    const oauthClient = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await oauthClient.getToken(code);

    return {
      access_token: tokens.access_token || "",
      refresh_token: tokens.refresh_token || undefined,
      expires_in:
        typeof tokens.expiry_date === "number"
          ? Math.max(0, Math.floor((tokens.expiry_date - Date.now()) / 1000))
          : undefined,
      scope: typeof tokens.scope === "string" ? tokens.scope : undefined,
      token_type: typeof tokens.token_type === "string" ? tokens.token_type : undefined
    } as TokenResponse;
  }

  const cfg = getEmailProviderConfig(provider);
  const clientId = requiredEnv(cfg.clientIdEnv);
  const clientSecret = requiredEnv(cfg.clientSecretEnv);

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: getRedirectUri(provider),
    grant_type: "authorization_code"
  });

  if (provider === "OUTLOOK") {
    body.set("scope", cfg.scopes.join(" "));
  }

  const response = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed (${response.status}): ${text}`);
  }

  return (await response.json()) as TokenResponse;
}

export async function refreshAccessToken(provider: EmailProvider, refreshToken: string) {
  const cfg = getEmailProviderConfig(provider);
  const clientId = requiredEnv(cfg.clientIdEnv);
  const clientSecret = requiredEnv(cfg.clientSecretEnv);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  if (provider === "OUTLOOK") {
    body.set("scope", cfg.scopes.join(" "));
  }

  const response = await fetch(cfg.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Refresh token exchange failed (${response.status}): ${text}`);
  }

  return (await response.json()) as TokenResponse;
}

async function fetchAccountProfile(provider: EmailProvider, accessToken: string) {
  if (provider === "GMAIL") {
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Unable to fetch Gmail profile (${response.status}).`);
    }

    const json = (await response.json()) as { emailAddress?: string; historyId?: string };

    return {
      externalAccountId: json.emailAddress || `gmail:${json.historyId || "me"}`,
      emailAddress: json.emailAddress
    };
  }

  const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Unable to fetch Microsoft profile (${response.status}).`);
  }

  const json = (await response.json()) as { id: string; mail?: string; userPrincipalName?: string };

  return {
    externalAccountId: json.id,
    emailAddress: json.mail || json.userPrincipalName
  };
}

export async function handleOAuthCallback(input: OAuthCallbackInput) {
  const parsedState = parseOAuthState(input.state);

  if (parseEmailProvider(parsedState.provider) !== input.provider) {
    throw new Error("OAuth provider mismatch in state.");
  }

  const token = await exchangeCodeForToken(input.provider, input.code);

  if (!token.access_token) {
    throw new Error("Provider did not return access token.");
  }

  const profile = await fetchAccountProfile(input.provider, token.access_token);
  const cfg = getEmailProviderConfig(input.provider);

  const connection = await upsertEmailConnection({
    userId: parsedState.userId,
    provider: input.provider,
    externalAccountId: profile.externalAccountId,
    emailAddress: profile.emailAddress,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresInSeconds: token.expires_in,
    scopes: token.scope?.split(" ").filter(Boolean) ?? cfg.scopes
  });

  const appBase = getAppBaseUrl().replace(/\/$/, "");
  return {
    redirectTarget: `${appBase}${parsedState.returnPath}`,
    userId: parsedState.userId,
    provider: input.provider,
    connectionId: connection.id
  };
}
