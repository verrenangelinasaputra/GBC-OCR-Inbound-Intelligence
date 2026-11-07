import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export function generateVerificationCode(): string {
  return String(randomInt(100000, 999999));
}

function codeSecret(): string {
  const secret = process.env.SESSION_SECRET ?? "";
  if (secret.length < 32) {
    throw new Error("SESSION_SECRET must be set (min 32 characters)");
  }
  return secret;
}

export function hashVerificationCode(code: string): string {
  return createHmac("sha256", codeSecret()).update(String(code)).digest("hex");
}

export function verificationCodeMatches(code: string, codeHash: string): boolean {
  const actual = Buffer.from(hashVerificationCode(code));
  const expected = Buffer.from(codeHash);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
