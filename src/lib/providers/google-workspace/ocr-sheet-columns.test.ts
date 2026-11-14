import { describe, expect, it } from "vitest";
import { ocrSheetLastColumnA1, OCR_SHEET_COLUMN_COUNT } from "./ocr-sheet-columns";
import { OCR_SHEET_RANGE_COL } from "./ocr-sheet-columns";

describe("ocrSheetLastColumnA1", () => {
  it("maps 28 kolom ke AB", () => {
    expect(OCR_SHEET_COLUMN_COUNT).toBe(28);
    expect(ocrSheetLastColumnA1(28)).toBe("AB");
    expect(OCR_SHEET_RANGE_COL).toBe("AB");
  });
});