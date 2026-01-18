import crypto from "crypto";
import { envVars } from "../config/env";

const ALGO = envVars.ALGORITHM as "aes-256-gcm" | "aes-192-gcm" | "aes-128-gcm";
const KEY = Buffer.from(envVars.ENC_KEY || "", "hex");
const IV_LENGTH = 16;

// Encrypt
export const hashPassword = async (text: string): Promise<string> => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Store in format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
};

// Verify plain text against encrypted value
export const verifyPassword = async (plainText: string, encryptedData: string): Promise<boolean> => {
  try {
    const decrypted = await decryptPassword(encryptedData);
    return decrypted === plainText;
  } catch {
    return false;
  }
};

// Decrypt back to original
export const decryptPassword = async (encryptedData: string): Promise<string> => {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};
