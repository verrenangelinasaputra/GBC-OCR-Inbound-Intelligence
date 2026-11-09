import crypto from "crypto";
import { prisma } from "@/lib/db";
import { requireApiPermission, jsonError } from "@/lib/api/auth-context";
import { getStorageProvider } from "@/lib/providers/storage/local-storage";
import { generateReference } from "@/lib/services/references";
import { enqueueOcrJob } from "@/lib/services/ocr-pipeline";
import { findDuplicateDocuments } from "@/lib/services/duplicate-detection";
import { notifyDbmUsers } from "@/lib/providers/notifications";
import { writeAuditLog } from "@/lib/services/audit";
import { SuratJalanStatus } from "@prisma/client";
import { SUPPLIER_GUDANG_OPTIONS, SUPPLIER_MAX_SJ_FILES } from "@/lib/config/supplier-gudang";

const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png"]);
const MAX_BYTES = 15 * 1024 * 1024;
const GUDANG_SET = new Set<string>(SUPPLIER_GUDANG_OPTIONS);

export async function POST(request: Request) {
  try {
    const session = await requireApiPermission("supplier_portal", "CREATE");
    if (!session.supplierId) {
      return jsonError(new Error("FORBIDDEN"), 403);
    }

    const form = await request.formData();
    const notes = String(form.get("notes") ?? "");
    const vehicleInfo = String(form.get("vehicleInfo") ?? "");
    const gudang = String(form.get("gudang") ?? "").trim();
    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return jsonError(new Error("Minimal 1 file Surat Jalan"), 400);
    }
    if (files.length > SUPPLIER_MAX_SJ_FILES) {
      return jsonError(new Error(`Maksimal ${SUPPLIER_MAX_SJ_FILES} file per submit`), 400);
    }
    if (!gudang || !GUDANG_SET.has(gudang)) {
      return jsonError(new Error("Pilih gudang tujuan yang valid"), 400);
    }
    const combinedNotes = notes ? `${notes} | Gudang: ${gudang}` : `Gudang: ${gudang}`;

    const supplier = await prisma.supplier.findUniqueOrThrow({
      where: { id: session.supplierId },
    });

    const shipmentRef = generateReference("NKB");
    const shipment = await prisma.inboundShipment.create({
      data: {
        referenceNumber: shipmentRef,
        supplierId: supplier.id,
        notes: combinedNotes,
        vehicleInfo: vehicleInfo || undefined,
      },
    });

    const submissionRef = generateReference("SJ");
    const storage = getStorageProvider();
    let combinedHash = crypto.createHash("sha256");

    const doc = await prisma.suratJalanDocument.create({
      data: {
        shipmentId: shipment.id,
        supplierId: supplier.id,
        uploadedById: session.userId,
        status: SuratJalanStatus.UPLOADED,
        submissionRef,
        supplierNotes: combinedNotes,
        vehicleInfo: vehicleInfo || undefined,
        destinationText: gudang,
      },
    });

    let page = 1;
    for (const file of files) {
      if (!ALLOWED.has(file.type)) {
        return jsonError(new Error(`Format tidak diizinkan — hanya foto JPG/PNG, bukan PDF.`), 400);
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.length > MAX_BYTES) {
        return jsonError(new Error("File terlalu besar (max 15MB)"), 400);
      }
      combinedHash.update(buffer);
      const saved = await storage.saveUploadedFile({
        buffer,
        originalFilename: file.name,
        mimeType: file.type,
      });
      await prisma.documentImage.create({
        data: {
          documentId: doc.id,
          storageKey: saved.storageKey,
          originalFilename: file.name,
          mimeType: file.type,
          sizeBytes: saved.sizeBytes,
          pageNumber: page++,
        },
      });
    }

    const fingerprint = combinedHash.digest("hex");
    const dupes = await findDuplicateDocuments({
      supplierId: supplier.id,
      fileFingerprint: fingerprint,
    });
    await prisma.suratJalanDocument.update({
      where: { id: doc.id },
      data: {
        fileFingerprint: fingerprint,
        duplicateOfId: dupes.find((d) => d.id !== doc.id)?.id,
      },
    });

    await writeAuditLog({
      actorId: session.userId,
      action: "surat_jalan.upload",
      entityType: "SuratJalanDocument",
      entityId: doc.id,
      after: { submissionRef, fingerprint, duplicateWarning: dupes.length > 1 },
    });

    try {
      await enqueueOcrJob(doc.id, session.userId);
    } catch (ocrErr) {
      await writeAuditLog({
        actorId: session.userId,
        action: "ocr.failed",
        entityType: "SuratJalanDocument",
        entityId: doc.id,
        after: { error: ocrErr instanceof Error ? ocrErr.message : "unknown" },
      });
      return Response.json(
        {
          ok: true,
          submissionRef,
          shipmentRef,
          documentId: doc.id,
          ocrError:
            ocrErr instanceof Error
              ? ocrErr.message
              : "OCR gagal — cek GEMINI_API_KEY dan OCR_PROVIDER=gemini",
        },
        { status: 202 }
      );
    }

    await notifyDbmUsers({
      title: "NKB — Surat Jalan baru",
      body: `${supplier.name} mengirim dokumen ${submissionRef}. Shipment: ${shipmentRef}`,
      link: `/surat-jalan/${doc.id}`,
    });

    return Response.json({
      ok: true,
      submissionRef,
      shipmentRef,
      documentId: doc.id,
      duplicateDetected: dupes.some((d) => d.id !== doc.id),
    });
  } catch (e) {
    return jsonError(e);
  }
}
