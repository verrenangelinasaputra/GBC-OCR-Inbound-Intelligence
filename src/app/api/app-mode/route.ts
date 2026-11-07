import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { isGoogleExportConfigured } from "@/lib/providers/google-workspace";
import { isDriveOAuthConfigured } from "@/lib/providers/google-workspace/drive-oauth";

export async function GET() {
  return Response.json({
    sheetOnly: isSheetOnlyMode(),
    googleExport: isGoogleExportConfigured(),
    driveOAuth: isDriveOAuthConfigured(),
    ocr: process.env.OCR_PROVIDER ?? "auto",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
  });
}
