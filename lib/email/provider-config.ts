import type { EmailProvider } from "@prisma/client";

export type EmailProviderConfig = {
  provider: EmailProvider;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  redirectPath: string;
};

const providerConfigs: Record<EmailProvider, EmailProviderConfig> = {
  GMAIL: {
    provider: "GMAIL",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "https://www.googleapis.com/auth/gmail.readonly"],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    redirectPath: "/api/email/oauth/gmail/callback"
  },
  OUTLOOK: {
    provider: "OUTLOOK",
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["openid", "email", "offline_access", "Mail.Read", "User.Read"],
    clientIdEnv: "MICROSOFT_OAUTH_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_OAUTH_CLIENT_SECRET",
    redirectPath: "/api/email/oauth/outlook/callback"
  }
};

export function parseEmailProvider(value: string): EmailProvider {
  const normalized = value.trim().toUpperCase();

  if (normalized === "GMAIL") return "GMAIL";
  if (normalized === "OUTLOOK") return "OUTLOOK";

  throw new Error(`Unsupported provider: ${value}`);
}

export function providerFromRoute(value: string): EmailProvider {
  const normalized = value.trim().toLowerCase();

  if (normalized === "gmail") return "GMAIL";
  if (normalized === "outlook") return "OUTLOOK";

  throw new Error(`Unsupported provider route: ${value}`);
}

export function getEmailProviderConfig(provider: EmailProvider): EmailProviderConfig {
  return providerConfigs[provider];
}

export function getAppBaseUrl() {
  return process.env.KINDE_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getRedirectUri(provider: EmailProvider): string {
  const cfg = getEmailProviderConfig(provider);
  return `${getAppBaseUrl().replace(/\/$/, "")}${cfg.redirectPath}`;
}
