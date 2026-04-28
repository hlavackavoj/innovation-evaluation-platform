const requiredServerEnv = [
  "DATABASE_URL",
  "KINDE_ISSUER_URL",
  "KINDE_CLIENT_ID",
  "KINDE_CLIENT_SECRET",
  "KINDE_SITE_URL",
  "KINDE_POST_LOGIN_REDIRECT_URL",
  "KINDE_POST_LOGOUT_REDIRECT_URL"
] as const;

export function getMissingRequiredServerEnv(): string[] {
  return requiredServerEnv.filter((key) => {
    const value = process.env[key];
    return !value || value.trim().length === 0;
  });
}

export function assertRequiredServerEnv() {
  const missing = getMissingRequiredServerEnv();

  if (missing.length > 0) {
    throw new Error(`Missing required server env vars: ${missing.join(", ")}`);
  }
}

export function formatErrorForDisplay(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? `\n${error.stack}` : ""}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
