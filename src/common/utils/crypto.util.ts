import { randomBytes, timingSafeEqual } from 'crypto';
import * as argon2 from 'argon2';

/**
 * Generate a cryptographically secure random secret (base64url, 64 chars).
 */
export function generateSecret(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Hash a secret using Argon2id.
 */
export async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verify a secret against an Argon2id hash (timing-safe).
 */
export async function verifySecret(
  secret: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, secret);
  } catch {
    return false;
  }
}

/**
 * Sanitize a filename to prevent directory traversal and XSS.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 255);
}
