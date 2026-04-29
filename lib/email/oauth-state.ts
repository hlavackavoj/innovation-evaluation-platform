import { createHmac, timingSafeEqual } from "crypto";

const TTL_SECONDS = 10 * 60;

type StatePayload = {
  userId: string;
  provider: string;
  returnPath: string;
  issuedAt: number;
};

function getSecret() {
  const secret = process.env.EMAIL_OAUTH_STATE_SECRET;

  if (!secret || secret.trim().length < 16) {
    throw new Error("EMAIL_OAUTH_STATE_SECRET must be configured.");
  }

  return secret;
}

function sign(payloadBase64: string) {
  return createHmac("sha256", getSecret()).update(payloadBase64).digest("base64url");
}

export function createOAuthState(input: Omit<StatePayload, "issuedAt">): string {
  const payload: StatePayload = {
    ...input,
    issuedAt: Math.floor(Date.now() / 1000)
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function parseOAuthState(state: string): StatePayload {
  const [payloadEncoded, signature] = state.split(".");

  if (!payloadEncoded || !signature) {
    throw new Error("Invalid OAuth state format.");
  }

  const expected = sign(payloadEncoded);

  if (
    !timingSafeEqual(Buffer.from(signature, "utf8"), Buffer.from(expected, "utf8"))
  ) {
    throw new Error("Invalid OAuth state signature.");
  }

  const payload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString("utf8")) as StatePayload;

  if (!payload?.userId || !payload?.provider || !payload?.issuedAt) {
    throw new Error("Invalid OAuth state payload.");
  }

  const now = Math.floor(Date.now() / 1000);

  if (now - payload.issuedAt > TTL_SECONDS) {
    throw new Error("OAuth state expired.");
  }

  return payload;
}
