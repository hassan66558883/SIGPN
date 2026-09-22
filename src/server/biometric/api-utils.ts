import "server-only";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { BusinessError } from "@/server/errors";

/** Parses a multipart POST body into {data, file} for the biometric REST endpoints. */
export async function parseMultipart<T extends z.ZodType>(req: NextRequest, schema: T, fileField = "file"): Promise<{ data: z.infer<T>; file: File }> {
  const fd = await req.formData();
  const entries: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string") entries[k] = v;
  const data = schema.parse(entries);
  const file = fd.get(fileField);
  if (!(file instanceof File) || file.size === 0) throw new BusinessError(`\`${fileField}\` upload is required.`);
  return { data, file };
}
