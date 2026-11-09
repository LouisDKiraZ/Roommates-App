import * as Crypto from "expo-crypto";

// No backend means no bcrypt/Argon2 server — this is a lightweight stretch
// (salted, iterated SHA-256) that's meaningfully better than a bare hash or
// plaintext, not a production-grade KDF.
const HASH_ITERATIONS = 500;

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const passwordRules: PasswordRule[] = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function isStrongPassword(password: string): boolean {
  return passwordRules.every((rule) => rule.test(password));
}

async function sha256(value: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
}

export async function hashPassword(
  password: string,
  salt?: string
): Promise<{ hash: string; salt: string }> {
  const useSalt = salt ?? Crypto.randomUUID().replace(/-/g, "");
  let hash = `${useSalt}:${password}`;
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    hash = await sha256(hash);
  }
  return { hash, salt: useSalt };
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const { hash } = await hashPassword(password, salt);
  return hash === expectedHash;
}
