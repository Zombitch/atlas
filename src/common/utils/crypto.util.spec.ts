import {
  generateSecret,
  hashSecret,
  verifySecret,
  sanitizeFilename,
} from './crypto.util';

describe('CryptoUtil', () => {
  describe('generateSecret', () => {
    it('should generate a secret of at least 64 characters', () => {
      const secret = generateSecret();
      expect(secret.length).toBeGreaterThanOrEqual(64);
    });

    it('should generate unique secrets', () => {
      const s1 = generateSecret();
      const s2 = generateSecret();
      expect(s1).not.toBe(s2);
    });

    it('should generate base64url-safe characters', () => {
      const secret = generateSecret();
      expect(secret).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });

  describe('hashSecret / verifySecret', () => {
    it('should hash and verify a secret correctly', async () => {
      const secret = generateSecret();
      const hash = await hashSecret(secret);
      expect(hash).not.toBe(secret);
      const isValid = await verifySecret(secret, hash);
      expect(isValid).toBe(true);
    });

    it('should reject wrong secrets', async () => {
      const secret = generateSecret();
      const hash = await hashSecret(secret);
      const isValid = await verifySecret('wrong-secret', hash);
      expect(isValid).toBe(false);
    });

    it('should reject invalid hashes', async () => {
      const isValid = await verifySecret('secret', 'not-a-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeFilename('file<script>.txt')).toBe('file_script_.txt');
    });

    it('should prevent directory traversal', () => {
      const result = sanitizeFilename('../../etc/passwd');
      expect(result).not.toContain('..');
    });

    it('should limit filename length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
    });

    it('should handle empty strings', () => {
      expect(sanitizeFilename('')).toBe('');
    });

    it('should remove null bytes', () => {
      expect(sanitizeFilename('file\x00.txt')).toBe('file_.txt');
    });
  });
});
