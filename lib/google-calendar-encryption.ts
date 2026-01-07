/**
 * Encryption utilities for Google Calendar refresh tokens
 * Uses Node.js crypto for encryption/decryption
 */

import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Get encryption key from environment variable
// In production, use a secure key stored in a secrets manager
const ENCRYPTION_KEY = process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY || "";
const ALGORITHM = "aes-256-gcm";

/**
 * Derive a key from the encryption key
 */
async function deriveKey(password: string): Promise<Buffer> {
  // Use a salt from env or default (in production, use a proper salt)
  const salt = process.env.GOOGLE_CALENDAR_ENCRYPTION_SALT || "default-salt-change-in-production";
  return (await scryptAsync(password, salt, 32)) as Buffer;
}

/**
 * Encrypt a refresh token before storing in database
 */
export async function encryptRefreshToken(token: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    console.warn("[encryptRefreshToken] No encryption key set, storing token in plain text (NOT SECURE)");
    return token; // Fallback to plain text if no key (not secure but allows development)
  }

  try {
    const key = await deriveKey(ENCRYPTION_KEY);
    const iv = randomBytes(16);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Return IV + authTag + encrypted data (all hex)
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("[encryptRefreshToken] Encryption failed:", error);
    throw new Error("Failed to encrypt refresh token");
  }
}

/**
 * Decrypt a refresh token from database
 */
export async function decryptRefreshToken(encryptedToken: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    // If no key, assume it's plain text (development mode)
    return encryptedToken;
  }

  try {
    const [ivHex, authTagHex, encrypted] = encryptedToken.split(":");
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error("Invalid encrypted token format");
    }

    const key = await deriveKey(ENCRYPTION_KEY);
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("[decryptRefreshToken] Decryption failed:", error);
    throw new Error("Failed to decrypt refresh token");
  }
}

