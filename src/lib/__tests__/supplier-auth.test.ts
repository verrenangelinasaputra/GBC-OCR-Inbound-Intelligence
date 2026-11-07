import { describe, expect, it } from "vitest";
import { hashVerificationCode, verificationCodeMatches } from "@/lib/supplier-auth/code";
import { maskEmail, validateEmail, validateUsername } from "@/lib/supplier-auth/fields";

describe("supplier account fields", () => {
  it("normalizes username and email", () => {
    expect(validateUsername("Fauzi_SSC")).toBe("fauzi_ssc");
    expect(validateEmail("Buyer@Supplier.com")).toBe("buyer@supplier.com");
    expect(maskEmail("buyer@supplier.com")).toBe("b***@supplier.com");
  });

  it("rejects a short username", () => {
    expect(() => validateUsername("ab")).toThrow(/3–32/);
  });
});

describe("supplier email verification code", () => {
  it("matches only the issued code", () => {
    process.env.SESSION_SECRET = "test-session-secret-min-32-characters";
    const hash = hashVerificationCode("123456");
    expect(verificationCodeMatches("123456", hash)).toBe(true);
    expect(verificationCodeMatches("000000", hash)).toBe(false);
  });
});
