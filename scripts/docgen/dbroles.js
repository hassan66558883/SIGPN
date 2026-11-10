// Lecture seule : droits effectifs de chaque rôle dans une base (RolePermission), pour la documentation.
require("dotenv/config");
const { Pool } = require("pg");
const url = process.argv[2] || process.env.DATABASE_URL;
const pool = new Pool({ connectionString: url, options: "-c default_transaction_read_only=on" });
(async () => {
  const r = await pool.query(`SELECT r.code, r."scopeLevel", r."requiresMfa", r."isActive", p.code AS perm FROM "Role" r LEFT JOIN "RolePermission" rp ON rp."roleId"=r.id LEFT JOIN "Permission" p ON p.id=rp."permissionId" ORDER BY r.code, p.code`);
  const out = {};
  for (const x of r.rows) { (out[x.code] ??= { scope: x.scopeLevel, mfa: x.requiresMfa, active: x.isActive, perms: [] }); if (x.perm) out[x.code].perms.push(x.perm); }
  require("fs").writeFileSync(process.argv[3] || "SIGEC_PN_DOCUMENTATION/_build/db_roles.json", JSON.stringify(out, null, 1));
  console.log(Object.keys(out).length, "roles");
  await pool.end();
})();
