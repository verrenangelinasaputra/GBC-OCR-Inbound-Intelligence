import { GeminiOCRProvider } from "@/lib/providers/ocr/gemini-ocr";
import type { GeminiSJPayload } from "@/lib/providers/ocr/gemini-surat-jalan";
import { ocrExportSheetUrl } from "@/lib/config/ocr-export-target";
import { isDriveOAuthConfigured } from "@/lib/providers/google-workspace/drive-oauth";
import {
  appendRowsToSheet,
  buildGoogleSheetRows,
  buildSuratJalanFileName,
  getGoogleExportConfig,
  isGoogleExportConfigured,
  uploadFileToDrive,
} from "@/lib/providers/google-workspace";

export type SheetOnlyUploadResult = {
  submissionRef: string;
  suratJalanNumber?: string;
  sheetRowCount: number;
  sheetId: string;
  sheetTab: string;
  sheetUrl: string;
  sheetUpdatedRange?: string;
  driveFileUrl?: string;
  driveWarning?: string;
  ocrWarnings: string[];
};

function makeSubmissionRef(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `SJ-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function tagRowsWithGudang(rows: string[][], gudang: string | undefined): string[][] {
  if (!gudang?.trim()) return rows;
  const label = `Gudang tujuan: ${gudang.trim()}`;
  return rows.map((row) => {
    const copy = [...row];
    const ket = String(copy[11] ?? "").trim();
    copy[11] = ket ? `${label} — ${ket}` : label;
    return copy;
  });
}

export async function processSheetOnlyUpload(params: {
  file: { buffer: Buffer; mimeType: string; name: string };
  notes?: string;
  vehicleInfo?: string;
  gudang?: string;
}): Promise<SheetOnlyUploadResult> {
  if (!isGoogleExportConfigured()) {
    throw new Error(
      "Google export wajib di mode Sheet-only. Set GOOGLE_EXPORT_ENABLED=true + GOOGLE_SERVICE_ACCOUNT_JSON di Vercel."
    );
  }

  const ocr = new GeminiOCRProvider();
  const result = await ocr.processImage(params.file.buffer, params.file.mimeType);
  if (result.isDemo) {
    throw new Error("OCR demo tidak dipakai di Sheet-only — set GEMINI_API_KEY + OCR_PROVIDER=gemini.");
  }

  const payload = (result.geminiPayload ?? {}) as GeminiSJPayload;
  if (params.vehicleInfo && !payload.no_kendaraan) {
    payload.no_kendaraan = params.vehicleInfo;
  }

  const submissionRef = makeSubmissionRef();
  const config = getGoogleExportConfig();
  const tanggalForName = payload.tanggal || result.documentDate || "";
  const noSj = payload.no_surat_jalan || result.suratJalanNumber || submissionRef;
  const ext = params.file.name.match(/\.[a-z0-9]+$/i)?.[0] || ".jpeg";
  const fileName = buildSuratJalanFileName({
    tanggal: tanggalForName,
    noSuratJalan: noSj,
    ext,
  });

  let fileUrl = "";
  let driveWarning: string | undefined;

  try {
    const uploaded = await uploadFileToDrive({
      config,
      buffer: params.file.buffer,
      fileName,
      mimeType: params.file.mimeType || "image/jpeg",
    });
    fileUrl = uploaded.fileUrl;
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Upload Drive gagal";
    const vercelHint =
      process.env.VERCEL === "1" && !isDriveOAuthConfigured()
        ? " Di Vercel: tambahkan GOOGLE_DRIVE_OAUTH_CLIENT_ID, GOOGLE_DRIVE_OAUTH_CLIENT_SECRET, GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN (dari npm run drive:oauth-setup), lalu redeploy."
        : "";
    driveWarning = raw.includes("storage quota") || raw.includes("Service Accounts")
      ? `Upload Drive gagal (service account).${vercelHint || " Pastikan OAuth Drive sudah di env production."} Spreadsheet tetap terisi.`
      : `${raw}${vercelHint}`;
    fileUrl = "";
  }

  let rows = buildGoogleSheetRows({
    payload,
    fileName,
    fileUrl,
    fallback: {
      suratJalanNumber: result.suratJalanNumber ?? null,
      documentDate: result.documentDate ? new Date(result.documentDate) : null,
      vehicleInfo: params.vehicleInfo || result.vehicleInfo || null,
      poReference: result.poReference ?? null,
      destinationText: result.destination ?? params.gudang?.trim() ?? null,
    },
  });
  rows = tagRowsWithGudang(rows, params.gudang);

  const sheetAppend = await appendRowsToSheet({ config, rows });

  return {
    submissionRef,
    suratJalanNumber: result.suratJalanNumber,
    sheetRowCount: rows.length,
    sheetId: config.sheetId,
    sheetTab: sheetAppend.sheetTab,
    sheetUrl: ocrExportSheetUrl(config.sheetId),
    sheetUpdatedRange: sheetAppend.updatedRange,
    driveFileUrl: fileUrl || undefined,
    driveWarning,
    ocrWarnings: result.warnings,
  };
}
