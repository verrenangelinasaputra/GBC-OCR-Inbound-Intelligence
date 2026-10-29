import type { OcrDocumentResult } from "../types";
import type { OCRProvider } from "./demo-ocr";
import {
  SJ_GEMINI_PROMPT,
  SJ_GEMINI_SCHEMA,
  geminiPayloadToLineItems,
  parseGeminiDateToIso,
  type GeminiSJPayload,
} from "./gemini-surat-jalan";
import { preprocessImageForOcr } from "./preprocess-image";
import { resolveGeminiModels } from "./gemini-models";

function hintForAuthError(status: number, body: string): string | null {
  if (status === 401 || status === 403) {
    return (
      "API key ditolak. Buat key baru di Google AI Studio (https://aistudio.google.com/apikey) — " +
      "biasanya format AIza.... Key format AQ.... kadang hanya untuk konteks tertentu, bukan REST generateContent."
    );
  }
  if (status === 400 && body.includes("API key")) {
    return "GEMINI_API_KEY tidak valid untuk Generative Language API.";
  }
  return null;
}

export class GeminiOCRProvider implements OCRProvider {
  async getHealth() {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      return {
        status: "NOT_CONFIGURED",
        message: "Set GEMINI_API_KEY di .env dan OCR_PROVIDER=gemini",
        isDemo: false,
      };
    }
    const models = await resolveGeminiModels(key);
    return {
      status: "CONNECTED",
      message: `Gemini Vision (${models.join(", ")})`,
      isDemo: false,
    };
  }

  async processImage(buffer: Buffer, mimeType: string): Promise<OcrDocumentResult> {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key) {
      throw new Error("GEMINI_API_KEY belum dikonfigurasi. Lihat .env.example");
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/bmp",
      "application/pdf",
    ];
    if (!allowed.includes(mimeType)) {
      throw new Error(`MIME tidak didukung Gemini: ${mimeType}`);
    }

    const processed = await preprocessImageForOcr(buffer, mimeType);
    const sendMime = mimeType.startsWith("image/") && mimeType !== "image/gif" ? "image/jpeg" : mimeType;

    const body = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: sendMime,
                data: processed.toString("base64"),
              },
            },
            { text: SJ_GEMINI_PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: SJ_GEMINI_SCHEMA,
      },
    };

    let lastError = "";
    const errors: string[] = [];
    const models = await resolveGeminiModels(key);
    if (models.length === 0) {
      throw new Error(
        "Tidak ada model Gemini yang cocok. Set GEMINI_MODEL=gemini-3.5-flash,gemini-2.5-flash di .env"
      );
    }

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": key,
          },
          body: JSON.stringify(body),
        });

        if (res.status === 200) {
          const json = (await res.json()) as {
            candidates?: Array<{
              finishReason?: string;
              content?: { parts?: Array<{ text?: string }> };
            }>;
          };
          const cand = json.candidates?.[0];
          const text =
            cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
          if (!text) {
            throw new Error(
              `Gemini tidak mengembalikan data (finishReason: ${cand?.finishReason ?? "?"})`
            );
          }

          const data = JSON.parse(text) as GeminiSJPayload;
          const lineItems = geminiPayloadToLineItems(data);
          const warnings: string[] = [];
          if (lineItems.length === 0) {
            warnings.push("Tidak ada line item terdeteksi — perlu review manual.");
          }
          if (lineItems.some((l) => (l.confidence ?? 1) < 0.7)) {
            warnings.push("Beberapa baris ditandai ragu / perlu CEK MANUAL.");
          }

          const destination = [data.nama_penerima, data.alamat]
            .filter(Boolean)
            .join(" — ");

          const avgConf =
            lineItems.length > 0
              ? lineItems.reduce((s, l) => s + (l.confidence ?? 0.7), 0) / lineItems.length
              : 0.5;

          return {
            suratJalanNumber: String(data.no_surat_jalan || "").toUpperCase() || undefined,
            documentDate: parseGeminiDateToIso(data.tanggal),
            destination: destination || undefined,
            poReference: data.no_po || undefined,
            vehicleInfo: String(data.no_kendaraan || "").toUpperCase() || undefined,
            totalItemCount: lineItems.length,
            lineItems: lineItems.map(({ needsReview: _, ...rest }) => rest),
            rawText: text,
            confidenceScore: avgConf,
            warnings,
            providerKey: `gemini:${model}`,
            isDemo: false,
            geminiPayload: data as unknown as Record<string, unknown>,
          };
        }

        const errText = await res.text();
        lastError = `${model} → ${res.status}: ${errText.slice(0, 280)}`;
        errors.push(lastError);
        const authHint = hintForAuthError(res.status, errText);
        if (authHint) {
          throw new Error(`${authHint}\nDetail: ${lastError}`);
        }
        if (res.status === 404) break;
        if (res.status === 429 || res.status === 500 || res.status === 503) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        throw new Error(`Gemini API error: ${lastError}`);
      }
    }

    throw new Error(
      `Gemini API gagal (semua model dicoba: ${models.join(", ")}).\n` +
        `Jalankan: npx tsx scripts/list-gemini-models.ts\n` +
        errors.slice(-4).join("\n")
    );
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
