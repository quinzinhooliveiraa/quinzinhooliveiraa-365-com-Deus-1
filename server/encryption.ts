import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

const ENC_KEY_HEX = process.env.ENCRYPTION_KEY || "";
const ENC_KEY = ENC_KEY_HEX.length === 64 ? Buffer.from(ENC_KEY_HEX, "hex") : null;

if (!ENC_KEY) {
  console.warn("[encryption] ENCRYPTION_KEY not set or invalid — sensitive fields will NOT be encrypted at rest.");
}

const ENC_PREFIX = "enc:";

export function encryptField(plaintext: string): string {
  if (!ENC_KEY || !plaintext) return plaintext;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ENC_KEY, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptField(value: string): string {
  if (!ENC_KEY || !value || !value.startsWith(ENC_PREFIX)) return value;
  try {
    const rest = value.slice(ENC_PREFIX.length);
    const parts = rest.split(":");
    if (parts.length !== 3) return value;
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const encrypted = Buffer.from(parts[2], "base64");
    const decipher = createDecipheriv("aes-256-gcm", ENC_KEY, iv, { authTagLength: 16 });
    if (tag.length !== 16) throw new Error("invalid auth tag length");
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
  } catch {
    return value;
  }
}

export function hashEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!ENC_KEY) return normalized;
  return createHmac("sha256", ENC_KEY).update(normalized).digest("hex");
}

export function decryptWithKey(value: string, keyHex: string): string | null {
  if (!value || !value.startsWith(ENC_PREFIX)) return null;
  try {
    const key = Buffer.from(keyHex, "hex");
    if (key.length !== 32) return null;
    const rest = value.slice(ENC_PREFIX.length);
    const parts = rest.split(":");
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const encrypted = Buffer.from(parts[2], "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
    if (tag.length !== 16) return null;
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString("utf8") + decipher.final("utf8");
  } catch {
    return null;
  }
}
