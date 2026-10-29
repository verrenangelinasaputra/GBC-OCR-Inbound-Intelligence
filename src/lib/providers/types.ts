export type ProviderHealth = {
  providerKey: string;
  displayName: string;
  status: "NOT_CONFIGURED" | "CONFIGURATION_REQUIRED" | "CONNECTED" | "ERROR" | "DISABLED";
  message?: string;
};

export type OcrLineItemResult = {
  lineNumber: number;
  supplierProductName?: string;
  supplierProductCode?: string;
  quantity?: string;
  unit?: string;
  unitPrice?: string;
  lineTotal?: string;
  /** Metadata banyaknya/isi/keterangan (SSC layout) */
  extractionNotes?: string;
  confidence?: number;
  pageNumber?: number;
};

export type OcrDocumentResult = {
  suratJalanNumber?: string;
  documentDate?: string;
  supplierName?: string;
  destination?: string;
  poReference?: string;
  vehicleInfo?: string;
  totalItemCount?: number;
  lineItems: OcrLineItemResult[];
  rawText?: string;
  confidenceScore?: number;
  warnings: string[];
  providerKey: string;
  isDemo: boolean;
  /** Raw Gemini Surat Jalan JSON — untuk export Google Sheet */
  geminiPayload?: Record<string, unknown>;
};
