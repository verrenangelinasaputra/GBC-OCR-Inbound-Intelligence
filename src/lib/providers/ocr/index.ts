import { DemoOCRProvider, ManualOCRProvider, type OCRProvider } from "./demo-ocr";
import { GeminiOCRProvider } from "./gemini-ocr";

export type { OCRProvider } from "./demo-ocr";

export function getOCRProvider(): OCRProvider {
  const key = (process.env.OCR_PROVIDER ?? "").toLowerCase().trim();
  const hasGemini = !!process.env.GEMINI_API_KEY?.trim();

  if (key === "manual") return new ManualOCRProvider();

  if (key === "gemini" || key === "google_gemini") {
    if (!hasGemini) {
      throw new Error(
        "OCR_PROVIDER=gemini but GEMINI_API_KEY kosong. Isi API key di .env (server-side only)."
      );
    }
    return new GeminiOCRProvider();
  }

  // Default: Gemini jika key ada; otherwise demo (development tanpa API)
  if (hasGemini && (key === "" || key === "auto")) {
    return new GeminiOCRProvider();
  }

  if (key === "demo" || !hasGemini) {
    return new DemoOCRProvider();
  }

  if (key === "google_vision" || key === "azure") {
    throw new Error(
      `OCR provider "${key}" belum diimplementasi. Gunakan OCR_PROVIDER=gemini + GEMINI_API_KEY.`
    );
  }

  return new DemoOCRProvider();
}
