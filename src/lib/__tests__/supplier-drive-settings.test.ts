import { describe, expect, it } from "vitest";
import { parseDriveFolderId } from "@/lib/supplier-auth/supplier-drive-settings";

describe("parseDriveFolderId", () => {
  it("parses standard folder URL", () => {
    expect(parseDriveFolderId("https://drive.google.com/drive/folders/1abcXYZ_-09")).toBe("1abcXYZ_-09");
  });

  it("accepts raw folder id", () => {
    expect(parseDriveFolderId("1_eQPA9BXJj1RjLgfyCPnlgZEsJdpjHnA")).toBe("1_eQPA9BXJj1RjLgfyCPnlgZEsJdpjHnA");
  });
});
