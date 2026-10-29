import { describe, it, expect } from "vitest";
import { canTransition } from "@/lib/workflow/document-workflow";

describe("document workflow", () => {
  it("allows upload to OCR queue", () => {
    expect(canTransition("UPLOADED", "QUEUED_FOR_OCR")).toBe(true);
  });
  it("blocks invalid jump to completed", () => {
    expect(canTransition("UPLOADED", "COMPLETED")).toBe(false);
  });
});
