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

function getStorageRoot(): string {
  return process.env.STORAGE_LOCAL_PATH ?? "./storage/uploads";
}

export class LocalDocumentStorageProvider implements DocumentStorageProvider {
  async saveUploadedFile(params: {
    buffer: Buffer;
    originalFilename: string;
    mimeType: string;
  }) {
    const root = path.resolve(getStorageRoot());
    await fs.mkdir(root, { recursive: true });
    const ext = path.extname(params.originalFilename).toLowerCase() || ".bin";
    const storageKey = `${randomUUID()}${ext}`;
    const fullPath = path.join(root, storageKey);
    await fs.writeFile(fullPath, params.buffer);
    return { storageKey, sizeBytes: params.buffer.length };
  }

  async readFile(storageKey: string): Promise<Buffer> {
    const fullPath = path.join(path.resolve(getStorageRoot()), storageKey);
    return fs.readFile(fullPath);
  }

  async getHealth() {
    return { status: "CONNECTED", message: "Local storage aktif (development)" };
  }
}

export function getStorageProvider(): DocumentStorageProvider {
  return new LocalDocumentStorageProvider();
}
