/**
 * Generates docs/DATABASE_DOCUMENTATION.md from prisma/schema.prisma.
 * Usage: npx tsx scripts/gen-db-docs.ts
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const schema = readFileSync(path.resolve("prisma/schema.prisma"), "utf8");
const lines = schema.split(/\r?\n/);

type Field = { name: string; type: string; attrs: string; doc?: string };
type Model = { name: string; doc?: string; fields: Field[]; blockAttrs: string[]; section: string };
type Enum = { name: string; values: string[]; section: string };

const models: Model[] = [];
const enums: Enum[] = [];
let section = "";
let pendingDoc: string[] = [];
let cur: Model | null = null;
let curEnum: Enum | null = null;

for (const raw of lines) {
  const line = raw.trim();
  const sec = /^\/\/ (\d+)\. (.+)$/.exec(line);
  if (sec) section = `${sec[1]}. ${sec[2]}`;
  if (line.startsWith("///")) {
    pendingDoc.push(line.replace(/^\/\/\/\s?/, ""));
    continue;
  }
  if (line.startsWith("model ")) {
    cur = { name: line.split(/\s+/)[1], doc: pendingDoc.join(" ") || undefined, fields: [], blockAttrs: [], section };
    pendingDoc = [];
    continue;
  }
  if (line.startsWith("enum ")) {
    curEnum = { name: line.split(/\s+/)[1], values: [], section };
    pendingDoc = [];
    continue;
  }
  if (line === "}") {
    if (cur) models.push(cur);
    if (curEnum) enums.push(curEnum);
    cur = null;
    curEnum = null;
    continue;
  }
  if (curEnum && line && !line.startsWith("//")) curEnum.values.push(line);
  if (cur && line && !line.startsWith("//")) {
    if (line.startsWith("@@")) {
      cur.blockAttrs.push(line);
      continue;
    }
    const m = /^(\w+)\s+([\w\[\]?]+)\s*(.*)$/.exec(line);
    if (m) {
      const [, name, type, attrs] = m;
      if (/^[A-Z]\w*(\[\])?\??$/.test(type) && !/^(String|Int|Float|Boolean|DateTime|Json|Decimal|BigInt|Bytes)/.test(type) && attrs.includes("@relation") === false && (type.endsWith("[]") || models.length >= 0)) {
        // relation back-field or enum: keep, annotate below
      }
      cur.fields.push({ name, type, attrs, doc: pendingDoc.join(" ") || undefined });
      pendingDoc = [];
    }
  }
}

const enumNames = new Set(enums.map((e) => e.name));
const modelNames = new Set(models.map((m) => m.name));

function describe(f: Field): string {
  const base = f.type.replace(/\[\]|\?/g, "");
  const notes: string[] = [];
  if (f.attrs.includes("@id")) notes.push("PK");
  if (f.attrs.includes("@unique")) notes.push("unique");
  if (f.type.endsWith("?")) notes.push("nullable");
  if (f.type.endsWith("[]")) notes.push("1→N relation");
  else if (modelNames.has(base)) notes.push(`FK → ${base}`);
  if (enumNames.has(base)) notes.push("enum");
  const def = /@default\(([^)]*)\)/.exec(f.attrs);
  if (def) notes.push(`default ${def[1]}`);
  if (f.attrs.includes("@updatedAt")) notes.push("auto-updated");
  if (f.attrs.includes("onDelete: Cascade")) notes.push("cascade");
  if (f.doc) notes.push(f.doc);
  return notes.join(", ");
}

const migrations = readdirSync(path.resolve("prisma/migrations")).filter((d) => /^\d{14}_/.test(d));

let out = `# Police Management System — Database Documentation\n\n`;
out += `_Generated from \`prisma/schema.prisma\` on ${new Date().toISOString().slice(0, 10)} by \`scripts/gen-db-docs.ts\`. Do not edit by hand._\n\n`;
out += `- Engine: PostgreSQL 18 · ORM: Prisma 7 (pg adapter)\n- Tables: **${models.length}** · Enums: **${enums.length}**\n- Migrations: ${migrations.map((m) => `\`${m}\``).join(", ")}\n\n`;
out += `## Integrity rules\n\n- All ids are \`cuid\` strings; business numbers (\`CASE-2026-00001\`) are unique and generated atomically from \`DocumentSequence\`.\n- Critical records use soft delete (\`deletedAt\`) or status transitions; no hard deletes.\n- \`AuditLog\` and \`CustodyEvent\` are append-only (PostgreSQL trigger \`pms_forbid_mutation\`).\n- \`CustodyEvent.hash\` = SHA-256(prevHash + canonical row) — the chain is verifiable.\n- Required relations use RESTRICT on delete (Prisma default); only per-user security rows cascade.\n\n`;

let lastSection = "";
for (const m of models) {
  if (m.section !== lastSection) {
    out += `\n## ${m.section}\n\n`;
    lastSection = m.section;
  }
  out += `### ${m.name}\n\n`;
  if (m.doc) out += `${m.doc}\n\n`;
  out += `| Column | Type | Notes |\n| ------ | ---- | ----- |\n`;
  for (const f of m.fields) out += `| ${f.name} | ${f.type} | ${describe(f)} |\n`;
  if (m.blockAttrs.length) out += `\nConstraints/indexes: ${m.blockAttrs.map((a) => `\`${a}\``).join(", ")}\n`;
  out += `\n`;
}

out += `\n## Enumerations\n\n`;
for (const e of enums) out += `- **${e.name}**: ${e.values.join(", ")}\n`;

writeFileSync(path.resolve("docs/DATABASE_DOCUMENTATION.md"), out);
console.log(`[gen-db-docs] ${models.length} models, ${enums.length} enums → docs/DATABASE_DOCUMENTATION.md`);
