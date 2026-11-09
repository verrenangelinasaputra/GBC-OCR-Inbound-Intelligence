import { jsonError } from "@/lib/api/auth-context";
import { getSession } from "@/lib/auth/session";
import { isSheetOnlyMode } from "@/lib/config/app-mode";
import { SUPPLIER_GUDANG_OPTIONS, SUPPLIER_MAX_SJ_FILES } from "@/lib/config/supplier-gudang";
import { resolveSupplierCompanyName } from "@/lib/supplier-auth/resolve-company";
import { processSheetOnlyUpload } from "@/lib/services/sheet-only-upload";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png"]);
const MAX_BYTES = 15 * 1024 * 1024;
const GUDANG_SET = new Set<string>(SUPPLIER_GUDANG_OPTIONS);

/** OCR multi-file bisa >60s — naikkan limit di Vercel (Pro: hingga 300s). */
export const maxDuration = 300;
export const runtime = "nodejs";

type NdjsonEvent =
  | {
      type: "file_start";
      fileIndex: number;
      fileTotal: number;
      fileName: string;
    }
  | {
      type: "step";
      fileIndex: number;
      fileTotal: number;
      fileName: string;
      phase: string;
      message: string;
    }
  | {
      type: "file_done";
      fileIndex: number;
      fileTotal: number;
      submissionRef: string;
      suratJalanNumber?: string;
      sheetRowCount: number;
    }
  | { type: "complete"; payload: Record<string, unknown> }
  | { type: "error"; message: string };

export async function POST(request: Request) {
  if (!isSheetOnlyMode()) {
    return jsonError(new Error("SHEET_ONLY_MODE bukan true — endpoint nonaktif"), 404);
  }

  const session = await getSession();
  if (!session?.roles.includes("SUPPLIER_USER") && !session?.roles.includes("SUPER_ADMIN")) {
    return jsonError(new Error("UNAUTHORIZED"), 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (e) {
    return jsonError(e instanceof Error ? e : new Error("Form tidak valid"), 400);
  }

  const notes = String(form.get("notes") ?? "");
  const vehicleInfo = String(form.get("vehicleInfo") ?? "");
  const gudang = String(form.get("gudang") ?? "").trim();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return jsonError(new Error("Minimal 1 file Surat Jalan"), 400);
  }
  if (files.length > SUPPLIER_MAX_SJ_FILES) {
    return jsonError(new Error(`Maksimal ${SUPPLIER_MAX_SJ_FILES} Surat Jalan per submit`), 400);
  }
  if (!gudang || !GUDANG_SET.has(gudang)) {
    return jsonError(new Error("Pilih gudang tujuan yang valid"), 400);
  }

  const supplierName = await resolveSupplierCompanyName(session.username);

  const prepared: { name: string; mimeType: string; buffer: Buffer }[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (!ALLOWED.has(file.type)) {
      return jsonError(
        new Error(`Format tidak diizinkan (file ${i + 1}) — hanya foto JPG/PNG.`),
        400
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      return jsonError(new Error(`File ${i + 1} terlalu besar (max 15MB)`), 400);
    }
    prepared.push({ name: file.name, mimeType: file.type, buffer });
  }

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const write = async (event: NdjsonEvent) => {
    await writer.write(encoder.encode(`${JSON.stringify(event)}\n`));
  };

  void (async () => {
    try {
      const uploads: Awaited<ReturnType<typeof processSheetOnlyUpload>>[] = [];
      const driveWarnings: string[] = [];
      const fileTotal = prepared.length;

      for (let i = 0; i < prepared.length; i += 1) {
        const file = prepared[i];
        const fileIndex = i + 1;
        await write({
          type: "file_start",
          fileIndex,
          fileTotal,
          fileName: file.name,
        });

        const result = await processSheetOnlyUpload({
          file: { buffer: file.buffer, mimeType: file.mimeType, name: file.name },
          notes: notes || undefined,
          vehicleInfo: vehicleInfo || undefined,
          gudang,
          supplierName,
          supplierUsername: session.username,
          batchIndex: fileIndex,
          batchTotal: fileTotal,
          onProgress: async (p) => {
            await write({
              type: "step",
              fileIndex,
              fileTotal,
              fileName: file.name,
              phase: p.phase,
              message: p.message,
            });
          },
        });

        uploads.push(result);
        if (result.driveWarning) driveWarnings.push(result.driveWarning);

        await write({
          type: "file_done",
          fileIndex,
          fileTotal,
          submissionRef: result.submissionRef,
          suratJalanNumber: result.suratJalanNumber,
          sheetRowCount: result.sheetRowCount,
        });
      }

      const totalRows = uploads.reduce((n, u) => n + u.sheetRowCount, 0);
      const last = uploads[uploads.length - 1];

      await write({
        type: "complete",
        payload: {
          ok: true,
          mode: "sheet-only",
          fileCount: uploads.length,
          gudang,
          submissionRef: uploads[0]?.submissionRef,
          uploads: uploads.map((u) => ({
            submissionRef: u.submissionRef,
            suratJalanNumber: u.suratJalanNumber,
            sheetRowCount: u.sheetRowCount,
            driveFileUrl: u.driveFileUrl,
          })),
          suratJalanNumber: uploads[0]?.suratJalanNumber,
          sheetRowCount: totalRows,
          sheetId: last?.sheetId,
          sheetTab: last?.sheetTab,
          sheetUrl: last?.sheetUrl,
          sheetUpdatedRange: last?.sheetUpdatedRange,
          driveFileUrl: uploads.find((u) => u.driveFileUrl)?.driveFileUrl,
          driveWarning: driveWarnings[0],
          ocrWarnings: uploads.flatMap((u) => u.ocrWarnings),
          message:
            `${uploads.length} Surat Jalan → spreadsheet (total ${totalRows} baris, gudang: ${gudang})` +
            (uploads.some((u) => u.driveFileUrl) ? " + foto di Drive" : ""),
        },
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload gagal";
      await write({ type: "error", message });
    } finally {
      try {
        await writer.close();
      } catch {
        // already closed
      }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
