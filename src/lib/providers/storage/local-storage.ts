import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface DocumentStorageProvider {
  saveUploadedFile(params: {
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
  }): Promise<{ storageKey: string; sizeBytes: number }>;
  readFile(storageKey: string): Promise<Buffer>;
  getHealth(): Promise<{ status: string; message?: string }>;
}

/** Static paths only — dynamic fs paths break Turbopack/Vercel deployment tracing. */
function uploadsBaseDir(): string {
  if (process.env.VERCEL === "1") {
    return path.join("/tmp", "gbc-uploads");
  }
  return path.join(process.cwd(), "storage", "uploads");
}

function assertSafeStorageKey(storageKey: string): string {
  const base = path.basename(storageKey);
  if (!base || base !== storageKey || base.includes("..")) {
    throw new Error("Invalid storage key");
  }
  return base;
}

function filePathForKey(storageKey: string): string {
  return path.join(uploadsBaseDir(), assertSafeStorageKey(storageKey));
}

export class LocalDocumentStorageProvider implements DocumentStorageProvider {
  async saveUploadedFile(params: {
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
  }) {
    const root = uploadsBaseDir();
    await fs.mkdir(root, { recursive: true });
    const ext = path.extname(params.originalFilename).toLowerCase() || ".bin";
    const storageKey = `${randomUUID()}${ext}`;
    const fullPath = path.join(root, assertSafeStorageKey(storageKey));
    await fs.writeFile(fullPath, params.buffer);
    return { storageKey, sizeBytes: params.buffer.length };
  }

  async readFile(storageKey: string): Promise<Buffer> {
    return fs.readFile(filePathForKey(storageKey));
  }

  async getHealth() {
    if (process.env.VERCEL === "1") {
      return {
        status: "CONNECTED",
        message: "Uploads di /tmp (ephemeral — gunakan object storage untuk production)",
      };
    }
    return { status: "CONNECTED", message: "Local storage aktif (development)" };
  }
}

export function getStorageProvider(): DocumentStorageProvider {
  return new LocalDocumentStorageProvider();
}
