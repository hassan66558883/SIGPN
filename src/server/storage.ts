import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/server/env";
import { sha256 } from "@/server/crypto";
import { randomToken } from "@/server/crypto";
import { BusinessError } from "@/server/errors";

/**
 * Local file storage (ADR-7): UPLOAD_DIR/<entity>/<yyyy>/<mm>/<hash-prefix>-<random>.<ext>.
 * Files are content-addressed by sha256 and never overwritten. Swappable for S3-compatible
 * storage later behind this same module — callers never touch the filesystem directly.
 */

const SAFE_EXT = /^[a-z0-9]{1,8}$/i;

export type SavedUpload = { relPath: string; sha256: string; size: number; mimeType: string };

export async function saveUpload(entity: string, file: File): Promise<SavedUpload> {
  if (file.size <= 0) throw new BusinessError("The uploaded file is empty.");
  if (file.size > env.upload.maxBytes) throw new BusinessError(`The file exceeds the maximum upload size (${Math.floor(env.upload.maxBytes / (1024 * 1024))} MB).`);
  const buf = Buffer.from(await file.arrayBuffer());
  const hash = sha256(buf);
  const extRaw = (file.name.split(".").pop() || "bin").toLowerCase();
  const ext = SAFE_EXT.test(extRaw) ? extRaw : "bin";
  const now = new Date();
  const dir = path.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, "0"));
  const relPath = path.join(entity, dir, `${hash.slice(0, 16)}-${randomToken(6)}.${ext}`);
  const absPath = path.join(env.upload.dir, relPath);
  await mkdir(path.dirname(absPath), { recursive: true });
  await writeFile(absPath, buf, { flag: "wx" });
  return { relPath: relPath.split(path.sep).join("/"), sha256: hash, size: buf.length, mimeType: file.type || "application/octet-stream" };
}

/** Reads a previously saved upload back. Callers must permission-check before calling this. */
export async function readUpload(relPath: string): Promise<Buffer> {
  const safe = path.normalize(relPath).replace(/^(\.\.[/\\])+/, "");
  return readFile(path.join(env.upload.dir, safe));
}
