import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const UPLOADS_ROOT = path.resolve(
  process.cwd(),
  process.env.UPLOADS_DIR ?? "./uploads"
);

export type SavedFile = {
  relativePath: string;
  absolutePath: string;
  fileName: string;
  mimeType: string;
  size: number;
  sha256: string;
};

export class UploadError extends Error {}

export type UploadOptions = {
  maxBytes?: number;
  allowedMime?: string[];
};

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10MB, allineato a next.config serverActions
const DOC_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export const PRESET_DOCUMENTO: UploadOptions = {
  maxBytes: DEFAULT_MAX_BYTES,
  allowedMime: DOC_MIME,
};

function sanitize(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180);
}

export async function saveUploadedFile(
  file: File,
  subdir: string,
  opts: UploadOptions = PRESET_DOCUMENTO
): Promise<SavedFile> {
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  if (file.size > maxBytes) {
    throw new UploadError(
      `File troppo grande (${(file.size / 1024 / 1024).toFixed(1)} MB, max ${(
        maxBytes /
        1024 /
        1024
      ).toFixed(0)} MB).`
    );
  }
  if (opts.allowedMime && file.type && !opts.allowedMime.includes(file.type)) {
    throw new UploadError(`Tipo file non ammesso: ${file.type}. Ammessi: PDF, PNG, JPEG, WebP.`);
  }

  const safeSubdir = subdir.replace(/\.\.+/g, "").replace(/^\/+|\/+$/g, "");
  const dirAbs = path.join(UPLOADS_ROOT, safeSubdir);
  await fs.mkdir(dirAbs, { recursive: true });

  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${ts}-${sanitize(file.name || "upload.bin")}`;
  const absPath = path.join(dirAbs, fileName);
  await fs.writeFile(absPath, buf);

  return {
    relativePath: path.posix.join(safeSubdir, fileName),
    absolutePath: absPath,
    fileName,
    mimeType: file.type || "application/octet-stream",
    size: buf.byteLength,
    sha256,
  };
}

export async function readUploadedFile(relativePath: string): Promise<{
  buffer: Buffer;
  absolutePath: string;
}> {
  const abs = path.resolve(UPLOADS_ROOT, relativePath);
  if (!abs.startsWith(UPLOADS_ROOT)) {
    throw new Error("Path traversal blocked");
  }
  const buffer = await fs.readFile(abs);
  return { buffer, absolutePath: abs };
}
