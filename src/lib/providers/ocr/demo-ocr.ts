import type { OcrDocumentResult } from "../types";

export interface OCRProvider {
  processImage(_buffer: Buffer, _mimeType: string): Promise<OcrDocumentResult>;
  getHealth(): Promise<{ status: string; message?: string; isDemo?: boolean }>;
}

/** Demo / manual fallback — tidak mengklaim hasil OCR nyata dari cloud */
export class DemoOCRProvider implements OCRProvider {
  async processImage(): Promise<OcrDocumentResult> {
    return {
      suratJalanNumber: "DEMO-SJ-001",
      documentDate: new Date().toISOString().slice(0, 10),
      supplierName: "SSC (Demo Supplier)",
      destination: "GBC Warehouse Demo",
      poReference: "PO-DEMO-1001",
      vehicleInfo: "B 1234 DEMO",
      totalItemCount: 2,
      lineItems: [
        {
          lineNumber: 1,
          supplierProductName: "Produk Demo A - Merk Fiktif",
          supplierProductCode: "SSC-DEMO-A",
          quantity: "10",
          unit: "PCS",
          unitPrice: "25000",
          confidence: 0.55,
        },
        {
          lineNumber: 2,
          supplierProductName: "Produk Demo B - Varian Fiktif",
          supplierProductCode: "SSC-DEMO-B",
          quantity: "5",
          unit: "BOX",
          confidence: 0.52,
        },
      ],
      rawText: "[DEMO OCR — silakan koreksi manual di halaman OCR Review]",
      confidenceScore: 0.54,
      warnings: [
        "Mode DEMO: OCR cloud belum dikonfigurasi. Data contoh — wajib diverifikasi operator.",
      ],
      providerKey: "demo",
      isDemo: true,
    };
  }

  async getHealth() {
    return {
      status: "CONNECTED",
      message: "Demo OCR aktif — untuk development / manual review",
      isDemo: true,
    };
  }
}

export class ManualOCRProvider implements OCRProvider {
  async processImage(): Promise<OcrDocumentResult> {
    return {
      lineItems: [],
      warnings: ["Mode MANUAL: tidak ada ekstraksi otomatis. Input di OCR Review Queue."],
      providerKey: "manual",
      isDemo: true,
    };
  }

  async getHealth() {
    return { status: "CONNECTED", message: "Manual entry mode", isDemo: true };
  }
}

/** @deprecated Import getOCRProvider from `@/lib/providers/ocr` */
export function getOCRProviderLegacy(): OCRProvider {
  return new DemoOCRProvider();
}
