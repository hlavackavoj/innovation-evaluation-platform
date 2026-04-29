import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

type EncryptedPayload = {
  iv: string;
  tag: string;
  data: string;
};

function getKey(): Buffer {
  const raw = process.env.EMAIL_TOKEN_ENCRYPTION_KEY;

  if (!raw || raw.trim().length < 16) {
    throw new Error("EMAIL_TOKEN_ENCRYPTION_KEY must be set for email token encryption.");
  }

  return createHash("sha256").update(raw).digest();
}

export function encryptSecret(value: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const payload: EncryptedPayload = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64")
  };

  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function decryptSecret(payloadBase64: string): string {
  const payloadRaw = Buffer.from(payloadBase64, "base64").toString("utf8");
  const payload = JSON.parse(payloadRaw) as EncryptedPayload;

  if (!payload?.iv || !payload?.tag || !payload?.data) {
    throw new Error("Invalid encrypted payload.");
  }

  const key = getKey();
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.data, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
