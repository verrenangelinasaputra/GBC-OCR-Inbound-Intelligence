import { describe, expect, it } from "vitest";
import { driveOAuthRefreshHint } from "./drive-oauth";

describe("driveOAuthRefreshHint", () => {
  it("returns guidance for invalid_grant", () => {
    const hint = driveOAuthRefreshHint('{"error":"invalid_grant","error_description":"Token has been expired or revoked."}');
    expect(hint).toContain("invalid_grant");
    expect(hint).toContain("drive:oauth-setup");
  });

  it("returns null for other errors", () => {
    expect(driveOAuthRefreshHint("storage quota exceeded")).toBeNull();
  });
});