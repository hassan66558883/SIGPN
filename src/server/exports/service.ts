import "server-only";
import type { Actor } from "@/server/auth/dal";
import { AuthError, NotFoundError } from "@/server/errors";
import { logAudit } from "@/server/audit";
import type { RequestContext } from "@/server/request-context";
import { fmtDateTime } from "@/lib/format";
import { roleName } from "@/lib/i18n/catalog";
import { MAX_EXPORT_ROWS, MODULES, type Query } from "@/server/exports/registry";
import { renderList, renderSheet, type Provenance } from "@/server/exports/pdf";

function authorize(actor: Actor, key: string) {
  const m = MODULES[key];
  if (!m) throw new NotFoundError("Export module");
  if (!actor.permissions.has("records:export_pdf")) throw new AuthError("forbidden", "Permission records:export_pdf required");
  if (!actor.permissions.has(m.view)) throw new AuthError("forbidden", `Permission ${m.view} required`);
  return m;
}

function provenance(actor: Actor, filters?: string): Provenance {
  return { who: actor.fullName, role: roleName(actor.roleCode, actor.roleName, "fr"), scope: actor.stationName ?? actor.regionName ?? "National", at: fmtDateTime(new Date(), "fr"), filters };
}

const FILTER_KEYS = ["q", "status", "category", "priority", "type", "severity", "stationId", "mine", "open", "overdue"] as const;

/** List export: the same query as the screen (same scope), up to MAX_EXPORT_ROWS rows. Always audited. */
export async function exportList(actor: Actor, key: string, query: Query, ctx: RequestContext) {
  const m = authorize(actor, key);
  const rows: string[][] = [];
  let total = 0;
  for (let page = 1; rows.length < MAX_EXPORT_ROWS; page++) {
    const r = await m.list(actor, query, page);
    total = r.total;
    for (const it of r.items) if (rows.length < MAX_EXPORT_ROWS) rows.push(m.row(it));
    if (r.items.length < 100) break;
  }
  const filters = FILTER_KEYS.filter((k) => query[k]).map((k) => `${k}=${query[k]}`).join(", ") || undefined;
  const buf = await renderList(m.title, m.cols, rows, total, provenance(actor, filters));
  await logAudit({ actor, action: "RECORDS_EXPORTED", module: "exports", entityType: key, summary: `PDF export of the list "${m.title}": ${rows.length} of ${total} row(s)${filters ? ` (${filters})` : ""}`, after: { rows: rows.length, total, filters: filters ?? null }, context: ctx });
  return { buf, fileName: `${key}-${new Date().toISOString().slice(0, 10)}.pdf` };
}

/** Record sheet export: same read function as the screen (same scope and confidentiality). Always audited. */
export async function exportRecord(actor: Actor, key: string, id: string, ctx: RequestContext) {
  const m = authorize(actor, key);
  const sheet = await m.sheet(actor, id);
  const buf = await renderSheet(sheet, provenance(actor));
  await logAudit({ actor, action: "RECORD_EXPORTED", module: "exports", entityType: key, entityId: id, entityLabel: sheet.number, summary: `PDF export of ${sheet.subtitle.toLowerCase()} ${sheet.number}`, context: ctx });
  return { buf, fileName: `${key}-${sheet.number}.pdf` };
}
